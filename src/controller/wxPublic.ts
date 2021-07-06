import { Provide, Controller, Inject, Post } from "@midwayjs/decorator"
import { Context } from "@midwayjs/koa"
import { Wx } from "../util/wx"
import { Logs } from "../service/log"
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
                    this.Wx.MP.getUserInfo(FromUserName).then(el => {
                        this.UserService.updateWxUser(el)
                    })
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
                                    return this.TextMessege(body, `您好:${user.name}\n 欢迎绑定透传账号到微信公众号,我们将会在以后发送透传平台的所有消息至此公众号,请留意新信息提醒!!!`)
                                }
                            }
                        }
                    }
                    break
            }
            return "success"
        }
        // 处理普通消息
        else {
            let text = '详情请咨询400-6655778\n\n招商专线18971282941'
            if (body.MsgType === 'text' && body.Content && body.Content !== '') {
                const data = await this.UserService.seach_user_keywords(body.Content)
                text = data + text
            }
            // 自动回复信息
            return this.TextMessege(body, text)
        }

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