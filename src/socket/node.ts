
import { Provide, WSController, Inject, App, OnWSConnection, MidwayFrameworkType, OnWSMessage, WSEmit } from "@midwayjs/decorator"
import { Context, Application } from "@midwayjs/socketio"

@Provide()
@WSController("/")
export class NodeSocket {
    @Inject()
    ctx: Context

    @App(MidwayFrameworkType.WS_IO)
    app: Application

    @OnWSConnection()
    async connect() {
        //console.log({ id: this.ctx.id });

    }

    @OnWSMessage('a')
    @WSEmit('b')
    async a(data: string) {
        return data
    }
}