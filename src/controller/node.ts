import { Provide, Controller, Inject, Post, Body } from "@midwayjs/decorator"
import { Device } from "../service/device"
import { Util } from "../util/util"
import { Logs } from "../service/log"
import { Alarm } from "../service/alarm"
import { ProtocolParse } from "../service/protocolParse"
import { ProtocolCheck } from "../service/protocolCheck"
import { RedisService } from "../service/redis"
import * as _ from "lodash"
import { SocketUser } from "../service/socketUser"

@Provide()
@Controller("/api/node", { middleware: ['nodeHttp'] })
export class NodeControll {

    @Inject()
    Device: Device

    @Inject()
    Util: Util

    @Inject()
    Logs: Logs

    @Inject()
    Alarm: Alarm

    @Inject()
    RedisService: RedisService

    @Inject()
    ProtocolParse: ProtocolParse

    @Inject()
    ProtocolCheck: ProtocolCheck

    @Inject()
    SocketUser: SocketUser

    /**
     * 上传dtu信息
     * @param info 
     */
    @Post("/dtuInfo")
    async dtuInfo(@Body() info: Uart.Terminal) {
        // 获取terminal信息
        const terminal = await this.Device.getTerminal(info.DevMac)
        if (terminal) {
            const { DevMac, ip, port, AT, PID, ver, Gver, iotStat, jw, uart, ICCID } = info
            // 比较参数，如果有修改则更新数据库
            {
                const temp: any[] = []
                if (terminal.ip !== ip && this.Util.RegexIP(ip)) temp.push({ ip })
                if (terminal.port !== port && Number(port) > 0) temp.push({ port })
                if (terminal.PID !== PID) temp.push({ PID })
                if (AT) {
                    if (terminal.AT !== AT) temp.push({ AT })
                    if (terminal.ver !== ver) temp.push({ ver })
                    if (terminal.Gver !== Gver) temp.push({ Gver })
                    if (terminal.iotStat !== iotStat) temp.push({ iotStat })
                    if (terminal.jw !== jw && this.Util.RegexLocation(jw)) temp.push({ jw })
                    if (terminal.uart !== uart && this.Util.RegexUart(uart)) temp.push({ uart })
                    if (terminal.ICCID !== ICCID && this.Util.RegexICCID(ICCID)) temp.push({ ICCID })
                }

                if (temp.length > 0) {
                    temp.push({ uptime: Date.now() })
                    // console.log(terminal,Object.assign({}, ...temp));
                    this.Device.setTerminal(DevMac, Object.assign({}, ...temp))
                } else {
                    this.Device.setTerminal(DevMac, { uptime: new Date() as any })
                }
            }
            return {
                code: 200,
                msg: 'success'
            }
        }
        return {
            code: 0,
            msg: 'no terminal'
        }
    }

    /**
     * 上传节点运行状态
     * @param node 
     * @param tcp 
     */
    @Post("/nodeInfo")
    async nodeInfo(@Body() name: string, @Body() node: Uart.nodeInfo, @Body() tcp: number) {
        return {
            code: 200,
            data: await this.Device.setNodeRun(name, { ...node, Connections: tcp, updateTime: new Date() })
        }
    }

    /**
     * 上传查询数据
     * @param data 
     */
    @Post("/queryData")
    queryData(@Body() data: Uart.queryResult[]) {
        if (data.length > 0) {
            const date = new Date().toLocaleDateString()
            data.forEach(async el => {
                // 如果数据设备状态不在线,设置在线
                this.Device.getStatTerminalDevs(el.mac, el.pid).then(els => {
                    if (!els) {
                        this.Device.setStatTerminalDevs(el.mac, el.pid, true)
                        this.SocketUser.sendMacUpdate(el.mac)
                    }
                })
                // 保存每个终端使用的数字节数
                // 保存每个查询指令使用的字节，以天为单位
                this.Logs.incUseBytes(el.mac, date, el.useBytes)
                const contents = el.contents.map(el => ({ content: el.content, data: el.buffer.data }))
                const docResults = await this.Device.saveTerminalResults({ contents } as any)
                const parentId = docResults._id

                const parse = await this.ProtocolParse.parse(el)
                // 获得解析数据首先写入数据库
                const clientData = { ...el, parentId, result: parse }

                const { _id } = await this.Device.saveTerminalResultColletion(clientData as any)
                // 如果设备有用户绑定则进入检查流程
                const user = await this.Alarm.getMactoUser(el.mac)
                if (user) {
                    const { alarm, result } = await this.ProtocolCheck.check(user.user, el, parse)
                    // 写入到单例数据库
                    await this.Device.updateTerminalResultSingle(el.mac, el.pid, _.omit({ ...el, parentId, result }, ['mac', 'pid']))

                    const instructLen = (await this.Device.getProtocol(el.protocol)).instruct.map(el => el.formResize.length).reduce((pre, cur) => pre + cur)
                    /* console.log({
                        date1,
                        result: result.length,
                        ilen: instructLen,
                        len: alarm.length,
                        r: result.some(el => el.name === '输入电压'),
                        alarm,
                        has: await this.RedisService.hasArgumentAlarmLog(el.mac + el.pid),
                        all: await this.RedisService.redisService.smembers('ArgumentAlarm')
                    }); */
                    // 迭代告警记录,
                    if (instructLen === result.length && alarm.length > 0) {
                        if (await this.RedisService.hasArgumentAlarmLog(el.mac + el.pid) === 0) {
                            await this.RedisService.addArgumentAlarmLog(el.mac + el.pid)

                            this.Alarm.argumentAlarm(el.mac, el.pid, alarm)

                            alarm.forEach(el2 => {
                                this.Logs.saveDataTransfinite({
                                    parentId: _id,
                                    mac: el.mac,
                                    pid: el.pid,
                                    devName: el.mountDev,
                                    protocol: el.protocol,
                                    timeStamp: el2.timeStamp,
                                    tag: el2.tag,
                                    msg: `${el2.argument}[${el2.data.parseValue}]`
                                })
                            })
                        }

                        this.Device.alarmTerminalResults(parentId)
                        this.Device.alarmTerminalResultColletion(_id)
                    } else {
                        await this.RedisService.delArgumentAlarmLog(el.mac + el.pid)
                    }
                } else {
                    await this.Device.updateTerminalResultSingle(el.mac, el.pid, _.omit(clientData, ['mac', 'pid']))
                }
            })
        }
        //
        return {
            code: 200
        }
    }

}