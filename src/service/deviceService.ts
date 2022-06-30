import { Types } from 'mongoose';
import { FindFilter } from '../interface';
import {
  DevArgumentAliasEntity,
  DevConstant,
  DevConstantEntity,
  DevTypeEntity,
  DtuBusyLogEntity,
  NodeClientEntity,
  NodeRunInfoEntity,
  ProtocolInstruct,
  Protocols,
  ProtocolsEntity,
  registerDevEntity,
  RegisterTerminalEntity,
  Terminal,
  TerminalClientResult,
  TerminalEntity,
  TerminalParseDataEntity,
  TerminalParseDataSingleEntity,
  TerminalPrimavelDataEntity,
  TerminalsLogEntity,
  UartTerminalDataTransfiniteEntityLogEntity,
  UseBytesLogEntity,
  UserAlarmSetupEntity,
  UserBindDeviceEntity,
} from '../entity';
import { GetCardDetailV2 } from './newDyIotService';

/**
 * 获取all终端
 * @returns
 */
export async function getTerminals(filter: FindFilter<Terminal> = {}) {
  const docs = await TerminalEntity.find({}, filter).lean();
  return docs as any as Terminal[];
}

/**
 * 获取指定终端
 * @param macs
 * @returns
 */
export async function getTerminal<T extends string | string[]>(
  macs: T,
  filter: FindFilter<Terminal> = { _id: 0 }
): Promise<T extends string ? Terminal : Terminal[]> {
  if (typeof macs === 'string') {
    return await TerminalEntity.findOne(
      { $or: [{ DevMac: macs }, { 'mountDevs.bindDev': macs }] },
      filter
    ).lean();
  } else {
    return (await TerminalEntity.find(
      { DevMac: { $in: macs as any } },
      filter
    ).lean()) as any;
  }
}

/**
 * 设置指定终端
 * @param mac
 * @returns
 */
export async function setTerminal(mac: string, doc: Partial<Terminal>) {
  return await TerminalEntity.updateOne(
    { DevMac: mac },
    { $set: { ...doc } }
  ).lean();
}

/**
 * 更新iccid信息
 */
export async function updateIccidInfo(mac: string) {
  const {ICCID} = await getTerminal(mac)
  const Info = { statu: false, version: 'ali_2' } as Uart.iccidInfo;
  const result = await GetCardDetailV2(ICCID);
  const { Success, Data, Message } = result

  if (Success) {
    const CardInfo = Data.VsimCardInfo;
    // 已使用流量
    const flowUsed = CardInfo.PeriodAddFlow.includes('KB')
      ? Number(CardInfo.PeriodAddFlow.split('KB')[0])
      : Number(CardInfo.PeriodAddFlow.split('MB')[0]) * 1024;
    // 未使用流量
    const restOfFlow =
      Number(CardInfo.PeriodRestFlow.split('MB')[0]) * 1024;

    const iccidInfo: Uart.iccidInfo = {
      statu: true,
      expireDate: CardInfo.ExpireTime,
      resName: CardInfo.CredentialNo,
      IsAutoRecharge: CardInfo.IsAutoRecharge,
      flowResource: restOfFlow + flowUsed,
      restOfFlow,
      flowUsed,
      version: CardInfo.AliFee,
      uptime: Date.now()
    };
    Object.assign(Info, iccidInfo);
  } else {
    setTerminal(mac, {
      remark: Message,
    });
  }

  await setTerminal(mac, {
    iccidInfo: Info,
  });

  return result
}

/**
 *
 * @returns 获取所以节点运行状态
 */
export async function getNodeRuns() {
  return NodeRunInfoEntity.find().lean();
}

/**
 * 设置节点运行信息
 * @param mac
 * @returns
 */
export async function setNodeRun(NodeName: string, doc: any) {
  return await NodeRunInfoEntity.updateOne(
    { NodeName },
    { $set: { ...doc } },
    { upsert: true }
  ).lean();
}

/**
 * 获取设备类型
 * @param Type
 * @returns
 */
export async function getDevTypes(Type: string) {
  return await DevTypeEntity.find({ Type }).lean();
}

/**
 * 获取单个协议告警配置
 * @param protocol
 */
export async function getAlarmProtocol(
  protocol: string,
  filter: FindFilter<DevConstant> = { _id: 0 }
) {
  const setup = (await DevConstantEntity.findOne(
    { Protocol: protocol },
    filter
  ).lean()) as any as Uart.ProtocolConstantThreshold;
  return {
    Protocol: protocol,
    ProtocolType: setup?.ProtocolType,
    ShowTag: setup?.ShowTag || [],
    Threshold: setup?.Threshold || [],
    AlarmStat: setup?.AlarmStat || [],
    Constant: setup?.Constant || ({} as any),
    OprateInstruct: setup?.OprateInstruct || [],
  };
}

/**
 * 获取all协议告警配置
 */
export async function getAlarmProtocols() {
  return await DevConstantEntity.find().lean();
}

/**
 * 获取指定的协议
 * @param protocol
 * @returns
 */
export async function getProtocol(
  protocol: string,
  filter: FindFilter<Protocols> = { _id: 0 }
) {
  return await ProtocolsEntity.findOne({ Protocol: protocol }, filter).lean();
}

/**
 * 获取所有协议
 * @returns
 */
export async function getProtocols() {
  return await ProtocolsEntity.find().lean();
}

/**
 * 获取mac设备协议别名
 * @param mac
 * @param pid
 * @param protocol
 */
export async function getProtocolAlias(
  mac: string,
  pid: number,
  protocol: string
) {
  return await DevArgumentAliasEntity.findOne({ mac, pid, protocol }).lean();
}

/**
 * 设备设备别名
 * @param mac
 * @param pid
 * @param protocol
 * @param name
 * @param alias
 * @returns
 */
export async function setAlias(
  mac: string,
  pid: number,
  protocol: string,
  name: string,
  alias: string
) {
  const data = await getProtocolAlias(mac, pid, protocol);
  let result: any;
  // $数组操作符需要查询匹配到数组数据，否则会报错误
  if (data && data.alias.findIndex(el => el.name === name) !== -1) {
    result = await DevArgumentAliasEntity.updateOne(
      { mac, pid: Number(pid), protocol, 'alias.name': name },
      { $set: { 'alias.$.alias': alias } },
      { multi: true }
    );
  } else {
    result = await DevArgumentAliasEntity.updateOne(
      { mac, pid: Number(pid), protocol },
      { $push: { alias: { name, alias } } },
      { upsert: true }
    );
  }
  return result;
}

/**
 * 获取指定的节点信息
 * @param name 名称或ip
 */
export async function getNode(name: string) {
  return await NodeClientEntity.findOne({
    $or: [{ Name: name }, { IP: name }],
  }).lean();
}

/**
 * 获取所有的节点信息
 */
export async function getNodes() {
  const nodes = await NodeClientEntity.find({}).lean();
  return await Promise.all(
    nodes.map(async node => {
      (node as any).count = await TerminalEntity.countDocuments({
        mountNode: node.Name,
      });
      (node as any).online = await TerminalEntity.countDocuments({
        mountNode: node.Name,
        online: true,
      });
      return node;
    })
  );
}

/**
 * 获取终端状态
 * @param mac
 */
export async function getStatTerminal(mac: string) {
  const t = await TerminalEntity.findOne({ DevMac: mac }, { online: 1 }).lean();
  return Boolean(t?.online);
}

/**
 * 设置终端在线状态
 * @param mac
 * @param stat
 */
export async function setStatTerminal(mac: string | string[], stat = true) {
  const macs = [mac].flat();
  await TerminalEntity.updateMany(
    { DevMac: { $in: macs } },
    { $set: { online: stat } }
  );
  return await TerminalEntity.updateMany(
    { DevMac: { $in: macs }, 'mountDevs.pid': { $lt: 256 } },
    { $set: { 'mountDevs.$.online': false } }
  );
}

/**
 * 获取终端挂载设备状态
 * @param mac
 */
export async function getStatTerminalDevs(mac: string, pid: number) {
  const t = await TerminalEntity.findOne(
    { DevMac: mac, 'mountDevs.pid': pid },
    { 'mountDevs.$': 1 }
  ).lean();
  return Boolean(t?.mountDevs[0]?.online);
}

/**
 * 设置终端挂载设备在线状态
 * @param mac
 * @param stat
 */
export async function setStatTerminalDevs(
  mac: string,
  pid: number,
  stat = true
) {
  await TerminalEntity.updateOne(
    { DevMac: mac, 'mountDevs.pid': pid },
    { $set: { 'mountDevs.$.online': stat } }
  );
}

/**
 * 获取每个dtu下的设备预估耗时（查询间隔）时间
 * 计算方式为4G模块时间为设备指令条数*1000,其它为*500
 * 结果为基数x合计指令数量
 * @param mac dtu设备mac
 */
export async function getMountDevInterval(mac: string) {
  const terminal = await getTerminal(mac, {
    ICCID: 1,
    'mountDevs.online': 1,
    'mountDevs.protocol': 1,
    'mountDevs.pid': 1,
    iccidInfo: 1,
  });

  // 统计挂载的设备协议指令数量
  const MountDevLens = await Promise.all(
    (terminal?.mountDevs || []).map(async el => {
      // 如果设备在线则统计所有指令条数，不在线则记为1
      return (await getProtocol(el.protocol, { instruct: 1 }))!.instruct.length;
    })
  );

  const { ICCID, iccidInfo } = terminal;
  // 基数
  let baseNum = ICCID ? 1000 : 500;

  /**
   * 如果是定向卡,暂时没有流量信息,预设流量为512mb
   */
  /* if (terminal.ICCID && !terminal.iccidInfo) {
      (terminal.iccidInfo as any) = {
        statu: true,
        flowResource: 512e3,
      };
    } */

  // 如果有有iccidInfo,老版物联卡,状态开启且月流量小于500mb,修改基数,
  if (
    iccidInfo &&
    iccidInfo.statu &&
    iccidInfo.flowResource < 512000 &&
    iccidInfo.version === 'ali_1'
  ) {
    // 新的基数= 基数 * (512e3 / 流量总量 )
    // 例如月流量是30Mb=32e3,512e3/32e3 ~ 17,基数系数变更为17,则单条指令查询事件为17秒
    baseNum =
      baseNum * parseInt(String(512000 / terminal.iccidInfo.flowResource));
  }

  // 指令合计数量
  const LensCount =
    MountDevLens.length > 0 ? MountDevLens.reduce((pre, cu) => pre + cu) : 1;
  return LensCount * baseNum;
}

/**
 * 保存查询原始记录
 * @param doc
 * @returns
 */
export async function saveTerminalResults(
  doc: Pick<Uart.queryResult, 'contents'>
) {
  return await TerminalPrimavelDataEntity.create(doc);
}

/**
 * 保存查询解析记录
 * @param doc
 * @returns
 */
export async function saveTerminalResultColletion(
  doc: Partial<TerminalClientResult>
) {
  return await TerminalParseDataEntity.create(doc);
}

/**
 * 标记告警查询原始记录
 * @param id
 * @returns
 */
export async function alarmTerminalResults(id: string) {
  return await TerminalPrimavelDataEntity.updateOne(
    { _id: new Types.ObjectId(id) },
    { $inc: { hasAlarm: 1 } }
  ).lean();
}

/**
 * 标记告警查询解析记录
 * @param id
 * @returns
 */
export async function alarmTerminalResultColletion(id: string) {
  return await TerminalParseDataEntity.updateOne(
    { _id: new Types.ObjectId(id) },
    { $inc: { hasAlarm: 1 } }
  ).lean();
}

/**
 * 保存查询解析记录
 * @param doc
 * @returns
 */
export async function updateTerminalResultSingle(
  mac: string,
  pid: number,
  doc: Partial<Uart.queryResultSave>
) {
  return await TerminalParseDataSingleEntity.updateOne(
    { mac, pid },
    { $set: { ...doc } },
    { upsert: true }
  ).lean();
}

/**
 * 添加设备协议常量配置
 * @param ProtocolType
 * @param Protocol
 * @param type
 * @param arg
 * @returns
 */
export async function addDevConstent(
  ProtocolType: string,
  Protocol: string,
  type: Uart.ConstantThresholdType,
  arg: any
) {
  switch (type) {
    case 'Constant':
      {
        const Constant = arg as DevConstant;
        await DevConstantEntity.updateOne(
          { Protocol, ProtocolType },
          { $set: { Constant } },
          { upsert: true }
        );
      }
      break;
    case 'Threshold':
      {
        const Threshold = arg as Uart.Threshold[];
        await DevConstantEntity.updateOne(
          { Protocol, ProtocolType },
          { $set: { Threshold } },
          { upsert: true }
        );
      }
      break;
    case 'ShowTag':
      {
        await DevConstantEntity.updateOne(
          { Protocol, ProtocolType },
          { $addToSet: { ShowTag: { $each: arg as string[] } } },
          { upsert: true }
        );
      }
      break;
    case 'AlarmStat':
      {
        const AlarmStat = arg as Uart.ConstantAlarmStat[];
        await DevConstantEntity.updateOne(
          { Protocol, ProtocolType },
          { $set: { AlarmStat } },
          { upsert: true }
        );
      }
      break;
    case 'Oprate' as any:
    case 'OprateInstruct':
      {
        const OprateInstruct = arg as Uart.OprateInstruct[];
        await DevConstantEntity.updateOne(
          { Protocol, ProtocolType },
          { $set: { OprateInstruct } },
          { upsert: true }
        );
      }
      break;
  }

  // 获取所有配置有此协议的用户,迭代更新缓存
  if (type === 'AlarmStat' || type === 'Threshold') {
    return (
      await UserAlarmSetupEntity.find(
        { 'ProtocolSetup.Protocol': Protocol },
        { user: 1 }
      ).lean()
    ).map(el => el.user);
  } else {
    return [];
  }
}

/**
 * 删除协议
 * @param protocol
 */
export async function deleteProtocol(protocol: string) {
  const ps = await DevTypeEntity.find(
    { 'Protocols.Protocol': protocol },
    { DevModel: 1 }
  ).lean();
  if (ps.length > 0) {
    return ps.map(el => el.DevModel);
  } else {
    await ProtocolsEntity.deleteOne({ Protocol: protocol });
    await DevConstantEntity.deleteOne({ Protocol: protocol });
    await UserAlarmSetupEntity.updateMany(
      {},
      { $pull: { 'ProtocolSetup.Protocol': protocol } }
    );
    return [];
  }
}

/**
 * 根据文本内容更新协议
 * @param protocol
 */
export async function updateProtocol(protocol: Protocols) {
  const { Protocol, ProtocolType, instruct } = protocol;
  return await ProtocolsEntity.updateOne(
    { Protocol, ProtocolType },
    { $set: { instruct } }
  );
}

/**
 * 更新协议字段
 * @param protocol
 */
export async function modifyProtocol(
  Protocol: string,
  data: Partial<Protocols>
) {
  return await ProtocolsEntity.updateOne(
    { Protocol },
    { $set: { ...data } }
  ).lean();
}

/**
 * 设置协议
 * @param Type
 * @param ProtocolType
 * @param Protocol
 * @param instruct
 * @returns
 */
export async function setProtocol(
  Type: number,
  ProtocolType: string,
  Protocol: string,
  instruct: ProtocolInstruct[]
) {
  return ProtocolsEntity.updateOne(
    { Type, Protocol },
    { $set: { ProtocolType, instruct } },
    { upsert: true }
  ).lean();
}

/**
 * 获取所有设备类型
 * @returns
 */
export async function DevTypes() {
  return DevTypeEntity.find().lean();
}

/**
 * 获取指定设备类型
 * @returns
 */
export async function DevType(DevModel: string) {
  return DevTypeEntity.findOne({ DevModel }).lean();
}

/**
 * 添加设备类型
 * @param Type
 * @param DevModel
 * @param Protocols
 * @returns
 */
export async function addDevType(
  Type: string,
  DevModel: string,
  Protocols: Pick<Protocols, 'Type' | 'Protocol'>[]
) {
  return await DevTypeEntity.updateOne(
    { Type, DevModel },
    {
      $set: {
        Protocols: Protocols.map(el => ({
          Protocol: el.Protocol,
          Type: el.Type,
        })),
      },
    },
    { upsert: true }
  ).lean();
}

/**
 * 删除设备类型
 */
export async function deleteDevModel(DevModel: string) {
  const terminals = await TerminalEntity.find(
    { 'mountDevs.mountDev': DevModel },
    { DevMac: 1 }
  ).lean();
  if (terminals.length > 0) {
    return terminals.map(el => el.DevMac);
  } else {
    await DevTypeEntity.deleteOne({ DevModel }).lean();
    return [];
  }
}

/**
 * 添加登记设备
 * @param DevMac
 * @param mountNode
 * @returns
 */
export async function addRegisterTerminal(DevMac: string, mountNode: string) {
  await RegisterTerminalEntity.updateOne(
    { DevMac },
    { $set: { mountNode } },
    { upsert: true }
  );
  return TerminalEntity.updateOne(
    { DevMac },
    { $set: { mountNode, name: DevMac } },
    { upsert: true }
  ).lean();
}

/**
 * 删除登记设备
 */
export async function deleteRegisterTerminal(DevMac: string) {
  const terminal = await UserBindDeviceEntity.findOne(
    { UTs: DevMac },
    { user: 1 }
  ).lean();
  if (terminal) {
    return {
      code: 0,
      data: terminal.user,
    };
  } else {
    return {
      code: 200,
      data: {
        TerminalClientResult: await TerminalParseDataEntity.deleteMany({
          mac: DevMac,
        }).lean(),
        TerminalClientResults: await TerminalPrimavelDataEntity.deleteMany({
          mac: DevMac,
        }).lean(),
        TerminalClientResultSingle:
          await TerminalParseDataSingleEntity.deleteMany({
            mac: DevMac,
          }).lean(),
        Terminal: await TerminalEntity.deleteOne({ DevMac }).lean(),
        LogUartTerminalDataTransfinite:
          await UartTerminalDataTransfiniteEntityLogEntity.deleteMany({
            mac: DevMac,
          }).lean(),
        LogTerminals: await TerminalsLogEntity.deleteMany({
          TerminalMac: DevMac,
        }).lean(),
        LogUseBytes: await UseBytesLogEntity.deleteMany({ mac: DevMac }).lean(),
        RegisterTerminal: await RegisterTerminalEntity.deleteOne({
          DevMac,
        }).lean(),
      },
    };
  }
}

/**
 * 设置节点
 * @param Name
 * @param IP
 * @param Port
 * @param MaxConnections
 * @returns
 */
export async function setNode(
  Name: string,
  IP: string,
  Port: number,
  MaxConnections: number
) {
  return await NodeClientEntity.updateOne(
    { Name },
    { $set: { IP, Port, MaxConnections } },
    { upsert: true }
  ).lean();
}

/**
 * 删除节点
 */
export async function deleteNode(Name: string) {
  const ter = await TerminalEntity.find(
    { mountNode: Name },
    { DevMac: 1 }
  ).lean();
  if (ter.length > 0) {
    return ter.map(el => el.DevMac);
  } else {
    await NodeClientEntity.deleteOne({ Name }).lean();
    return [];
  }
}

/**
 * 查询注册终端设备的节点
 * @param DevMac
 * @returns
 */
export async function RegisterTerminal(DevMac: string) {
  return await RegisterTerminalEntity.findOne({ DevMac }).lean();
}

/**
 * 查询所有终端
 */
export async function RegisterTerminals() {
  return await RegisterTerminalEntity.find().lean();
}

/**
 * 获取设备原始数据
 * @param start
 * @param end
 * @param id
 * @returns
 */
export async function ClientResults(
  start?: number,
  end?: number,
  id?: Types.ObjectId
) {
  if (id) {
    return [await TerminalPrimavelDataEntity.findOne({ _id: id })];
  } else {
    return await TerminalPrimavelDataEntity.find({
      timeStamp: { $lte: end, $gte: start },
    }).lean();
  }
}

/**
 * 获取设备解析数据
 * @param start
 * @param end
 * @param id
 * @returns
 */
export async function ClientResult(
  start?: number,
  end?: number,
  id?: Types.ObjectId
) {
  if (id) {
    return [await TerminalParseDataEntity.findOne({ _id: id })];
  } else {
    return await TerminalParseDataEntity.find({
      timeStamp: { $lte: end, $gte: start },
    }).lean();
  }
}

/**
 * 获取设备单例数据
 * @returns
 */
export async function ClientResultSingle() {
  return TerminalParseDataSingleEntity.find().lean();
}

/**
 * 注册设备
 * @param data
 */
export async function addRegisterDev(doc: Uart.registerDev) {
  return registerDevEntity.create(doc);
}

/**
 * 获取指定注册设备
 * @param id
 * @returns
 */
export async function getRegisterDev(id: string) {
  return registerDevEntity.findOne({ id }).lean();
}

/**
 * 删除指定注册设备
 * @param id
 * @returns
 */
export async function delRegisterDev(id: string) {
  return await registerDevEntity.deleteOne({ id }).lean();
}

/**
 * 获取指定所有设备
 * @returns
 */
export async function getRegisterDevs() {
  return registerDevEntity.find().lean();
}

/**
 * 初始化设备
 * @param mac
 */
export async function initTerminal(mac: string) {
  const a = Date.now();
  await UseBytesLogEntity.deleteMany({ mac });
  await UartTerminalDataTransfiniteEntityLogEntity.deleteMany({ mac });
  await TerminalEntity.deleteMany({ mac });
  await DtuBusyLogEntity.deleteMany({ mac });
  await DevArgumentAliasEntity.deleteMany({ mac });
  await TerminalParseDataEntity.deleteMany({ mac });
  await TerminalParseDataSingleEntity.deleteMany({ mac });
  await TerminalsLogEntity.updateOne(
    { DevMac: mac },
    { $set: { mountDevs: [], name: mac } }
  );
  return Date.now() - a;
}
