import { Provide, Scope, ScopeEnum, Inject } from '@midwayjs/decorator';
import { Logs } from '../service/logBase';
import { WxOpens } from '../wx/open_web';
import { WxApps } from '../wx/weapp';
import { WxPublics } from '../wx/wxpublic';

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
  MP: WxPublics;
  /**
   * 小程序
   */
  @Inject()
  WP: WxApps;
  /**
   * 开放平台
   */
  @Inject()
  OP: WxOpens;

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
