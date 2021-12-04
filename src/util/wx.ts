import { Provide, Scope, ScopeEnum, Inject } from '@midwayjs/decorator';
import { Logs } from '../service/log';
import { WxOpen } from '../wx/open_web';
import { WxApp } from '../wx/weapp';
import { WxPublic } from '../wx/wxpublic';

/**
 * 微信开发套件
 */
@Provide()
@Scope(ScopeEnum.Singleton)
//@Autoload()
export class Wx {
  /**
   * 公众号
   */
  @Inject()
  MP: WxPublic;
  /**
   * 小程序
   */
  @Inject()
  WP: WxApp;
  /**
   * 开放平台
   */
  @Inject()
  OP: WxOpen;

  @Inject()
  logs: Logs;

  /**
   *
   * @param postData
   * @returns
   */
  async SendsubscribeMessageDevAlarm(postData: Uart.WX.wxsubscribeMessage) {
    return this.MP.SendsubscribeMessageDevAlarm(postData).then(el => {
      this.logs.saveWxsubscribeMessage({ ...postData, result: el });
      return el;
    });
  }
}
