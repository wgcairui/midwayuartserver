import {
  Controller,
  Post,
  Inject,
  App,
  MidwayFrameworkType,
  Body,
} from '@midwayjs/decorator';
import { RedisService } from '../service/redisService';
import { HF } from '../service/hfService';
import { Application as SocketApp } from '@midwayjs/socketio';
import { date, IdDate, macDate, registerDev, userDate } from '../dto/root';
import { ProvideSocketUart } from '../service/socketService';
import { Clean } from '../task/clean';
import { UpdateIccid } from '../task/updateIccid';
import { loginHash } from '../dto/user';
import { getBindMacUser } from '../util/base';

import { Validate } from '@midwayjs/validate';
import { root } from '../middleware/root';
import {
  getNodes,
  getTerminals,
  getProtocols,
  getNodeRuns,
  getNode,
  addDevConstent,
  deleteProtocol,
  updateProtocol,
  setProtocol,
  DevTypes,
  addDevType,
  deleteDevModel,
  addRegisterTerminal,
  deleteRegisterTerminal,
  setNode,
  deleteNode,
  RegisterTerminals,
  ClientResults,
  ClientResult,
  ClientResultSingle,
  addRegisterDev,
  getTerminal,
  delRegisterDev,
  getRegisterDevs,
  initTerminal,
  getProtocol,
  setTerminal,
  modifyProtocol,
  DevType,
  RegisterTerminal,
} from '../service/deviceService';
import { NodeInfo, ParseFunction, parseTime } from '../util/util';
import {
  getDtuBusy,
  getlogBull,
  getlogDevUseTime,
  getloginnerMessage,
  getUseBtyes,
  getWxEvent,
  logdataclean,
  logInstructQuery,
  logmailsends,
  lognodes,
  logsmssends,
  logsmssendsCountInfo,
  logterminalAggs,
  logterminals,
  loguartterminaldatatransfinites,
  logUserAggs,
  loguserlogins,
  loguserrequsts,
  logwxsubscribes,
} from '../service/logService';
import {
  getUsers,
  getWxUsers,
  updateWxUser,
  setUserSecret,
  getUserSecret,
  deleteUser,
  getUserAlarmSetup,
  getUserAlarmSetups,
  deleteUsersetup,
  initUserAlarmSetup,
  getUserBindDevices,
  getUser,
  toggleUserGroup,
  delUserTerminal,
  modifyUserInfo,
  getUserAlarm,
  userModel,
} from '../service/userSevice';
import { WxPublics } from '../util/wxpublic';
import {
  DoIotRecharge,
  DoIotUnbindResume,
  QueryCardFlowInfo,
  QueryCardInfo,
  QueryIotCardOfferDtl,
} from '../service/dyiotService';
import { GetCardDetailV2 } from '../service/newDyIotService';
import { ProvideSocketUser } from '../service/socketUserService';
import { MQ } from '../service/bullService';

@Controller('/api/root', { middleware: [root] })
export class RootControll {
  @Inject()
  Clean: Clean;

  @Inject()
  UpdateIccid: UpdateIccid;

  @Inject()
  SocketUart: ProvideSocketUart;

  @Inject()
  SocketUser: ProvideSocketUser;

  @App(MidwayFrameworkType.WS_IO)
  private SocketApp: SocketApp;

  /**
   * 获取服务器状态
   * @returns
   */
  @Post('/runingState')
  async runingState() {
    const User = {
      online: this.SocketApp.of('/web').sockets.size,
      all: await userModel.count(),
    };
    // 在线节点
    const Node = {
      online: this.SocketApp.of('/node').sockets.size,
      all: (await getNodes()).length,
    };
    // 在线终端
    const terminals = await getTerminals({ online: 1 });
    const Terminal = {
      online: terminals.filter(el => el.online).length,
      all: terminals.length,
    };
    // 超时设备数量
    const TimeOutMonutDev = terminals
      .map(el => el?.mountDevs || [])
      .flat()
      .filter(el => !el?.online).length;
    // 所以协议
    const Protocol = (await getProtocols()).length;
    // 系统事件总数
    const events = 0;
    // 系统性能
    const SysInfo = NodeInfo();
    return {
      code: 200,
      data: {
        User,
        Node,
        Terminal,
        Protocol,
        TimeOutMonutDev,
        events,
        SysInfo,
      },
    };
  }

  /**
   *
   * @returns 获取所以节点运行状态
   */
  @Post('/NodeInfo')
  async NodeInfo() {
    return {
      code: 200,
      data: await getNodeRuns(),
    };
  }

  /**
   * 获取终端信息
   * @param user
   * @param mac
   * @returns
   */
  @Post('/getTerminal')
  async getTerminal(@Body('mac') mac: string) {
    return {
      code: 200,
      data: await getTerminal(mac),
    };
  }

  /**
   *
   * @returns 获取所以节点
   */
  @Post('/Nodes')
  async Nodes() {
    return {
      code: 200,
      data: await getNodes(),
    };
  }

  /**
   *
   * @returns 获取指定节点
   */
  @Post('/Node')
  async Node(@Body('name') name: string) {
    return {
      code: 200,
      data: await getNode(name),
    };
  }

  /**
   * 获取所以终端信息
   * @returns
   */
  @Post('/getTerminals')
  async getTerminals(@Body('filter') filter?: any) {
    const ts = await getTerminals(filter);
    for (const t of ts) {
      (t as any).user = await getBindMacUser(t.DevMac);
    }
    return {
      code: 200,
      data: ts,
    };
  }

  /**
   * 获取wx公众号图文列表
   * @param type 类型
   * @param offset 其实位置
   * @param count 数量
   * @returns
   */
  @Post('/materials_list')
  async materials_list(
    @Body('type') type: 'image' | 'video' | 'voice' | 'news',
    @Body('offset') offset: number,
    @Body('count') count: number
  ) {
    return {
      code: 200,
      data: await WxPublics.get_materials_list_Public({ type, offset, count }),
    };
  }

  /**
   * 获取所有公众号用户
   * @returns
   */
  @Post('/wx_users')
  async wx_users() {
    const data = await getWxUsers();
    return {
      code: 200,
      data,
    };
  }

  /**
   * 更新公众号用户资料库
   * @returns
   */
  @Post('/update_wx_users_all')
  async update_wx_users_all() {
    const users = await WxPublics.saveUserInfo();
    const save = users.users.map(el => updateWxUser(el));
    return {
      ...users,
      code: 200,
      data: await Promise.all(save),
      count: users.count,
    };
  }

  /**
   * 向指定用户推送信息
   * @param key
   * @param openid
   * @param content
   */
  @Post('/wx_send_info')
  async wx_send_info(
    @Body('key') key: string,
    @Body('openid') openid: string,
    @Body('content') content: string
  ) {
    if (openid) {
      const postData: Uart.WX.wxsubscribeMessage = {
        touser: openid,
        template_id: 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
        miniprogram: {
          appid: 'wx38800d0139103920',
          pagepath: 'pages/index/index',
        },
        data: {
          first: {
            value: content,
            color: '#173177',
          },
          device: {
            value: 'test',
            color: '#173177',
          },
          time: {
            value: parseTime(),
            color: '#173177',
          },
          remark: {
            value: 'test',
            color: '#173177',
          },
        },
      };
      MQ.addJob('wx', postData);
      return {
        code: 200,
      };
    }
  }

  /**
   * 获取微信推送事件记录
   */
  @Post('/log_wxEvent')
  async log_wxEvent() {
    return {
      code: 200,
      data: await getWxEvent(),
    };
  }

  /**
   * 设置第三方密匙信息
   * @param type
   * @param appid
   * @param secret
   */
  @Post('/setSecret')
  async setSecret(
    @Body('type') type: any,
    @Body('appid') appid: string,
    @Body('secret') secret: string
  ) {
    return {
      code: 200,
      data: await setUserSecret(type, appid, secret),
    };
  }

  /**
   * 获取第三方密匙信息
   * @param type
   * @returns
   */
  @Post('/getSecret')
  async getSecret(@Body('type') type: any) {
    return {
      code: 200,
      data: await getUserSecret(type),
    };
  }

  /**
   * 获取所有协议
   * @returns
   */
  @Post('/getProtocols')
  async getProtocols() {
    return {
      code: 200,
      data: await getProtocols(),
    };
  }

  /**
   * 添加设备协议常量配置
   * @param ProtocolType
   * @param Protocol
   * @param type
   * @param arg
   * @returns
   */
  @Post('/addDevConstent')
  async addDevConstentSingle(
    @Body('ProtocolType') ProtocolType: string,
    @Body('Protocol') Protocol: string,
    @Body('type') type: Uart.ConstantThresholdType,
    @Body('arg') arg: any
  ) {
    const users = await addDevConstent(ProtocolType, Protocol, type, arg);
    return {
      code: 200,
      data: (await Promise.all(
        users.map(
          async el => await RedisService.setUserSetup(el, Protocol, true)
        )
      )) as any,
    };
  }

  /**
   * 删除协议
   * @param protocol
   */
  @Post('/deleteProtocol')
  async deleteProtocol(@Body('protocol') protocol: string) {
    const r = await deleteProtocol(protocol);
    return {
      code: r.length > 0 ? 0 : 200,
      data: r,
    };
  }

  /**
   * 根据文本内容更新协议
   * @param protocol
   */
  @Post('/updateProtocol')
  async updateProtocol(@Body('protocol') protocol: Uart.protocol) {
    const d = await updateProtocol(protocol);
    RedisService.setProtocolInstruct(protocol.Protocol);
    this.SocketUart.UpdateCacheProtocol(protocol.Protocol);
    return {
      code: 200,
      data: d,
    };
  }

  /**
   * 设置协议
   * @param Type
   * @param ProtocolType
   * @param Protocol
   * @param instruct
   * @returns
   */
  @Post('/setProtocol')
  async setProtocol(
    @Body('Type') Type: number,
    @Body('ProtocolType') ProtocolType: string,
    @Body('Protocol') Protocol: string,
    @Body('instruct') instruct: Uart.protocolInstruct[]
  ) {
    const d = await setProtocol(Type, ProtocolType, Protocol, instruct);
    RedisService.setProtocolInstruct(Protocol);
    this.SocketUart.UpdateCacheProtocol(Protocol);
    return {
      code: 200,
      data: d,
    };
  }

  /**
   * 测试协议前置脚本
   * @returns
   */
  @Post('/TestScriptStart')
  async TestScriptStart(
    @Body('scriptStart') scriptStart: string,
    @Body('name') name: string
  ) {
    const Fun = ParseFunction(scriptStart);
    return {
      code: 200,
      data: Fun(1, name),
    };
  }

  /**
   * 获取所有设备类型
   * @returns
   */
  @Post('/DevTypes')
  async DevTypes() {
    return {
      code: 200,
      data: await DevTypes(),
    };
  }

  /**
   * 获取指定设备类型
   * @returns
   */
  @Post('/DevType')
  async DevType(@Body('DevModel') DevModel: string) {
    return {
      code: 200,
      data: await DevType(DevModel),
    };
  }

  /**
   * 添加设备类型
   * @param Type
   * @param DevModel
   * @param Protocols
   * @returns
   */
  @Post('/addDevType')
  async addDevType(
    @Body('Type') Type: string,
    @Body('DevModel') DevModel: string,
    @Body('Protocols') Protocols: Pick<Uart.protocol, 'Type' | 'Protocol'>[]
  ) {
    return {
      code: 200,
      data: await addDevType(Type, DevModel, Protocols),
    };
  }

  /**
   * 删除设备类型
   */
  @Post('/deleteDevModel')
  async deleteDevModel(@Body('DevModel') DevModel: string) {
    const r = await deleteDevModel(DevModel);
    return {
      code: r.length > 0 ? 0 : 200,
      data: r,
    };
  }

  /**
   * 添加登记设备
   * @param DevMac
   * @param mountNode
   * @returns
   */
  @Post('/addRegisterTerminal')
  async addRegisterTerminal(
    @Body('DevMac') DevMac: string,
    @Body('mountNode') mountNode: string
  ) {
    return {
      code: 200,
      data: await addRegisterTerminal(DevMac, mountNode),
    };
  }

  /**
   * 删除登记设备
   */
  @Post('/deleteRegisterTerminal')
  async deleteRegisterTerminal(@Body('DevMac') DevMac: string) {
    return await deleteRegisterTerminal(DevMac);
  }

  /**
   * 设置节点
   * @param Name
   * @param IP
   * @param Port
   * @param MaxConnections
   * @returns
   */
  @Post('/setNode')
  async setNode(
    @Body('Name') Name: string,
    @Body('IP') IP: string,
    @Body('Port') Port: number,
    @Body('MaxConnections') MaxConnections: number
  ) {
    return {
      code: 200,
      data: await setNode(Name, IP, Port, MaxConnections),
    };
  }

  /**
   * 删除节点
   */
  @Post('/deleteNode')
  async deleteNode(@Body('Name') Name: string) {
    const r = await deleteNode(Name);
    return {
      code: r.length > 0 ? 0 : 200,
      data: r,
    };
  }

  /**
   * 获取设备远程调试地址
   * @param mac
   */
  @Post('/iotRemoteUrl')
  async iotRemoteUrl(@Body('mac') mac: string) {
    const d = await HF.macRemote(mac);
    return {
      code: d ? 200 : 0,
      data: d,
    };
  }

  /**
   * 获取设备使用流量
   */
  @Post('/getUseBtyes')
  async getUseBtyes(@Body('mac') mac: string) {
    return {
      code: 200,
      data: await getUseBtyes(mac),
    };
  }

  /**
   * 获取设备指定时段繁忙状态
   * @param mac
   * @param start
   * @param end
   */
  @Post('/getDtuBusy')
  @Validate()
  async getDtuBusyStat(@Body() data: macDate) {
    return {
      code: 200,
      data: await getDtuBusy(data.mac, data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取dtu发送指令记录
   * @param mac
   * @returns
   */
  @Post('/logInstructQuery')
  async logInstructQuery(@Body('mac') mac: string) {
    return {
      code: 200,
      data: await logInstructQuery(mac),
    };
  }

  /**
   * 固定发送DTU AT指令
   * @param mac
   * @param content
   * @returns
   */
  @Post('/sendATInstruct')
  async sendATInstruct(
    @Body('mac') mac: string,
    @Body('content') content: string
  ) {
    // 获取协议指令
    // 携带事件名称，触发指令查询
    const Query: Uart.DTUoprate = {
      DevMac: mac,
      events: 'QueryAT' + Date.now() + mac,
      content,
    };
    const result = await this.SocketUart.OprateDTU(Query);
    return {
      code: result.ok ? 200 : 0,
      data: result,
    };
  }

  /**
   * 查询注册终端设备的节点
   * @param DevMac
   * @returns
   */
  @Post('/RegisterTerminal')
  async RegisterTerminal(@Body('DevMac') DevMac: string) {
    return {
      code: 200,
      data: await RegisterTerminal(DevMac),
    };
  }

  /**
   * 查询所有终端
   */
  @Post('/RegisterTerminals')
  async RegisterTerminals() {
    return {
      code: 200,
      data: await RegisterTerminals(),
    };
  }

  /**
   * 获取所有用户信息
   * @returns
   */
  @Post('/users')
  async users() {
    return {
      code: 200,
      data: await getUsers(),
    };
  }

  /**
   * 删除用户
   * @param user
   * @param passwd
   */
  @Post('/deleteUser')
  async deleteUser(@Body('user') user: string, @Body('hash') hash: string) {
    if (user !== 'root' && hash === 'lgups@123') {
      return {
        code: 200,
        data: await deleteUser(user),
      };
    }
  }

  /**
   * 获取指定用户告警配置
   * @param user
   * @param filter
   * @returns
   */
  @Post('/getUserAlarmSetup')
  async getUserAlarmSetup(@Body('user') user: string) {
    return {
      code: 200,
      data: await getUserAlarmSetup(user),
    };
  }

  /**
   * 获取all用户告警配置
   * @param user
   * @param filter
   * @returns
   */
  @Post('/getUserAlarmSetups')
  async getUserAlarmSetups() {
    return {
      code: 200,
      data: await getUserAlarmSetups(),
    };
  }

  /**
   * 删除用户告警配置
   * @param user
   * @returns
   */
  @Post('/deleteUsersetup')
  async deleteUsersetup(@Body('user') user: string) {
    return {
      code: 200,
      data: await deleteUsersetup(user),
    };
  }

  /**
   * 初始化用户告警配置
   * @param user
   */
  @Post('/initUserAlarmSetup')
  async initUserAlarmSetup(@Body('user') user: string) {
    await deleteUsersetup(user);
    return {
      code: 200,
      data: await initUserAlarmSetup(user),
    };
  }

  /**
   * 获取用户绑定设备
   * @param token
   * @returns
   */
  @Post('/BindDev')
  async BindDev(@Body('user') user: string) {
    const bind = await getUserBindDevices(user);
    return {
      code: 200,
      data: bind,
    };
  }

  /**
   * 获取节点指令发送运行状态
   * @returns
   */
  @Post('/getNodeInstructQuery')
  async getNodeInstructQuery() {
    return {
      code: 200,
      data: [
        ...this.SocketUart.cache.values(),
      ] as unknown as Uart.TerminalMountDevsEX,
    };
  }

  /**
   * 获取节点指令发送运行状态
   * @returns
   */
  @Post('/getNodeInstructQueryMac')
  @Validate()
  async getNodeInstructQueryMac(
    @Body('mac') mac: string,
    @Body('pid') pid: string | number
  ) {
    return {
      code: 200,
      data: this.SocketUart.cache.get(mac + pid)?.Interval || 3000,
    };
  }

  /**
   * 获取所有连接的socket客户端用户
   * @returns
   */
  @Post('/getUsersOnline')
  async getUsersOnline() {
    const s = await this.SocketApp.of('/web').fetchSockets();
    const rooms = s
      .map(el => (el.rooms.size > 1 ? [...el.rooms.values()][1] : ''))
      .flat();
    const names = rooms.filter(el => el);

    const wsUsers = [];

    return {
      code: 200,
      data: await Promise.all([...names, ...wsUsers].map(u => getUser(u))),
    };
  }

  /**
   * 获取用户在线状态
   * @returns
   */
  @Post('/getUserOnlineStat')
  async getUserOnlineStat(@Body('user') user: string) {
    const names = (await this.SocketApp.of('/web').fetchSockets())
      .map(el => (el.rooms.size > 1 ? [...el.rooms.values()][1] : ''))
      .flat()
      .filter(el => el);

    return {
      code: 200,
      data: names.includes(user),
    };
  }

  /**
   * 发送socket消息给用户
   * @param user
   * @param msg
   * @returns
   */
  @Post('/sendUserSocketInfo')
  async sendUserSocketInfo(
    @Body('user') user: string,
    @Body('msg') msg: string
  ) {
    return {
      code: 200,
      data: this.SocketUser.toUserInfo(user, 'info', msg),
    };
  }

  /**
   * 获取设备原始数据
   * @param start
   * @param end
   * @param id
   * @returns
   */
  @Post('/ClientResults')
  @Validate()
  async ClientResults(@Body() data: IdDate) {
    return {
      code: 200,
      data: await ClientResults(
        data.getStart(),
        data.getEnd(),
        data.id ? data.getId() : null
      ),
    };
  }

  /**
   * 获取设备解析数据
   * @param start
   * @param end
   * @param id
   * @returns
   */
  @Post('/ClientResult')
  @Validate()
  async ClientResult(@Body() data: IdDate) {
    return {
      code: 200,
      data: await ClientResult(
        data.getStart(),
        data.getEnd(),
        data.id ? data.getId() : null
      ),
    };
  }

  /**
   * 获取设备单例数据
   * @returns
   */
  @Post('/ClientResultSingle')
  async ClientResultSingle() {
    return {
      code: 200,
      data: await ClientResultSingle(),
    };
  }

  /**
   * 获取节点日志
   * @param start
   * @param end
   * @returns
   */
  @Post('/lognodes')
  @Validate()
  async lognodes(@Body() data: date) {
    return {
      code: 200,
      data: await lognodes(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取终端日志
   * @param start
   * @param end
   * @returns
   */
  @Post('/logterminals')
  @Validate()
  async logterminals(@Body() data: date) {
    return {
      code: 200,
      data: await logterminals(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取短信日志
   */
  @Post('/logsmssends')
  @Validate()
  async logsmssends(@Body() data: date) {
    return {
      code: 200,
      data: await logsmssends(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取短信日志
   */
  @Post('/logsmssendsCountInfo')
  @Validate()
  async logsmssendsCountInfo() {
    return {
      code: 200,
      data: await logsmssendsCountInfo(),
    };
  }

  /**
   * 获取邮件日志
   */
  @Post('/logmailsends')
  @Validate()
  async logmailsends(@Body() data: date) {
    return {
      code: 200,
      data: await logmailsends(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取设备告警日志
   * @param start
   * @param end
   * @returns
   */
  @Post('/loguartterminaldatatransfinites')
  @Validate()
  async loguartterminaldatatransfinites(@Body() data: date) {
    return {
      code: 200,
      data: await loguartterminaldatatransfinites(
        data.getStart(),
        data.getEnd()
      ),
    };
  }

  /**
   * 获取用户登陆日志
   * @param start
   * @param end
   * @returns
   */
  @Post('/loguserlogins')
  @Validate()
  async loguserlogins(@Body() data: date) {
    return {
      code: 200,
      data: await loguserlogins(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取用户请求日志
   * @param start
   * @param end
   * @returns
   */
  @Post('/loguserrequsts')
  @Validate()
  async loguserrequsts(@Body() data: date) {
    return {
      code: 200,
      data: await loguserrequsts(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取wx告警推送
   * @param start
   * @param end
   * @returns
   */
  @Post('/logwxsubscribes')
  @Validate()
  async logwxsubscribes(@Body() data: date) {
    return {
      code: 200,
      data: await logwxsubscribes(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取wx告警推送
   * @param start
   * @param end
   * @returns
   */
  @Post('/loginnerMessages')
  @Validate()
  async loginnerMessages(@Body() data: date) {
    return {
      code: 200,
      data: await getloginnerMessage(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取wx告警推送
   * @param start
   * @param end
   * @returns
   */
  @Post('/logbulls')
  @Validate()
  async logbulls(@Body() data: date) {
    return {
      code: 200,
      data: await getlogBull(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取wx告警推送
   * @param start
   * @param end
   * @returns
   */
  @Post('/logDevUseTime')
  @Validate()
  async logDevUseTimes(@Body() data: macDate) {
    return {
      code: 200,
      data: await getlogDevUseTime(data.mac, data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取定时清理记录
   * @param start
   * @param end
   * @returns
   */
  @Post('/logdataclean')
  @Validate()
  async logdataclean(@Body() data: date) {
    return {
      code: 200,
      data: await logdataclean(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取指定设备聚合日志
   * @param start
   * @param end
   * @returns
   */
  @Post('/logterminalAggs')
  @Validate()
  async logterminalAggs(@Body() data: macDate) {
    return {
      code: 200,
      data: await logterminalAggs(data.mac, data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取指定用户聚合日志
   * @param start
   * @param end
   * @returns
   */
  @Post('/logUserAggs')
  @Validate()
  async logUserAggs(@Body() data: userDate) {
    return {
      code: 200,
      data: await logUserAggs(data.user, data.getStart(), data.getEnd()),
    };
  }

  /**
   * 注册设备
   * @param data
   */
  @Post('/addRegisterDev')
  @Validate()
  async addRegisterDev(@Body() data: registerDev) {
    return {
      code: 200,
      data: await Promise.all(
        data.ids.map(id => {
          return addRegisterDev({ id, ...data.mountDev });
        })
      ),
    };
  }

  /**
   * 删除指定注册设备
   * @param id
   * @returns
   */
  @Post('/delRegisterDev')
  async delRegisterDev(@Body('id') id: string) {
    const t = await getTerminal(id);
    if (t) {
      return {
        code: 0,
        msg: `设备已被${t.DevMac}绑定,请先解除与${t.DevMac}之间的绑定`,
      };
    } else {
      return {
        code: 200,
        data: await delRegisterDev(id),
      };
    }
  }

  /**
   * 获取指定所有设备
   * @returns
   */
  @Post('/getRegisterDevs')
  async getRegisterDevs() {
    return {
      code: 200,
      data: await getRegisterDevs(),
    };
  }

  /**
   * 初始化设备
   * @param mac
   */
  @Post('/initTerminal')
  async initTerminal(@Body('mac') mac: string) {
    const u = await getBindMacUser(mac);
    if (u) {
      const user = await getUser(u);
      return {
        code: 0,
        msg: `设备被用户${u}/${user.name}绑定`,
      };
    } else {
      return {
        code: 200,
        data: await initTerminal(mac),
      };
    }
  }

  /**
   * 变更用户组
   * @param user
   */
  @Post('/toggleUserGroup')
  async toggleUserGroup(@Body('user') user: string) {
    return {
      code: 200,
      data: await toggleUserGroup(user),
    };
  }

  /**
   * 清空整个redis数据库
   * @returns
   */
  @Post('/redisflushall')
  async redisflushall() {
    const d = await RedisService.getClient().flushall();
    setTimeout(() => {
      process.exit(1);
    }, 1000);
    return {
      code: 200,
      data: d,
    };
  }

  /**
   * 清空当前库中的所有 key
   */
  @Post('/redisflushdb')
  async redisflushdb() {
    const d = await RedisService.getClient().flushdb();
    setTimeout(() => {
      process.exit(1);
    }, 1000);
    return {
      code: 200,
      data: d,
    };
  }

  /**
   * 获取redis中key
   */
  @Post('/rediskeys')
  async rediskeys(@Body() pattern: string) {
    return {
      code: 200,
      data: await RedisService.getClient().keys(pattern),
    };
  }

  /**
   * 删除redis中指定key
   */
  @Post('/rediskeysdValue')
  async rediskeysdValue(@Body('keys') keys: string[]) {
    return {
      code: 200,
      data: await RedisService.getClient().mget(keys),
    };
  }

  /**
   * 删除redis中指定key
   */
  @Post('/rediskeysdel')
  async rediskeysdel(@Body('keys') keys: string[]) {
    return {
      code: 200,
      data: await RedisService.getClient().del(keys),
    };
  }

  /**
   * 数据清理
   */
  @Post('/DataClean')
  async DataClean() {
    return {
      code: 200,
      data: await this.Clean.clean(),
    };
  }

  /**
   * 固定发送设备操作指令
   * @param query
   * @param item
   * @returns
   */
  @Post('/SendProcotolInstructSet')
  async SendProcotolInstructSet(@Body('query') query: Uart.instructQuery) {
    const protocol = await getProtocol(query.protocol);
    // 携带事件名称，触发指令查询
    const Query: Uart.instructQuery = {
      protocol: query.protocol,
      DevMac: query.DevMac,
      pid: query.pid,
      type: protocol.Type,
      events: 'oprate' + Date.now() + query.DevMac,
      content: query.content,
    };
    return {
      code: 200,
      data: await this.SocketUart.InstructQuery(Query),
      msg: 'success',
    };
  }

  /**
   * 解绑复机
   * @param iccid
   * @returns
   */
  @Post('/IotDoIotUnbindResume')
  async IotDoIotUnbindResume(@Body('iccid') iccid: string) {
    const res = await DoIotUnbindResume(iccid);
    return {
      code: res.code === 'OK' ? 200 : 0,
      data: res.data,
    };
  }

  /**
   * 续订套餐
   * @param mac
   * @returns
   */
  @Post('/IotRecharge')
  async IotRecharge(@Body('mac') mac: string) {
    const ter = await getTerminal(mac);
    if (ter && ter.iccidInfo) {
      if (ter.iccidInfo.version === 'ali_1') {
        const data = await DoIotRecharge(ter.ICCID);
        return {
          code: 200,
          data,
        };
      }
    } else {
      return {
        code: 0,
        messege: 'no terminal',
      };
    }
  }

  /**
   * 查询物联网卡的明细信息
   * @param iccid
   * @returns
   */
  @Post('/IotQueryCardInfo')
  async IotQueryCardInfo(@Body('iccid') iccid: string) {
    const res = await QueryCardInfo(iccid);
    return {
      code: res.code === 'OK' ? 200 : 0,
      data: res.cardInfo,
    };
  }

  /**
   * 查询物联网卡的流量信息
   * @param iccid
   * @returns
   */
  @Post('/IotQueryCardFlowInfo')
  async IotQueryCardFlowInfo(@Body('iccid') iccid: string) {
    const res = await QueryCardFlowInfo(iccid);
    return {
      code: res.code === 'OK' ? 200 : 0,
      data: res.cardFlowInfos.cardFlowInfo[0],
    };
  }

  /**
   * 查询物联网卡当前时间有效套餐的列表
   * @param iccid
   * @returns
   */
  @Post('/IotQueryIotCardOfferDtl')
  async IotQueryIotCardOfferDtl(@Body('iccid') iccid: string) {
    const res = await QueryIotCardOfferDtl(iccid);
    return {
      code: res.code === 'OK' ? 200 : 0,
      data: res.cardOfferDetail.detail,
    };
  }

  /**
   * 更新所有4G dtu iccid信息
   * @returns
   */
  @Post('/UpdateIccids')
  async UpdateIccids() {
    return {
      code: 200,
      data: await this.UpdateIccid.up(),
    };
  }

  /**
   * 删除绑定设备
   * @param user
   * @param mac
   * @returns
   */
  @Post('/delUserTerminal')
  async delUserTerminal(@Body('user') user: string, @Body('mac') mac: string) {
    return {
      code: 200,
      data: await delUserTerminal(user, mac),
    };
  }

  /**
   * 修改设备备注
   * @param mac
   * @param remark
   * @returns
   */
  @Post('/modifyTerminalRemark')
  async modifyTerminalRemark(
    @Body('mac') mac: string,
    @Body('remark') remark: string
  ) {
    return {
      code: 200,
      data: await setTerminal(mac, { remark }),
    };
  }

  /**
   * 修改user备注
   * @param user
   * @param remark
   * @returns
   */
  @Post('/modifyUserRemark')
  async modifyUserRemark(
    @Body('user') user: string,
    @Body('remark') remark: string
  ) {
    return {
      code: 200,
      data: await modifyUserInfo(user, { remark }),
    };
  }

  /**
   * 修改user备注
   * @param user
   * @param remark
   * @returns
   */
  @Post('/modifyProtocolRemark')
  async modifyProtocolRemark(
    @Body('protocol') protocol: string,
    @Body('remark') remark: string
  ) {
    return {
      code: 200,
      data: await modifyProtocol(protocol, { remark }),
    };
  }

  /**
   * 获取用户信息
   * @param data
   * @returns
   */
  @Post('/getUser')
  @Validate()
  async getUser(@Body() data: loginHash) {
    return {
      code: 200,
      data: await getUser(data.user, {
        passwd: 0,
      }),
    };
  }

  /**
   * 获取用户告警信息
   * @param token
   */
  @Post('/userLoguartterminaldatatransfinites')
  async userLoguartterminaldatatransfinites(
    @Body('user') user: string,
    @Body('start') start: number,
    @Body('end') end: number
  ) {
    const alarms = await getUserAlarm(user, start, end);
    return {
      code: 200,
      data: alarms,
    };
  }

  /**
   *
   * @param mac 根据mac获取用户
   * @returns
   */
  @Post('/getTerminalUser')
  async getTerminalUser(@Body('mac') mac: string) {
    return {
      code: 200,
      data: await getBindMacUser(mac),
    };
  }

  /**
   *
   * 重启节点程序
   */
  @Post('/nodeRestart')
  async nodeRestart(@Body('node') node: string) {
    try {
      const el = await this.SocketUart.nodeRestart(node);
      return { code: 200, data: el };
    } catch (e) {
      return { code: 0, data: e };
    }
  }

  /**
   * 获取物联卡信息
   * @param Iccid
   */
  @Post('/getSimInfo')
  async getSimInfo(@Body('Iccid') Iccid: string) {
    try {
      const data = await GetCardDetailV2(Iccid);
      return {
        code: 200,
        data,
      };
    } catch (error) {
      return {
        code: 0,
        data: error,
      };
    }
  }
}
