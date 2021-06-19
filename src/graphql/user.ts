import { Field, ObjectType, InputType, Int, Float } from 'type-graphql';
import {
    IsNumber,
    IsPositive,
    IsString,
    Length,
    Max,
    Min,
} from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json'



@InputType()
export class UserCreateInput {
    @Field()
    @IsString()
    @Length(2, 10)
    name!: string;
}

@InputType()
export class UserUpdateInput {
    @IsNumber()
    @IsPositive()
    @Field(type => Int)
    id!: number;

    @Field()
    @IsString()
    @Length(2, 10)
    name!: string;
}

@InputType()
export class UserPaginationInput {
    @IsNumber()
    @Min(0)
    @Field(type => Int)
    offset?: number;

    @IsNumber()
    @Min(5)
    @Max(100)
    @Field(type => Int)
    take?: number;
}

@ObjectType({ simpleResolvers: true })
export class result {
    @Field()
    msg?: string
    @Field()
    ok?: number
    @Field()
    n?: number
    @Field()
    nModified?: number
    @Field(type => GraphQLJSONObject)
    arg?: any
}

/**
 * tool节点配置
 */
@ObjectType()
export class Node {
    @Field()
    Name: string
    @Field()
    IP: string
    @Field()
    Port: number
    @Field()
    MaxConnections: string
}

/**
 * tool协议详细指令
 */
@ObjectType()
export class ProtocolInstruct {
    @Field()
    isUse: boolean
    @Field()
    isSplit: boolean
    @Field()
    noStandard: boolean
    @Field()
    scriptStart: string
    @Field()
    scriptEnd: string
    @Field()
    name: string
    @Field()
    resultType: string
    @Field()
    shift: boolean
    @Field()
    shiftNum: number
    @Field()
    pop: boolean
    @Field()
    popNum: number
    @Field()
    resize: string
    @Field(type => GraphQLJSONObject)
    formResize: any
}

/**
 * 协议集
 */
@ObjectType()
export class Protocol {
    @Field()
    Type: number
    @Field()
    Protocol: string
    @Field()
    ProtocolType: string
    @Field(type => [ProtocolInstruct])
    instruct: ProtocolInstruct[]
}

/**
 * 设备类型
 */
@ObjectType()
export class DevType {
    @Field()
    Type: string
    @Field()
    DevModel: string
    @Field(type => [Protocol])
    Protocols: Protocol[]
}

/**
 * 终端挂载的设备类型
 */
@ObjectType()
export class MountDev {
    @Field()
    Type: string
    @Field()
    online: boolean
    @Field()
    mountDev: string
    @Field()
    protocol: string
    @Field()
    pid: number
}

/**
 * 聚合设备
 */
@ObjectType()
export class aggregationDev {
    @Field()
    DevMac: string
    @Field()
    name: string
    @Field()
    Type: string
    @Field()
    mountDev: string
    @Field()
    protocol: string
    @Field()
    pid: number
}

/**
 * 聚合设备
 */
@ObjectType()
export class aggregation {
    @Field()
    user: string
    @Field()
    id: string
    @Field()
    name: string
    @Field(type => [aggregationDev])
    aggregations: aggregationDev[]
    @Field(type => GraphQLJSONObject)
    devs: any
}

/**
 * 注册终端
 */
@ObjectType()
export class RegisterTerminal {
    @Field()
    DevMac: string
    @Field()
    mountNode: string
}

/**
 * 终端
 */
@ObjectType()
export class Terminal {
    @Field()
    DevMac: string
    @Field()
    name: string
    @Field()
    ip: string
    @Field()
    port: number
    @Field()
    AT: boolean
    @Field()
    jw: string
    @Field()
    uart: string
    @Field()
    PID: string
    @Field()
    ver: string
    @Field()
    Gver: string
    @Field()
    iotStat: string
    @Field()
    ICCID: string
    @Field()
    uptime: string
    @Field()
    online: boolean
    @Field()
    mountNode: string
    @Field(type => [MountDev])
    mountDevs: [MountDev]
}

/**
 * 环控
 */
@ObjectType()
export class ECterminal {
    @Field()
    ECid: string
    @Field()
    name: string
    @Field()
    model: string
}

/**
 * 节点的socket终端数据
 */
@ObjectType()
export class NodeInfoTerminal {
    @Field()
    mac: string
    @Field()
    port: number
    @Field()
    ip: string
    @Field()
    jw: string
}

/**
 * 节点的运行状态
 */
@ObjectType()
export class NodeInfo {
    @Field()
    updateTime: string
    @Field()
    hostname: string
    @Field()
    totalmem: string
    @Field()
    freemem: string
    @Field(type => [Float])
    loadavg: number[]
    @Field()
    type: string
    @Field()
    uptime: string
    @Field()
    NodeName: string
    @Field()
    Connections: number
    @Field(type => [NodeInfoTerminal])
    SocketMaps: NodeInfoTerminal[]
}

/**
 * 用户
 * 
 */
@ObjectType()
export class User {
    @Field()
    avanter: string
    @Field()
    name: string
    @Field()
    user: string
    @Field()
    userId: string
    @Field()
    userGroup: string
    @Field()
    mail: string
    @Field()
    company: string
    @Field()
    tel: string
    @Field()
    creatTime: Date
    @Field()
    modifyTime: Date
    @Field()
    address: string
    @Field()
    status: boolean
    @Field()
    messageId: string
    @Field()
    rgtype: string
    @Field()
    wpId: string
    @Field()
    wxId: string
    @Field()
    openId: string
}

/**
 * 用户绑定的设备
 */
@ObjectType()
export class BindDevice {
    @Field()
    user: string
    @Field(type => [Terminal])
    UTs: Terminal[]
    @Field(type => [ECterminal])
    ECs: ECterminal[]
    @Field(type => [aggregation])
    AGG: aggregation[]
}

/**
 * terminalData
 */
@ObjectType()
export class terminalData {
    @Field()
    name: string
    @Field()
    value: string
    @Field()
    unit: string
    @Field()
    parseValue: string
    @Field()
    alarm: boolean
    @Field()
    alias: string
    @Field()
    issimulate: boolean
}

/**
 * 透传设备数据
 */
@ObjectType()
export class UartTerminalData {
    @Field()
    stat: string
    @Field()
    pid: number
    @Field()
    time: Date
    @Field()
    timeStamp: string
    @Field()
    mac: string
    @Field()
    type: number
    @Field()
    protocol: string
    @Field()
    content: string
    @Field(type => [terminalData])
    result: terminalData[]
    @Field()
    Interval: number
    @Field()
    useTime: number
}

/**
 * 设备常量
 */
@ObjectType()
export class Constant {
    @Field()
    WorkMode: string
    @Field()
    Switch: string
    //air
    @Field()
    HeatChannelTemperature: string
    @Field()
    HeatChannelHumidity: string
    @Field()
    ColdChannelTemperature: string
    @Field()
    ColdChannelHumidity: string
    @Field()
    RefrigerationTemperature: string
    @Field()
    RefrigerationHumidity: string
    @Field()
    Speed: string
    @Field()
    HeatModel: string
    @Field()
    ColdModel: string
    @Field()
    Dehumidification: string
    @Field()
    Humidification: string
    // th and air
    @Field()
    Temperature: string
    @Field()
    Humidity: string
    // ups
    @Field(type => [String])
    UpsStat: [string]
    @Field(type => [String])
    BettyStat: [string]
    @Field(type => [String])
    InputStat: [string]
    @Field(type => [String])
    OutStat: [string]
    // EM
    @Field()
    battery: string
    @Field(type => [String])
    voltage: [string]
    @Field(type => [String])
    current: [string]
    @Field(type => [String])
    factor: [string]
    // io
    @Field(type => [String])
    di: [string]
    @Field(type => [String])
    do: [string]
}

/**
 * 操作指令
 */
@ObjectType()
export class OprateInstruct {
    @Field()
    name: string
    @Field()
    value: string
    @Field()
    bl: string
    @Field()
    tag: string
    @Field()
    readme: string
}

/**
 * 协议告警状态
 */
@ObjectType()
export class AlarmStat {
    @Field()
    name: string
    @Field()
    value: string
    @Field()
    unit: string
    @Field(type => [String])
    alarmStat: string[]
}

/**
 * 每个协议的设备常量和阀值，显示参数
 */
@ObjectType()
export class DevConstant {
    @Field()
    Protocol: string
    @Field()
    ProtocolType: string
    @Field(type => Constant)
    Constant: Constant
    @Field(type => GraphQLJSONObject)
    Threshold: any
    @Field(type => [AlarmStat])
    AlarmStat: [AlarmStat]
    @Field(type => [String])
    ShowTag: [string]
    @Field(type => [OprateInstruct])
    OprateInstruct: [OprateInstruct]
}

/**
 * 用户自定义配置
 */
@ObjectType()
export class UserSetup {
    @Field()
    user: string
    @Field(type => [String])
    tels: [string]
    @Field(type => [String])
    mails: [string]
    @Field(type => [DevConstant])
    ProtocolSetup: [DevConstant]
}

/**
 * 日志
 */
@ObjectType()
export class LogTerminal {
    @Field()
    NodeIP: string
    @Field()
    NodeName: string
    @Field()
    TerminalMac: string
    @Field()
    type: string
    @Field()
    msg: string
    @Field(type => GraphQLJSONObject)
    query: any
    @Field(type => GraphQLJSONObject)
    result: any
    @Field()
    createdAt: Date
}

@ObjectType()
export class LayoutBind {
    @Field()
    mac: string
    @Field()
    pid: number
    @Field()
    name: string
}

/**
 * 聚合设备布局配置
 */
@ObjectType()
export class Layout {
    @Field(type => Float)
    x: number
    @Field(type => Float)
    y: number
    @Field()
    id: string
    @Field()
    name: string
    @Field()
    color: string
    @Field(type => LayoutBind)
    bind: LayoutBind
}
/**
 *  用户聚合设备
 */
@ObjectType()
export class UserLayout {
    @Field()
    user: string
    @Field()
    type: string
    @Field()
    id: string
    @Field()
    bg: string
    @Field(type => [Layout])
    Layout: [Layout]
}
