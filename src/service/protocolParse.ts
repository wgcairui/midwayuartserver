import { Provide, Inject, Scope, ScopeEnum } from "@midwayjs/decorator"
import { Device } from "../service/device"
import { Util } from "../util/util"
import { RedisService } from "../service/redis"

/**
 * 解析设备查询数据
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class ProtocolParse {


    @Inject()
    Device: Device

    @Inject()
    Util: Util

    @Inject()
    RedisService: RedisService

    /**
     * 获取查询使用时间使用时间
     * @param mac 
     * @param pid 
     */
    public async getQueryuseTime(mac: string, pid: number) {
        const useTimeArray = await this.RedisService.getQueryTerminaluseTime(mac, pid, 1000)
        const len = useTimeArray.length
        const yxuseTimeArray = len > 60 ? useTimeArray.slice(len - 60, len) : useTimeArray
        return Math.max(...yxuseTimeArray) || 4000
    }

    /**
     * 重置查询计时
     * @param mac 
     * @param pid 
     */
    public clearQueryuseTime(mac: string, pid: number) {
        this.RedisService.clearQueryTerminaluseTime(mac, pid)
    }

    private getProtocolRegx(regx: string) {
        return regx.split("-").map(el => parseInt(el))
    }

    /**
     * 处理232协议
     * @param IntructResult 设备结果集
     * @param protocol 协议
     */
    private async parse232(IntructResult: Uart.IntructQueryResult[], protocol: string): Promise<Promise<Uart.queryResultArgument>[]> {
        const InstructMap = await this.RedisService.getProtocolInstruct(protocol)
        return IntructResult
            // 刷选出指令正确的查询，避免出错
            // 通过InstructMap.has(el.content)确认指令是系统所包含的
            // 通过el.buffer.data.findIndex(el2 => el2 === 13) === el.buffer.data.length - 1 确认\r结束符在结果中只有一次且在结尾位置,确保结果没有串码
            .filter(el => InstructMap.has(el.content) && el.buffer.data.findIndex(el2 => el2 === 13) === el.buffer.data.length - 1)

            .map(el => {
                // 解析规则
                const instructs = InstructMap.get(el.content)!
                // 把buffer转换为utf8字符串并掐头去尾
                const parseStr = Buffer.from(el.buffer.data)
                    .toString("utf8", instructs.shift ? instructs.shiftNum : 0, instructs.pop ? el.buffer.data.length - instructs.popNum : el.buffer.data.length)
                    .replace(/(#)/g, "")
                    // 如果是utf8,分隔符为' '
                    .split(instructs.isSplit ? " " : "");
                // console.log({ cont:el.content,parseStr, parseStrlen: parseStr.length, ins: instructs.formResize.length });
                return instructs.formResize.map(async el2 => {


                    const [start] = this.getProtocolRegx(el2.regx!)
                    const value = parseStr[start - 1]
                    return { name: el2.name, value, parseValue: el2.isState ? await this.RedisService.parseUnit(el2.unit!, value) : value, unit: el2.unit, issimulate: el2.isState } as any
                });
            })
            .flat() as any
    }

    /**
     * 处理485协议
     * @param IntructResult 设备结果集
     * @param R 设备结果对象
     */
    private async parse485(IntructResult: Uart.IntructQueryResult[], R: Uart.queryResult) {
        const InstructMap = await this.RedisService.getProtocolInstruct(R.protocol);
        // 刷选阶段,协议指令查询返回的结果不一定是正确的,可能存在返回报警数据,其他设备返回的数据
        // 检查1,检查返回的查询指令是否是查询协议中包含的指令
        // 2,检查协议是否是非标协议,如果是非标协议的话且有检查脚本,使用脚本检查结果buffer,返回Boolen
        // 3,检查标准modbus协议,协议返回的控制字符与查询指令一致,结果数据长度与结果中声明的数据长度一致
        // 
        const ResultFilter = IntructResult.filter(async el => {
            const instructName = await this.RedisService.getContentToInstructName(el.content) //0300010002
            // 如果程序重启后接受到数据，缓存中可能还没有指令对照
            if (instructName) {
                const protocolInstruct = InstructMap.get(instructName)!
                // 如果是非标协议且含有后处理脚本，由脚本校验结果buffer
                if (protocolInstruct.noStandard && protocolInstruct.scriptEnd) {
                    const Fun = this.Util.ParseFunctionEnd(protocolInstruct.scriptEnd)
                    return Fun(el.content, el.buffer.data) as Boolean
                } else {
                    // 结果对象需要满足对应操作指令,是此协议中的指令,数据长度和结果中声明的一致
                    const FunctionCode = parseInt(el.content.slice(2, 4))
                    return (el.buffer.data[1] === FunctionCode && el.buffer.data[2] + 5 === el.buffer.data.length)
                }
            } else return false

        })
        //console.log(ResultFilter);
        // 根据协议指令解析类型的不同,转换裁减Array<number>为Array<number>,把content换成指令名称
        const ParseInstructResultType = ResultFilter.map(async el => {
            el.content = await this.RedisService.getContentToInstructName(el.content)!
            const instructs = InstructMap.get(el.content)!
            const data = el.buffer.data.slice(instructs.shift ? instructs.shiftNum : 3, instructs.pop ? el.buffer.data.length - instructs.popNum : el.buffer.data.length - 2)
            switch (instructs.resultType) {
                case 'bit2':
                    // 把结果字段中的10进制转换为2进制,翻转后补0至8位,代表modbus线圈状态
                    // https://blog.csdn.net/qq_26093511/article/details/58628270
                    // http://blog.sina.com.cn/s/blog_dc9540b00102x9p5.html

                    // 1,读bit2指读线圈oil，方法为把10/16进制转为2进制,不满8位则前补0至8位，然后翻转这个8位数组，
                    // 2,把连续的几个数组拼接起来，转换为数字
                    // 例子：[1,0,0,0,1],[0,1,1,1,1]补0为[0,0,0,1,0,0,0,1],[0,0,0,0,1,1,1,1],数组顺序不变，每个数组内次序翻转
                    // [1,0,0,0,1,0,0,0],[1,1,1,1,0,0,0,0],然后把二维数组转为一维数组
                    el.buffer.data = data.map(el2 => el2.toString(2).padStart(8, '0').split('').reverse().map(el3 => Number(el3))).flat()
                    break
                default:
                    el.buffer.data = data
                    break
            }
            return el
        })
        //console.log(ParseInstructResultType);
        // 把转换处理后的数据根据协议指令对应的解析对象生成结果对象数组,赋值result属性
        return (await Promise.all(ParseInstructResultType)).map(el => {
            const instructs = InstructMap.get(el.content)!
            const buffer = Buffer.from(el.buffer.data)
            return instructs.formResize.map(async el2 => {
                // 申明结果
                const result: Uart.queryResultArgument = { name: el2.name, value: '0', parseValue: '0', unit: el2.unit, issimulate: el2.isState }
                // 每个数据的结果地址
                const [start, len] = this.getProtocolRegx(el2.regx!)
                switch (instructs.resultType) {
                    // 处理
                    case 'bit2':
                        result.value = buffer[start - 1].toString()
                        break
                    // 处理整形
                    case "hex":
                    case "short":
                        // 如果是浮点数则转换为带一位小数点的浮点数
                        const num = this.Util.ParseCoefficient(el2.bl, buffer.readIntBE(start - 1, len))
                        const str = num.toString()
                        result.value = /\./.test(str) ? num.toFixed(1) : str
                        break;
                    // 处理单精度浮点数
                    case "float":
                        result.value = this.Util.HexToSingle(buffer.slice(start - 1, start + len - 1)).toFixed(2)
                        break;
                }
                result.parseValue = result.issimulate ? await this.RedisService.parseUnit(result.unit!, result.value) : result.value
                return result
            })
        }).flat()
    }

    /**
     * 解析查询结果
     * @param R 设备查询结果
     */
    public async parse(R: Uart.queryResult) {
        this.RedisService.addQueryTerminaluseTime(R.mac, R.pid, R.useTime)
        // 结果集数组
        const IntructResult = R.contents;

        const result = R.type === 232 ? await this.parse232(IntructResult, R.protocol) : await this.parse485(IntructResult, R)
        return (await Promise.all(result)).filter(el => !el.issimulate || el.parseValue)
    }
}