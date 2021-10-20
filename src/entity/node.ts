import { Prop, modelOptions, prop } from '@typegoose/typegoose';

/**
 * 友情链接
 */
@modelOptions({ schemaOptions: { timestamps: true } })
export class LinkFrend {
  @Prop()
  public name: string;

  @Prop()
  public link: string;
}

/**
 * 节点信息
 */
@modelOptions({ schemaOptions: { collection: 'node.clients' } })
export class NodeClient {
  @prop()
  public Name: string;

  @prop()
  public IP: string;

  @prop()
  public Port: number;

  @prop({ default: 0 })
  public MaxConnections: number;
}

/**
 * 节点websocket设备
 */
@modelOptions({ schemaOptions: { collection: 'terminal.websocketinfos' } })
export class WebSocketTerminal {
  @prop()
  public mac: string;

  @prop()
  public port: number;

  @prop()
  public ip: string;

  @prop()
  public jw: string;

  @prop()
  public uart: string;

  @prop({ default: false })
  public AT: boolean;

  @prop()
  public ICCID: string;

  @prop()
  public connecting: boolean;

  @prop()
  public lock: boolean;

  @prop()
  public PID: string;

  @prop()
  public ver: string;

  @prop()
  public Gver: string;

  @prop()
  public iotStat: string;
}

/**
 * 节点状态流
 */
@modelOptions({ schemaOptions: { collection: 'node.runinfos' } })
export class NodeRunInfo {
  @prop({ default: new Date() })
  public updateTime: Date;

  @prop()
  public hostname: string;

  @prop()
  public totalmem: string;

  @prop()
  public freemem: string;

  @prop({ type: Number })
  public loadavg: number[];

  @prop()
  public type: string;

  @prop()
  public uptime: string;

  @prop()
  public NodeName: string;

  @prop()
  public Connections: number;

  @prop({ type: () => [WebSocketTerminal] })
  public SocketMaps: WebSocketTerminal[];
}

/* @modelOptions({ options: { allowMixed: 0 } })
class buffer {
    @prop()
    public type: string

    @prop({ type: Number })
    public data: number[]
} */

class content {
  @prop()
  public content: string;

  /* @prop()
    public buffe: buffer */

  @prop({ type: Number })
  public data: number[];
}

/**
 * 终端设备上传数据=>原始数据
 */
@modelOptions({ schemaOptions: { collection: 'client.results' } })
export class TerminalClientResults {
  /* @prop({ min: 0, max: 255, default: 0 })
    public pid: number

    @prop()
    public mac: string

    @prop()
    public protocol: string

    @prop()
    public useTime: number

    @prop({ index: true })
    public timeStamp: number
    */

  @prop({ type: () => content, _id: false })
  public contents: content[];
}

class result {
  @prop({ index: true })
  public name: string;

  @prop()
  public value: string;

  @prop()
  public parseValue: string;

  @prop({ default: false })
  public alarm?: boolean;

  @prop()
  public unit: string;

  @prop({ default: false })
  public issimulate: boolean;
}

class saveResult {
  @prop({ index: true })
  public name: string;

  @prop()
  public value: string;

  @prop()
  public parseValue: string;

  /* @prop({ default: false })
    public alarm?: boolean

    @prop()
    public unit: string

    @prop({ default: false })
    public issimulate: boolean */
}

/**
 * 终端设备上传数据=>解析数据集合
 */
@modelOptions({ schemaOptions: { collection: 'client.resultcolltions' } })
export class TerminalClientResult {
  @prop({ type: () => saveResult, _id: false })
  public result: saveResult[];

  @prop({ index: true, type: Number })
  public timeStamp: number;

  @prop({ index: true })
  public pid: number;

  @prop({ index: true })
  public mac: string;

  @prop()
  public useTime: number;

  @prop()
  public parentId: string;
  // 是否包含告警记录

  @prop({ index: true, default: 0 })
  public hasAlarm: number;
}

/**
 * 终端设备上传数据=>解析数据单例
 */
@modelOptions({ schemaOptions: { collection: 'client.resultsingles' } })
export class TerminalClientResultSingle {
  @prop({ type: () => result, _id: false })
  public result: result[];

  @prop({ index: true })
  public pid: number;

  @prop({ index: true })
  public mac: string;

  @prop()
  public time: string;

  @prop()
  public Interval: number;

  @prop()
  public useTime: number;

  @prop()
  public parentId: string;
}

/**
 * 注册终端列表
 */
@modelOptions({ schemaOptions: { collection: 'terminal.registers' } })
export class RegisterTerminal {
  @prop({ uppercase: true })
  public DevMac!: string;

  @prop()
  public bindDev?: string;

  @prop()
  public mountNode!: string;

  @prop({ default: Date.now() })
  public timeStamp?: number;
}

class mountDev {
  @prop()
  public Type!: string;

  @prop()
  public mountDev!: string;

  @prop()
  public protocol!: string;

  @prop({ default: 0 })
  public pid!: number;

  @prop({ default: false })
  public online?: boolean;

  @prop({ unique: true, sparse: true, required: false })
  public bindDev?: string;
}

class iccidInfo {
  /**
   * 状态
   */
  @prop({ default: false })
  public statu: boolean;
  /**
   * 语音套餐总量，以分钟为单位
   */
  @prop()
  public voiceTotal: number;
  /**
   * 	资源失效日期
   */
  @prop()
  public expireDate: string;
  /**
   * 资源名称
   */
  @prop()
  public resName: string;
  /**
   * 资源类型编码。6700001代表流量
   */
  @prop()
  public resourceType: string;
  /**
   * 资源使用量，流量单位为KB
   */
  @prop()
  public flowUsed: number;
  /**
   * 资源剩余量，流量单位为KB
   */
  @prop()
  public restOfFlow: number;
  /**
   * 短信使用量。以条为单位
   */
  @prop()
  public smsUsed: number;
  /**
   * 资源生效日期
   */
  @prop()
  public validDate: string;
  /**
   * 语音使用量，以分钟为单位
   */
  @prop()
  public voiceUsed: number;
  /**
   * 资源总量 ，流量单位为KB
   */
  @prop()
  public flowResource: number;
}

/**
 * 终端列表
 */
@modelOptions({ schemaOptions: { collection: 'terminals' } })
export class Terminal {
  @prop({ uppercase: true })
  public DevMac!: string;

  @prop()
  public name!: string;

  @prop()
  public ip: string;

  @prop()
  public port: number;

  @prop()
  public jw: string;

  @prop()
  public uart: string;

  @prop({ default: false })
  public AT: boolean;

  @prop()
  public ICCID: string;

  @prop()
  public connecting: boolean;

  @prop()
  public lock: boolean;

  @prop()
  public PID: string;

  @prop()
  public ver: string;

  @prop()
  public Gver: string;

  @prop()
  public iotStat: string;

  @prop({ default: false })
  public online: boolean;

  @prop({ default: false })
  public disable: boolean;

  @prop({ default: new Date() })
  public uptime: Date;

  @prop()
  public mountNode!: string;

  @prop({ type: mountDev, _id: false, default: [] })
  public mountDevs: mountDev[];

  @prop({ type: iccidInfo, _id: false })
  public iccidInfo: iccidInfo;
}

/**
 * 注册设备
 */
@modelOptions({ schemaOptions: { collection: 'dev.register' } })
export class registerDev extends mountDev {
  @prop({ unique: true, index: true, required: true, trim: true })
  public id!: string;

  @prop({ default: Date.now() })
  public timeStamp?: number;
}
