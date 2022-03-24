import { getCurrentApplicationContext } from '@midwayjs/core';
import {
  App,
  Init,
  MidwayFrameworkType,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator';
import { Application as IO } from '@midwayjs/socketio';
import { Context as Ws } from '@midwayjs/ws';
import { getBindMacUser } from '../util/base';

@Provide()
@Scope(ScopeEnum.Singleton)
export class ProvideSocketUser {
  @App(MidwayFrameworkType.WS_IO)
  app: IO;

  /**
   * 微信用户ws
   */
  wsMap: Map<string, Ws>;

  /**
   * 用户订阅
   */
  subscribeUsers: Map<string, Set<string>>;

  @Init()
  init() {
    this.wsMap = new Map();
    this.subscribeUsers = new Map();
    console.log({ app: this.app });
  }

  /**
   *
   * @param mac 向订阅ˇ端发送设备变更日志
   */
  async sendMacUpdate(mac: string) {
    this.toUser(mac, 'MacUpdate', { mac });

    /**
     * 适用于root,监控所有设备变更
     */
    {
      const users = this.subscribeUsers.get('MacUpdate');
      if (users && users.size > 0) {
        this.toUserInfo([...users.values()], 'MacUpdate', { mac });
      }
    }
    /**
     * 适用于用户
     */
    {
      const key = 'MacUpdate' + mac;
      const users = this.subscribeUsers.get(key);
      if (users && users.size > 0) {
        this.toUserInfo([...users.values()], key, { mac });
      }
    }
  }

  /**
   *
   * @param mac 向订阅ˇ端发送设备查询间隔变更日志
   */
  async sendMacIntervalUpdate(mac: string, pid: number | string) {
    /**
     * 适用于用户
     */
    {
      const key = 'MacIntervalUpdate' + mac + pid;
      const users = this.subscribeUsers.get(key);
      if (users && users.size > 0) {
        this.toUserInfo([...users.values()], key, { mac });
      }
    }
  }

  /**
   *
   * @param mac 向订阅端发送设备数据更新
   */
  async sendMacDateUpdate(mac: string, pid: number) {
    const event = mac + pid;
    const users = this.subscribeUsers.get(mac + pid);
    if (users && users.size > 0) {
      this.toUserInfo([...users.values()], event);
    }
    this.toUser(mac, 'MacDateUpdate' + mac + pid, { mac, pid });
  }

  /**
   * 向用户发送告警提醒
   * @param mac
   * @param alarm
   */
  async sendMacAlarm(mac: string, alarm: Uart.uartAlarmObject) {
    this.toUser(mac, 'alarm', alarm);
  }

  /**
   * 向用户发送socket事件
   * @param mac
   * @param events
   * @param data
   * @deprecated 下个大版本取消操作,全部使用订阅模式
   */
  private async toUser(mac: string, events: string, data: any = {}) {
    const user = await getBindMacUser(mac);
    if (user) {
      this.app.of('/web').in(user).emit(events, data);
      if (this.wsMap.has(user)) {
        this.wsMap.get(user).send(JSON.stringify({ type: events, data }));
      }
    }
  }

  /**
   * 向用户发送socket事件
   * @param user
   * @param events
   * @param data
   */
  toUserInfo(user: string | string[], events: string, data: any = {}) {
    this.app.of('/web').in(user).emit(events, data);
    if (typeof user === 'string') {
      if (this.wsMap.has(user)) {
        this.wsMap.get(user).send(JSON.stringify({ type: events, data }));
      }
    } else {
      user.forEach(u => {
        if (this.wsMap.has(u)) {
          this.wsMap.get(u).send(JSON.stringify({ type: events, data }));
        }
      });
    }
  }

  /**
   * 给root用户推送告警信息
   * @param msg
   * @param _type 消息类型
   * @param user
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sendRootSocketMessage(msg: string, _type = 'message', user = 'root') {
    this.app.of('/web').in(user).emit('message', msg);
  }
}

export const SocketUser = async () => {
  return getCurrentApplicationContext().getAsync(ProvideSocketUser);
};
