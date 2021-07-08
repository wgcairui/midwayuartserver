import { Provide, Scope, ScopeEnum, Inject, App, MidwayFrameworkType } from "@midwayjs/decorator"
import { Application as IO } from "@midwayjs/socketio"
//import { Application as WS } from "@midwayjs/ws"
import { Util } from "../util/util"
import { Logs } from "./log"
import { RedisService } from "./redis"
import { Device } from "./device"
import { UserService } from "../service/user"

@Provide()
@Scope(ScopeEnum.Singleton)
export class SocketUser {

    @Inject()
    Util: Util

    @Inject()
    log: Logs

    @Inject()
    RedisService: RedisService


    @Inject()
    Device: Device

    @Inject()
    UserService: UserService

    @App(MidwayFrameworkType.WS_IO)
    app: IO

    /* @App(MidwayFrameworkType.WS)
    ws: WS */

    /**
     * 
     * @param mac 向客户端发送设备变更日志
     */
    async sendMacUpdate(mac: string) {
        const user = await this.UserService.getBindMacUser(mac)
        if (user) {
            this.app.of("/web").in(user).emit("MacUpdate", mac)
            //this.ws.emit("MacUpdate", mac)
        }
    }


}