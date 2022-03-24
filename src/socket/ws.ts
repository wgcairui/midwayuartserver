import {
  WSController,
  Provide,
  OnWSConnection,
  Inject,
  OnWSMessage,
} from '@midwayjs/decorator';
import { Context } from '@midwayjs/ws';
import { SocketUser } from '../service/socketUserService';
import { Secret_JwtVerify } from '../util/util';

@Provide()
@WSController('/ws')
export class HelloSocketController {
  @Inject()
  ctx: Context;

  @OnWSConnection()
  async onConnectionMethod() {
    this.ctx.send(JSON.stringify({ type: 'Connection' }));
  }

  @OnWSMessage('message')
  async gotMessage(data: string) {
    if (/^{"token".*}$/) {
      const { token } = JSON.parse(data);
      if (token) {
        try {
          const users = await Secret_JwtVerify<Uart.UserInfo>(token);
          SocketUser.wsMap.set(users.user, this.ctx);
        } catch (error) {
          this.ctx.send(JSON.stringify({ type: 'error' }));
        }
      }
    }
  }
}
