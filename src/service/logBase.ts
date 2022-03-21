import { Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { AnyParamConstructor } from '@typegoose/typegoose/lib/types';
import {
  Nodes,
  Terminals,
  UartTerminalDataTransfinite,
  DtuBusy,
  MailSend,
  UseBytes,
  WXEvent,
  InstructQuery,
  SmsSend,
  UserLogin,
  UserRequst,
  DataClean,
  wxsubscribeMessage,
} from '../entity/log';
import * as _ from 'lodash';
import { getModelForClass } from '@typegoose/typegoose';
import { getModel } from '../util/base';

/**
 * 日至操作
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class Logs {
  /**
   * 创建插入文档
   * @param cl
   * @param doc
   * @returns
   */
  creatDoc<D extends { [x: string]: any; timeStamp?: number }, T>(
    cl: AnyParamConstructor<T>,
    doc: D
  ) {
    return getModelForClass(cl).create({ ...doc, timeStamp: Date.now() });
  }

  /**
   * 保存节点操作日志
   * @param doc
   * @returns
   */
  async saveNode(doc: Uart.logNodes) {
    return await this.creatDoc(Nodes, doc); //.creatDoc(Nodes,doc);
  }

  /**
   * 保存终端操作日志
   * @param doc
   * @returns
   */
  async saveTerminal(doc: Uart.logTerminals) {
    return await this.creatDoc(Terminals, doc); //.creatDoc(Terminals,doc);
  }

  /**
   * 保存普通告警事件
   * @param doc
   * @returns
   */
  async saveDataTransfinite(doc: Uart.uartAlarmObject) {
    // this.SocketUser.sendMacAlarm(doc.mac, doc)
    return await this.creatDoc(UartTerminalDataTransfinite, doc); //.creatDoc(UartTerminalDataTransfinite,doc);
  }

  /**
   * 保存dtu工作状态变化
   * @param doc
   * @returns
   */
  async saveDtuBusy(doc: Uart.logDtuBusy) {
    return await this.creatDoc(DtuBusy, doc);
  }

  /**
   * 保存邮箱发送记录
   */
  async saveMail(doc: Uart.logMailSend) {
    return await this.creatDoc(MailSend, doc);
  }

  /**
   * 保存短信打算记录
   * @param doc
   * @returns
   */
  async saveSms(doc: Uart.logSmsSend) {
    return await this.creatDoc(SmsSend, doc);
  }

  /**
   * 保存用户请求记录
   * @param user 用户
   * @param userGroup 用户类型
   * @param type 请求类型
   * @param argument 请求参数
   * @returns
   */
  saveUserRequst(user: string, userGroup: string, type: string, argument: any) {
    return this.creatDoc(UserRequst, {
      user,
      userGroup,
      type,
      argument,
    });
  }

  /**
   * 保存清理记录
   * @param doc
   * @returns
   */
  saveClean(doc: any) {
    return this.creatDoc(DataClean, doc);
  }

  /**
   * 保存微信服务器推送
   * @param doc
   * @returns
   */
  async saveWxEvent(doc: Uart.WX.wxValidation | Uart.WX.WxEvent) {
    return await this.creatDoc(WXEvent, doc);
  }

  /**
   * 保存推送到用户的微信消息
   */
  async saveWxsubscribeMessage(
    doc: Uart.WX.wxsubscribeMessage & { result: Uart.WX.wxRequest }
  ) {
    return await this.creatDoc(wxsubscribeMessage, {
      ...doc,
      timeStamp: Date.now(),
    });
  }

  /**
   * 增加dtu流量使用记录
   * @param mac
   * @param date
   * @param useBytes
   * @returns
   */
  async incUseBytes(mac: string, date: string, useBytes: number) {
    return await getModel(UseBytes)
      .updateOne({ mac, date }, { $inc: { useBytes } }, { upsert: true })
      .lean();
  }

  /**
   * 获取所有微信推送事件
   * @returns
   */
  getWxEvent() {
    return getModel(WXEvent).find().lean();
  }

  /**
   * 获取设备使用流量
   */
  getUseBtyes(mac: string) {
    return getModel(UseBytes)
      .find({ mac }, { date: 1, useBytes: 1, _id: 0 })
      .lean();
  }

  /**
   * 获取设备指定时段繁忙状态
   * @param mac
   * @param start
   * @param end
   */
  getDtuBusy(mac: string, start: number, end: number) {
    return getModel(DtuBusy)
      .find(
        { mac, timeStamp: { $lte: end, $gte: start } },
        { stat: 1, timeStamp: 1, _id: 0 }
      )
      .lean();
  }

  /**
   * 获取dtu发送指令记录
   * @param mac
   * @returns
   */
  logInstructQuery(mac: string) {
    return getModel(InstructQuery).find({ mac }).lean();
  }

  /**
   * 获取节点日志
   * @param start
   * @param end
   * @returns
   */
  lognodes(start: number, end: number) {
    return getModel(Nodes)
      .find({ timeStamp: { $lte: end, $gte: start } })
      .lean();
  }

  /**
   * 获取终端日志
   * @param start
   * @param end
   * @returns
   */
  logterminals(start: number, end: number) {
    return getModel(Terminals)
      .find({ timeStamp: { $lte: end, $gte: start } })
      .lean();
  }

  /**
   * 获取短信日志
   */
  logsmssends(start: number, end: number) {
    return getModel(SmsSend).aggregate([
      {
        $match: {
          timeStamp: { $lte: end, $gte: start },
        },
      },
      {
        $project: {
          timeStamp: 1,
          tels: 1,
          sendParams: 1,
          Success: 1,
          Error: 1,
        },
      },
      { $unwind: '$tels' },
    ]);
    /* .find({ timeStamp: { $lte: end, $gte: start } })
    .lean(); */
  }

  /**
   * 返回每个手机号码发送的短信次数
   * @returns
   */
  logsmssendsCountInfo() {
    return getModel(SmsSend).aggregate<{ _id: string; sum: number }>([
      { $project: { tels: 1, Success: 1 } },
      { $unwind: '$tels' },
      { $match: { 'Success.Code': 'OK' } },
      { $group: { _id: '$tels', sum: { $sum: 1 } } },
      { $sort: { sum: -1 } },
    ]);
  }

  /**
   * 获取邮件日志
   */
  logmailsends(start: number, end: number) {
    return getModel(MailSend).aggregate([
      {
        $match: {
          timeStamp: { $lte: end, $gte: start },
        },
      },
      {
        $project: {
          timeStamp: 1,
          mails: 1,
          sendParams: 1,
          Success: 1,
          Error: 1,
        },
      },
      { $unwind: '$mails' },
    ]);
    /* .find({ timeStamp: { $lte: end, $gte: start } })
    .lean(); */
  }

  /**
   * 获取设备告警日志
   * @param start
   * @param end
   * @returns
   */
  loguartterminaldatatransfinites(start: number, end: number) {
    return getModel(UartTerminalDataTransfinite)
      .find({ timeStamp: { $lte: end, $gte: start } })
      .lean();
  }

  /**
   * 获取指定设备聚合日志
   * @param start
   * @param end
   * @returns
   */
  async logterminalAggs(mac: string, start: number, end: number) {
    const trans = await getModel(UartTerminalDataTransfinite)
      .find({ timeStamp: { $lte: end, $gte: start }, mac })
      .lean();
    const ter = await getModel(Terminals)
      .find({ timeStamp: { $lte: end, $gte: start }, TerminalMac: mac })
      .lean();
    return [...trans, ...ter].map(el =>
      _.pick(el, ['type', 'msg', 'timeStamp'])
    );
  }

  /**
   * 获取指定用户聚合日志
   * @param start
   * @param end
   * @returns
   */
  async logUserAggs(user: string, start: number, end: number) {
    const login = await getModel(UserLogin)
      .find({ timeStamp: { $lte: end, $gte: start }, user })
      .lean();
    const request = await getModel(UserRequst)
      .find({ timeStamp: { $lte: end, $gte: start }, user })
      .lean();
    return [
      ...login.map(el => ({
        type: el.type,
        msg: el.msg,
        timeStamp: el.timeStamp,
      })),
      ...request.map(el => ({
        type: '请求',
        msg: el.type,
        timeStamp: el.timeStamp,
      })),
    ];
  }

  /**
   * 获取用户登陆日志
   * @param start
   * @param end
   * @returns
   */
  loguserlogins(start: number, end: number) {
    return getModel(UserLogin)
      .find({ timeStamp: { $lte: end, $gte: start } })
      .lean();
  }

  /**
   * 获取用户请求日志
   * @param start
   * @param end
   * @returns
   */
  loguserrequsts(start: number, end: number) {
    return getModel(UserRequst)
      .find({ timeStamp: { $lte: end, $gte: start } })
      .lean();
  }

  /**
   * 获取定时清理记录
   * @param start
   * @param end
   * @returns
   */
  logdataclean(start: number, end: number) {
    return getModel(DataClean)
      .find({ timeStamp: { $lte: end, $gte: start } })
      .lean();
  }

  /**
   * 获取wx告警推送
   * @param start
   * @param end
   * @returns
   */
  logwxsubscribes(start: number, end: number) {
    return getModel(wxsubscribeMessage)
      .find({ timeStamp: { $lte: end, $gte: start } })
      .lean();
  }
}
