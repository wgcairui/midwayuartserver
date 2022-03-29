import {
  Provide,
  WSController,
  Inject,
  App,
  OnWSConnection,
  MidwayFrameworkType,
  OnWSDisConnection,
  OnWSMessage,
  WSEmit,
} from '@midwayjs/decorator';
import { Context, Application } from '@midwayjs/socketio';
import { ProvideSocketUser } from '../service/socketUserService';

@Provide()
@WSController('/web')
export class WebSocket {
  @Inject()
  ctx: Context;

  @Inject()
  SocketUser: ProvideSocketUser;

  /* @Inject()
    Alarm: Alarm */

  @App(MidwayFrameworkType.WS_IO)
  app: Application;

  /**
   * 连接事件¸
   */
  @OnWSConnection()
  async Connection() {}

  /**
   * 断开事件
   * 退出指定房间,清理缓存
   */
  @OnWSDisConnection()
  async DisConnection() {}

  /**
   * 监听设备上线注册信息
   * @param data
   * @returns
   */
  @OnWSMessage('register')
  @WSEmit('registerSuccess')
  register(data: { user: string }) {
    if (data.user) {
      this.ctx.join(data.user);
      return `hello,${data.user}`;
    }
  }

  /**
   * 监听设备离线信息
   * @param data
   */
  @OnWSMessage('disConnect')
  disConnect(data: { user: string }) {
    this.ctx.leave(data.user);
  }

  /**
   * 监听订阅信息
   * @param data
   */
  @OnWSMessage('subscribe')
  subscribe(data: { event: string }) {
    // console.log("subscribe",data);

    if (!this.SocketUser.subscribeUsers.has(data.event)) {
      this.SocketUser.subscribeUsers.set(data.event, new Set());
    }
    this.SocketUser.subscribeUsers.get(data.event).add(this.ctx.id);
  }

  /**
   * 取消订阅
   * @param data
   */
  @OnWSMessage('unSubscribe')
  unSubscribe(data: { event: string }) {
    // console.log("unsubscribe",data);
    if (this.SocketUser.subscribeUsers.has(data.event)) {
      this.SocketUser.subscribeUsers.get(data.event).delete(this.ctx.id);
    }
  }
}
