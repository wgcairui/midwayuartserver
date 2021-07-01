import { Provide, Inject } from "@midwayjs/decorator"
import { UserService } from "../service/user"
import { Device } from "../service/device"
import { Util } from "../util/util"
import { Sms } from "../util/sms"
import { Wx } from "../util/wx"
import { Mail } from "../util/mail"
import { alarm } from "../interface"

@Provide()
export class Alarm {

    @Inject()
    UserService: UserService

    @Inject()
    Device: Device

    @Inject()
    Util: Util

    @Inject()
    Sms: Sms

    @Inject()
    Wx: Wx

    @Inject()
    Mail: Mail

    async timeOut(mac: string, pid: number, devName: string, event: '超时' | '恢复', time: number | Date) {
        const user = await this.getMactoUser(mac)
        if (user) {
            const ter = await this.getTerminal(mac)
            if (user.wxid) {
                return {
                    type: 'wx',
                    data: await this.Wx.MP.SendsubscribeMessageDevAlarm({
                        touser: user.wxid,
                        template_id: 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
                        miniprogram: {
                            appid: "wx38800d0139103920",
                            pagepath: "/pages/index/alarm/alarm",
                        },
                        data: {
                            first: {
                                value: `设备[${ter.name}/${devName}]连接${event}${event === '超时' ? ',请检查设备连接状态' : ''}`,
                                color: "#173177"
                            },
                            device: {
                                value: `${ter.name}/${devName}`,
                                color: "#173177"
                            },
                            time: {
                                value: this.Util.parseTime(time),
                                color: "#173177"
                            },
                            remark: {
                                value: event,
                                color: "#173177"
                            }
                        }
                    })
                }
            } else if (user.tels) {
                return {
                    type: 'sms',
                    data: await this.Sms.SmsDTUDevTimeOut(user.tels, { pid, devName, event, name: user.name, DTU: ter.name })
                }
            } else if (user.mails) {
                const body = `<p><strong>尊敬的${user.name}</strong></p>
                <hr />
                <p><strong>您的DTU <em>${ter.name}</em> ${pid ? '挂载的 ' + devName : ''} 告警</strong></p>
                <p><strong>告警时间:&nbsp; </strong>${this.Util.parseTime()}</p>
                <p><strong>告警事件:</strong>&nbsp; ${event}</p>
                <p>您可登录 <a title="透传服务平台" href="https://uart.ladishb.com" target="_blank" rel="noopener">LADS透传服务平台</a> 查看处理(右键选择在新标签页中打开)</p>
                <hr />
                <p>&nbsp;</p>
                <p>扫码使用微信小程序查看</p>
                <p><img src="https://www.ladishb.com/upload/3312021__LADS_Uart.5df2cc6.png" alt="weapp" width="430" height="430" /></p>
                <p>&nbsp;</p>`
                return {
                    type: "mail",
                    data: await this.Mail.send(user.mails.join(","), "Ladis透传平台", "设备告警", body)
                }
            }
        }
    }

    async offline(mac: string, event: '恢复上线' | '离线', time: number | Date) {
        const user = await this.getMactoUser(mac)
        if (user) {
            const ter = await this.getTerminal(mac)
            if (user.wxid) {
                return {
                    type: 'wx',
                    data: await this.Wx.MP.SendsubscribeMessageDevAlarm({
                        touser: user.wxid,
                        template_id: 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
                        miniprogram: {
                            appid: "wx38800d0139103920",
                            pagepath: "/pages/index/alarm/alarm",
                        },
                        data: {
                            first: {
                                value: `设备[${ter.name}]${event}${event === '离线' ? ',请检查设备或网络状态' : ''}`,
                                color: "#173177"
                            },
                            device: {
                                value: `${ter.name}`,
                                color: "#173177"
                            },
                            time: {
                                value: this.Util.parseTime(time),
                                color: "#173177"
                            },
                            remark: {
                                value: event,
                                color: "#173177"
                            }
                        }
                    })
                }
            } else if (user.tels?.length > 0) {
                return {
                    type: 'sms',
                    data: await this.Sms.send({
                        "RegionId": "cn-hangzhou",
                        "PhoneNumbers": user.tels.join(","),
                        "SignName": "雷迪司科技湖北有限公司",
                        "TemplateCode": 'SMS_200691431',
                        TemplateParam: JSON.stringify({
                            name: user.name,
                            DTU: ter.name,
                            time: this.Util.parseTime(time),
                            remind: event
                        })
                    })//.SmsDTUDevTimeOut(user.tels, { pid, devName, event, name: user.name, DTU: ter.name })
                }
            } else if (user.mails?.length > 0) {
                const body = `<p><strong>尊敬的${user.name}</strong></p>
                <hr />
                <p><strong>您的DTU <em>${ter.name}</em> ${event}</strong></p>
                <p><strong>时间:&nbsp; </strong>${this.Util.parseTime()}</p>
                <p><strong>事件:</strong>&nbsp; ${event}</p>
                <p>您可登录 <a title="透传服务平台" href="https://uart.ladishb.com" target="_blank" rel="noopener">LADS透传服务平台</a> 查看处理(右键选择在新标签页中打开)</p>
                <hr />
                <p>&nbsp;</p>
                <p>扫码使用微信小程序查看</p>
                <p><img src="https://www.ladishb.com/upload/3312021__LADS_Uart.5df2cc6.png" alt="weapp" width="430" height="430" /></p>
                <p>&nbsp;</p>`
                return {
                    type: "mail",
                    data: await this.Mail.send(user.mails.join(","), "Ladis透传平台", "设备告警", body)
                }
            }
        }
    }

    /**
     * 发送参数告警
     * @param mac 
     * @param pid 
     * @param time 
     */
    async argumentAlarm(mac: string, pid: number, alarm: alarm[]) {
        const user = await this.getMactoUser(mac)
        if (user) {
            const ter = await this.getTerminal(mac)
            const dev = ter.mountDevs.find(el => el.pid === pid)
            if (user.wxid) {
                return {
                    type: 'wx',
                    data: await this.Wx.MP.SendsubscribeMessageDevAlarm({
                        touser: user.wxid,
                        template_id: 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
                        miniprogram: {
                            appid: "wx38800d0139103920",
                            pagepath: "/pages/index/alarm/alarm",
                        },
                        data: {
                            first: {
                                value: `[${ter.name}/${dev.mountDev}] 运行异常`,
                                color: "#173177"
                            },
                            device: {
                                value: `${ter.name}/${dev.mountDev}`,
                                color: "#173177"
                            },
                            time: {
                                value: this.Util.parseTime(alarm[0].timeStamp),
                                color: "#173177"
                            },
                            remark: {
                                value: alarm.map(el => {
                                    const str = el.tag === 'ups' ? '' : (el.tag === "Threshold" ? [(el.contant as Uart.Threshold).min, (el.contant as Uart.Threshold).max].join('~') : '');
                                    return `${el.argument}[${el.data.parseValue}],参考值:[${str}]`
                                }).join('\n'),
                                color: "#173177"
                            }
                        }
                    })
                }
            } else if (user.tels) {
                const remind = alarm.length === 1 ? `${alarm[0].argument}[${alarm[0].data.parseValue}]` : `${alarm.map(el => el.argument).slice(0, 2).join(',')}等告警`
                const TemplateParam = JSON.stringify({
                    name: user.name,
                    DTU: ter.name,
                    pid: pid,
                    devname: dev.mountDev,
                    time: this.Util.parseTime(alarm[0].timeStamp),
                    remind
                })
                return {
                    type: 'sms',
                    data: await this.Sms.send({
                        "RegionId": "cn-hangzhou",
                        "PhoneNumbers": user.tels.join(','),
                        "SignName": "雷迪司科技湖北有限公司",
                        "TemplateCode": 'SMS_200701342',
                        TemplateParam
                    })
                }
            } else if (user.mails) {
                const body = `<p><strong>尊敬的${user.name}</strong></p>
                <hr />
                <p><strong>您的DTU <em>${ter.name}</em> 挂载的 ${dev.mountDev} 告警</strong></p>
                <p><strong>告警时间:&nbsp; </strong>${this.Util.parseTime(alarm[0].timeStamp)}</p>
                ${alarm.map(el => {
                    const str = el.tag === 'ups' ? '' : (el.tag === 'AlarmStat' ? (el.contant as Uart.ConstantAlarmStat).alarmStat : [(el.contant as Uart.Threshold).min, (el.contant as Uart.Threshold).max].join('~'));
                    return `<p><strong>告警事件:</strong>&nbsp; ${el.argument}</p>
                    <p><strong>实际值: </strong>&nbsp;${el.data.parseValue}</p>
                    <p><strong>参考值: </strong>&nbsp;${str}</p>`
                })}
                <p>您可登录 <a title="透传服务平台" href="https://uart.ladishb.com" target="_blank" rel="noopener">LADS透传服务平台</a> 查看处理(右键选择在新标签页中打开)</p>
                <hr />
                <p>&nbsp;</p>
                <p>扫码或点击程序码使用微信小程序查看</p>
                <a href="weixin://dl/business/?t=203U27hghyu" target="_blank"><img src="https://www.ladishb.com/admin/upload/3312021__LADS_Uart.5df2cc6.png" alt="weapp" width="430" height="430" /></a>
                <p>&nbsp;</p>`
                return {
                    type: "mail",
                    data: await this.Mail.send(user.mails.join(","), "Ladis透传平台", "设备告警", body)
                }
            }
        }
    }

    /**
     * 根据mac获取用户告警号码和邮箱,wx
     * @param mac 
     * @returns 
     */
    async getMactoUser(mac: string) {
        const bind = await this.UserService.userbindModel.findOne({ UTs: mac }, { user: 1 }).lean()
        if (bind) {
            const user = await this.UserService.getUser(bind.user, { tel: 1, mail: 1, wxId: 1, user: 1, name: 1 })
            const userSetup = await this.UserService.getUserAlarmSetup(bind.user, { tels: 1, mails: 1 })
            return {
                user: user.user,
                name: user.name,
                wxid: user.wxId,
                tels: userSetup.tels || [],
                mails: userSetup.mails || []
            }
        } else {
            return null
        }
    }

    /**
     * 根据获取用户号码和邮箱,wx
     * @param user
     * @returns 
     */
    async getUser(user: string) {
        return await this.UserService.getUser(user, { tel: 1, mail: 1, wxId: 1 })
    }

    /**
     * 获取设备信息
     * @param mac 
     * @returns 
     */
    async getTerminal(mac: string) {
        return await this.Device.getTerminal(mac)
    }
}