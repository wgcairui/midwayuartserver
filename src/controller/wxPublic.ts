import { Provide, Controller, Inject, Post } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { Wx } from '../util/wx';
import { Logs } from '../service/logBase';
import { Util } from '../util/util';
import { UserService } from '../service/user';
import { parseStringPromise } from 'xml2js';
import { SHA1 } from 'crypto-js';
/**
 * xml2Js解析出来的数据格式
 */
interface xmlObj {
  xml: {
    [x: string]: string[];
  };
}

/**
 * 响应微信公众号
 */
@Provide()
@Controller('/api/wxPublic')
export class WxPublic {
  @Inject()
  Wx: Wx;

  @Inject()
  logs: Logs;

  @Inject()
  ctx: Context;

  @Inject()
  UserService: UserService;

  @Inject()
  Util: Util;

  @Post('/')
  async wxPublic() {
    const body: Uart.WX.wxValidation | Uart.WX.WxEvent =
      await parseStringPromise(this.ctx.request.body).then(
        el => this.parseXmlObj(el) as any
      );
    this.logs.saveWxEvent(body);
    // 微信校验接口
    if ('signature' in body) {
      const { signature, timestamp, nonce, echostr } = body;
      const secret = await this.UserService.getUserSecret('wxmpValidaton');
      const sha = SHA1([secret?.appid, timestamp, nonce].sort().join(''));
      return sha.toString() === signature ? echostr : false;
    }
    const { FromUserName, Event } = body;
    this.ctx.type = 'application/xml';

    // 进入事件处理流程
    if (Event) {
      // console.log('wx推送:进入事件处理流程');

      switch (Event) {
        // 关注公众号
        case 'subscribe':
          {
            const wxUser = await this.Wx.MP.getUserInfo(FromUserName);
            const u = await this.UserService.updateWxUser(wxUser);
            // 如果可以根据unidid找到用户
            if (u && u.wpId) {
              return this.TextMessege(
                body,
                `亲爱的用户:${u.name},我们已经自动为你的LADS透传云平台和公众号进行绑定,后期云平台的告警将会通过公众号进行推送,请注意查收!!`
              );
            } else if ('Ticket' in body && body.EventKey) {
              /**
               * 如果是通过二维码扫码绑定账号
               * 通过判断有这个用户和用户还没有绑定公众号
               *
               */

              /**
               * 修改策略,同一用户公众号可绑定多个平台用户,和uniid解绑
               */
              const { EventKey, FromUserName } = body;
              // EventKey是用户的数据库文档id字符串
              const user = await this.UserService.getIdUser(
                EventKey.replace('qrscene_', '')
              );
              // 如果有用户和用户还没有绑定公众号
              if (user && !user.wxId) {
                const { headimgurl } = wxUser;
                // 如果用户没有绑定微信或绑定的微信是扫码的微信
                //if (!user.userId || user.userId === unionid) {
                //if(!user.userId)
                await this.UserService.modifyUserInfo(user.user, {
                  wxId: FromUserName,
                  avanter: headimgurl,
                });
                return this.TextMessege(
                  body,
                  `您好:${user.name}\n 欢迎绑定透传账号到微信公众号,我们将会在以后发送透传平台的所有消息至此公众号,请留意新信息提醒!!!\n回复'告警测试'我们将推送一条测试告警信息`
                );
              }
            }
          }
          break;
        // 取消关注
        case 'unsubscribe':
          {
            /**
             * 解绑存在一种无法避免的边界情况
             * 当用户公众号和小程序不是同一个主体绑定时,userId会是后一个绑定主体的unionid
             * 此种情况会导致解绑的时候找不到用户
             */
            const users = await this.UserService.userModel
              .find({ wxId: body.FromUserName })
              .lean();
            // 如果有用户,解绑用户的公众号关联
            users.forEach(user => {
              this.UserService.modifyUserInfo(user.user, { wxId: '' });
            });
            await this.UserService.delWxUser(FromUserName);
          }
          break;

        case 'SCAN':
          {
            /**
             * 如果是通过二维码扫码绑定账号
             * 通过判断有这个用户和用户还没有绑定公众号
             *
             */
            if ('Ticket' in body) {
              const { EventKey, FromUserName } = body;
              // EventKey是用户的数据库文档id字符串
              const user = await this.UserService.getIdUser(EventKey);
              if (user && !user.wxId) {
                const { headimgurl } = await this.Wx.MP.getUserInfo(
                  FromUserName
                );
                // 如果用户没有绑定微信或绑定的微信是扫码的微信
                //if (!user.userId || user.userId === unionid) {
                await this.UserService.modifyUserInfo(user.user, {
                  wxId: FromUserName,
                  avanter: headimgurl,
                });
                return this.TextMessege(
                  body,
                  `您好:${user.name}\n 欢迎绑定透传账号到微信公众号,我们将会在以后发送透传平台的所有消息至此公众号,请留意新信息提醒!!!\n回复'告警测试'我们将推送一条测试告警信息`
                );
              }
            }
          }
          break;
      }
    } else if (body.Content) {
      switch (body.Content) {
        // 激活绑定策略
        case '绑定':
          {
            const { unionid } = await this.UserService.getWxUser(
              body.FromUserName
            );
            const u = await this.UserService.getUser(unionid);
            if (u && u.wpId) {
              return this.TextMessege(
                body,
                `亲爱的用户:${u.name},我们将为你的LADS透传云平台和公众号进行绑定,后期云平台的告警将会通过公众号进行推送,请注意查收!!\n回复'告警测试'我们将推送一条测试告警信息`
              );
            }
          }
          break;

        case '告警测试':
          {
            const { unionid } = await this.UserService.getWxUser(
              body.FromUserName
            );
            const user = await this.UserService.getUser(unionid);
            await this.Wx.SendsubscribeMessageDevAlarm({
              touser: FromUserName,
              template_id: 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
              miniprogram: {
                appid: 'wx38800d0139103920',
                pagepath: 'pages/index/index',
              },
              data: {
                first: {
                  value: `${user.name}的测试`,
                  color: '#173177',
                },
                device: {
                  value: 'test',
                  color: '#173177',
                },
                time: {
                  value: this.Util.parseTime(),
                  color: '#173177',
                },
                remark: {
                  value: body.Content,
                  color: '#173177',
                },
              },
            });
          }
          break;

        default: {
          let text = '详情请咨询400-6655778';
          if (body.MsgType === 'text' && body.Content && body.Content !== '') {
            const data = await this.UserService.seach_user_keywords(
              body.Content
            );
            text = data + text;
          }
          // 自动回复信息
          return this.TextMessege(body, text);
        }
      }
    }
    // 处理普通消息
    else {
      // 自动回复信息
      return this.TextMessege(
        body,
        '详情请咨询400-6655778'
      );
    }
    return 'success';
  }

  /**
   * 返回图文消息
   * @param data
   * @returns
   */
  TextMessege(
    event: Pick<Uart.WX.WxEvent, 'FromUserName' | 'ToUserName' | 'CreateTime'>,
    content: string
  ) {
    return (
      `<xml><ToUserName><![CDATA[${event.FromUserName}]]></ToUserName>` +
      `<FromUserName><![CDATA[${event.ToUserName}]]></FromUserName>` +
      `<CreateTime>${event.CreateTime + 100}</CreateTime>` +
      '<MsgType><![CDATA[text]]></MsgType>' +
      `<Content><![CDATA[${content}]]></Content></xml>`
    );
  }

  /**
   * xml转换为onj
   * @param data
   * @returns
   */
  parseXmlObj(data: xmlObj): Uart.WX.WxEvent {
    const r = data.xml;
    const a = {} as any;
    for (const i in r) {
      a[i] = r[i][0];
    }
    return a;
  }
}
