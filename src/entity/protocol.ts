import { modelOptions, prop, Ref } from '@typegoose/typegoose';
import { Schema } from 'mongoose';

class Devprotocol {
  @prop({ enum: [485, 232], default: 485 })
  public Type: number;

  @prop()
  public Protocol: string;
}

/**
 * 设备信息
 */
@modelOptions({ schemaOptions: { collection: 'device.types' } })
export class DevType {
  @prop()
  public Type!: string;

  @prop()
  public DevModel!: string;

  @prop({ type: () => Devprotocol })
  public Protocols: Devprotocol[];
}

class formResize {
  @prop()
  public name: string;

  @prop()
  public enName?: string;

  @prop()
  public regx: string;

  @prop()
  public bl: string;

  @prop()
  public unit: string;

  @prop()
  public isState: boolean;
}

@modelOptions({
  options: { allowMixed: 0 },
})
class instruct {
  @prop()
  public name!: string; // 指令名称--GQS

  @prop({ default: true })
  public isUse: boolean;

  @prop({ default: true })
  public isSplit: boolean;

  @prop({ default: false })
  // 非标协议
  public noStandard: boolean;

  @prop()
  // 前处理脚本
  public scriptStart: string;

  @prop()
  // 后处理脚本
  public scriptEnd: string;

  @prop({ type: Schema.Types.Mixed })
  public resultType: Uart.characterType; // 怎么格式化返回结果

  @prop({ default: false })
  public shift: boolean; // 结果是否需要去除头部符号

  @prop({ default: 1 })
  public shiftNum: number; // 头部去除个数

  @prop({ default: false })
  public pop: boolean; // 结果是否需要去除尾部部符号

  @prop({ default: 1 })
  public popNum: number; // 尾部去除个数

  @prop()
  public resize: string;

  // 分割结果 [["power","1-5"，1]]代表第一和第五个字符是结果，倍率为1不修改结果，否则结果×倍率
  @prop({ type: () => formResize, _id: false })
  public formResize: formResize[];
}

/**
 * 协议信息
 */
@modelOptions({ schemaOptions: { collection: 'device.protocols' } })
export class Protocols {
  @prop({ enum: [485, 232] })
  public Type!: number;

  @prop({ unique: true })
  public Protocol!: string;

  @prop({ enum: ['ups', 'air', 'em', 'th', 'io'] })
  public ProtocolType!: string;

  @prop({ type: () => instruct })
  public instruct: instruct[];

  @prop()
  public remark: string
}

/**
 * 各个类型设备的常量
 */
class Constant {
  @prop()
  public WorkMode: string;

  @prop()
  public Switch: string;
  // air
  //热通道温度

  @prop()
  public HeatChannelTemperature: string;

  @prop()
  public HeatChannelHumidity: string;

  @prop()
  //冷通道湿度
  public ColdChannelTemperature: string;

  @prop()
  public ColdChannelHumidity: string;

  @prop()
  //制冷温度
  public RefrigerationTemperature: string;

  @prop()
  public RefrigerationHumidity: string;

  @prop()
  // 风速
  public Speed: string;
  //制热模式
  /* HeatModel: string
    ColdModel: string
    //除湿
    Dehumidification: string
    // 加湿
    Humidification: string */

  //th

  @prop({ type: String })
  public Temperature: string;

  @prop({ type: String })
  public Humidity: string;
  // ups

  @prop({ type: String })
  public UpsStat: string[];

  @prop({ type: String })
  public BettyStat: string[];

  @prop({ type: String })
  public InputStat: string[];

  @prop({ type: String })
  public OutStat: string[];
  // EM

  @prop({ type: String })
  public battery: string;

  @prop({ type: String })
  public voltage: string[];

  @prop({ type: String })
  public current: string[];

  @prop({ type: String })
  public factor: string[];
  // IO

  @prop({ type: String })
  public di: string[];

  @prop({ type: String })
  public do: string[];
}

/**
 * 告警阈值约束
 */
class Threshold {
  @prop()
  public name: string;

  @prop()
  public min: number;

  @prop()
  public max: number;
}

/**
 * 协议对应操作指令
 */
class OprateInstruct {
  @prop()
  public name: string;

  @prop()
  public value: string;

  @prop({ default: '1' })
  public bl: string;

  @prop()
  public readme: string;

  @prop()
  public tag: string;
}

/**
 * 设备告警状态约束
 */
class AlarmStat {
  @prop()
  public name: string;

  @prop()
  public value: string;

  @prop()
  public unit: string;

  @prop({ type: String })
  public alarmStat: string[];
}

/**
 * 协议对应的约束配置
 */
@modelOptions({ schemaOptions: { collection: 'device.constants' } })
export class DevConstant {
  @prop()
  public Protocol: string;

  @prop()
  public ProtocolType: string;

  @prop({ type: Constant })
  public Constant: Ref<Constant>;

  @prop({ type: () => Threshold, _id: false })
  public Threshold: Ref<Threshold>[];

  @prop({ type: () => AlarmStat, _id: false })
  public AlarmStat: Ref<AlarmStat>[];

  @prop({ type: String })
  public ShowTag: string[];

  @prop({ type: () => OprateInstruct, _id: false })
  public OprateInstruct: Ref<OprateInstruct>[];
}

class alias {
  @prop()
  public name: string;

  @prop()
  public alias: string;
}

/**
 * 相同设备下的参数字段别名
 */
@modelOptions({ schemaOptions: { collection: 'device.argumentalias' } })
export class DevArgumentAlias {
  @prop()
  public mac: string;

  @prop()
  public pid: number;

  @prop()
  public protocol: string;

  @prop({ type: () => alias })
  public alias: alias[];
}
