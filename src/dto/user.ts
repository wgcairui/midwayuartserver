import { Rule, RuleType } from "@midwayjs/decorator"
import { ObjectId } from "../interface"


export class loginHash {
    @Rule(RuleType.string().required())
    user: string
}

@Rule(loginHash)
export class login extends loginHash {

    @Rule(RuleType.string().required())
    passwd: string
}

@Rule(login)
export class wplogin extends login {
    @Rule(RuleType.string())
    avanter: string

    @Rule(RuleType.string())
    openid: string

    @Rule(RuleType.string())
    unionid: string
}

export class wxlogin {
    @Rule(RuleType.string().required())
    code: string

    @Rule(RuleType.string().required().equal('e0bwU6jnO2KfIuTgBQNDVxlsy7iGtoF3A8rWpSCM5RzZ1dmYJcLHqPhXav4Ek9lIC6P4cULfktXj5Wcwa3GcCBCYRMWidUzZyJyTqu'))
    state: string
}

type Group = 'root' | 'user' | 'guest'
class token {
    @Rule(RuleType.string().required())
    user: string

    @Rule(RuleType.string().required())
    userGroup: Group

    @Rule(RuleType.string())
    type: "wp" | 'web'
}

export class Api {
    @Rule(token)
    token: token
}


@Rule(Api)
export class id extends Api {
    @Rule(RuleType.string().token())
    id: string
}

/**
 * 日期参数
 */
@Rule(Api)
export class date extends Api {
    @Rule(RuleType.string().required())
    start: string

    @Rule(RuleType.string().required())
    end: string

    getStart() {
        return new Date(this.start).getTime()
    }

    getEnd() {
        return new Date(this.end).getTime()
    }
}

/**
 * mongoId参数
 */
@Rule(Api)
export class mongoId extends Api {
    @Rule(RuleType.string())
    id?: string

    getId() {
        return this.id ? ObjectId(this.id) : null
    }
}

/**
 * mac
 */
@Rule(Api)
export class mac extends Api {
    @Rule(RuleType.string().required())
    mac: string
}

/**
 * PId
 */
@Rule(mac)
export class macPid extends mac {
    @Rule(RuleType.number().required())
    pid: number
}

@Rule(macPid)
export class terminalResults extends macPid {
    @Rule(RuleType.string().required())
    name: string

    @Rule(RuleType.string().required())
    datetime: string

    getStart() {
        return new Date(this.datetime + ' 0:0:0').getTime()
    }

    getEnd() {
        return new Date(this.datetime + ' 23:59:59').getTime()
    }
}

/**
 * 挂载设备
 */
export class mountDev {
    @Rule(RuleType.string().required())
    Type: string

    @Rule(RuleType.string().required())
    mountDev: string

    @Rule(RuleType.string().required())
    protocol: string

    @Rule(RuleType.number().required())
    pid: number

    @Rule(RuleType.string().allow())
    bindDev?: string
}

/**
 * 添加挂载设备
 */
@Rule(mac)
export class addMountDev extends mac {
    @Rule(mountDev)
    mountDev: Uart.TerminalMountDevs
}

/**
 * 修改用户设备别名
 */
@Rule(Api)
export class modifiTerminalName extends Api {
    @Rule(RuleType.string().required())
    mac: string

    @Rule(RuleType.string().required())
    name: string
}

/**
 * smsCode
 */
@Rule(Api)
export class smsCode extends Api {
    @Rule(RuleType.number().required())
    code: number
}

/**
 * 
 */
@Rule(Api)
export class alarmTels extends Api {
    @Rule(RuleType.array().items(RuleType.string()))
    tels: string[]

    @Rule(RuleType.array().items(RuleType.string()))
    mails: string[]
}

/**
 * 协议
 */
@Rule(Api)
export class protocol extends Api {
    @Rule(RuleType.string().required())
    protocol: string
}

class instructQuery {
    @Rule(RuleType.string().required())
    DevMac: string

    @Rule(RuleType.number().required())
    pid: number

    @Rule(RuleType.string().required())
    mountDev: string

    @Rule(RuleType.string().required())
    protocol: string
}

// 协议操作指令
class OprateInstruct {
    @Rule(RuleType.allow())
    name: string

    @Rule(RuleType.string().required())
    value: string

    @Rule(RuleType.allow())
    bl: string

    @Rule(RuleType.allow())
    val?: number

    @Rule(RuleType.allow())
    readme?: string

    @Rule(RuleType.allow())
    tag?: string
}

/**
 * 操作指令
 */
@Rule(Api)
export class InstructSet extends Api {
    @Rule(instructQuery)
    query: Uart.instructQueryArg

    @Rule(OprateInstruct)
    item: Uart.OprateInstruct
}

/**
 * 设置协议参数
 */
@Rule(protocol)
export class setUserSetupProtocol extends protocol {
    @Rule(RuleType.string())
    type: Uart.ConstantThresholdType

    @Rule(RuleType.allow())
    arg: any
}

/**
 * 设置协议参数别名
 */
@Rule(macPid)
export class setAlias extends macPid {
    @Rule(RuleType.string())
    protocol: string

    @Rule(RuleType.string())
    name: string

    @Rule(RuleType.string())
    alias: string
}

/**
 * 设置聚合设备
 */
@Rule(id)
export class setAggs extends id {
    @Rule(RuleType.string())
    type: string

    @Rule(RuleType.string())
    bg: string


    @Rule(RuleType.array().allow())
    Layout: Uart.AggregationLayoutNode[]
}

/**
 * add
 */
@Rule(Api)
export class addAgg extends Api {
    @Rule(RuleType.string())
    name: string

    @Rule(RuleType.array().allow())
    aggs: Uart.AggregationDev[]
}

/**
 * 
 */
@Rule(Api)
export class updateAvanter extends Api {
    @Rule(RuleType.string())
    nickName: string

    @Rule(RuleType.string())
    avanter: string
}

@Rule(mac)
export class updateJw extends mac {
    @Rule(RuleType.string())
    jw: string
}