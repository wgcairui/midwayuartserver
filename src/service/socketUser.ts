import { Provide, Inject, App, MidwayFrameworkType } from "@midwayjs/decorator"
import { Application as IO } from "@midwayjs/socketio"
import { UserService } from "../service/user"

@Provide()
export class SocketUser {

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
        this.toUser(mac, "MacUpdate", { mac })
    }

    /**
     * 
     * @param mac 向客户端发送设备数据更新
     */
    async sendMacDateUpdate(mac: string, pid: number) {
        this.toUser(mac, "MacDateUpdate" + mac + pid, { mac, pid })
    }


    /**
     * 向用户发送告警提醒
     * @param mac 
     * @param alarm 
     */
    async sendMacAlarm(mac: string, alarm: Uart.uartAlarmObject) {
        this.toUser(mac, 'alarm', alarm)
    }

    /**
     * 向用户发送socket事件
     * @param mac 
     * @param events 
     * @param data 
     */
    private async toUser(mac: string, events: string, data: any = {}) {
        const user = await this.UserService.getBindMacUser(mac)
        if (user) {
            this.app.of("/web").in(user).emit(events, data)
            //this.ws.emit("MacUpdate", mac)
        }
    }

    /**
     * 给root用户推送告警信息
     * @param msg 
     * @param type 消息类型
     * @param user 
     */
    sendRootSocketMessage(msg: string, type: string = "message", user: string = "root") {
        this.app.of("/web").in(user).emit("message", msg)
    }


}