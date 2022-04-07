import { SmsResult } from '../interface';
import { saveSms } from './logService';
import * as moment from 'moment';
import { RedisService } from './redisService';

interface params {
  RegionId: string;
  PhoneNumbers: string;
  SignName: string;
  TemplateCode: string;
  TemplateParam: string;
}

export type SmsParams = params;

type SmsUartAlarmType =
  | '透传设备下线提醒'
  | '透传设备上线提醒'
  | '透传设备告警';

interface SmsUartAlarmParam {
  name: string;
  devname: string;
  air: string;
  event: string;
}
export interface SmsUartAlarm {
  tels: string[];
  type: SmsUartAlarmType;
  query: SmsUartAlarmParam;
}

/**
 * 发送短信
 * @param params
 */
export async function sendSMS(params: params): Promise<SmsResult> {
  // 迭代发送的手机号码,检查号码每天的发送次数,每个号码每天限额50
  const tels = params.PhoneNumbers.toString().split(','); //.filter(el => !CacheAlarmSendNum.has(el) || CacheAlarmSendNum.get(el) as number < 51)
  if (tels.length === 0) {
    return;
  }
  params.PhoneNumbers = tels.join(',');

  /**
   * 检查发送的短信,如果1小时
   */
  return await RedisService.Secret.sms
    .request<SmsResult>('SendSms', params, { method: 'POST' })
    .then(el => {
      saveSms({ tels, sendParams: params, Success: el });
      return el;
    })
    .catch(e => {
      saveSms({ tels, sendParams: params, Error: e });
      return e;
    });
}

/**
 * 返回格式化的时间
 * @returns
 */
function d() {
  return moment().format('M/D H:m:s');
}

/**
 * 短信发送校验码
 * @param tel 手机号
 * @param code 验证码
 */
export async function SendValidation(
  tel: string | number,
  code: string = (Math.random() * 10000).toFixed(0).padStart(4, '0')
) {
  const TemplateParam = JSON.stringify({ code });
  const params: params = {
    RegionId: 'cn-hangzhou',
    PhoneNumbers: tel.toString(),
    SignName: '雷迪司科技湖北有限公司',
    TemplateCode: 'SMS_190275627',
    TemplateParam,
  };
  return {
    code,
    data: await sendSMS(params),
  };
}

/**
 * 发送设备恢复/超时下线
 * @param Template
 * @returns
 */
export async function SmsDTUDevTimeOut(
  tels: string[],
  Template: {
    name: string;
    DTU: string;
    pid: string | number;
    devName: string;
    event: '超时' | '恢复';
  }
) {
  const TemplateParam = JSON.stringify({ ...Template, time: d() });
  const params: params = {
    RegionId: 'cn-hangzhou',
    PhoneNumbers: tels.join(','),
    SignName: '雷迪司科技湖北有限公司',
    TemplateCode: 'SMS_200701321',
    TemplateParam,
  };
  return sendSMS(params);
}

/**
 * 发送设备超时下线
 * @param tels
 * @param Template
 * @returns
 */
export async function SmsDTU(
  tels: string[],
  Template: { name: string; DTU: string; remind: '恢复上线' | '离线' }
) {
  const TemplateParam = JSON.stringify({ ...Template, time: d() });
  const params: params = {
    RegionId: 'cn-hangzhou',
    PhoneNumbers: tels.join(','),
    SignName: '雷迪司科技湖北有限公司',
    TemplateCode: 'SMS_200691431',
    TemplateParam,
  };
  return sendSMS(params);
}

/**
 * 发送告警短信
 * @param tels
 * @param type
 * @param query
 * @returns
 */
export async function SendUartAlarm(
  tels: string[],
  type: SmsUartAlarmType,
  query: SmsUartAlarmParam
) {
  const smsCode = {
    透传设备下线提醒: 'SMS_189710812',
    透传设备上线提醒: 'SMS_189710830',
    透传设备告警: 'SMS_189710878',
  };
  // 构建请求对象
  const queryObject =
    type === '透传设备告警'
      ? {
          name: query.name,
          devname: query.devname,
          air: query.air,
          event: query.event,
          time: d(),
        }
      : { name: query.name, devname: query.devname, time: d() };
  const TemplateParam = JSON.stringify(queryObject);
  const params: params = {
    RegionId: 'cn-hangzhou',
    PhoneNumbers: tels.join(','),
    SignName: '雷迪司科技湖北有限公司',
    TemplateCode: smsCode[type],
    TemplateParam,
  };
  return sendSMS(params);
}
