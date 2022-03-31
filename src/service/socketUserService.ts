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
import { getBindMacUser } from '../util/base';
import { MQ, WsData } from './bullService';
import { RedisService } from './redisService';
import { Job, Worker } from 'bullmq';
import { Secret_JwtVerify } from '../util/util';
@Provide()
@Scope(ScopeEnum.Singleton)
export class ProvideSocketUser {
  @App(MidwayFrameworkType.WS_IO)
  app: IO;

  /**
   * 用户订阅
   */
  subscribeUsers: Map<string, Set<string>>;

  @Init()
  init() {
    this.subscribeUsers = new Map();

    new Worker(
      'wsInput',
      async (job: Job<WsData>) => {
        const { token, event } = job.data;
        try {
          const { user } = await Secret_JwtVerify<Uart.UserInfo>(token);
          await RedisService.addWsToken(user, token);
          if (event) {
            if (!this.subscribeUsers.has(event)) {
              this.subscribeUsers.set(event, new Set());
            }
            this.subscribeUsers.get(event).add(user);
          }
        } catch (error: any) {
          console.error('bull wsConnect Error:', error.message || '');
        }
      },
      {
        connection: RedisService.redisService,
      }
    );
  }

  /**
   * 处理wx ws接受程序触发的队列
   * 把用户信息传递
   * 微信ws事件触发
   * @param job
   */
  /* private async wsConnect(job: Job<WsData>) {

  } */
  /**
   *
   * @param mac 向订阅ˇ端发送设备变更日志
   */
  async sendMacUpdate(mac: string) {
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
  }

  /**
   * 向用户发送告警提醒
   * @param mac
   * @param alarm
   */
  async sendMacAlarm(mac: string, alarm: Uart.uartAlarmObject) {
    const user = await getBindMacUser(mac);
    user && this.toUserInfo(user, 'alarm', alarm);
  }

  /**
   * 向用户发送socket事件
   * @param user
   * @param events
   * @param data
   */
  toUserInfo(user: string | string[], events: string, data: any = {}) {
    // 发送web.io信息
    this.app.of('/web').in(user).emit(events, data);

    /**
     * 发送ws信息
     */
    const users = [user].flat();
    users.forEach(async u => {
      const token = await RedisService.getWsToken(u);

      if (token) {
        MQ.addJobWs({
          token,
          event: events,
          data,
        });
      }
    });
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

/**
 * socketUserApp
 * @returns
 */
export const SocketUser = async () => {
  return getCurrentApplicationContext().getAsync(ProvideSocketUser);
};
