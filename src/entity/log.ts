import { modelOptions, prop, Ref } from "@typegoose/typegoose"
import { Schema } from "mongoose"



class smssendParams {
    @prop()
    public SignName: string

    @prop()
    public TemplateCode: string

    @prop()
    public TemplateParam: string
}

class Success {
    @prop()
    public Message: string

    @prop()
    public RequestId: string

    @prop()
    public BizId: string

    @prop()
    public Code: string
}
/**
 * v发送短信记录
 */
@modelOptions({ schemaOptions: { collection: "log.smssends" }, options: { allowMixed: 0 } })
export class SmsSend {
    @prop({ default: Date.now() })
    public timeStamp?: number

    @prop()
    public tels: string

    @prop()
    public sendParams: Ref<smssendParams>

    @prop()
    public Success: Ref<Success>

    @prop({ type: Schema.Types.Mixed })
    public Error: any
}


class mailsendParams {
    @prop()
    public from: string

    @prop()
    public to: string

    @prop()
    public subject: string

    @prop()
    public html: string
}

/**
 * 邮件发送记录
 */
@modelOptions({ schemaOptions: { collection: 'log.mailsends' }, options: { allowMixed: 0 } })
export class MailSend {
    @prop({ default: Date.now() })
    public timeStamp?: number

    @prop()
    public mails: string[]

    @prop()
    public sendParams: Ref<mailsendParams>

    @prop({ type: Schema.Types.Mixed })
    public Success: any

    @prop({ type: Schema.Types.Mixed })
    public Error: any
}

/**
 * 设备参数超限记录
 */
@modelOptions({ schemaOptions: { collection: 'log.uartterminaldatatransfinites' } })
export class UartTerminalDataTransfinite {
    @prop({ default: Date.now() })
    public timeStamp?: number

    @prop()
    public parentId: string

    @prop()
    public type: string

    @prop()
    public mac: string

    @prop()
    public devName: string

    @prop()
    public pid: number

    @prop()
    public protocol: string

    @prop()
    public tag: string

    @prop()
    public msg: string

    @prop({ default: false })
    public isOk: boolean
}

/**
 * 记录用户的所有操作
 */
@modelOptions({ schemaOptions: { collection: 'log.userrequsts' }, options: { allowMixed: 0 } })
export class UserRequst {
    @prop({ default: Date.now() })
    public timeStamp?: number

    @prop()
    public user: string

    @prop()
    public userGroup: string

    @prop()
    public type: string

    @prop({ type: Schema.Types.Mixed })
    public argument: any
}

/**
 * 记录用户登陆注册相关
 */
@modelOptions({ schemaOptions: { collection: 'log.userlogins' } })
export class UserLogin {
    @prop({ default: Date.now() })
    public timeStamp?: number

    @prop()
    public user: string

    @prop()
    public type: string

    @prop()
    public address: string

    @prop()
    public msg: string
}

/**
 * 节点事件
 */
@modelOptions({ schemaOptions: { collection: 'log.nodes' } })
export class Nodes {
    @prop({ default: Date.now() })
    public timeStamp?: number

    @prop()
    public ID: string

    @prop()
    public IP: string

    @prop()
    public Name: string

    @prop()
    public type: string
}

/**
 * 终端事件
 */
@modelOptions({ schemaOptions: { collection: 'log.terminals' }, options: { allowMixed: 0 } })
export class Terminals {
    @prop({ default: Date.now() })
    public timeStamp?: number

    @prop()
    public NodeIP: string

    @prop()
    public NodeName: string

    @prop()
    public TerminalMac: string

    @prop()
    public type: string

    @prop()
    public msg: string

    @prop({ type: Schema.Types.Mixed, })
    public query: any

    @prop({ type: Schema.Types.Mixed })
    public result: any
}

/**
 * 数据清洗
 */
@modelOptions({ schemaOptions: { collection: 'log.datacleans' } })
export class DataClean {
    @prop({ default: Date.now() })
    public timeStamp?: number


    @prop()
    public NumUartterminaldatatransfinites: string

    @prop()
    public NumUserRequst: string

    @prop()
    public NumClientresults: string

    @prop()
    public NumClientresultcolltion: string

    @prop()
    public CleanClientresultsTimeOut: string

    @prop()
    public lastDate: Date
}

/**
 * 流量每日使用量
 */
@modelOptions({ schemaOptions: { collection: 'log.usebytes' } })
export class UseBytes {
    @prop({ default: Date.now() })
    public timeStamp?: number


    @prop()
    public mac: string

    @prop()
    public date: string

    @prop()
    public useBytes: number
}

/**
 * dtu繁忙状态变更记录
 */
@modelOptions({ schemaOptions: { collection: 'log.dtubusy' } })
export class DtuBusy {
    @prop({ default: Date.now() })
    public timeStamp?: number


    @prop()
    public mac: string

    @prop()
    public stat: boolean

    @prop()
    public n: number
}

/**
 * dtu发送指令记录
 */
@modelOptions({ schemaOptions: { collection: 'log.instructquerys' }, options: { allowMixed: 0 } })
export class InstructQuery {
    @prop({ default: Date.now() })
    public timeStamp?: number


    @prop()
    public mac: string

    @prop()
    public type: number

    @prop()
    public mountDev: string

    @prop()
    public protocol: string

    @prop()
    public pid: number

    @prop({ type: String })
    public content: string[]

    @prop()
    public Interval: number
}

/**
 * 记录微信推送事件
 */
@modelOptions({ schemaOptions: { collection: 'log.wxevents' }, options: { allowMixed: 0 } })
export class WXEvent {
    @prop({ default: Date.now() })
    public timeStamp?: number


    @prop()
    /**
                * 开发者 微信号
                */
    public ToUserName: string

    @prop()
    /**
     * 发送方帐号（一个OpenID）
     */
    public FromUserName: string

    @prop()
    /**
     * 消息创建时间 （整型）
     */
    public CreateTime: string

    @prop()
    /**
     * 消息类型，event
     */
    public MsgType: string

    @prop()
    /**
     * 事件类型，VIEW
     */
    public Event: string

    @prop()
    /**
     * 事件KEY值，设置的跳转URL
     */
    public EventKey: string

    @prop()
    /**
     * 文本消息内容
     */
    public Content: string

    @prop()
    /**
     * 指菜单ID，如果是个性化菜单，则可以通过这个字段，知道是哪个规则的菜单被点击了
     */

    public MenuID: string

    @prop()
    /**
     * 扫描信息
     */
    public ScanCodeInfo: string

    @prop()
    /**
     * 扫描类型，一般是qrcode
     */
    public ScanType: string

    @prop()
    /**
     * 扫描结果，即二维码对应的字符串信息
     */
    public ScanResult: string

    @prop({ type: Schema.Types.Mixed })
    /**
     * 发送的图片信息
     */
    public SendPicsInfo: any

    @prop()
    /**
     * 发送的图片数量
     */
    public Count: number

    @prop({ type: Schema.Types.Mixed })
    /**
     * 图片列表
     */
    public PicList: any

    @prop()
    /**
     * 图片的MD5值，开发者若需要，可用于验证接收到图片
     */
    public PicMd5Sum: string

    @prop()
    /**
     * 二维码ticket
     */
    public Ticket: String
}


/**
 * 记录微信消息推送事件
 */
@modelOptions({ schemaOptions: { collection: 'log.wxsubscribeMessages' }, options: { allowMixed: 0 } })
export class wxsubscribeMessage {
    /**
     * 接收者openid
     */
    @prop()
    touser: string
    /**
     * 模板ID
     */
    @prop()
    template_id: string
    /**
     * 模板跳转链接（海外帐号没有跳转能力）
     */
    @prop()
    url?: string
    /**
     * 
     */
    @prop()
    page?: string

    /**
     * 模板数据
     */
    @prop({ type: Schema.Types.Mixed })
    public data: any


    @prop({ type: Schema.Types.Mixed })
    public result: any
}