
import { Provide, WSController, Inject, App, OnWSConnection, MidwayFrameworkType, OnWSMessage, WSEmit, OnWSDisConnection } from "@midwayjs/decorator"
import { Context, Application } from "@midwayjs/socketio"
import { Device } from "../service/device"
import { Logs } from "../service/log"
import { Alarm } from "../service/alarm"
import { RedisService } from "../service/redis"
import { SocketUart } from "../service/socketUart"
import { SocketUser } from "../service/socketUser"

@Provide()
@WSController('/node')
export class NodeSocket {
    @Inject()
    ctx: Context

    @Inject()
    Device: Device

    @Inject()
    log: Logs

    @Inject()
    RedisService: RedisService

    @Inject()
    SocketUart: SocketUart

    @Inject()
    SocketUser: SocketUser

    @Inject()
    Alarm: Alarm

    @App(MidwayFrameworkType.WS_IO)
    app: Application

    /**
     * 连接事件
     */
    @OnWSConnection()
    async connect() {
        const socket = this.ctx
        const ID = socket.id
        if (!this.ctx.handshake) return
        // ip由nginx代理后会变为nginx服务器的ip，重写文件头x-real-ip为远端ip
        const IP: string = socket.handshake.headers["x-real-ip"] || socket.conn.remoteAddress
        // 检查连接节点是否在系统登记
        const Node = await this.Device.getNode(/\:/.test(IP) ? IP.split(":").reverse()[0] : IP)
        if (Node) {
            // 每个连接加入到名称和ip对应的房间
            this.ctx.join([Node.Name, Node.IP])
            this.RedisService.getClient().set('sid' + ID, Node.Name)
            console.log(`new socket connect<id: ${ID},IP: ${IP},Name: ${Node.Name}>`);
            // 检查节点是否在缓存中,在的话激活旧的socket,否则创建新的socket
            this.log.saveNode({ ID, IP, type: "上线", Name: Node.Name })
            this.ctx.emit("accont")
        } else {
            console.log(`有未登记或重复登记节点连接=>${IP}，断开连接`);
            socket.disconnect()
            // 添加日志
            this.log.saveNode({ ID, IP, type: "非法连接请求", Name: 'null' })
        }
    }

    @OnWSMessage('message')
    async gotMessage(data: any) {
        console.log({ data });

    }

    /**
     * 断开事件
     * 退出指定房间,清理缓存
     */
    @OnWSDisConnection()
    async DisConnection() {
        const node = await this.SocketUart.getNode(this.ctx.id)
        if (node) {
            // 
            this.ctx.leave(node.Name)
            this.ctx.leave(node.IP)
            console.log(`${new Date().toLocaleTimeString()}## 节点：${node.Name}断开连接，清除定时操作`);
            this.ctx.disconnect();
            console.log('socket disconnected Stat:', this.ctx?.disconnected);
            const macs = (await this.Device.getTerminals({ DevMac: 1, mountNode: 1 })).filter(el => el.mountNode === node.Name).map(el => el.DevMac)
            // 批量设置终端离线
            this.Device.setStatTerminal(macs, false)
            this.SocketUart.delNodeCache(node.Name)
            // 添加日志
            this.log.saveNode({ type: "断开", ID: this.ctx.id, IP: node.IP, Name: node.Name })
            macs.forEach(mac => {
                this.log.saveTerminal({ NodeIP: node.IP, NodeName: node.Name, TerminalMac: mac, type: "节点断开" })
            })
        }
    }

    /**
     * 响应注册事件
     * @param data 
     * @returns 
     */
    @OnWSMessage('register')
    @WSEmit('registerSuccess')
    async register(data: string) {
        return await this.SocketUart.getNode(this.ctx.id)
    }

    /**
     * 节点启动失败
     * @param data 
     */
    @OnWSMessage("startError")
    async startError(data: any) {
        const node = await this.SocketUart.getNode(this.ctx.id)
        this.log.saveNode({ type: "TcpServer启动失败", ID: this.ctx.id, IP: node.IP, Name: node.Name })
    }


    /**
     * 触发报警事件
     * @param data 
     */
    @OnWSMessage("alarm")
    async alarm(data: any) {
        const node = await this.SocketUart.getNode(this.ctx.id)
        console.log(data);
        this.log.saveNode({ type: "告警", ID: this.ctx.id, IP: node.IP, Name: node.Name })
    }

    /**
     * 节点终端设备上线
     * @param data 
     * @param reline 
     */
    @OnWSMessage("terminalOn")
    async terminalOn(data: string | string[], reline = false) {
        const node = await this.SocketUart.getNode(this.ctx.id)
        if (node) {
            const date = new Date()
            this.Device.setStatTerminal(data)
            // 迭代macs,从busy列表删除,写入日志,在线记录更新
            this.Device.getTerminal(data, { DevMac: 1 }).then(els => {
                const ters = [els].flat()
                ters.forEach(async t => {
                    if (t) {
                        this.RedisService.delDtuWorkBus(t.DevMac)
                        this.SocketUser.sendMacUpdate(t.DevMac)
                        this.log.saveTerminal({ NodeIP: node.IP, NodeName: node.Name, TerminalMac: data[0], type: reline ? "重新连接" : "连接" })
                        // 如果是重连，加入缓存
                        if (reline) this.RedisService.setMacOnlineTime(t.DevMac, date)
                    }
                })
            })
            console.info(`${date.toLocaleTimeString()}##${node.Name} DTU:/${data}/ 已上线,模式:${reline}`);
        }
    }

    /**
     * 节点终端设备掉线
     * @param mac 
     * @param active 
     */
    @OnWSMessage("terminalOff")
    async terminalOff(mac: string, active: boolean) {
        const node = await this.SocketUart.getNode(this.ctx.id)
        if (node) {
            this.Device.setStatTerminal(mac, false)
            this.SocketUser.sendMacUpdate(mac)
            console.error(`${new Date().toLocaleTimeString()}##${node.Name} DTU:${mac} 已${active ? '主动' : '被动'}离线`);
            this.RedisService.delDtuWorkBus(mac)
            // 添加日志
            this.log.saveTerminal({ NodeIP: node.IP, NodeName: node.Name, TerminalMac: mac, type: active ? "dtu主动断开" : "dtu断开" })
        }
    }

    /**
     * 设备查询指令有部分超时,把dtu查询间隔+500ms
     * @param mac 
     * @param pid 
     * @param instructNum 
     */
    @OnWSMessage("instructTimeOut")
    async instructTimeOut(mac: string, pid: number, instructNum: number) {
        const node = await this.SocketUart.getNode(this.ctx.id)
        if (node) {
            console.log('部分指令超时', mac, pid, instructNum);
            this.Device.setStatTerminalDevs(mac, pid)
            this.SocketUser.sendMacUpdate(mac)
            const EX = this.SocketUart.cache.get(mac + pid)
            if (EX) EX.Interval += 500 * instructNum
        }
    }

    /**
     * 设备挂载节点查询超时,dtu所有查询指令超时
     * @param mac 
     * @param pid 
     * @param timeOut 
     */
    @OnWSMessage("terminalMountDevTimeOut")
    async terminalMountDevTimeOut(mac: string, pid: number, timeOut: number) {
        const node = await this.SocketUart.getNode(this.ctx.id)
        if (node) {
            const hash = mac + pid
            const Query = this.SocketUart.cache.get(hash)
            if (Query) {
                console.log('------全部指令超时', Query);
                // console.log(`${hash} 查询超时次数:${timeOut},查询间隔：${QueryTerminal.Interval}`);
                // 如果查询间隔小于五分钟则每次查询间隔修改为+10000
                // if (Query.Interval < 3e5) Query.Interval += 10000
                // 如果超时次数>10和短信发送状态为false
                if (timeOut > 20) {
                    this.Device.setStatTerminalDevs(mac, pid, false)
                    this.SocketUser.sendMacUpdate(mac)
                    // 把查询超时间隔修改为10分钟
                    Query.Interval = 6e5
                    console.log(`${hash} 查询超时次数:${timeOut},查询间隔：${Query.Interval}`);
                    if (!await this.RedisService.hasTimeOutMonutDevSmsSend(hash)) {
                        const terminal = await this.Device.getTerminal(mac)
                        // 发送设备查询超时短信
                        this.Alarm.timeOut(Query.TerminalMac, Query.pid, Query.mountDev, '超时', new Date())
                        // 添加短信发送记录
                        this.RedisService.addTimeOutMonutDevSmsSend(hash)
                        this.log.saveDataTransfinite({ mac, devName: terminal.name, pid: 0, protocol: '', tag: '连接', msg: `${terminal.name}/${Query.pid}/${Query.mountDev} 查询超时`, timeStamp: Date.now() })
                        this.log.saveTerminal({ NodeIP: node.IP, NodeName: node.Name, TerminalMac: mac, type: "查询超时", query: Query })

                    }
                }
            }
        }

    }

    /**
     * 接收dtu空闲状态变更,如果busy是true则把mac加入到繁忙设备列表
     * @param mac 
     * @param busy 
     * @param n 
     */
    @OnWSMessage("busy")
    async busy(mac: string, busy: boolean, n: number) {
        busy ? await this.RedisService.addDtuWorkBus(mac) : await this.RedisService.delDtuWorkBus(mac)
        this.log.saveDtuBusy({ mac, stat: busy, n, timeStamp: Date.now() })
    }

    @OnWSMessage("ready")
    async ready() {
        console.log('ready');
        // 迭代所有设备,加入缓存
        const node = await this.SocketUart.getNode(this.ctx.id)
        if (node) {
            this.SocketUart.setNodeCache(node.Name)
        }
    }

    /**
     * 监听dtu查询事件结果,转发至event
     * @param events 
     * @param result 
     */
    @OnWSMessage("deviceopratesuccess")
    @OnWSMessage("dtuopratesuccess")
    dtuOprateSuccess(events: string, result: Uart.ApolloMongoResult) {
        console.log({ events, result });

        this.SocketUart.event.emit(events, result)
    }


    /**
     * 监听设备查询事件结果,转发至event
     * @param events 
     * @param result 
     */
    /* @OnWSMessage("deviceopratesuccess")
    deviceOprateSuccess(events: string, result: Uart.ApolloMongoResult) {
        this.SocketUart.event.emit(events, result)
    } */
}