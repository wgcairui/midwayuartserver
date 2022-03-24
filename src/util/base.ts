import { getModelForClass } from '@typegoose/typegoose';
import { AnyParamConstructor } from '@typegoose/typegoose/lib/types';
import * as moment from 'moment';
import { SecretApp, UserBindDevice } from '../entity/user';
import {
  getUser,
  getUserAlarmSetup,
  userbindModel,
} from '../service/userSevice';

/**
 * 获取格式化时间
 * @param time
 * @returns
 */
export function time(time: Date | number | string = new Date()) {
  return moment(time).format('YYYY/MM/DD H:m:s');
}

/**
 * 获取数据库实体
 * @param cl
 * @returns
 */
export const getModel = <T>(cl: AnyParamConstructor<T>) => {
  return getModelForClass(cl);
};

/**
 * 获取绑定设备所属用户
 * @param mac
 */
export const getBindMacUser = async (mac: string) => {
  const t = await getModel(UserBindDevice).findOne({ UTs: mac }).lean();
  return t ? t.user : null;
};

/**
 * 获取key
 * @param type
 * @returns
 */
export const getSecretKey = async (type: Uart.secretType) => {
  const model = getModelForClass(SecretApp);
  return (await model.findOne({ type }).lean()) as any as Uart.Secret_app;
};

/**
 * 根据mac获取用户告警号码和邮箱,wx
 * @param mac
 * @returns
 */
export async function getMactoUser(mac: string) {
  const bind = await userbindModel.findOne({ UTs: mac }, { user: 1 }).lean();
  if (bind) {
    const user = await getUser(bind.user, {
      tel: 1,
      mail: 1,
      wxId: 1,
      user: 1,
      name: 1,
    });
    const userSetup = await getUserAlarmSetup(bind.user, {
      tels: 1,
      mails: 1,
    });
    return {
      user: user.user,
      name: user.name,
      wxid: user.wxId,
      tels: userSetup.tels || [],
      mails: userSetup.mails || [],
    };
  } else {
    return null;
  }
}
