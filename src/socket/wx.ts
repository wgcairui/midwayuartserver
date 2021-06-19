import { Provide, App, Inject, WSController, OnWSConnection, OnWSMessage, WSEmit, MidwayFrameworkType } from "@midwayjs/decorator"
import { Context, Application } from "@midwayjs/ws"

@Provide()
@WSController("/wx")

export class WxSocket {

    @Inject()
    ctx: Context

    @App(MidwayFrameworkType.WS)
    app: Application

    @OnWSConnection()
    async connect() {
        console.log({ stst: this.ctx.readyState });

    }

    @OnWSMessage('data')
    @WSEmit('ok')
    async data(data: any) {
        return data
    }
}