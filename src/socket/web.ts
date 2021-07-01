import { Provide, WSController, Inject, App, OnWSConnection, MidwayFrameworkType, OnWSDisConnection, OnWSMessage } from "@midwayjs/decorator"
import { Context, Application } from "@midwayjs/socketio"

@Provide()
@WSController("/web")
export class WebSocket {
    @Inject()
    ctx: Context

    /* @Inject()
    Alarm: Alarm */

    @App(MidwayFrameworkType.WS_IO)
    app: Application

    /**
     * 连接事件¸
     */
    @OnWSConnection()
    async Connection() {
    }



    /**
     * 断开事件
     * 退出指定房间,清理缓存
     */
    @OnWSDisConnection()
    async DisConnection() {
    }

    @OnWSMessage("register")
    register(data: { user: string }) {
        if (data.user) {
            this.ctx.join(data.user)
        }
    }
}