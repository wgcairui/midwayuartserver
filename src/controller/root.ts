import {
  Provide,
  Controller,
  Post,
  Inject,
  App,
  MidwayFrameworkType,
  Body,
  Validate,
  ALL,
} from '@midwayjs/decorator';
import { Device } from '../service/device';
import { UserService } from '../service/user';
import { RedisService } from '../service/redis';
import { Util } from '../util/util';
import { Wx } from '../util/wx';
import { HF } from '../util/hf';
import { Logs } from '../service/log';
import { Application as SocketApp } from '@midwayjs/socketio';
import { date, IdDate, macDate, registerDev, userDate } from '../dto/root';
import { SocketUart } from '../service/socketUart';
import { Clean } from '../task/clean';
import { DyIot } from '../util/dyiot';
import { UpdateIccid } from '../task/updateIccid';
import { SocketUser } from '../service/socketUser';

@Provide()
@Controller('/api/root', { middleware: ['root'] })
export class RootControll {
  @Inject()
  private Device: Device;

  @Inject()
  private UserService: UserService;

  @Inject()
  private Util: Util;

  @Inject()
  private Wx: Wx;

  @Inject()
  private logs: Logs;

  @Inject()
  private RedisService: RedisService;

  @Inject()
  private HF: HF;

  @Inject()
  Clean: Clean;

  @Inject()
  private SocketUart: SocketUart;

  @Inject()
  DyIot: DyIot;

  @Inject()
  UpdateIccid: UpdateIccid;

  @Inject()
  SocketUser: SocketUser;

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
      all: (await this.UserService.getUsers()).length,
    };
    // 在线节点
    const Node = {
      online: this.SocketApp.of('/node').sockets.size,
      all: (await this.Device.getNodes()).length,
    };
    // 在线终端
    const terminals = await this.Device.getTerminals({ online: 1 });
    const Terminal = {
      online: terminals.filter(el => el.online).length,
      all: terminals.length,
    };
    // 所以协议
    const Protocol = (await this.Device.getProtocols()).length;
    // 超时设备数量
    const TimeOutMonutDev = terminals
      .map(el => el.mountDevs)
      .flat()
      .filter(el => !el?.online).length;
    // 系统事件总数
    const events = 0;
    // 系统性能
    const SysInfo = this.Util.NodeInfo();
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
      data: await this.Device.getNodeRuns(),
    };
  }

  /**
   * 获取终端信息
   * @param user
   * @param mac
   * @returns
   */
  @Post('/getTerminal')
  async getTerminal(@Body() mac: string) {
    return {
      code: 200,
      data: await this.UserService.getTerminal('root', mac),
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
      data: await this.Device.getNodes(),
    };
  }

  /**
   *
   * @returns 获取指定节点
   */
  @Post('/Node')
  async Node(@Body() name: string) {
    return {
      code: 200,
      data: await this.Device.getNode(name),
    };
  }

  /**
   * 获取所以终端信息
   * @returns
   */
  @Post('/getTerminals')
  async getTerminals(@Body() filter?: any) {
    const ts = await this.Device.getTerminals(filter);
    for (const t of ts) {
      (t as any).user = await this.UserService.getBindMacUser(t.DevMac);
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
    @Body() type: 'image' | 'video' | 'voice' | 'news',
    @Body() offset: number,
    @Body() count: number
  ) {
    return {
      code: 200,
      data: await this.Wx.MP.get_materials_list_Public({ type, offset, count }),
    };
  }

  /**
   * 获取所有公众号用户
   * @returns
   */
  @Post('/wx_users')
  async wx_users() {
    const data = await this.UserService.getWxUsers();
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
    const users = await this.Wx.MP.saveUserInfo();
    const save = users.users.map(el => this.UserService.updateWxUser(el));
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
    @Body() key: string,
    @Body() openid: string,
    @Body() content: string
  ) {
    if (openid) {
      return {
        code: 200,
        data: await this.Wx.MP.SendsubscribeMessageDevAlarm({
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
              value: this.Util.parseTime(),
              color: '#173177',
            },
            remark: {
              value: 'test',
              color: '#173177',
            },
          },
        }),
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
      data: await this.logs.getWxEvent(),
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
    @Body() type: any,
    @Body() appid: string,
    @Body() secret: string
  ) {
    return {
      code: 200,
      data: await this.UserService.setUserSecret(type, appid, secret),
    };
  }

  /**
   * 获取第三方密匙信息
   * @param type
   * @returns
   */
  @Post('/getSecret')
  async getSecret(@Body() type: any) {
    return {
      code: 200,
      data: await this.UserService.getUserSecret(type),
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
      data: await this.Device.getProtocols(),
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
  async addDevConstent(
    @Body() ProtocolType: string,
    @Body() Protocol: string,
    @Body() type: Uart.ConstantThresholdType,
    @Body() arg: any
  ) {
    const users = await this.Device.addDevConstent(
      ProtocolType,
      Protocol,
      type,
      arg
    );
    return {
      code: 200,
      data: (await Promise.all(
        users.map(
          async el => await this.RedisService.setUserSetup(el, Protocol, true)
        )
      )) as any,
    };
  }

  /**
   * 删除协议
   * @param protocol
   */
  @Post('/deleteProtocol')
  async deleteProtocol(@Body() protocol: string) {
    const r = await this.Device.deleteProtocol(protocol);
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
  async updateProtocol(@Body() protocol: Uart.protocol) {
    const d = await this.Device.updateProtocol(protocol);
    this.RedisService.setProtocolInstruct(protocol.Protocol);
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
    @Body() Type: number,
    @Body() ProtocolType: string,
    @Body() Protocol: string,
    @Body() instruct: Uart.protocolInstruct[]
  ) {
    const d = await this.Device.setProtocol(
      Type,
      ProtocolType,
      Protocol,
      instruct
    );
    this.RedisService.setProtocolInstruct(Protocol);
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
  async TestScriptStart(@Body() scriptStart: string, @Body() name: string) {
    const Fun = this.Util.ParseFunction(scriptStart);
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
      data: await this.Device.DevTypes(),
    };
  }

  /**
   * 获取指定设备类型
   * @returns
   */
  @Post('/DevType')
  async DevType(@Body() DevModel: string) {
    return {
      code: 200,
      data: await this.Device.DevType(DevModel),
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
    @Body() Type: string,
    @Body() DevModel: string,
    @Body() Protocols: Pick<Uart.protocol, 'Type' | 'Protocol'>[]
  ) {
    return {
      code: 200,
      data: await this.Device.addDevType(Type, DevModel, Protocols),
    };
  }

  /**
   * 删除设备类型
   */
  @Post('/deleteDevModel')
  async deleteDevModel(@Body() DevModel: string) {
    const r = await this.Device.deleteDevModel(DevModel);
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
  async addRegisterTerminal(@Body() DevMac: string, @Body() mountNode: string) {
    return {
      code: 200,
      data: await this.Device.addRegisterTerminal(DevMac, mountNode),
    };
  }

  /**
   * 删除登记设备
   */
  @Post('/deleteRegisterTerminal')
  async deleteRegisterTerminal(@Body() DevMac: string) {
    return await this.Device.deleteRegisterTerminal(DevMac);
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
    @Body() Name: string,
    @Body() IP: string,
    @Body() Port: number,
    @Body() MaxConnections: number
  ) {
    return {
      code: 200,
      data: await this.Device.setNode(Name, IP, Port, MaxConnections),
    };
  }

  /**
   * 删除节点
   */
  @Post('/deleteNode')
  async deleteNode(@Body() Name: string) {
    const r = await this.Device.deleteNode(Name);
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
  async iotRemoteUrl(@Body() mac: string) {
    const d = await this.HF.macRemote(mac);
    return {
      code: d ? 200 : 0,
      data: d,
    };
  }

  /**
   * 获取设备使用流量
   */
  @Post('/getUseBtyes')
  async getUseBtyes(@Body() mac: string) {
    return {
      code: 200,
      data: await this.logs.getUseBtyes(mac),
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
  async getDtuBusy(@Body(ALL) data: macDate) {
    return {
      code: 200,
      data: await this.logs.getDtuBusy(
        data.mac,
        data.getStart(),
        data.getEnd()
      ),
    };
  }

  /**
   * 获取dtu发送指令记录
   * @param mac
   * @returns
   */
  @Post('/logInstructQuery')
  async logInstructQuery(@Body() mac: string) {
    return {
      code: 200,
      data: await this.logs.logInstructQuery(mac),
    };
  }

  /**
   * 固定发送DTU AT指令
   * @param mac
   * @param content
   * @returns
   */
  @Post('/sendATInstruct')
  async sendATInstruct(@Body() mac: string, @Body() content: string) {
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
  async RegisterTerminal(@Body() DevMac: string) {
    return {
      code: 200,
      data: await this.Device.RegisterTerminal(DevMac),
    };
  }

  /**
   * 查询所有终端
   */
  @Post('/RegisterTerminals')
  async RegisterTerminals() {
    return {
      code: 200,
      data: await this.Device.RegisterTerminals(),
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
      data: await this.UserService.getUsers(),
    };
  }

  /**
   * 删除用户
   * @param user
   * @param passwd
   */
  @Post('/deleteUser')
  async deleteUser(@Body() user: string, @Body() hash: string) {
    if (user !== 'root' && hash === 'lgups@123') {
      return {
        code: 200,
        data: await this.UserService.deleteUser(user),
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
  async getUserAlarmSetup(@Body() user: string) {
    return {
      code: 200,
      data: await this.UserService.getUserAlarmSetup(user),
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
      data: await this.UserService.getUserAlarmSetups(),
    };
  }

  /**
   * 删除用户告警配置
   * @param user
   * @returns
   */
  @Post('/deleteUsersetup')
  async deleteUsersetup(@Body() user: string) {
    return {
      code: 200,
      data: await this.UserService.deleteUsersetup(user),
    };
  }

  /**
   * 初始化用户告警配置
   * @param user
   */
  @Post('/initUserAlarmSetup')
  async initUserAlarmSetup(@Body() user: string) {
    await this.UserService.deleteUsersetup(user);
    return {
      code: 200,
      data: await this.UserService.initUserAlarmSetup(user),
    };
  }

  /**
   * 获取用户绑定设备
   * @param token
   * @returns
   */
  @Post('/BindDev')
  async BindDev(@Body() user: string) {
    const bind = await this.UserService.getUserBindDevices(user);
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
  getNodeInstructQuery() {
    return {
      code: 200,
      data: [
        ...this.SocketUart.cache.values(),
      ] as unknown as Uart.TerminalMountDevsEX,
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

    const wsUsers = [...this.SocketUser.wsMap.keys()];

    return {
      code: 200,
      data: await Promise.all(
        [...names, ...wsUsers].map(u => this.UserService.getUser(u))
      ),
    };
  }

  /**
   * 发送socket消息给用户
   * @param user
   * @param msg
   * @returns
   */
  @Post('/sendUserSocketInfo')
  async sendUserSocketInfo(@Body() user: string, @Body() msg: string) {
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
  async ClientResults(@Body(ALL) data: IdDate) {
    return {
      code: 200,
      data: await this.Device.ClientResults(
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
  async ClientResult(@Body(ALL) data: IdDate) {
    return {
      code: 200,
      data: await this.Device.ClientResult(
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
      data: await this.Device.ClientResultSingle(),
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
  async lognodes(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.lognodes(data.getStart(), data.getEnd()),
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
  async logterminals(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.logterminals(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取短信日志
   */
  @Post('/logsmssends')
  @Validate()
  async logsmssends(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.logsmssends(data.getStart(), data.getEnd()),
    };
  }

  /**
   * 获取邮件日志
   */
  @Post('/logmailsends')
  @Validate()
  async logmailsends(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.logmailsends(data.getStart(), data.getEnd()),
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
  async loguartterminaldatatransfinites(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.loguartterminaldatatransfinites(
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
  async loguserlogins(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.loguserlogins(data.getStart(), data.getEnd()),
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
  async loguserrequsts(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.loguserrequsts(data.getStart(), data.getEnd()),
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
  async logwxsubscribes(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.logwxsubscribes(data.getStart(), data.getEnd()),
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
  async logdataclean(@Body(ALL) data: date) {
    return {
      code: 200,
      data: await this.logs.logdataclean(data.getStart(), data.getEnd()),
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
  async logterminalAggs(@Body(ALL) data: macDate) {
    return {
      code: 200,
      data: await this.logs.logterminalAggs(
        data.mac,
        data.getStart(),
        data.getEnd()
      ),
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
  async logUserAggs(@Body(ALL) data: userDate) {
    return {
      code: 200,
      data: await this.logs.logUserAggs(
        data.user,
        data.getStart(),
        data.getEnd()
      ),
    };
  }

  /**
   * 注册设备
   * @param data
   */
  @Post('/addRegisterDev')
  @Validate()
  async addRegisterDev(@Body(ALL) data: registerDev) {
    return {
      code: 200,
      data: await Promise.all(
        data.ids.map(id => {
          return this.Device.addRegisterDev({ id, ...data.mountDev });
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
  async delRegisterDev(@Body() id: string) {
    const t = await this.Device.getTerminal(id);
    if (t) {
      return {
        code: 0,
        msg: `设备已被${t.DevMac}绑定,请先解除与${t.DevMac}之间的绑定`,
      };
    } else {
      return {
        code: 200,
        data: await this.Device.delRegisterDev(id),
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
      data: await this.Device.getRegisterDevs(),
    };
  }

  /**
   * 初始化设备
   * @param mac
   */
  @Post('/initTerminal')
  async initTerminal(@Body() mac: string) {
    const u = await this.UserService.getBindMacUser(mac);
    if (u) {
      const user = await this.UserService.getUser(u);
      return {
        code: 0,
        msg: `设备被用户${u}/${user.name}绑定`,
      };
    } else {
      return {
        code: 200,
        data: await this.Device.initTerminal(mac),
      };
    }
  }

  /**
   * 变更用户组
   * @param user
   */
  @Post('/toggleUserGroup')
  async toggleUserGroup(@Body() user: string) {
    return {
      code: 200,
      data: await this.UserService.toggleUserGroup(user),
    };
  }

  /**
   * 清空整个redis数据库
   * @returns
   */
  @Post('/redisflushall')
  async redisflushall() {
    const d = await this.RedisService.getClient().flushall();
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
    const d = await this.RedisService.getClient().flushdb();
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
      data: await this.RedisService.getClient().keys(pattern),
    };
  }

  /**
   * 删除redis中指定key
   */
  @Post('/rediskeysdValue')
  async rediskeysdValue(@Body() keys: string[]) {
    return {
      code: 200,
      data: await this.RedisService.getClient().mget(keys),
    };
  }

  /**
   * 删除redis中指定key
   */
  @Post('/rediskeysdel')
  async rediskeysdel(@Body() keys: string[]) {
    return {
      code: 200,
      data: await this.RedisService.getClient().del(keys),
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
  async SendProcotolInstructSet(@Body() query: Uart.instructQuery) {
    const protocol = await this.Device.getProtocol(query.protocol);
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
  async IotDoIotUnbindResume(@Body() iccid: string) {
    const res = await this.DyIot.DoIotUnbindResume(iccid);
    return {
      code: res.code === 'OK' ? 200 : 0,
      data: res.data,
    };
  }

  /**
   * 查询物联网卡的明细信息
   * @param iccid
   * @returns
   */
  @Post('/IotQueryCardInfo')
  async IotQueryCardInfo(@Body() iccid: string) {
    const res = await this.DyIot.QueryCardInfo(iccid);
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
  async IotQueryCardFlowInfo(@Body() iccid: string) {
    const res = await this.DyIot.QueryCardFlowInfo(iccid);
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
  async IotQueryIotCardOfferDtl(@Body() iccid: string) {
    const res = await this.DyIot.QueryIotCardOfferDtl(iccid);
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
  async delUserTerminal(@Body() user: string, mac: string) {
    return {
      code: 200,
      data: await this.UserService.delUserTerminal(user, mac),
    };
  }
}
