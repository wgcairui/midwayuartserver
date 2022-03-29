import { fetch } from './fetch';
import { RedisService } from '../service/redisService';

/**
 * 微信公众号api
 */
export class App {
  primary_industry_first: string;
  primary_industry_second: string;

  secret() {
    return RedisService.Secret.wxPublic;
  }

  /**
   * 获取请求密匙
   * @returns
   */
  private async getToken() {
    const token = await RedisService.redisService.get('wxpublictoken');
    // 如果没有密匙或密匙已超时,重新请求密匙
    if (!token) {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${
        this.secret().appid
      }&secret=${this.secret().secret}`;
      const { access_token, expires_in, errcode, errmsg } =
        await fetch<Uart.WX.wxRequestAccess_token>({ url, method: 'GET' });
      if (errcode) throw new Error(errmsg);
      await RedisService.redisService.setex(
        'wxpublictoken',
        expires_in,
        access_token
      );
      return access_token;
    }
    return token;
    // 如果没有密匙或密匙已超时,重新请求密匙
    /*  if (!this.token || Date.now() > (this.expires_in * 1000) + this.expreTime) {
             const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appid}&secret=${this.secret()}`
             const { access_token, expires_in } = await fetch<Uart.WX.wxRequestAccess_token>({ url, method: 'GET' })
             this.token = access_token
             this.expires_in = expires_in
             this.expreTime = Date.now()
         }
         return this.token */
  }

  /**
   * 获取公众号行业代码
   */
  async getIndustry() {
    const url = `https://api.weixin.qq.com/cgi-bin/template/get_industry?access_token=${await this.getToken()}`;
    const { primary_industry, secondary_industry } =
      await fetch<Uart.WX.wxRequest_industry>({ url, method: 'GET' });
    this.primary_industry_first = primary_industry.first_class;
    this.primary_industry_second = primary_industry.second_class;
    return {
      primary_industry_first: primary_industry.first_class,
      primary_industry_second: primary_industry.second_class,
      secondary_industry,
    };
  }

  /**
   * 创建公众号自定义菜单
   */
  public async CreateMeun(menu: Uart.WX.menu) {
    const url = `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${await this.getToken()}`;
    return await fetch<Uart.WX.wxRequest>({ url, method: 'POST', data: menu });
  }

  /**
   * 发送模板消息
   * @param postData
   * @returns
   */
  async SendsubscribeMessageDevAlarm(postData: Uart.WX.wxsubscribeMessage) {
    const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${await this.getToken()}`;
    return await fetch<Uart.WX.wxRequest>({
      url,
      method: 'POST',
      data: postData,
    });
  }

  /**
   * 获取公众号用户信息
   * @param openid 用户id
   */
  async getUserInfo(openid: string) {
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${await this.getToken()}&openid=${openid}&lang=zh_CN`;
    return await fetch<Uart.WX.userInfoPublic>({ url, method: 'GET' });
  }

  /**
   * 批量获取公众号用户信息,每次最大100个
   * @param wxIds 用户id
   */
  async getUserInfos(wxIds: string[]) {
    const url = `https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=${await this.getToken()}`;
    const data = {
      user_list: wxIds.slice(0, 100).map(el => ({
        openid: el,
        lang: 'zh_CN',
      })),
    };
    return await fetch<{ user_info_list: Uart.WX.userInfoPublic[] }>({
      url,
      data,
      method: 'POST',
    });
  }

  /**
   * 获取关注用户列表,每次返回1000个
   * @param next_openid 第一个拉取的OPENID，不填默认从头开始拉取
   */
  private async getUserlist(next_openid?: string) {
    const url = `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${await this.getToken()}${
      next_openid ? `&next_openid=${next_openid}` : ''
    }`;
    return await fetch<Uart.WX.userlistPublic>({ url, method: 'GET' });
  }

  /**
   * 获取全部关注者列表
   * 获取关注者列表,批量获取用户信息
   */
  async getUserlistAll() {
    const data = await this.getUserlist();
    const r = { total: data.total, list: data.data.openid };
    const next = data.next_openid;
    if (data.total > 10000) {
      for (let index = 1; index * 10000 < data.total; index++) {
        const {
          data: { openid },
        } = await this.getUserlist(next);
        r.list.concat(openid);
      }
    }
    const set = new Set(r.list);
    r.list = [...set];
    return r;
  }

  /**
   *  获取所有用户信息
   */
  async saveUserInfo() {
    const now = Date.now();
    const { total, list } = await this.getUserlistAll();
    /* const users = [] as Uart.WX.userInfoPublic[]
        for (let index = 0; index < total; index = index + 100) {
            const ids = list.slice(index, index + 100)
            const { user_info_list } = await this.getUserInfos(ids)
            if (user_info_list) {
                users.push(...user_info_list)
            }
        } */
    const p = [] as Promise<{ user_info_list: Uart.WX.userInfoPublic[] }>[];
    for (let index = 0; index < total; index = index + 100) {
      const ids = list.slice(index, index + 100);
      p.push(this.getUserInfos(ids));
    }
    const result = await Promise.all(p);
    const users = result.map(el => el.user_info_list).flat();
    return { code: 0, users, count: users.length, time: Date.now() - now };
  }

  /**
   * 获取参数公众号二维码ticket,绑定账号
   * https://developers.weixin.qq.com/doc/offiaccount/Account_Management/Generating_a_Parametric_QR_Code.html
   * @param scene_str 二维码携带的自定义信息
   * @param expire_seconds 二维码有效期,默认360s
   * @returns 二维码图像链接
   */
  async getTicket(scene_str: string, expire_seconds = 360) {
    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${await this.getToken()}`;
    const data = {
      expire_seconds,
      action_name: 'QR_STR_SCENE',
      action_info: { scene: { scene_str } },
      scene_str: 'binduser',
      scene_id: 520,
    };
    const { ticket } = await fetch<Uart.WX.ticketPublic>({
      url,
      data,
      method: 'POST',
    });
    return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${ticket}`;
  }

  /**
   * 获取永久素材的列表
   * @param type 素材的类型，图片（image）、视频（video）、语音 （voice）、图文（news）
   * @param offset 从全部素材的该偏移位置开始返回，0表示从第一个素材 返回
   * @param count 返回素材的数量，取值在1到20之间
   */
  async get_materials_list_Public(opt?: {
    type?: 'image' | 'video' | 'voice' | 'news';
    offset?: number;
    count?: number;
  }) {
    const opts = Object.assign({ type: 'news', offset: 0, count: 20 }, opt);
    const url = `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${await this.getToken()}`;
    return await fetch<Uart.WX.materials_list>({
      url,
      data: opts,
      method: 'POST',
    });
  }
}

export const WxPublics = new App();
