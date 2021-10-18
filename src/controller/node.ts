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
import { SocketUart } from "../service/socketUart"
import { UserService } from "../service/user"
import { alarm } from "../interface"
import axios from "axios"

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

    @Inject()
    UserService: UserService

    @Inject()
    SocketUart: SocketUart

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
    async queryData(@Body() data: Uart.queryResult) {
        
        // 同一时间只处理设备的一次结果,避免处理同一设备异步之间告警错误提醒
        if (data.mac && !await this.RedisService.hasParseSet(data.mac + data.pid)) {
            // 标记数据正在处理
            this.RedisService.setParseSet(data.mac + data.pid)
            {
                // 如果数据设备状态不在线,设置在线
                this.Device.getStatTerminalDevs(data.mac, data.pid).then(els => {
                    if (!els) {
                        // 设置
                        this.Device.setStatTerminalDevs(data.mac, data.pid, true)
                        this.SocketUser.sendMacUpdate(data.mac)
                    }
                })
                // 保存每个终端使用的数字节数
                // 保存每个查询指令使用的字节，以天为单位
                this.Logs.incUseBytes(data.mac, new Date(data.time).toLocaleDateString(), data.useBytes)
                this.RedisService.addQueryTerminaluseTime(data.mac, data.pid, data.useTime)
            }

            // 处理数据
            const parse = await this.ProtocolParse.parse(data)

            // 数据转发配置
            {
                this.UserService.getBindMacUser(data.mac).then(async user => {
                    if (user) {
                        const { proxy } = await this.UserService.getUser(user)
                        if (proxy) {
                            axios.post(proxy, {
                                mac: data.mac,
                                timestamp: data.timeStamp,
                                data: parse
                            }).catch(_ => {
                                console.error(
                                    {
                                        msg: "proxy Error",
                                        mac: data.mac,
                                        user,
                                        proxy
                                    }
                                );

                            })
                        }
                    }
                })
            }

            // 如果设备有用户绑定则进入检查流程

            const { a, r } = await this.check(data, parse)

            // 发送数据更新消息
            this.SocketUser.sendMacDateUpdate(data.mac, data.pid)

            {
                const alarmTag = await this.RedisService.hasArgumentAlarmLog(data.mac + data.pid)

                if (a.length > 0) {
                    // 如果没有告警标记
                    if (!alarmTag) {
                        // 添加告警标志
                        await this.RedisService.addArgumentAlarmLog(data.mac + data.pid)
                        // 发送告警
                        this.Alarm.argumentAlarm(data.mac, data.pid, a)
                        // 迭代告警信息,加入日志
                        this.saveResultHistory(data, parse, a.length, r).then(el => {
                            a.forEach(el2 => {
                                this.Logs.saveDataTransfinite({
                                    parentId: el._id,
                                    mac: data.mac,
                                    pid: data.pid,
                                    devName: data.mountDev,
                                    protocol: data.protocol,
                                    timeStamp: el2.timeStamp,
                                    tag: el2.tag,
                                    msg: `${el2.argument}[${el2.data.parseValue}]`
                                }).then(el => {
                                    this.SocketUser.sendMacAlarm(data.mac, el as any)
                                })
                            })
                        })

                    } else {
                        this.saveResultHistory(data, parse, a.length, r)
                    }
                }
                // 如果有告警标志,清除告警标识并发送恢复提醒
                else {
                    if (alarmTag) {
                        await this.RedisService.delArgumentAlarmLog(data.mac + data.pid)
                        this.Alarm.argumentAlarmReload(data.mac, data.pid)
                    }
                    this.saveResultHistory(data, parse, a.length, r)
                }
            }
            // 清除标记
            this.RedisService.delParseSet(data.mac + data.pid)
        } else {
            // console.log({ time: new Date().toLocaleString(), data: data.mac, stat: await this.RedisService.getClient().keys("parseSet*") });
        }
        return {
            code: 200
        }

    }

    // 检查数据
    async check(data: Uart.queryResult, parse: Uart.queryResultArgument[]) {
        const a: alarm[] = []
        const r: Uart.queryResultArgument[] = []
        // 获取设备用户
        const user = await this.UserService.getBindMacUser(data.mac)
        // 获取协议指令条数
        const instructLen = (await this.Device.getProtocol(data.protocol)).instruct.map(data => data.formResize.length).reduce((pre, cur) => pre + cur)

        /**
         * 检查的必要条件
         * 1,需要有用户
         * 2,没有未处理的告警记录
         * 3,解析结果数量和协议解析数量需要一致
         */
        await this.Device.updateTerminalResultSingle(data.mac, data.pid, _.omit({ ...data, result: parse }, ['mac', 'pid']))
        if (user && parse.length === instructLen) {

            const { alarm, result } = await this.ProtocolCheck.check(user, data, parse)
            // 如果有告警
            if (alarm.length > 0) {
                a.push(...alarm)
                r.push(...result)
                // 写入到单例数据库
                await this.Device.updateTerminalResultSingle(data.mac, data.pid, { result })
            }

            //判断数据间隔时间大于30秒
            if (data.Interval > 3e4) {
                this.SocketUart.setTerminalMountDevCache(data.mac)
            }

        }
        return { a, r }
    }

    /**
     * 保存历史数据
     * @param data 
     * @param parse 
     * @param a 
     * @param r 
     * @returns 
     */
    async saveResultHistory(data: Uart.queryResult, parse: Uart.queryResultArgument[], a: number, r: Uart.queryResultArgument[]) {
        // 异步保存设备数据
        const { _id: parentId } = await this.Device.saveTerminalResults({ contents: data.contents.map(data => ({ content: data.content, data: data.buffer.data })) } as any)
        const { _id } = await this.Device.saveTerminalResultColletion({ ...data, parentId, result: r.length > 0 ? r : parse, hasAlarm: a } as any)
        // 单例中的parentId只具备参考意义,可能不准确
        this.Device.updateTerminalResultSingle(data.mac, data.pid, { parentId })
        return { parentId, _id }
    }

}