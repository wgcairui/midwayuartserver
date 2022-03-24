import { saveWxsubscribeMessage } from './logService';
import { WxPublics } from '../util/wxpublic';

/**
 * 发送设备告警
 * @param postData
 * @returns
 */
export async function SendsubscribeMessageDevAlarm(
  postData: Uart.WX.wxsubscribeMessage
) {
  return WxPublics.SendsubscribeMessageDevAlarm(postData).then(el => {
    saveWxsubscribeMessage({ ...postData, result: el });
    return el;
  });
}
