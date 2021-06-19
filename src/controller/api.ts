import { Provide, Controller, Inject, Post, Body, Validate, ALL } from "@midwayjs/decorator"
import { UserService } from "../service/user"
import { Device } from "../service/device"
import { date, Api, mongoId, modifiTerminalName, mac, macPid } from "../dto/user"

@Provide()
@Controller("/api", { middleware: ['token'] })
export class ApiControll {

    @Inject()
    UserService: UserService

    @Inject()
    Device: Device

    /**
     * 获取用户绑定设备
     * @param token 
     * @returns 
     */
    @Post("/BindDev")
    @Validate()
    async BindDev(@Body(ALL) data: Api) {
        return {
            code: 200,
            data: await this.UserService.getUserBindDevices(data.token.user)
        }
    }

    /**
     * 获取用户告警信息
     * @param token 
     */
    @Validate()
    @Post("/loguartterminaldatatransfinites")
    async loguartterminaldatatransfinites(@Body(ALL) data: date) {
        return {
            code: 200,
            data: await this.UserService.getUserAlarm(data.token.user, data.getStart(), data.getEnd(), { mac: 1, isOk: 1, pid: 1, devName: 1, tag: 1, msg: 1, timeStamp: 1 })
        }
    }

    /**
     * 获取用户信息
     * @param data 
     * @returns 
     */
    @Post("/userInfo")
    @Validate()
    async userinfo(@Body(ALL) data: Api) {
        return {
            code: 200,
            data: await this.UserService.getUser(data.token.user, { _id: 0, passwd: 0, createdAt: 0, updatedAt: 0 })
        }
    }

    /**
   * 确认用户告警信息
   * @param user 
   * @param id 
   * @returns 
   */
    @Post("/confrimAlarm")
    @Validate()
    async confrimAlarm(@Body(ALL) data: mongoId) {
        return {
            code: 200,
            data: await this.UserService.confrimAlarm(data.token.user, data.getId())
        }
    }


    /**
     * 获取指定且在线的终端
     * @param mac 
     * @returns 
     */
    @Post("/getTerminalOnline")
    @Validate()
    async getTerminalOnline(@Body(ALL) data: mac) {
        return {
            code: 200,
            data: await this.Device.getTerminalOnline(data.mac)
        }
    }

    /**
       * 修改用户设备别名
       * @returns 
       */
    @Post("/modifyTerminal")
    @Validate()
    async modifyTerminal(@Body(ALL) data: modifiTerminalName) {
        return {
            code: 200,
            data: await this.UserService.modifyTerminal(data.token.user, data.mac, data.name)
        }
    }

    /**
   * 添加绑定设备
   * @param user 
   * @param mac 
   */
    @Post("/addUserTerminal")
    @Validate()
    async addUserTerminal(@Body(ALL) data: mac) {
        const d = await this.UserService.addUserTerminal(data.token.user, data.mac)
        return {
            code: d ? 200 : 0,
            data: d,
            msg: d ? "success" : 'mac is binding'
        }
    }

    /**
   * 删除绑定设备
   * @param user 
   * @param mac 
   * @returns 
   */
    @Post("/delUserTerminal")
    @Validate()
    async delUserTerminal(@Body(ALL) data: mac) {
        return {
            code: 200,
            data: await this.UserService.delUserTerminal(data.token.user, data.mac)
        }
    }

    /**
    * 获取设备类型
    * @param Type 
    * @returns 
    */
    @Post("/getDevTypes")
    async getDevTypes(@Body() Type: string) {
        return {
            code: 200,
            data: await this.Device.getDevTypes(Type)
        }
    }

    /**
   * 删除终端挂载设备
   * @param mac 
   * @param pid 
   */
    @Post("/delTerminalMountDev")
    @Validate()
    async delTerminalMountDev(@Body(ALL) data: macPid) {
        const d = await this.UserService.delTerminalMountDev(data.token.user, data.mac, data.pid)
        return {
            code: d ? 200 : 0,
            data: d,
            msg: d ? "success" : 'mac is binding'
        }
    }

}