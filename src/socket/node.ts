import {
  WSController,
  Inject,
  App,
  OnWSConnection,
  MidwayFrameworkType,
  OnWSMessage,
  WSEmit,
  OnWSDisConnection,
} from '@midwayjs/decorator';
import { Context, Application } from '@midwayjs/socketio';
import { RedisService } from '../service/redisService';
import { ProvideSocketUart } from '../service/socketService';
import { ProvideSocketUser } from '../service/socketUserService';
import { HF } from '../service/hfService';
import {
  getNode,
  getTerminals,
  setStatTerminal,
  addRegisterTerminal,
  setTerminal,
  getTerminal,
  setStatTerminalDevs,
} from '../service/deviceService';
import {
  saveNode,
  saveTerminal,
  saveDataTransfinite,
  saveDtuBusy,
} from '../service/logService';
import { addTerminalMountDev } from '../service/userSevice';
import { macOnOff_line, timeOutAlarm } from '../service/alarmService';

@WSController('/node')
export class NodeSocket {
  @Inject()
  ctx: Context;

  @Inject()
  SocketUart: ProvideSocketUart;

  @Inject()
  SocketUser: ProvideSocketUser;

  @App(MidwayFrameworkType.WS_IO)
  app: Application;

  /**
   * 连接事件
   */
  @OnWSConnection()
  async connect() {
    const socket = this.ctx;
    const ID = socket.id;

    if (!this.ctx.handshake) return;
    // ip由nginx代理后会变为nginx服务器的ip，重写文件头x-real-ip为远端ip
    const IP: string =
      (socket.handshake.headers['x-real-ip'] as string) ||
      socket.conn.remoteAddress;
    // 检查连接节点是否在系统登记
    const Node = await getNode(
      // eslint-disable-next-line no-useless-escape
      /\:/.test(IP) ? IP.split(':').reverse()[0] : IP
    );
    if (Node) {
      // 每个连接加入到名称和ip对应的房间
      this.ctx.join([Node.Name, Node.IP]);
      RedisService.setSocketSid(ID, Node.Name);
      console.info(
        `new socket connect<id: ${ID},IP: ${IP},Name: ${Node.Name}>`
      );
      // 检查节点是否在缓存中,在的话激活旧的socket,否则创建新的socket
      saveNode({ ID, IP, type: '上线', Name: Node.Name });
      this.ctx.emit('accont');
    } else {
      console.info(`有未登记或重复登记节点连接=>${IP}，断开连接`);
      socket.disconnect();
      // 添加日志
      saveNode({ ID, IP, type: '非法连接请求', Name: 'null' });
    }
  }

  /**
   * 断开事件
   * 退出指定房间,清理缓存
   */
  @OnWSDisConnection()
  async DisConnection() {
    const node = await this.SocketUart.getNode(this.ctx.id);
    if (node) {
      //
      this.ctx.leave(node.Name);
      this.ctx.leave(node.IP);
      RedisService.delSocketSid(this.ctx.id);
      this.ctx.disconnect();
      const macs = (await getTerminals({ DevMac: 1, mountNode: 1 }))
        .filter(el => el.mountNode === node.Name)
        .map(el => el.DevMac);
      // 批量设置终端离线
      await setStatTerminal(macs, false);
      this.SocketUart.delNodeCache(node.Name);

      // 添加日志
      //await saveNode({ type: "断开", ID: this.ctx.id, IP: node.IP, Name: node.Name })
      macs.forEach(mac => {
        saveTerminal({
          NodeIP: node.IP,
          NodeName: node.Name,
          TerminalMac: mac,
          type: '节点断开',
        });
      });
    }
  }

  /**
   * 响应注册事件
   * @param _data
   * @returns
   */
  @OnWSMessage('register')
  @WSEmit('registerSuccess')
  async register() {
    const node = this.SocketUart.getNode(this.ctx.id);
    const UserID = await HF.getUserId();
    return { ...node, UserID };
  }

  /**
   * 节点启动失败
   * @param _data
   */
  @OnWSMessage('startError')
  async startError() {
    const node = await this.SocketUart.getNode(this.ctx.id);
    saveNode({
      type: 'TcpServer启动失败',
      ID: this.ctx.id,
      IP: node.IP,
      Name: node.Name,
    });
  }

  /**
   * 触发报警事件
   * @param data
   */
  @OnWSMessage('alarm')
  async alarm(data: any) {
    const node = await this.SocketUart.getNode(this.ctx.id);
    console.info({ data });
    saveNode({
      type: '告警',
      ID: this.ctx.id,
      IP: node.IP,
      Name: node.Name,
    });
  }

  /**
   * 节点终端设备上线
   * @param data
   * @param reline
   */
  @OnWSMessage('terminalOn')
  async terminalOn(data: string | string[], reline = false) {
    const node = await this.SocketUart.getNode(this.ctx.id);
    if (node) {
      // 如果是pesiv节点的设备和设备未注册,自动注册设备信息
      // 如果设备是百事服卡且未注册,自动注册设备型号
      if (
        ['pwsiv', 'besiv-1'].includes(node.Name) &&
        typeof data === 'string' &&
        !RedisService.terminalMap.has(data)
      ) {
        await addRegisterTerminal(data, node.Name);
        // 构造用户ups信息
        const mountDev: Uart.TerminalMountDevs = {
          pid: 0,
          mountDev: 'UPS',
          protocol: 'Pesiv卡',
          Type: 'UPS',
        };
        await addTerminalMountDev('root', data, mountDev);
        await setTerminal(data, { PID: 'pesiv' });
        RedisService.initTerminalMap();
        console.info(`Pesiv卡:${data}未注册,将自动注册到设备库`);
      }
      setStatTerminal(data);
      // 迭代macs,从busy列表删除,写入日志,在线记录更新
      getTerminal(data, { DevMac: 1 }).then(els => {
        const ters = [els].flat();
        ters.forEach(async t => {
          if (t) {
            RedisService.delDtuWorkBus(t.DevMac);
            this.SocketUser.sendMacUpdate(t.DevMac);
            saveTerminal({
              NodeIP: node.IP,
              NodeName: node.Name,
              TerminalMac: data[0],
              type: reline ? '重新连接' : '连接',
            });

            {
              // 如果是单条设备上线
              if (typeof data === 'string') {
                const onTime = await RedisService.getMacOnlineTime(t.DevMac);
                const ofTime = await RedisService.getMacOfflineTime(t.DevMac);
                /**
                 * 要么是新的设备,没有上下线记录
                 * 要么必须有上下线时间且下线时间大于上次上线时间
                 */
                if ((!ofTime && !onTime) || (ofTime && ofTime > onTime)) {
                  macOnOff_line(t.DevMac, '上线');
                }
              }
            }
            // 如果是重连，加入缓存
            RedisService.setMacOnlineTime(t.DevMac);
          }
        });
      });
    }
  }

  /**
   * 节点终端设备掉线
   * @param mac
   * @param active
   */
  @OnWSMessage('terminalOff')
  async terminalOff(mac: string, active: boolean) {
    const node = await this.SocketUart.getNode(this.ctx.id);
    if (node) {
      setStatTerminal(mac, false);
      this.SocketUser.sendMacUpdate(mac);
      RedisService.delDtuWorkBus(mac);
      if (!active) {
        const onTime = await RedisService.getMacOnlineTime(mac);
        const ofTime = await RedisService.getMacOfflineTime(mac);
        if (onTime && ofTime && ofTime < onTime) macOnOff_line(mac, '离线');
        RedisService.setMacOfflineTime(mac);
      }

      // 添加日志
      saveTerminal({
        NodeIP: node.IP,
        NodeName: node.Name,
        TerminalMac: mac,
        type: active ? 'dtu主动断开' : 'dtu断开',
      });
    }
  }

  /**
   * 设备查询指令有部分超时,把dtu查询间隔+500ms
   * @param mac
   * @param pid
   * @param instruct
   */
  @OnWSMessage('instructTimeOut')
  async instructTimeOut(mac: string, pid: number, instruct: string[]) {
    const node = await this.SocketUart.getNode(this.ctx.id);
    if (node) {
      // console.log('部分指令超时', mac, pid, instruct);
      setStatTerminalDevs(mac, pid);
      this.SocketUser.sendMacUpdate(mac);
      const EX = this.SocketUart.cache.get(mac + pid);
      if (EX) EX.Interval += 500 * instruct.length;
      this.SocketUser.sendRootSocketMessage(
        `部分指令超时,mac:${mac}/pid:${pid}/instruct:${instruct.join(',')}`
      );
      /*  saveDataTransfinite({
        mac: mac + 'h',
        pid,
        protocol: EX.protocol,
        devName: EX.mountDev,
        tag: '部分指令超时',
        timeStamp: Date.now(),
        msg: instruct.join(','),
        isOk: true,
      }); */
      // console.log({ EX });
    }
  }

  /**
   * 设备挂载节点查询超时,dtu所有查询指令超时
   * @param mac
   * @param pid
   * @param timeOut
   */
  @OnWSMessage('terminalMountDevTimeOut')
  async terminalMountDevTimeOut(mac: string, pid: number, timeOut: number) {
    const node = await this.SocketUart.getNode(this.ctx.id);
    if (node) {
      const hash = mac + pid;
      const Query = this.SocketUart.cache.get(hash);
      if (Query) {
        // 如果超时次数>10和短信发送状态为false
        if (timeOut > 10) {
          setStatTerminalDevs(mac, pid, false);
          this.SocketUser.sendMacUpdate(mac);
          // 把查询超时间隔修改为1分钟
          Query.Interval = 6e4;
          if (!(await RedisService.hasTimeOutMonutDevSmsSend(hash))) {
            RedisService.setMacOfflineTime(mac);
            const terminal = await getTerminal(mac);
            // 发送设备查询超时短信
            timeOutAlarm(
              Query.TerminalMac,
              Query.pid,
              Query.mountDev,
              '超时',
              new Date()
            );
            // 添加短信发送记录
            RedisService.setTimeOutMonutDevSmsSend(hash);
            saveDataTransfinite({
              mac,
              devName: terminal.name,
              pid: 0,
              protocol: '',
              tag: '连接',
              msg: `${terminal.name}/${Query.pid}/${Query.mountDev} 查询超时`,
              timeStamp: Date.now(),
            });
            saveTerminal({
              NodeIP: node.IP,
              NodeName: node.Name,
              TerminalMac: mac,
              type: '查询超时',
              query: Query,
            });
          }
        }
      }
    }
  }

  /**
   * 接收dtu空闲状态变更,如果busy是true则把mac加入到繁忙设备列表
   * @param mac
   * @param busy
   * @param n
   */
  @OnWSMessage('busy')
  async busy(mac: string, busy: boolean, n: number) {
    busy
      ? await RedisService.addDtuWorkBus(mac)
      : await RedisService.delDtuWorkBus(mac);
    saveDtuBusy({ mac, stat: busy, n, timeStamp: Date.now() });
  }

  @OnWSMessage('ready')
  @WSEmit('nodeInfo')
  async ready() {
    // 迭代所有设备,加入缓存
    const node = await this.SocketUart.getNode(this.ctx.id);
    if (node) {
      this.SocketUart.setNodeCache(node.Name);
      return node.Name;
    }
  }

  /**
   * 监听dtu查询事件结果,转发至event
   * @param events
   * @param result
   */
  @OnWSMessage('deviceopratesuccess')
  @OnWSMessage('dtuopratesuccess')
  @OnWSMessage('result')
  async dtuOprateSuccess(events: string, result: Uart.ApolloMongoResult) {
    this.SocketUart.event.emit(events, result);
  }
}
