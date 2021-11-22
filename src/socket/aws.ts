import { WSController, Provide, OnWSConnection, Inject, OnWSMessage } from '@midwayjs/decorator';
import { Context } from '@midwayjs/ws';
import * as http from 'http';
import { Util } from "../util/util"
import { SocketUser } from "../service/socketUser"

@Provide()
@WSController("/ws")
export class HelloSocketController {

  @Inject()
  ctx: Context;

  @Inject()
  Util: Util

  @Inject()
  SocketUser: SocketUser

  @OnWSConnection()
  async onConnectionMethod(socket: Context, request: http.IncomingMessage) {
    this.ctx.send(JSON.stringify({ type: "Connection" }))
  }

  @OnWSMessage('message')
  async gotMessage(data: string) {
    if (/^{"token".*}$/) {
      const { token } = JSON.parse(data)
      if (token) {
        try {
          const users = await this.Util.Secret_JwtVerify<Uart.UserInfo>(token)
          this.SocketUser.wsMap.set(users.user, this.ctx)
        } catch (error) {
          this.ctx.send(JSON.stringify({ type: 'error' }))
        }

      }

    }
  }
}
