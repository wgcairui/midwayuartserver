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
  innerMessages,
  logbull,
  logDevUseTime,
} from '../entity/log';
import * as _ from 'lodash';
import { getModelForClass } from '@typegoose/typegoose';
import { getModel } from '../util/base';

/**
 * 创建插入文档
 * @param cl
 * @param doc
 * @returns
 */
function creatDoc<D extends { [x: string]: any; timeStamp?: number }, T>(
  cl: AnyParamConstructor<T>,
  doc: D
) {
  return getModelForClass(cl).create({ ...doc, timeStamp: Date.now() });
}

/**
 * 保存站内信信息
 * @param doc
 * @returns
 */
export async function saveInnerMessage(doc: innerMessages) {
  return await creatDoc(innerMessages, doc);
}

/**
 * 保存站内信信息
 * @param doc
 * @returns
 */
export async function saveBull(doc: logbull) {
  return await creatDoc(logbull, doc);
}

/**
 * 保存设备查询间隔耗时
 * @param doc
 * @returns
 */
export async function saveDevUseTime(doc: logDevUseTime) {
  return await creatDoc(logDevUseTime, doc);
}

/**
 * 保存节点操作日志
 * @param doc
 * @returns
 */
export async function saveNode(doc: Nodes) {
  return await creatDoc(Nodes, doc); //.creatDoc(Nodes,doc);
}

/**
 * 保存终端操作日志
 * @param doc
 * @returns
 */
export async function saveTerminal(doc: Terminals) {
  return await creatDoc(Terminals, doc); //.creatDoc(Terminals,doc);
}

/**
 * 保存普通告警事件
 * @param doc
 * @returns
 */
export async function saveDataTransfinite(doc: UartTerminalDataTransfinite) {
  // SocketUser.sendMacAlarm(doc.mac, doc)
  return await creatDoc(UartTerminalDataTransfinite, doc); //.creatDoc(UartTerminalDataTransfinite,doc);
}

/**
 * 保存dtu工作状态变化
 * @param doc
 * @returns
 */
export async function saveDtuBusy(doc: DtuBusy) {
  return await creatDoc(DtuBusy, doc);
}

/**
 * 保存邮箱发送记录
 */
export async function saveMail(doc: MailSend) {
  return await creatDoc(MailSend, doc);
}

/**
 * 保存短信打算记录
 * @param doc
 * @returns
 */
export async function saveSms(doc: SmsSend) {
  return await creatDoc(SmsSend, doc);
}

/**
 * 保存用户请求记录
 * @param user 用户
 * @param userGroup 用户类型
 * @param type 请求类型
 * @param argument 请求参数
 * @returns
 */
export async function saveUserRequst(
  user: string,
  userGroup: string,
  type: string,
  argument: any
) {
  return creatDoc(UserRequst, {
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
export async function saveClean(doc: DataClean) {
  return creatDoc(DataClean, doc);
}

/**
 * 保存微信服务器推送
 * @param doc
 * @returns
 */
export async function saveWxEvent(doc: Uart.WX.wxValidation | Uart.WX.WxEvent) {
  return await creatDoc(WXEvent, doc);
}

/**
 * 保存推送到用户的微信消息
 */
export async function saveWxsubscribeMessage(
  doc: Uart.WX.wxsubscribeMessage & { result: Uart.WX.wxRequest }
) {
  return await creatDoc(wxsubscribeMessage, {
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
export async function incUseBytes(mac: string, date: string, useBytes: number) {
  return await getModel(UseBytes)
    .updateOne({ mac, date }, { $inc: { useBytes } }, { upsert: true })
    .lean();
}

/**
 * 获取所有微信推送事件
 * @returns
 */
export async function getWxEvent() {
  return getModel(WXEvent).find().lean();
}

/**
 * 获取设备使用流量
 */
export async function getUseBtyes(mac: string) {
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
export async function getDtuBusy(mac: string, start: number, end: number) {
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
export async function logInstructQuery(mac: string) {
  return getModel(InstructQuery).find({ mac }).lean();
}

/**
 * 获取节点日志
 * @param start
 * @param end
 * @returns
 */
export async function lognodes(start: number, end: number) {
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
export async function logterminals(start: number, end: number) {
  return getModel(Terminals)
    .find({ timeStamp: { $lte: end, $gte: start } })
    .lean();
}

/**
 * 获取短信日志
 */
export async function logsmssends(start: number, end: number) {
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
export async function logsmssendsCountInfo() {
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
export async function logmailsends(start: number, end: number) {
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
export async function loguartterminaldatatransfinites(
  start: number,
  end: number
) {
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
export async function logterminalAggs(mac: string, start: number, end: number) {
  const trans = await getModel(UartTerminalDataTransfinite)
    .find({ timeStamp: { $lte: end, $gte: start }, mac })
    .lean();
  const ter = await getModel(Terminals)
    .find({ timeStamp: { $lte: end, $gte: start }, TerminalMac: mac })
    .lean();
  return [...trans, ...ter].map(el => _.pick(el, ['type', 'msg', 'timeStamp']));
}

/**
 * 获取指定用户聚合日志
 * @param start
 * @param end
 * @returns
 */
export async function logUserAggs(user: string, start: number, end: number) {
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
export async function loguserlogins(start: number, end: number) {
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
export async function loguserrequsts(start: number, end: number) {
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
export async function logdataclean(start: number, end: number) {
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
export async function logwxsubscribes(start: number, end: number) {
  return getModel(wxsubscribeMessage)
    .find({ timeStamp: { $lte: end, $gte: start } })
    .lean();
}

/**
 * 获取站内信
 * @param start
 * @param end
 * @returns
 */
export async function getloginnerMessage(start: number, end: number) {
  return getModel(innerMessages)
    .find({ timeStamp: { $lte: end, $gte: start } })
    .lean();
}

/**
 * 获取bull
 * @param start
 * @param end
 * @returns
 */
export async function getlogBull(start: number, end: number) {
  return getModel(logbull)
    .find({ timeStamp: { $lte: end, $gte: start } })
    .lean();
}

/**
 * 获取设备查询间隔和耗时
 * @param mac
 * @param start
 * @param end
 * @returns
 */
export async function getlogDevUseTime(
  mac: string,
  start: number,
  end: number
) {
  return getModel(logDevUseTime)
    .find({ mac, timeStamp: { $lte: end, $gte: start } })
    .lean();
}
