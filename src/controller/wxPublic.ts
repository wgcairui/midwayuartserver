import { Provide, Controller, Inject, Post } from "@midwayjs/decorator"
import { Context } from "@midwayjs/koa"
import { Wx } from "../util/wx"
import { Logs } from "../service/log"
import { Util } from "../util/util"
import { UserService } from "../service/user"
import { parseStringPromise } from "xml2js"
import { SHA1 } from "crypto-js"
/**
 * xml2Js解析出来的数据格式
 */
interface xmlObj {
    xml: {
        [x: string]: string[]
    }
}

/**
 * 响应微信公众号
 */
@Provide()
@Controller("/api/wxPublic")
export class WxPublic {

    @Inject()
    Wx: Wx

    @Inject()
    logs: Logs

    @Inject()
    ctx: Context

    @Inject()
    UserService: UserService

    @Inject()
    Util: Util

    @Post("/")
    async wxPublic() {
        const body: Uart.WX.wxValidation | Uart.WX.WxEvent = await parseStringPromise(this.ctx.request.body).then(el => this.parseXmlObj(el) as any);
        // 微信校验接口
        if ('signature' in body) {
            const { signature, timestamp, nonce, echostr } = body
            const secret = await this.UserService.getUserSecret('wxmpValidaton')
            const sha = SHA1([secret?.appid, timestamp, nonce].sort().join(''))
            return sha.toString() === signature ? echostr : false
        }
        const { FromUserName, Event } = body
        this.ctx.type = 'application/xml'

        // 进入事件处理流程
        if (Event) {
            switch (Event) {
                // 关注公众号
                case "subscribe":
                    const wxUser = await this.Wx.MP.getUserInfo(FromUserName)
                    const u = await this.UserService.updateWxUser(wxUser)
                    if (u && u.wpId) {
                        return this.TextMessege(body, `亲爱的用户:${u.name},我们已经自动为你的LADS透传云平台和公众号进行绑定,后期云平台的告警将会通过公众号进行推送,请注意查收!!`)
                    }
                    break
                // 取消关注
                case "unsubscribe":
                    this.UserService.delWxUser(FromUserName)
                    break

                case "SCAN":
                    {
                        /**
                         * 如果是通过二维码扫码绑定账号
                         * 通过判断有这个用户和用户还没有绑定公众号
                         * 
                         */
                        if ("Ticket" in body) {
                            const { EventKey, FromUserName } = body
                            // EventKey是用户的数据库文档id字符串
                            const user = await this.UserService.getUser(EventKey)
                            if (user && !user.wxId) {
                                const { unionid, headimgurl } = await this.Wx.MP.getUserInfo(FromUserName)
                                // 如果用户没有绑定微信或绑定的微信是扫码的微信
                                if (!user.userId || user.userId === unionid) {
                                    await this.UserService.modifyUserInfo(user.user, { userId: unionid, wxId: FromUserName, avanter: headimgurl })
                                    return this.TextMessege(body, `您好:${user.name}\n 欢迎绑定透传账号到微信公众号,我们将会在以后发送透传平台的所有消息至此公众号,请留意新信息提醒!!!\n回复'告警测试'我们将推送一条测试告警信息`)
                                }
                            }
                        }
                    }
                    break
            }

        }

        else if (body.Content) {
            switch (body.Content) {
                // 激活绑定策略
                case '绑定':
                    const wxUser = await this.Wx.MP.getUserInfo(FromUserName)
                    const u = await this.UserService.updateWxUser(wxUser)
                    if (u && u.wpId) {
                        return this.TextMessege(body, `亲爱的用户:${u.name},我们将为你的LADS透传云平台和公众号进行绑定,后期云平台的告警将会通过公众号进行推送,请注意查收!!\n回复'告警测试'我们将推送一条测试告警信息`)
                    }
                    break;

                case "告警测试":
                    await this.Wx.MP.SendsubscribeMessageDevAlarm({
                        touser: FromUserName,
                        template_id: 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
                        miniprogram: {
                            appid: "wx38800d0139103920",
                            pagepath: 'pages/index/index',
                        },
                        data: {
                            first: {
                                value: body.Content,
                                color: "#173177"
                            },
                            device: {
                                value: `test`,
                                color: "#173177"
                            },
                            time: {
                                value: this.Util.parseTime(),
                                color: "#173177"
                            },
                            remark: {
                                value: "test",
                                color: "#173177"
                            }
                        }
                    })
                    break;

                default:
                    let text = '详情请咨询400-6655778\n\n招商专线18971282941'
                    if (body.MsgType === 'text' && body.Content && body.Content !== '') {
                        const data = await this.UserService.seach_user_keywords(body.Content)
                        text = data + text
                    }
                    // 自动回复信息
                    return this.TextMessege(body, text)
                    break
            }

        }
        // 处理普通消息
        else {
            // 自动回复信息
            return this.TextMessege(body, '详情请咨询400-6655778\n\n招商专线18971282941')
        }
        return "success"
    }


    /**
 * 返回图文消息
 * @param data 
 * @returns 
 */
    TextMessege(event: Pick<Uart.WX.WxEvent, 'FromUserName' | 'ToUserName' | 'CreateTime'>, content: string) {
        return `<xml><ToUserName><![CDATA[${event.FromUserName}]]></ToUserName>` +
            `<FromUserName><![CDATA[${event.ToUserName}]]></FromUserName>` +
            `<CreateTime>${event.CreateTime + 100}</CreateTime>` +
            `<MsgType><![CDATA[text]]></MsgType>` +
            `<Content><![CDATA[${content}]]></Content></xml>`
    }

    /**
 * xml转换为onj
 * @param data 
 * @returns 
 */
    parseXmlObj(data: xmlObj): Uart.WX.WxEvent {
        const r = data.xml
        const a = {} as any
        for (let i in r) {
            a[i] = r[i][0]
        }
        return a
    }


}