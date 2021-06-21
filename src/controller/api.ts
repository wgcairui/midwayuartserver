import { Provide, Controller, Inject, Post, Body, Validate, ALL } from "@midwayjs/decorator"
import { Context } from "@midwayjs/koa"
import { UserService } from "../service/user"
import { Device } from "../service/device"
import { RedisService } from "../service/redis"
import { date, Api, mongoId, modifiTerminalName, mac, macPid, addMountDev, smsCode, alarmTels, protocol, terminalResults } from "../dto/user"
import { Sms } from "../decorator/smsValidation"
import * as lodash from "lodash"

@Provide()
@Controller("/api", { middleware: ['token'] })
export class ApiControll {

    @Inject()
    UserService: UserService

    @Inject()
    Device: Device

    @Inject()
    RedisService: RedisService

    @Inject()
    ctx: Context

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

    /**
   *   添加用户终端挂载设备
   * @param mac 
   * @param param2 
   * @returns 
   */
    @Post("/addTerminalMountDev")
    @Validate()
    @Sms()
    async addTerminalMountDev(@Body(ALL) data: addMountDev) {
        const d = await this.UserService.addTerminalMountDev(data.token.user, data.mac, data.mountDev)
        return {
            code: d ? 200 : 0,
            data: d,
            msg: d ? "success" : 'mac is binding'
        }
    }


    /**
     * 校验用户权限
     * @param data 
     * @returns 
     */
    @Post("/smsValidation")
    @Validate()
    async smsValidation(@Body(ALL) data: Api) {
        const sr = await this.UserService.sendValidation(data.token.user)
        if (sr.code) {
            await this.RedisService.getClient().setex(data.token.user + 'sms', 6 * 60, sr.data)


            return {
                code: 200,
                msg: sr.msg
            }
        } else {
            return {
                code: 0,
                msg: sr.msg
            }
        }
    }
    /**
         * 校验用户权限短信验证码
         * @param data 
         * @returns 
         */
    @Post("/smsCodeValidation")
    @Validate()
    async smsCodeValidation(@Body(ALL) data: smsCode) {
        const code = Number(await this.RedisService.getClient().get(data.token.user + 'sms'))
        if (code === data.code) {
            await this.RedisService.getClient().setex(this.ctx.cookies.get("auth._token.local"), 60 * 60 * 72, 'true')
        }
        return {
            code: !code || code !== data.code ? 0 : 200,
            msg: !code ? '验证码已失效' : (code !== data.code ? '验证码错误' : 'success')
        }
    }

    /**
   * 获取用户告警配置
   * @returns 
   */
    @Post("/getUserAlarmSetup")
    @Validate()
    async getUserAlarmSetup(@Body(ALL) data: Api) {
        return {
            code: 200,
            data: await this.UserService.getUserAlarmSetup(data.token.user, { tels: 1, mails: 1 })
        }
    }

    /**
  * 修改用户告警配置联系方式
  * @param user 
  * @param tels 联系电话
  * @param mails 联系邮箱
  * @returns 
  */
    @Post("/modifyUserAlarmSetupTel")
    @Validate()
    async modifyUserAlarmSetupTel(@Body(ALL) data: alarmTels) {
        return {
            code: 200,
            data: await this.UserService.modifyUserAlarmSetupTel(data.token.user, data.tels, data.mails)
        }
    }


    /**
   * 修改用户信息
   * @param user 
   * @param data 
   * @returns 
   */
    @Post("/modifyUserInfo")
    async modifyUserInfo(@Body() token: { user: string }, @Body() data: Partial<Uart.UserInfo>) {
        return {
            code: 200,
            data: await this.UserService.modifyUserInfo(token.user, lodash.omit(data, "user"))
        }
    }

    /**
       * 获取公众号二维码
       * @param user 
       * @returns 
       */
    @Post("/mpTicket")
    @Validate()
    async mpTicket(@Body(ALL) data: Api) {
        const d = await this.UserService.mpTicket(data.token.user)
        return {
            code: typeof d === "string" ? 200 : 0,
            data: d
        }
    }

    /**
       * 获取小程序二维码
       * @param user 
       * @returns 
       */
    @Post("/wpTicket")
    @Validate()
    async wpTicket(@Body(ALL) data: Api) {
        const d = await this.UserService.wpTicket(data.token.user)
        return {
            code: typeof d === "string" ? 200 : 0,
            data: d
        }
    }

    /**
   * 获取用户单个协议告警配置
   * @param user 
   * @param protocol 
   */
    @Post("/getUserAlarmProtocol")
    @Validate()
    async getUserAlarmProtocol(@Body(ALL) data: protocol) {
        return {
            code: 200,
            data: await this.UserService.getUserAlarmProtocol(data.token.user, data.protocol)
        }
    }

    /**
   * 获取单个协议告警配置
   * @param protocol 
   */
    @Post("/getAlarmProtocol")
    @Validate()
    async getAlarmProtocol(@Body(ALL) data: protocol) {
        return {
            code: 200,
            data: await this.Device.getAlarmProtocol(data.protocol)
        }
    }

    /**
   * 获取用户设备运行数据
   * @param user 
   * @param mac 
   * @param pid 
   */
    @Post("/getTerminalData")
    @Validate()
    async getTerminalData(@Body(ALL) data: macPid) {
        const d = await this.UserService.getTerminalData(data.token.user, data.mac, data.pid)
        return {
            code: d ? 200 : 0,
            data: d,
            msg: d ? "success" : 'mac is binding'
        }
    }

    /**
   * 获取用户设备运行数据
   * @param user 
   * @param mac 
   * @param pid 
   */
    @Post("/getTerminalDatas")
    @Validate()
    async getTerminalDatas(@Body(ALL) data: terminalResults) {
        const d = await this.UserService.getTerminalDatas(data.token.user, data.mac, data.pid, data.name, data.getStart(), data.getEnd()) as unknown as Uart.queryResultSave[]
        if (d) {
            if (d.length < 50) {
                return {
                    code: 200,
                    data: lodash.sortBy(d, 'timeStamp')
                }
            }
            // 把结果拆分为块,50等分
            const len = Number.parseInt((d.length / 50).toFixed(0))
            const resultChunk = lodash.chunk(d.map(els => {
                els.tempValue = els.result[0].value
                return els
            }), len < 10 ? 10 : len)
            const arrs = resultChunk.map(el => [lodash.maxBy(el, 'tempValue')!, lodash.minBy(el, 'tempValue')!]).flat()
            return {
                code: 200,
                data: lodash.sortBy(arrs, 'timeStamp')
            }

        } else {
            return {
                code: 0,
                msg: 'error nodata'
            }
        }
    }

}

