import { SimResope, SimUse, SimInfo } from '../interface';
import { RedisService } from './redisService';

/**
 * ali_2无线物联服务api
 * 新版
 * @see https://help.aliyun.com/document_detail/375319.html
 */

/**
 * 内部调用
 * @param action
 * @param params
 * @param method
 * @returns
 */
async function request<T>(
  action: string,
  params: object = {},
  method: 'POST' | 'GET' = 'POST'
) {
  return new Promise<SimResope<T>>((resolve, reject) => {
    RedisService.Secret.newIot.request(action, params, { method }).then(
      (result: any) => {
        resolve(result);
      },
      ex => {
        reject(ex);
      }
    );
  });
}

/**
 * 查询物联网卡的流量信息
 * @param Iccid
 * @returns
 * @see https://next.api.aliyun.com/api/Linkcard/2021-05-20/GetCardFlowInfo?lang=NODEJS&params={}&sdkStyle=old
 */
export function QueryCardFlowInfoV2(Iccid: string) {
  return request<SimUse>('GetCardFlowInfo', { Iccid });
}

/**
 * 换绑复用
 * @param Iccid
 * @returns
 * @see https://next.api.aliyun.com/api/Linkcard/2021-05-20/RebindResumeSingleCard?lang=NODEJS&params={}&sdkStyle=old
 */
export function RebindResumeSingleCardV2(Iccid: string) {
  return request<boolean>('RebindResumeSingleCard', { Iccid });
}

/**
 * 卡的主动停用或复用
 * @param Iccid
 * @param stat
 */
export function SwitchSimV2(
  Iccid: string,
  stat: 'ResumeSingleCard' | 'StopSingleCard'
) {
  return request<boolean>(stat, { Iccid });
}

/**
 * 查询物联网卡的明细信息
 * @param iccid
 * @returns
 */
export function GetCardDetailV2(Iccid: string) {
  return request<SimInfo>('GetCardDetail', { Iccid });
}

/**
 * 自动续费开关
 */
export function UpdateAutoRechargeSwitch(Iccid: string, Open:boolean){
  return request<Boolean>('UpdateAutoRechargeSwitch',{Iccid, Open})
}