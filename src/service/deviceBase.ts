/* eslint-disable no-case-declarations */
import { Provide } from '@midwayjs/decorator';
import { Types } from 'mongoose';
import {
  NodeClient,
  NodeRunInfo,
  registerDev,
  RegisterTerminal,
  Terminal,
  TerminalClientResult,
  TerminalClientResults,
  TerminalClientResultSingle,
} from '../entity/node';
import {
  DevArgumentAlias,
  DevConstant,
  DevType,
  Protocols,
} from '../entity/protocol';
import { filter } from '../interface';
import { UserAlarmSetup, UserBindDevice } from '../entity/user';
import {
  UartTerminalDataTransfinite,
  Terminals,
  UseBytes,
  DtuBusy,
} from '../entity/log';
import { getModelForClass } from '@typegoose/typegoose';
import { getModel } from '../util/base';

/**
 * 获取设备协议等相关数据的逻辑
 */
@Provide()
export class Device {
  /**
   * 获取all终端
   * @returns
   */
  async getTerminals(filter: filter<Uart.Terminal> = {}) {
    return await getModel(Terminal).find({}, filter).lean();
  }

  /* getTerminal(macs: string, filter: filter<Uart.Terminal>): Promise<DocumentDefinition<DocumentType<Terminal>>>
    getTerminal(macs: string[], filter: filter<Uart.Terminal>): Promise<DocumentDefinition<DocumentType<Terminal>>[]> */

  /**
   * 获取指定终端
   * @param macs
   * @returns
   */
  async getTerminal<T extends string | string[]>(
    macs: T,
    filter: filter<Uart.Terminal> = { _id: 0 }
  ): Promise<T extends string ? Terminal : Terminal[]> {
    const model = getModel(Terminal);
    if (typeof macs === 'string') {
      return await model
        .findOne(
          { $or: [{ DevMac: macs }, { 'mountDevs.bindDev': macs }] },
          filter
        )
        .lean();
    } else {
      return (await model
        .find({ DevMac: { $in: macs as any } }, filter)
        .lean()) as any;
    }
  }

  /**
   * 设置指定终端
   * @param mac
   * @returns
   */
  async setTerminal(mac: string, doc: Partial<Uart.Terminal>) {
    const model = getModel(Terminal);
    return await model.updateOne({ DevMac: mac }, { $set: { ...doc } }).lean();
  }

  /**
   *
   * @returns 获取所以节点运行状态
   */
  getNodeRuns() {
    const model = getModel(NodeRunInfo);
    return model.find().lean();
  }

  /**
   * 设置节点运行信息
   * @param mac
   * @returns
   */
  async setNodeRun(NodeName: string, doc: any) {
    const model = getModel(NodeRunInfo);
    return await model
      .updateOne({ NodeName }, { $set: { ...doc } }, { upsert: true })
      .lean();
  }

  /**
   * 获取设备类型
   * @param Type
   * @returns
   */
  async getDevTypes(Type: string) {
    const model = getModelForClass(DevType);
    return await model.find({ Type }).lean();
  }

  /**
   * 获取单个协议告警配置
   * @param protocol
   */
  async getAlarmProtocol(
    protocol: string,
    filter: filter<Uart.ProtocolConstantThreshold> = { _id: 0 }
  ) {
    const model = getModel(DevConstant);
    const setup = (await model
      .findOne({ Protocol: protocol }, filter)
      .lean()) as unknown as Uart.ProtocolConstantThreshold;
    const obj: Uart.ProtocolConstantThreshold = {
      Protocol: protocol,
      ProtocolType: setup?.ProtocolType,
      ShowTag: setup?.ShowTag || [],
      Threshold: setup?.Threshold || [],
      AlarmStat: setup?.AlarmStat || [],
      Constant: setup?.Constant || ({} as any),
      OprateInstruct: setup?.OprateInstruct || [],
    };
    return obj;
  }

  /**
   * 获取all协议告警配置
   */
  async getAlarmProtocols() {
    const model = getModel(DevConstant);
    return await model.find().lean();
  }

  /**
   * 获取指定的协议
   * @param protocol
   * @returns
   */
  async getProtocol(
    protocol: string,
    filter: filter<Uart.protocol> = { _id: 0 }
  ) {
    const model = getModel(Protocols);
    return await model.findOne({ Protocol: protocol }, filter).lean();
  }

  /**
   * 获取所有协议
   * @returns
   */
  async getProtocols() {
    const model = getModel(Protocols);
    return await model.find().lean();
  }

  /**
   * 获取mac设备协议别名
   * @param mac
   * @param pid
   * @param protocol
   */
  async getProtocolAlias(mac: string, pid: number, protocol: string) {
    const model = getModel(DevArgumentAlias);
    return await model.findOne({ mac, pid, protocol }).lean();
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
  async setAlias(
    mac: string,
    pid: number,
    protocol: string,
    name: string,
    alias: string
  ) {
    const data = await this.getProtocolAlias(mac, pid, protocol);
    const model = getModel(DevArgumentAlias);
    let result;
    // $数组操作符需要查询匹配到数组数据，否则会报错误
    if (data && data.alias.findIndex(el => el.name === name) !== -1) {
      result = await model.updateOne(
        { mac, pid: Number(pid), protocol, 'alias.name': name },
        { $set: { 'alias.$.alias': alias } },
        { multi: true }
      );
    } else {
      result = await model.updateOne(
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
  async getNode(name: string) {
    const model = getModel(NodeClient);
    return await model.findOne({ $or: [{ Name: name }, { IP: name }] }).lean();
  }

  /**
   * 获取所有的节点信息
   */
  async getNodes() {
    const model = getModel(NodeClient);
    const tModel = getModel(Terminal);
    const nodes = await model.find({}).lean();
    for (const node of nodes) {
      (node as any).count = await tModel.countDocuments({
        mountNode: node.Name,
      });
      (node as any).online = await tModel.countDocuments({
        mountNode: node.Name,
        online: true,
      });
    }
    return nodes;
  }

  /**
   * 获取终端状态
   * @param mac
   */
  async getStatTerminal(mac: string) {
    const t = await getModel(Terminal)
      .findOne({ DevMac: mac }, { online: 1 })
      .lean();
    return Boolean(t?.online);
  }

  /**
   * 设置终端在线状态
   * @param mac
   * @param stat
   */
  async setStatTerminal(mac: string | string[], stat = true) {
    const macs = [mac].flat();
    await getModel(Terminal).updateMany(
      { DevMac: { $in: macs } },
      { $set: { online: stat } }
    );
    return await getModel(Terminal).updateMany(
      { DevMac: { $in: macs }, 'mountDevs.pid': { $lt: 256 } },
      { $set: { 'mountDevs.$.online': false } }
    );
  }

  /**
   * 获取终端挂载设备状态
   * @param mac
   */
  async getStatTerminalDevs(mac: string, pid: number) {
    const t = await getModel(Terminal)
      .findOne({ DevMac: mac, 'mountDevs.pid': pid }, { 'mountDevs.$': 1 })
      .lean();
    return Boolean(t?.mountDevs[0]?.online);
  }

  /**
   * 设置终端挂载设备在线状态
   * @param mac
   * @param stat
   */
  async setStatTerminalDevs(mac: string, pid: number, stat = true) {
    await getModel(Terminal).updateOne(
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
  async getMountDevInterval(mac: string) {
    const terminal = await this.getTerminal(mac, {
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
        return (await this.getProtocol(el.protocol, { instruct: 1 }))!.instruct
          .length;
      })
    );

    const { ICCID, iccidInfo } = terminal
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

    // 如果有有iccidInfo,状态开启且月流量小于500mb,修改基数,
    if (iccidInfo && iccidInfo.statu && iccidInfo.flowResource < 512000) {
      // 新的基数= 基数 * (512e3 / 流量总量 )
      // 例如月流量是30Mb=32e3,512e3/32e3 ~ 17,基数系数变更为17,则单条指令查询事件为17秒
      baseNum =
        baseNum * (parseInt(String(512000 / terminal.iccidInfo.flowResource)) + 2);
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
  async saveTerminalResults(doc: Pick<Uart.queryResult, 'contents'>) {
    return await getModel(TerminalClientResults).create(doc as any);
  }

  /**
   * 保存查询解析记录
   * @param doc
   * @returns
   */
  async saveTerminalResultColletion(doc: any) {
    return await getModel(TerminalClientResult).create(doc as any);
  }

  /**
   * 标记告警查询原始记录
   * @param id
   * @returns
   */
  async alarmTerminalResults(id: string) {
    return await getModel(TerminalClientResults)
      .updateOne({ _id: new Types.ObjectId(id) }, { $inc: { hasAlarm: 1 } })
      .lean();
  }

  /**
   * 标记告警查询解析记录
   * @param id
   * @returns
   */
  async alarmTerminalResultColletion(id: string) {
    return await getModel(TerminalClientResult)
      .updateOne({ _id: new Types.ObjectId(id) }, { $inc: { hasAlarm: 1 } })
      .lean();
  }

  /**
   * 保存查询解析记录
   * @param doc
   * @returns
   */
  async updateTerminalResultSingle(
    mac: string,
    pid: number,
    doc: Partial<Uart.queryResultSave>
  ) {
    return await getModel(TerminalClientResultSingle)
      .updateOne({ mac, pid }, { $set: { ...(doc as any) } }, { upsert: true })
      .lean();
  }

  /**
   * 添加设备协议常量配置
   * @param ProtocolType
   * @param Protocol
   * @param type
   * @param arg
   * @returns
   */
  async addDevConstent(
    ProtocolType: string,
    Protocol: string,
    type: Uart.ConstantThresholdType,
    arg: any
  ) {
    switch (type) {
      case 'Constant':
        const Constant = arg as Uart.DevConstant;
        await getModel(DevConstant).updateOne(
          { Protocol, ProtocolType },
          { $set: { Constant } },
          { upsert: true }
        );
        break;
      case 'Threshold':
        const Threshold = arg as Uart.Threshold[];
        await getModel(DevConstant).updateOne(
          { Protocol, ProtocolType },
          { $set: { Threshold } },
          { upsert: true }
        );
        break;
      case 'ShowTag':
        await getModel(DevConstant).updateOne(
          { Protocol, ProtocolType },
          { $addToSet: { ShowTag: { $each: arg as string[] } } },
          { upsert: true }
        );
        break;
      case 'AlarmStat':
        const AlarmStat = arg as Uart.ConstantAlarmStat[];
        await getModel(DevConstant).updateOne(
          { Protocol, ProtocolType },
          { $set: { AlarmStat } },
          { upsert: true }
        );
        break;
      case 'Oprate' as any:
      case 'OprateInstruct':
        const OprateInstruct = arg as Uart.OprateInstruct[];
        await getModel(DevConstant).updateOne(
          { Protocol, ProtocolType },
          { $set: { OprateInstruct } },
          { upsert: true }
        );
        break;
    }

    // 获取所有配置有此协议的用户,迭代更新缓存
    if (type === 'AlarmStat' || type === 'Threshold') {
      return (
        await getModel(UserAlarmSetup)
          .find({ 'ProtocolSetup.Protocol': Protocol }, { user: 1 })
          .lean()
      ).map(el => el.user);
    } else {
      return [];
    }
  }

  /**
   * 删除协议
   * @param protocol
   */
  async deleteProtocol(protocol: string) {
    const ps = await getModel(DevType)
      .find({ 'Protocols.Protocol': protocol }, { DevModel: 1 })
      .lean();
    if (ps.length > 0) {
      return ps.map(el => el.DevModel);
    } else {
      await getModel(Protocols).deleteOne({ Protocol: protocol });
      await getModel(DevConstant).deleteOne({ Protocol: protocol });
      await getModel(UserAlarmSetup).updateMany(
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
  async updateProtocol(protocol: Uart.protocol) {
    const { Protocol, ProtocolType, instruct } = protocol;
    return await getModel(Protocols).updateOne(
      { Protocol, ProtocolType },
      { $set: { instruct } }
    );
  }

  /**
   * 更新协议字段
   * @param protocol
   */
  async modifyProtocol(Protocol: string, data: Partial<Uart.protocol>) {
    return await getModel(Protocols)
      .updateOne({ Protocol }, { $set: { ...data } })
      .lean();
  }

  /**
   * 设置协议
   * @param Type
   * @param ProtocolType
   * @param Protocol
   * @param instruct
   * @returns
   */
  setProtocol(
    Type: number,
    ProtocolType: string,
    Protocol: string,
    instruct: Uart.protocolInstruct[]
  ) {
    return getModel(Protocols)
      .updateOne(
        { Type, Protocol },
        { $set: { ProtocolType, instruct } },
        { upsert: true }
      )
      .lean();
  }

  /**
   * 获取所有设备类型
   * @returns
   */
  DevTypes() {
    return getModel(DevType).find().lean();
  }

  /**
   * 获取指定设备类型
   * @returns
   */
  DevType(DevModel: string) {
    return getModel(DevType).findOne({ DevModel }).lean();
  }

  /**
   * 添加设备类型
   * @param Type
   * @param DevModel
   * @param Protocols
   * @returns
   */
  async addDevType(
    Type: string,
    DevModel: string,
    Protocols: Pick<Uart.protocol, 'Type' | 'Protocol'>[]
  ) {
    return await getModel(DevType)
      .updateOne(
        { Type, DevModel },
        {
          $set: {
            Protocols: Protocols.map(el => ({
              Protocol: el.Protocol,
              Type: el.Type,
            })) as any,
          },
        },
        { upsert: true }
      )
      .lean();
  }

  /**
   * 删除设备类型
   */
  async deleteDevModel(DevModel: string) {
    const terminals = await getModel(Terminal)
      .find({ 'mountDevs.mountDev': DevModel }, { DevMac: 1 })
      .lean();
    if (terminals.length > 0) {
      return terminals.map(el => el.DevMac);
    } else {
      await getModel(DevType).deleteOne({ DevModel }).lean();
      return [];
    }
  }

  /**
   * 添加登记设备
   * @param DevMac
   * @param mountNode
   * @returns
   */
  async addRegisterTerminal(DevMac: string, mountNode: string) {
    await getModel(RegisterTerminal).updateOne(
      { DevMac },
      { $set: { mountNode } },
      { upsert: true }
    );
    return getModel(Terminal)
      .updateOne(
        { DevMac },
        { $set: { mountNode, name: DevMac } },
        { upsert: true }
      )
      .lean();
  }

  /**
   * 删除登记设备
   */
  async deleteRegisterTerminal(DevMac: string) {
    const terminal = await getModel(UserBindDevice)
      .findOne({ UTs: DevMac }, { user: 1 })
      .lean();
    if (terminal) {
      return {
        code: 0,
        data: terminal.user,
      };
    } else {
      return {
        code: 200,
        data: {
          TerminalClientResult: await getModel(TerminalClientResult)
            .deleteMany({ mac: DevMac })
            .lean(),
          TerminalClientResults: await getModel(TerminalClientResults)
            .deleteMany({ mac: DevMac })
            .lean(),
          TerminalClientResultSingle: await getModel(TerminalClientResultSingle)
            .deleteMany({ mac: DevMac })
            .lean(),
          Terminal: await getModel(Terminal).deleteOne({ DevMac }).lean(),
          LogUartTerminalDataTransfinite: await getModel(
            UartTerminalDataTransfinite
          )
            .deleteMany({ mac: DevMac })
            .lean(),
          LogTerminals: await getModel(Terminals)
            .deleteMany({ TerminalMac: DevMac })
            .lean(),
          LogUseBytes: await getModel(UseBytes)
            .deleteMany({ mac: DevMac })
            .lean(),
          RegisterTerminal: await getModel(RegisterTerminal)
            .deleteOne({ DevMac })
            .lean(),
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
  async setNode(
    Name: string,
    IP: string,
    Port: number,
    MaxConnections: number
  ) {
    return await getModel(NodeClient)
      .updateOne(
        { Name },
        { $set: { IP, Port, MaxConnections } },
        { upsert: true }
      )
      .lean();
  }

  /**
   * 删除节点
   */
  async deleteNode(Name: string) {
    const ter = await getModel(Terminal)
      .find({ mountNode: Name }, { DevMac: 1 })
      .lean();
    if (ter.length > 0) {
      return ter.map(el => el.DevMac);
    } else {
      await getModel(NodeClient).deleteOne({ Name }).lean();
      return [];
    }
  }

  /**
   * 查询注册终端设备的节点
   * @param DevMac
   * @returns
   */
  async RegisterTerminal(DevMac: string) {
    return await getModel(RegisterTerminal).findOne({ DevMac }).lean();
  }

  /**
   * 查询所有终端
   */
  async RegisterTerminals() {
    return await getModel(RegisterTerminal).find().lean();
  }

  /**
   * 获取设备原始数据
   * @param start
   * @param end
   * @param id
   * @returns
   */
  async ClientResults(start?: number, end?: number, id?: Types.ObjectId) {
    const model = getModel(TerminalClientResults);
    if (id) {
      return [await model.findOne({ _id: id })];
    } else {
      return await model.find({ timeStamp: { $lte: end, $gte: start } }).lean();
    }
  }

  /**
   * 获取设备解析数据
   * @param start
   * @param end
   * @param id
   * @returns
   */
  async ClientResult(start?: number, end?: number, id?: Types.ObjectId) {
    const model = getModel(TerminalClientResult);
    if (id) {
      return [await model.findOne({ _id: id })];
    } else {
      return await model.find({ timeStamp: { $lte: end, $gte: start } }).lean();
    }
  }

  /**
   * 获取设备单例数据
   * @returns
   */
  ClientResultSingle() {
    return getModel(TerminalClientResultSingle).find().lean();
  }

  /**
   * 注册设备
   * @param data
   */
  addRegisterDev(doc: Uart.registerDev) {
    return getModel(registerDev).create(doc);
  }

  /**
   * 获取指定注册设备
   * @param id
   * @returns
   */
  getRegisterDev(id: string) {
    return getModel(registerDev).findOne({ id }).lean();
  }

  /**
   * 删除指定注册设备
   * @param id
   * @returns
   */
  async delRegisterDev(id: string) {
    return await getModel(registerDev).deleteOne({ id }).lean();
  }

  /**
   * 获取指定所有设备
   * @returns
   */
  getRegisterDevs() {
    return getModel(registerDev).find().lean();
  }

  /**
   * 初始化设备
   * @param mac
   */
  async initTerminal(mac: string) {
    const a = Date.now();
    await getModel(UseBytes).deleteMany({ mac });
    await getModel(UartTerminalDataTransfinite).deleteMany({ mac });
    await getModel(Terminals).deleteMany({ mac });
    await getModel(DtuBusy).deleteMany({ mac });
    await getModel(DevArgumentAlias).deleteMany({ mac });
    await getModel(TerminalClientResult).deleteMany({ mac });
    await getModel(TerminalClientResultSingle).deleteMany({ mac });
    await getModel(TerminalClientResultSingle).deleteOne({ mac });
    await getModel(Terminal).updateOne(
      { DevMac: mac },
      { $set: { mountDevs: [], name: mac } }
    );
    return Date.now() - a;
  }
}
