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
  updateIccidInfo,
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
} from '../service/userSevice';
import { WxPublics } from '../util/wxpublic';
import {
  DoIotRecharge,
  DoIotUnbindResume,
  QueryCardFlowInfo,
  QueryCardInfo,
  QueryIotCardOfferDtl,
} from '../service/dyiotService';
import { GetCardDetailV2, UpdateAutoRechargeSwitch } from '../service/newDyIotService';
import { ProvideSocketUser } from '../service/socketUserService';
import { MQ } from '../service/bullService';
import { ProtocolInstruct, Protocols, UsersEntity } from '../entity';

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
   * ?????????????????????
   * @returns
   */
  @Post('/runingState')
  async runingState() {
    const wsUser = await RedisService.getClient().keys('ws*');
    const User = {
      online: this.SocketApp.of('/web').sockets.size + wsUser.length,
      all: await UsersEntity.count(),
    };
    // ????????????
    const Node = {
      online: this.SocketApp.of('/node').sockets.size,
      all: (await getNodes()).length,
    };
    // ????????????
    const terminals = await getTerminals({ online: 1 });
    const Terminal = {
      online: terminals.filter(el => el.online).length,
      all: terminals.length,
    };
    // ??????????????????
    const TimeOutMonutDev = terminals
      .map(el => el?.mountDevs || [])
      .flat()
      .filter(el => !el?.online).length;
    // ????????????
    const Protocol = (await getProtocols()).length;
    // ??????????????????
    const events = 0;
    // ????????????
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
   * @returns ??????????????????????????????
   */
  @Post('/NodeInfo')
  async NodeInfo() {
    return {
      code: 200,
      data: await getNodeRuns(),
    };
  }

  /**
   * ??????????????????
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
   * @returns ??????????????????
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
   * @returns ??????????????????
   */
  @Post('/Node')
  async Node(@Body('name') name: string) {
    return {
      code: 200,
      data: await getNode(name),
    };
  }

  /**
   * ????????????????????????
   * @returns
   */
  @Post('/getTerminals')
  async getTerminals(@Body('filter') filter?: any) {
    const ts = await getTerminals(filter);
    /* for (const t of ts) {
      (t as any).user = await getBindMacUser(t.DevMac);
    } */
    return {
      code: 200,
      data: ts,
    };
  }

  /**
   * ??????wx?????????????????????
   * @param type ??????
   * @param offset ????????????
   * @param count ??????
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
   * ???????????????????????????
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
   * ??????????????????????????????
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
   * ???????????????????????????
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
   * ??????????????????????????????
   */
  @Post('/log_wxEvent')
  async log_wxEvent() {
    return {
      code: 200,
      data: await getWxEvent(),
    };
  }

  /**
   * ???????????????????????????
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
   * ???????????????????????????
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
   * ??????????????????
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
   * ??????????????????????????????
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
   * ????????????
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
   * ??????????????????????????????
   * @param protocol
   */
  @Post('/updateProtocol')
  async updateProtocol(@Body('protocol') protocol: Protocols) {
    const d = await updateProtocol(protocol);
    RedisService.setProtocolInstruct(protocol.Protocol);
    this.SocketUart.UpdateCacheProtocol(protocol.Protocol);
    return {
      code: 200,
      data: d,
    };
  }

  /**
   * ????????????
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
    @Body('instruct') instruct: ProtocolInstruct[]
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
   * ????????????????????????
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
   * ????????????????????????
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
   * ????????????????????????
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
   * ??????????????????
   * @param Type
   * @param DevModel
   * @param Protocols
   * @returns
   */
  @Post('/addDevType')
  async addDevType(
    @Body('Type') Type: string,
    @Body('DevModel') DevModel: string,
    @Body('Protocols') Protocols: Pick<Protocols, 'Type' | 'Protocol'>[]
  ) {
    return {
      code: 200,
      data: await addDevType(Type, DevModel, Protocols),
    };
  }

  /**
   * ??????????????????
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
   * ??????????????????
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
   * ??????????????????
   */
  @Post('/deleteRegisterTerminal')
  async deleteRegisterTerminal(@Body('DevMac') DevMac: string) {
    return await deleteRegisterTerminal(DevMac);
  }

  /**
   * ????????????
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
   * ????????????
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
   * ??????????????????????????????
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
   * ????????????????????????
   */
  @Post('/getUseBtyes')
  async getUseBtyes(@Body('mac') mac: string) {
    return {
      code: 200,
      data: await getUseBtyes(mac),
    };
  }

  /**
   * ????????????????????????????????????
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
   * ??????dtu??????????????????
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
   * ????????????DTU AT??????
   * @param mac
   * @param content
   * @returns
   */
  @Post('/sendATInstruct')
  async sendATInstruct(
    @Body('mac') mac: string,
    @Body('content') content: string
  ) {
    // ??????????????????
    // ???????????????????????????????????????
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
   * ?????????????????????????????????
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
   * ??????????????????
   */
  @Post('/RegisterTerminals')
  async RegisterTerminals() {
    return {
      code: 200,
      data: await RegisterTerminals(),
    };
  }

  /**
   * ????????????????????????
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
   * ????????????
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
   * ??????????????????????????????
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
   * ??????all??????????????????
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
   * ????????????????????????
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
   * ???????????????????????????
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
   * ????????????????????????
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
   * ????????????????????????????????????
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
   * ????????????????????????????????????
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
   * ?????????????????????socket???????????????
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
   * ????????????????????????
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
   * ??????socket???????????????
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
   * ????????????????????????
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
   * ????????????????????????
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
   * ????????????????????????
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
   * ??????????????????
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
   * ??????????????????
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
   * ??????????????????
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
   * ??????????????????
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
   * ??????????????????
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
   * ????????????????????????
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
   * ????????????????????????
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
   * ????????????????????????
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
   * ??????wx????????????
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
   * ??????wx????????????
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
   * ??????wx????????????
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
   * ??????wx????????????
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
   * ????????????????????????
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
   * ??????????????????????????????
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
   * ??????????????????????????????
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
   * ????????????
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
   * ????????????????????????
   * @param id
   * @returns
   */
  @Post('/delRegisterDev')
  async delRegisterDev(@Body('id') id: string) {
    const t = await getTerminal(id);
    if (t) {
      return {
        code: 0,
        msg: `????????????${t.DevMac}??????,???????????????${t.DevMac}???????????????`,
      };
    } else {
      return {
        code: 200,
        data: await delRegisterDev(id),
      };
    }
  }

  /**
   * ????????????????????????
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
   * ???????????????
   * @param mac
   */
  @Post('/initTerminal')
  async initTerminal(@Body('mac') mac: string) {
    const u = await getBindMacUser(mac);
    if (u) {
      const user = await getUser(u);
      return {
        code: 0,
        msg: `???????????????${u}/${user.name}??????`,
      };
    } else {
      return {
        code: 200,
        data: await initTerminal(mac),
      };
    }
  }

  /**
   * ???????????????
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
   * ????????????redis?????????
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
   * ??????????????????????????? key
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
   * ??????redis???key
   */
  @Post('/rediskeys')
  async rediskeys(@Body('pattern') pattern: string) {
    return {
      code: 200,
      data: await RedisService.getClient().keys(pattern),
    };
  }

  /**
   * ??????redis?????????key
   */
  @Post('/rediskeysdValue')
  async rediskeysdValue(@Body('keys') keys: string[]) {
    return {
      code: 200,
      data: await RedisService.getClient().mget(keys),
    };
  }

  /**
   * ??????redis?????????key
   */
  @Post('/rediskeysdel')
  async rediskeysdel(@Body('keys') keys: string[]) {
    return {
      code: 200,
      data: await RedisService.getClient().del(keys),
    };
  }

  /**
   * ????????????
   */
  @Post('/DataClean')
  async DataClean() {
    return {
      code: 200,
      data: await this.Clean.clean(),
    };
  }

  /**
   * ??????????????????????????????
   * @param query
   * @param item
   * @returns
   */
  @Post('/SendProcotolInstructSet')
  async SendProcotolInstructSet(@Body('query') query: Uart.instructQuery) {
    const protocol = await getProtocol(query.protocol);
    // ???????????????????????????????????????
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
   * ????????????
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
   * ??????????????????
   * @param iccid 
   * @param open 
   * @returns 
   */
  @Post('/IotUpdateAutoRechargeSwitch')
  async IotUpdateAutoRechargeSwitch(@Body('iccid') iccid: string, @Body('open') open:boolean){
    const res = await UpdateAutoRechargeSwitch(iccid, open)
    return {
      code: res.Success ? 200 : 0,
      data: res.Data,
    };
  }

  /**
   * ??????iccid??????
   */
  @Post('/IotUpdateIccidInfo')
  async IotUpdateIccidInfo(@Body('mac') mac: string ){
    const res = await updateIccidInfo(mac)
    return {
      code: res.Success ? 200 : 0,
      data: res.Data,
    };
  }

  /**
   * ????????????
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
   * ?????????????????????????????????
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
   * ?????????????????????????????????
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
   * ???????????????????????????????????????????????????
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
   * ????????????4G dtu iccid??????
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
   * ??????????????????
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
   * ??????????????????
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
   * ??????user??????
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
   * ??????user??????
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
   * ??????????????????
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
   * ????????????????????????
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
   * @param mac ??????mac????????????
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
   * ??????????????????
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
   * ?????????????????????
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
