import { Prop, modelOptions, prop, Ref } from "@typegoose/typegoose";

/**
 * 友情链接
 */
@modelOptions({ schemaOptions: { timestamps: true } })
export class LinkFrend {
    @Prop()
    public name: string

    @Prop()
    public link: string
}

/**
 * 节点信息
 */
@modelOptions({ schemaOptions: { collection: 'node.clients' } })
export class NodeClient {
    @prop()
    public Name: string

    @prop()
    public IP: string

    @prop()
    public Port: number

    @prop({ default: 0 })
    public MaxConnections: number
}

/**
 * 节点websocket设备
 */
@modelOptions({ schemaOptions: { collection: 'terminal.websocketinfos' } })
export class WebSocketTerminal {
    @prop()
    public mac: string

    @prop()
    public port: number

    @prop()
    public ip: string

    @prop()
    public jw: string

    @prop()
    public uart: string

    @prop({ default: false })
    public AT: boolean

    @prop()
    public ICCID: string

    @prop()
    public connecting: boolean

    @prop()
    public lock: boolean

    @prop()
    public PID: string

    @prop()
    public ver: string

    @prop()
    public Gver: string

    @prop()
    public iotStat: string
}

/**
 * 节点状态流
 */
@modelOptions({ schemaOptions: { collection: 'node.runinfos' } })
export class NodeRunInfo {
    @prop({ default: new Date() })
    public updateTime: Date

    @prop()
    public hostname: string

    @prop()
    public totalmem: string

    @prop()
    public freemem: string

    @prop()
    public loadavg: number[]

    @prop()
    public type: string

    @prop()
    public uptime: string

    @prop()
    public NodeName: string

    @prop()
    public Connections: number

    @prop({ type: () => [WebSocketTerminal] })
    public SocketMaps: WebSocketTerminal[]
}

class buffer {
    @prop()
    public type: string

    @prop()
    public data: number[]
}

class content {
    @prop()
    public content: string

    @prop()
    public buffe: Ref<buffer>
}

/**
 * 终端设备上传数据=>原始数据
 */
@modelOptions({ schemaOptions: { collection: 'client.result' } })
export class TerminalClientResults {
    @prop({ min: 0, max: 255, default: 0 })
    public pid: number

    @prop()
    public time: string

    @prop({ index: true })
    public timeStamp: number

    @prop()
    public mac: string

    @prop()
    public type: number

    @prop()
    public protocol: string

    @prop()
    public Interval: number

    @prop()
    public useTime: number

    @prop({ ref: () => content })
    public contents: Ref<content>[]

    @prop({ index: true, default: 0 })
    public hasAlarm: number
}


class result {
    @prop({ index: true })
    public name: string

    @prop()
    public value: string

    @prop()
    public parseValue: string

    @prop()
    public unit: string

    @prop({ default: false })
    public alarm: boolean

    @prop({ default: false })
    public issimulate: boolean
}

/**
 * 终端设备上传数据=>解析数据集合
 */
@modelOptions({ schemaOptions: { collection: "client.resultcolltions" } })
export class TerminalClientResult {
    @prop({ ref: () => result })
    public result: Ref<result>[]

    @prop({ index: true, type: Number })
    public timeStamp: number

    @prop({ index: true })
    public pid: number

    @prop({ index: true })
    public mac: string

    @prop()
    public Interval: number

    @prop()
    public useTime: number

    @prop()
    public parentId: string
    // 是否包含告警记录

    @prop({ index: true, default: 0 })
    public hasAlarm: number
}

/**
 * 终端设备上传数据=>解析数据单例
 */
@modelOptions({ schemaOptions: { collection: 'client.resultsingles' } })
export class TerminalClientResultSingle {
    @prop({ type: () => result })
    public result: Ref<result>[]


    @prop({ index: true })
    public pid: number

    @prop({ index: true })
    public mac: string

    @prop()
    public time: string

    @prop()
    public Interval: number

    @prop()
    public useTime: number

    @prop()
    public parentId: string


}

/**
 * 注册终端列表
 */
@modelOptions({ schemaOptions: { collection: 'terminal.registers' } })
export class RegisterTerminal {
    @prop()
    public DevMac!: string

    @prop()
    public mountNode!: string
}

class mountDev {

    @prop()
    public Type!: string

    @prop()
    public mountDev!: string

    @prop()
    public protocol!: string

    @prop({ default: 0 })
    public pid!: number

    @prop({ default: false })
    public online?: boolean
}

/**
 * 终端列表
 */
@modelOptions({ schemaOptions: { collection: 'terminals' } })
export class Terminal {
    @prop()
    public DevMac!: string

    @prop()
    public name!: string

    @prop()
    public ip: string

    @prop()
    public port: number

    @prop()
    public jw: string

    @prop()
    public uart: string

    @prop({ default: false })
    public AT: boolean

    @prop()
    public ICCID: string

    @prop()
    public connecting: boolean

    @prop()
    public lock: boolean

    @prop()
    public PID: string

    @prop()
    public ver: string

    @prop()
    public Gver: string

    @prop()
    public iotStat: string

    @prop({ default: false })
    public online: boolean

    @prop({ default: false })
    public disable: boolean

    @prop({ default: new Date() })
    public uptime: Date

    @prop()
    public mountNode!: string

    @prop({ type: () => mountDev, _id: false })
    public mountDevs: Ref<mountDev>[]
}

