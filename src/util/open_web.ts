import { getSecretKey } from './base';
import { fetch, parseUrl } from './fetch';

/**
 * 封装微信开放平台-web应用
 */
function getSecret() {
  return getSecretKey('wxopen');
}

/**
 * 根据登录二维码获得的code值,获取用户信息
 * @param code
 */
export async function wxWebUserInfo(code: string) {
  // 获取用户acctoken
  const url = parseUrl('https://api.weixin.qq.com/sns/oauth2/access_token', {
    ...(await getSecret()),
    code,
    grant_type: 'authorization_code',
  });
  const result = await fetch<Uart.WX.webLogin>({ url, method: 'GET' });

  if (result.errcode) throw new Error(result.errmsg);
  // 获取微信用户信息
  const url2 = parseUrl('https://api.weixin.qq.com/sns/userinfo', {
    access_token: result.access_token,
    openid: result.openid,
  });
  const result2 = await fetch<Uart.WX.webUserInfo>({
    url: url2,
    method: 'GET',
  });
  if (result2.errcode) throw new Error(result.errmsg);
  return result2;
}
