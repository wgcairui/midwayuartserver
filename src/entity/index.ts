import { getModelForClass } from '@typegoose/typegoose';
import {
  DataClean,
  DtuBusy,
  innerMessages,
  InstructQuery,
  logbull,
  logDevUseTime,
  MailSend,
  Nodes,
  SmsSend,
  Terminals,
  UartTerminalDataTransfinite,
  UseBytes,
  UserLogin,
  UserRequst,
  WXEvent,
  wxsubscribeMessage,
} from './log';
import {
  LinkFrend,
  NodeClient,
  NodeRunInfo,
  registerDev,
  RegisterTerminal,
  Terminal,
  TerminalClientResult,
  TerminalClientResults,
  TerminalClientResultSingle,
  WebSocketTerminal,
} from './node';
import {
  DevArgumentAlias,
  DevConstant,
  DevType,
  Protocols,
  instruct,
} from './protocol';
import {
  Salt,
  SecretApp,
  UserAggregation,
  UserAlarmSetup,
  UserBindDevice,
  UserLayout,
  Users,
  wxUser,
} from './user';

export {
  Salt,
  SecretApp,
  UserAggregation,
  UserAlarmSetup,
  UserBindDevice,
  UserLayout,
  Users,
  wxUser,
  DevArgumentAlias,
  DevConstant,
  DevType,
  Protocols,
  LinkFrend,
  NodeClient,
  NodeRunInfo,
  registerDev,
  RegisterTerminal,
  Terminal,
  TerminalClientResult,
  TerminalClientResults,
  TerminalClientResultSingle,
  WebSocketTerminal,
  DataClean,
  DtuBusy,
  innerMessages,
  InstructQuery,
  logbull,
  logDevUseTime,
  MailSend,
  Nodes,
  SmsSend,
  Terminals,
  UartTerminalDataTransfinite,
  UseBytes,
  UserLogin,
  UserRequst,
  WXEvent,
  wxsubscribeMessage,
  instruct as ProtocolInstruct,
};

/**
 * 短信发送日志entity
 */
export const SmsSendLogEntity = getModelForClass(SmsSend);

/**
 * 邮件发送日志entity
 */
export const MailSendLogEntity = getModelForClass(MailSend);

/**
 * 设备告警日志entity
 */
export const UartTerminalDataTransfiniteEntityLogEntity = getModelForClass(
  UartTerminalDataTransfinite
);

/**
 * 用户请求日志entity
 */
export const UserRequstLogEntity = getModelForClass(UserRequst);

/**
 * 用户登录日志entity
 */
export const UserLoginLogEntity = getModelForClass(UserLogin);

/**
 * 节点日志entity
 */
export const NodesLogEntity = getModelForClass(Nodes);

/**
 * 终端日志entity
 */
export const TerminalsLogEntity = getModelForClass(Terminals);

/**
 * 数据清洗日志entity
 */
export const DataCleanLogEntity = getModelForClass(DataClean);

/**
 * 设备流量使用日志entity
 */
export const UseBytesLogEntity = getModelForClass(UseBytes);

/**
 * 设备工作状态日志entity
 */
export const DtuBusyLogEntity = getModelForClass(DtuBusy);

/**
 * 设备指令发送日志entity
 */
export const InstructQueryLogEntity = getModelForClass(InstructQuery);

/**
 * 微信事件日志entity
 */
export const WXEventLogEntity = getModelForClass(WXEvent);

/**
 * 微信推送消息日志entity
 */
export const wxsubscribeMessageLogEntity = getModelForClass(wxsubscribeMessage);

/**
 * 站内信日志entity
 */
export const innerMessagesLogEntity = getModelForClass(innerMessages);

/**
 * bull队列消息日志entity
 */
export const logbullLogEntity = getModelForClass(logbull);

/**
 * 设备查询耗时日志entity
 */
export const logDevUseTimeLogEntity = getModelForClass(logDevUseTime);

/**
 * 友情链接entity
 */
export const LinkFrendEntity = getModelForClass(LinkFrend);

/**
 * 透传节点entity
 */
export const NodeClientEntity = getModelForClass(NodeClient);

/**
 * 节点ws设备entity
 */
export const WebSocketTerminalEntity = getModelForClass(WebSocketTerminal);

/**
 * 节点运行状态
 */
export const NodeRunInfoEntity = getModelForClass(NodeRunInfo);

/**
 * 设备运行原始数据
 */
export const TerminalPrimavelDataEntity = getModelForClass(
  TerminalClientResults
);

/**
 * 设备运行解析数据
 */
export const TerminalParseDataEntity = getModelForClass(TerminalClientResult);

/**
 * 设备运行解析数据单例
 */
export const TerminalParseDataSingleEntity = getModelForClass(
  TerminalClientResultSingle
);

/**
 * 注册终端
 */
export const RegisterTerminalEntity = getModelForClass(RegisterTerminal);

/**
 * 终端
 */
export const TerminalEntity = getModelForClass(Terminal);

/**
 * 注册挂载设备
 */
export const registerDevEntity = getModelForClass(registerDev);

/**
 * 设备类型entity
 */
export const DevTypeEntity = getModelForClass(DevType);

/**
 * 设备协议entity
 */
export const ProtocolsEntity = getModelForClass(Protocols);

/**
 * 协议约束配置
 */
export const DevConstantEntity = getModelForClass(DevConstant);

/**
 * 参数别名
 */
export const DevArgumentAliasEntity = getModelForClass(DevArgumentAlias);

/**
 * 用户entity
 */
export const UsersEntity = getModelForClass(Users);

/**
 * 用户绑定设备
 */
export const UserBindDeviceEntity = getModelForClass(UserBindDevice);

/**
 * 用户聚合设备entity
 */
export const UserAggregationEntity = getModelForClass(UserAggregation);

/**
 * 用户布局设置entity
 */
export const UserLayoutEntity = getModelForClass(UserLayout);

/**
 * 微信用户信息
 */
export const WxUserEntity = getModelForClass(wxUser);

/**
 * 用户告警设置
 */
export const UserAlarmSetupEntity = getModelForClass(UserAlarmSetup);

/**
 * 第三方秘钥
 */
export const SecretAppEntity = getModelForClass(SecretApp);

/**
 * 记录百事服用户盐值
 */
export const SaltEntity = getModelForClass(Salt);
