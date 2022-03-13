import { Provide, Inject, Scope, ScopeEnum } from '@midwayjs/decorator';
import { Device } from './deviceBase';
import { Util } from '../util/util';
import { RedisService } from '../service/redis';

/**
 * 解析设备查询数据
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class ProtocolParse {
  @Inject()
  Device: Device;

  @Inject()
  Util: Util;

  @Inject()
  RedisService: RedisService;

  /**
   * 获取查询使用时间使用时间
   * @param mac
   * @param pid
   */
  public async getQueryuseTime(mac: string, pid: number) {
    const useTimeArray = await this.RedisService.getQueryTerminaluseTime(
      mac,
      pid,
      1000
    );
    const len = useTimeArray.length;
    const yxuseTimeArray =
      len > 60 ? useTimeArray.slice(len - 60, len) : useTimeArray;
    return Math.max(...yxuseTimeArray) || 4000;
  }

  /**
   * 重置查询计时
   * @param mac
   * @param pid
   */
  public clearQueryuseTime(mac: string, pid: number) {
    this.RedisService.clearQueryTerminaluseTime(mac, pid);
  }

  /**
   *
   * @param regx
   * @returns
   */
  private getProtocolRegx(regx: string) {
    const [s, len] = regx.split('-').map(el => parseInt(el));
    const start = s - 1;
    return {
      start: start,
      end: start + len,
      step: len,
    };
  }

  /**
   * 处理232协议
   * @param IntructResult 设备结果集
   * @param protocol 协议
   */
  private async parse232(
    IntructResult: Uart.IntructQueryResult[],
    protocol: string
  ): Promise<Promise<Uart.queryResultArgument>[]> {
    const InstructMap = await this.RedisService.getProtocolInstruct(protocol);

    return (
      IntructResult
        // 刷选出指令正确的查询，避免出错
        // 通过InstructMap.has(el.content)确认指令是系统所包含的
        // 通过el.buffer.data.findIndex(el2 => el2 === 13) === el.buffer.data.length - 1 确认\r结束符在结果中只有一次且在结尾位置,确保结果没有串码
        .filter(
          el =>
            InstructMap.has(el.content) &&
            el.buffer.data.findIndex(el2 => el2 === 13) ===
            el.buffer.data.length - 1
        )

        .map(el => {
          // 解析规则
          const instructs = InstructMap.get(el.content)!;
          // 把buffer转换为utf8字符串并掐头去尾
          const parseStr = Buffer.from(el.buffer.data)
            .toString(
              'utf8',
              instructs.shift ? instructs.shiftNum : 0,
              instructs.pop
                ? el.buffer.data.length - instructs.popNum
                : el.buffer.data.length
            )
            .replace(/(#)/g, '')
            // 如果是utf8,分隔符为' '
            .split(instructs.isSplit ? ' ' : '');
          return instructs.formResize.map(async el2 => {
            const { start } = this.getProtocolRegx(el2.regx!);
            const value = parseStr[start];
            return {
              name: el2.name,
              value,
              parseValue: el2.isState
                ? await this.RedisService.parseUnit(el2.unit!, value)
                : value,
              unit: el2.unit,
              issimulate: el2.isState,
            } as any;
          });
        })
        .flat() as any
    );
  }

  /**
   * 处理485协议
   * @param IntructResult 设备结果集
   * @param R 设备结果对象
   */
  private async parse485(
    IntructResult: Uart.IntructQueryResult[],
    R: Uart.queryResult
  ) {
    const InstructMap = await this.RedisService.getProtocolInstruct(R.protocol);
    // 刷选阶段,协议指令查询返回的结果不一定是正确的,可能存在返回报警数据,其他设备返回的数据
    // 检查1,检查返回的查询指令是否是查询协议中包含的指令
    // 2,检查协议是否是非标协议,如果是非标协议的话且有检查脚本,使用脚本检查结果buffer,返回Boolen
    // 3,检查标准modbus协议,协议返回的控制字符与查询指令一致,结果数据长度与结果中声明的数据长度一致
    //
    const ResultFilter: Uart.IntructQueryResult[] = [];

    for (const el of IntructResult) {
      const instructName = await this.RedisService.getContentToInstructName(
        el.content
      ); //0300010002
      // 如果程序重启后接受到数据，缓存中可能还没有指令对照
      if (instructName) {
        const protocolInstruct = InstructMap.get(instructName)!;

        // 如果是非标协议且含有后处理脚本，由脚本校验结果buffer
        if (protocolInstruct.noStandard && protocolInstruct.scriptEnd) {
          const Fun = this.Util.ParseFunctionEnd(protocolInstruct.scriptEnd);
          if (Fun(el.content, el.buffer.data) as boolean) ResultFilter.push(el);
        } else {
          // 返回数据的pid
          const pid = el.buffer.data[0];
          // 查询指令的类型
          const FunctionCode = parseInt(el.content.slice(2, 4));
          // 返回数据的类型
          const ResFunctionCode = el.buffer.data[1];
          // 返回数据标明的长度
          const ResLength = el.buffer.data[2];
          // 最大解析数据长度是否对应返回数据长度
          /* const { end } = this.getProtocolRegx(
            protocolInstruct.formResize[protocolInstruct.formResize.length - 1]
              .regx!
          ); */
          /**
           * 返回数据和查询指令对比
           * pid需一致
           * 数据类型需一致
           * 解析数据长度需要<=实际数据长度
           * 数据实际长度和数据标识长度需一致&& ResLength + 1 >= end
           */
          if (
            pid === R.pid &&
            ResFunctionCode === FunctionCode &&
            ResLength === el.buffer.data.length - 5
          ) {
            ResultFilter.push(el);
          }
        }
      }
    }

    /*  if (ResultFilter.length < IntructResult.length) {
      const ok = ResultFilter.map(el => el.content);
      const error = IntructResult.filter(el => !ok.includes(el.content)).map(el => {
        // 返回数据的pid
        const pid = el.buffer.data[0];
        // 查询指令的类型
        const FunctionCode = parseInt(el.content.slice(2, 4));
        // 返回数据的类型
        const ResFunctionCode = el.buffer.data[1];
        // 返回数据标明的长度
        const ResLength = el.buffer.data[2];

        const len = el.buffer.data.length - 5

        return { content: el.content, buffer: Buffer.from(el.buffer.data).toString('hex'), pid, FunctionCode, ResFunctionCode, ResLength, len }
      })


      console.log({
        msg: '485校验出错',
        R,

        ok,
        error
      });
    } */
    // 根据协议指令解析类型的不同,转换裁减Array<number>为Array<number>,把content换成指令名称
    const ParseInstructResultType = ResultFilter.map(async el => {
      const content = await this.RedisService.getContentToInstructName(
        el.content
      )!;
      const instructs = InstructMap.get(content)!;
      const data = el.buffer.data.slice(
        instructs.shift ? instructs.shiftNum : 3,
        instructs.pop
          ? el.buffer.data.length - instructs.popNum
          : el.buffer.data.length - 2
      );
      let bufferData: number[] = [];
      switch (instructs.resultType) {
        case 'bit2':
          // 把结果字段中的10进制转换为2进制,翻转后补0至8位,代表modbus线圈状态
          // https://blog.csdn.net/qq_26093511/article/details/58628270
          // http://blog.sina.com.cn/s/blog_dc9540b00102x9p5.html

          // 1,读bit2指读线圈oil，方法为把10/16进制转为2进制,不满8位则前补0至8位，然后翻转这个8位数组，
          // 2,把连续的几个数组拼接起来，转换为数字
          // 例子：[1,0,0,0,1],[0,1,1,1,1]补0为[0,0,0,1,0,0,0,1],[0,0,0,0,1,1,1,1],数组顺序不变，每个数组内次序翻转
          // [1,0,0,0,1,0,0,0],[1,1,1,1,0,0,0,0],然后把二维数组转为一维数组
          bufferData = data
            .map(el2 =>
              el2
                .toString(2)
                .padStart(8, '0')
                .split('')
                .reverse()
                .map(el3 => Number(el3))
            )
            .flat();
          break;
        default:
          bufferData = data;
          break;
      }
      return {
        content,
        bufferData,
        bufferN: el.buffer.data,
      };
    });
    // 把转换处理后的数据根据协议指令对应的解析对象生成结果对象数组,赋值result属性
    return (await Promise.all(ParseInstructResultType))
      .map(({ content, bufferData }) => {
        const instructs = InstructMap.get(content)!;
        const buffer = Buffer.from(bufferData);
        return instructs.formResize.map(async el2 => {
          // 申明结果
          const result: Uart.queryResultArgument = {
            name: el2.name,
            value: '0',
            parseValue: '0',
            unit: el2.unit,
            issimulate: el2.isState,
          };
          // 每个数据的结果地址
          const { start, end, step } = this.getProtocolRegx(el2.regx!);
          switch (instructs.resultType) {
            // 处理
            case 'bit2':
              try {
                result.value = buffer[start].toString();
              } catch (error) {
                console.log({
                  error: error.message,
                  buffer,
                  instructs,
                  start,
                  end,
                  step,
                });

                result.value = undefined;
              }
              break;
            // 处理ascii
            case 'utf8':
              result.value = buffer.slice(start, end).toString();
              break;
            // 处理整形
            case 'hex':
            case 'short':
              // 如果是浮点数则转换为带一位小数点的浮点数
              try {
                const num = this.Util.ParseCoefficient(
                  el2.bl,
                  buffer.readIntBE(start, step)
                );
                const str = num.toString();

               /*  if (R.mac === '193059799391' && content === "0300830002") {
                  console.log({ num, str, content, buffer, k: buffer.readIntBE(start, step),el2 });
                } */

                result.value = /\./.test(str) ? num.toFixed(1) : str;
              } catch (error) {
                result.value = undefined;
                console.error({
                  el2,
                  msg: '解析结果长度错误',
                  instructs,
                  content,
                  bufferData,
                  buffer,
                  start, end, step,
                  R,
                  IntructResult,
                  error
                });
              }
              break;
            // 处理单精度浮点数
            case 'float':
              result.value = this.Util.HexToSingle(
                buffer.slice(start, end)
              ).toFixed(2);
              break;
          }
          result.parseValue =
            result.value && result.issimulate
              ? await this.RedisService.parseUnit(result.unit!, result.value)
              : result.value;
          return result;
        });
      })
      .flat();
  }

  /**
   * 解析查询结果
   * @param R 设备查询结果
   */
  public async parse(R: Uart.queryResult) {
    this.RedisService.addQueryTerminaluseTime(R.mac, R.pid, R.useTime);
    // 结果集数组
    const IntructResult = R.contents;

    const result =
      R.type === 232
        ? await this.parse232(IntructResult, R.protocol)
        : await this.parse485(IntructResult, R);
    return (await Promise.all(result)).filter(
      el => !el.issimulate || el.parseValue
    );
  }
}
