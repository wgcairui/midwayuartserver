import {
  Users,
  UserBindDevice,
  UserAggregation,
  SecretApp,
  UserAlarmSetup,
  UserLayout,
  wxUser,
  Salt,
} from '../entity/user';
import { UartTerminalDataTransfinite, UserLogin } from '../entity/log';
import {
  Terminal,
  TerminalClientResult,
  TerminalClientResultSingle,
} from '../entity/node';
import * as lodash from 'lodash';
import axios from 'axios';
import { SHA384 } from 'crypto-js';
import { getModelForClass } from '@typegoose/typegoose';
import {
  BcryptCompare,
  RegexTel,
  RegexMail,
  BcryptDo,
  Secret_JwtSign,
} from '../util/util';
import { addRegisterTerminal, setTerminal, getTerminal } from './deviceService';
import { FindFilter, MongoTypesId, ObjectId } from '../interface';
import { WeaApps } from '../util/weapp';
import { WxPublics } from '../util/wxpublic';
import { SendValidation } from './smsService';

interface pesiv_userInfo {
  user_name: string;
  user_pwd: string;
  salt: string;
  real_name: string;
  telephone: string;
  email: string;
}

interface pesiv_dev {
  DevName: string;
  DeviceCode: string;
}

interface pesivData {
  code: number;
  data: {
    u: pesiv_userInfo;
    devs: pesiv_dev[];
  };
}

export const userModel = getModelForClass(Users);
const loguserModel = getModelForClass(UserLogin);
export const userbindModel = getModelForClass(UserBindDevice);
const useraggregModel = getModelForClass(UserAggregation);
const userAlarmSetupModel = getModelForClass(UserAlarmSetup);
const AlarmModel = getModelForClass(UartTerminalDataTransfinite);
const layoutModel = getModelForClass(UserLayout);
const wxUserModel = getModelForClass(wxUser);
const secretModel = getModelForClass(SecretApp);
const saltModel = getModelForClass(Salt);

/**
 * 校验用户密码
 * @param user 用户名
 * @param decryptPasswd 用户明文密码
 */
export async function BcryptComparePasswd(user: string, decryptPasswd: string) {
  const { passwd, rgtype } = await getUser(user);
  if (rgtype === 'pesiv') {
    try {
      const { salt } = await saltModel.findOne({ user });
      const p = SHA384(decryptPasswd + salt)
        .toString()
        .toLocaleUpperCase();
      return Boolean(p === passwd);
    } catch (error) {
      return false;
    }
  } else {
    return BcryptCompare(decryptPasswd, passwd);
  }
}

/**
 * 同步百事服用户信息
 * @param user
 * @returns
 * @deprecated 百事服已下线,此同步器下个版本废弃
 */
export async function syncPesivUser(user: string, pw: string) {
  try {
    const { status, data } = await axios.get<pesivData>(
      `http://www.pesiv.com:7001/pesiv/user?user=${user}`
    );
    // 如果数据返回正确且密码正确,迁移pesiv数据
    if (
      status === 200 &&
      data.code === 200 &&
      data.data.u.user_pwd ===
        SHA384(pw + data.data.u.salt)
          .toString()
          .toLocaleUpperCase()
    ) {
      const { u, devs } = data.data;
      // 创建用户信息
      const userinfo = {
        user: u.user_name,
        name: u.real_name || u.user_name.slice(u.user_name.length - 6),
        passwd: u.user_pwd,
        rgtype: 'pesiv',
        userGroup: 'user',
        status: true,
        creatTime: new Date(),
      } as Partial<Uart.UserInfo>;

      // 判断用户电话
      if ((u.telephone && RegexTel(u.telephone)) || RegexTel(u.real_name)) {
        const tel = String(u.telephone || u.real_name) as any;
        if (await getUser(tel)) {
          console.warn({ ...userinfo, msg: '用户手机号码重复' });
        } else {
          userinfo.tel = tel;
        }
      }
      // 判断用户邮箱
      if ((u.email && RegexMail(u.email)) || RegexMail(u.real_name)) {
        userinfo.mail = u.email || u.real_name;
      }
      // pesiv用户密码盐值
      const saltinfo = {
        user,
        salt: u.salt,
      };
      // 保存盐值
      await saltModel.updateOne(
        { user: saltinfo.user },
        { $set: { salt: saltinfo.salt } },
        { upsert: true }
      );
      // 保存用户
      const ru = await userModel.create(userinfo as any);
      // 初始化用户配置
      await initUserAlarmSetup(ru.user);
      // 写入日志
      await loguserModel.create({
        user: ru.user,
        type: 'pesiv迁移',
        address: '',
        msg: '',
      });
      // 判断用户是否挂载设备
      if (devs && devs.length > 0) {
        const pdev = devs.filter(el => el.DeviceCode.length === 12);
        // 构造用户ups信息
        const mountDev: Uart.TerminalMountDevs = {
          pid: 0,
          mountDev: 'UPS',
          protocol: 'Pesiv卡',
          Type: 'UPS',
        };
        // 迭代用户绑定设备
        for (const dev of pdev) {
          const code = dev.DeviceCode.toLocaleUpperCase();
          // 添加到用户绑定
          await addUserTerminal(ru.user, code);
          // 添加到注册信息
          await addRegisterTerminal(code, 'pwsiv');
          // 修改卡名称
          await modifyTerminal(ru.user, code, dev.DevName);
          await setTerminal(code, { PID: 'pesiv' });
          // 添加挂载信息
          await addTerminalMountDev(ru.user, code, mountDev);
        }
      }

      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 2000);
      });
      return ru;
    } else {
      return null;
    }
  } catch (e) {
    console.warn({ e });

    return null;
  }
}

/**
 * 检查是否是用户绑定mac
 * @param user
 * @param mac
 * @returns
 */
export async function isBindMac(user: string, mac: string) {
  const u = await getUser(user);
  if (u && ['root', 'admin'].includes(u.userGroup)) return true;
  const r = await userbindModel.findOne(
    { user, $or: [{ UTs: mac }] },
    { _id: 1 }
  );
  return r ? true : false;
}

/**
 * 发送验证码到用户
 * @param user
 */
export async function sendValidation(user: string) {
  const users = await getUser(user, { tel: 1, mail: 1, wxId: 1 });
  if (users.tel) {
    const r = await SendValidation(users.tel);
    return {
      code: r.data.Code === 'OK' ? 200 : 0,
      data: r.code,
      msg: `手机号:${users.tel.toString().slice(0, 3)}***${users.tel
        .toString()
        .slice(7)}`,
    };
  } else {
    return {
      code: 0,
      msg: 'user is undefine ',
    };
  }
}

/**
 * 修改密码
 * @param user
 * @param passwd
 */
export async function resetUserPasswd(user: string, passwd: string) {
  const users = await getUser(user);
  const isPesiv = users.userGroup === 'user' && users.rgtype === 'pesiv';
  return await userModel
    .updateOne(
      { user },
      {
        $set: {
          passwd: await BcryptDo(passwd),
          rgtype: isPesiv ? 'web' : users.rgtype,
        },
      }
    )
    .lean();
}

/**
 * 获取所以微信用户
 * @returns
 */
export async function getWxUsers() {
  return wxUserModel.find().lean();
}

/**
 * 更新微信用户信息
 * @param users
 * @returns
 */
export async function updateWxUser(users: Uart.WX.userInfoPublic) {
  await wxUserModel
    .updateOne(
      { openid: users.openid },
      { $set: { ...users } },
      { upsert: true }
    )
    .lean();
  const u = await getUser(users.unionid);
  if (u) {
    await userModel.updateOne(
      { user: u.user },
      { $set: { wxId: users.openid } }
    );
  }
  return u;
}

/**
 * 获取指定微信用户
 * @returns
 */
export async function getWxUser(id: string) {
  return wxUserModel.findOne({ $or: [{ openid: id }, { unionid: id }] }).lean();
}

/**
 * 删除指定微信用户
 * @returns
 */
export async function delWxUser(id: string) {
  return wxUserModel
    .deleteOne({ $or: [{ openid: id }, { unionid: id }] })
    .lean();
}

/**
 * 获取所有用户信息
 * @returns
 */
export async function getUsers() {
  return userModel.find().lean();
}

/**
 * 使用用户名或tel或id或uniId获取用户信息
 * @param user
 * @param filter 刷选
 * @returns
 */
export async function getUser(
  user: string,
  filter: FindFilter<Uart.UserInfo> = { _id: 0 }
): Promise<Uart.UserInfo> {
  return userModel
    .findOne({ $or: [{ user }, { userId: user }, { tel: user }] }, filter)
    .lean() as any;
}

/**
 * 使用用户id获取用户信息
 * @param id
 * @param filter 刷选
 * @returns
 */
export async function getIdUser(
  id: string,
  filter: FindFilter<Uart.UserInfo> = { _id: 0 }
) {
  return userModel.findOne({ _id: new ObjectId(id) }, filter).lean();
}

/**
 * 获取用户token
 * @param user
 * @returns
 */
export async function getToken(user: string) {
  const users = await getUser(user);
  const data: Partial<Uart.UserInfo> = {
    user: users.user,
    name: users.name,
    userGroup: users.userGroup,
    rgtype: users.rgtype as any,
  };
  return await Secret_JwtSign(data);
}

/**
 * 初始化用户告警配置
 * @param user
 */
export async function initUserAlarmSetup(user: string) {
  const u = await getUser(user);
  if (u) {
    return await userAlarmSetupModel.create({
      user: u.user,
      tels: u?.tel && RegexTel(u.tel) ? [u.tel] : [],
      mails: u?.mail && RegexMail(u.mail) ? [u.mail] : [],
      wxs: u?.wxId ? [u.wxId] : [],
      ProtocolSetup: [],
    });
  } else {
    return null;
  }
}

/**
 * 创建用户
 * @param user
 * @returns
 */
export async function createUser(user: Partial<Uart.UserInfo>) {
  user.passwd = await BcryptDo(user.passwd || user.user);
  const u = (await userModel.create(user as any)) as any as Uart.UserInfo;
  await initUserAlarmSetup(u.user);
  await loguserModel.create({
    user: u.user,
    type: '用户注册',
    address: user.address,
    msg: '',
    creatTime: new Date(),
  });
  return u;
}

/**
 * 更新用户登录记录
 * @param address
 */
export async function updateUserLoginlog(
  user: string,
  address: string,
  msg = ''
) {
  return {
    user: await userModel
      .updateOne({ user }, { $set: { modifyTime: new Date(), address } })
      .lean(),
    log: await loguserModel.create({
      user,
      type: '用户登录',
      address,
      msg,
    }),
  };
}

/**
 * 获取用户绑定
 * @param user
 * @returns
 */
export async function getUserBind(user: string) {
  const bind = await userbindModel
    .findOne({ user }, { UTs: 1, UTsShare: 1 })
    .lean();
  return {
    UTs: [bind?.UTs || [], bind?.UTsShare || []].flat(),
  };
}

/**
 * 获取用户绑定设备
 * @param user
 */
export async function getUserBindDevices(user: string) {
  const bind = await getUserBind(user);
  return {
    bind,
    UTs: await getTerminal(bind.UTs),
    ECs: [],
    AGG: await useraggregModel.find({ user }).lean(),
  };
}

/**
 * 获取绑定设备所属用户
 * @param mac
 */
/* async getBindMacUser(mac: string) {
    const t = await userbindModel.findOne({ UTs: mac }).lean();
    return t ? t.user : null;
  } */

/**
 * 获取第三方密匙信息
 * @param type
 * @returns
 */
export async function getUserSecret(
  type: 'aliSms' | 'mail' | 'hf' | 'wxopen' | 'wxmp' | 'wxmpValidaton' | 'wxwp'
) {
  return await secretModel.findOne({ type }).lean();
}

/**
 * set第三方密匙信息
 * @param type
 * @returns
 */
export async function setUserSecret(
  type:
    | 'aliSms'
    | 'mail'
    | 'hf'
    | 'wxopen'
    | 'wxmp'
    | 'wxmpValidaton'
    | ('wxwp' & string),
  appid: string,
  secret: string
) {
  return await secretModel
    .updateOne({ type }, { $set: { appid, secret } }, { upsert: true })
    .lean();
}

/**
 * 获取用户告警
 * @param user
 * @param start
 * @param end
 * @returns
 */
export async function getUserAlarm(
  user: string,
  start: number,
  end: number,
  filter: FindFilter<Uart.uartAlarmObject> = { _id: 0 }
) {
  const bind = await getUserBind(user);
  return AlarmModel.find(
    { mac: { $in: bind.UTs }, timeStamp: { $gte: start, $lte: end } },
    filter
  ).lean();
}

/**
 * 确认用户告警信息
 * @param user
 * @param id
 * @returns
 */
export async function confrimAlarm(user: string, id?: MongoTypesId) {
  const bind = await getUserBind(user);
  if (id) {
    return await AlarmModel.updateOne(
      { _id: id, mac: { $in: bind.UTs } },
      { $set: { isOk: true } }
    ).lean();
  } else {
    return await AlarmModel.updateMany(
      { mac: { $in: bind.UTs } },
      { $set: { isOk: true } }
    ).lean();
  }
}

/**
 * 修改用户设备别名
 * @param user
 * @param mac
 * @param name
 * @returns
 */
export async function modifyTerminal(user: string, mac: string, name: string) {
  if (isBindMac(user, mac)) {
    const model = getModelForClass(Terminal);
    return await model.updateOne({ DevMac: mac }, { $set: { name } }).lean();
  } else {
    throw new Error('mac Error');
  }
}

/**
 * 修改用户设备定位
 * @param user
 * @param mac
 * @param jw
 * @returns
 */
export async function modifyTerminalJw(user: string, mac: string, jw: string) {
  const bind = await getUserBind(user);
  if (bind.UTs.includes(mac)) {
    const model = getModelForClass(Terminal);
    return await model.updateOne({ DevMac: mac }, { $set: { jw } }).lean();
  } else throw new Error('mac Error');
}

/**
 * 添加绑定设备
 * @param user
 * @param mac
 */
export async function addUserTerminal(user: string, mac: string) {
  // 检查mac是否已经被绑定
  const isBind = await userbindModel.findOne({ UTs: mac });
  if (isBind) {
    return null;
  } else {
    return await userbindModel
      .updateOne({ user }, { $addToSet: { UTs: mac } }, { upsert: true })
      .lean();
  }
}

/**
 * 删除绑定设备
 * @param user
 * @param mac
 * @returns
 */
export async function delUserTerminal(user: string, mac: string) {
  return await userbindModel
    .updateOne({ user }, { $pull: { UTs: mac } })
    .lean();
}

/**
 * 删除终端挂载设备
 * @param mac
 * @param pid
 */
export async function delTerminalMountDev(
  user: string,
  mac: string,
  pid: number
) {
  const isBind = await isBindMac(user, mac);
  if (!isBind) {
    return null;
  } else {
    const model = getModelForClass(Terminal);
    return await model
      .updateOne({ DevMac: mac }, { $pull: { mountDevs: { pid } } })
      .lean();
  }
}

/**
 * 添加用户终端挂载设备
 * @param user
 * @param mac
 * @param param2
 * @returns
 */
export async function addTerminalMountDev(
  user: string,
  mac: string,
  mountDevs: Uart.TerminalMountDevs
) {
  const isBind = await isBindMac(user, mac);
  const model = getModelForClass(Terminal);
  if (
    !isBind ||
    (mountDevs.bindDev &&
      (await model.findOne(
        { 'mountDevs.bindDev': mountDevs.bindDev.toLocaleUpperCase() },
        { _id: 1 }
      )))
  ) {
    return null;
  } else {
    return await model
      .updateOne(
        { DevMac: mac },
        {
          $addToSet: {
            mountDevs,
          },
        }
      )
      .lean();
  }
}

/**
 * 获取all用户告警配置
 * @param user
 * @param filter
 * @returns
 */
export async function getUserAlarmSetups(
  filter: FindFilter<Uart.userSetup> = { _id: 0 }
) {
  return await userAlarmSetupModel.find({}, filter).lean();
}

/**
 * 获取用户告警配置
 * @param user
 * @param filter
 * @returns
 */
export async function getUserAlarmSetup(
  user: string,
  filter: FindFilter<Uart.userSetup> = { _id: 0 }
) {
  return await userAlarmSetupModel.findOne({ user }, filter).lean();
}

/**
 * 删除用户告警配置
 * @param user
 * @returns
 */
export async function deleteUsersetup(user: string) {
  return userAlarmSetupModel.deleteOne({ user }).lean();
}

/**
 * 修改用户告警配置联系方式
 * @param user
 * @param tels 联系电话
 * @param mails 联系邮箱
 * @returns
 */
export async function modifyUserAlarmSetupTel(
  user: string,
  tels: string[],
  mails: string[]
) {
  return await userAlarmSetupModel
    .updateOne({ user }, { $set: { tels, mails } })
    .lean();
}

/**
 * 修改用户信息
 * @param user
 * @param data
 * @returns
 */
export async function modifyUserInfo(
  user: string,
  data: Partial<Uart.UserInfo>
) {
  return await userModel
    .updateOne({ user }, { $set: { ...(data as any) } })
    .lean();
}

/**
 * 获取公众号二维码
 * @param user
 * @returns
 */
export async function mpTicket(user: string) {
  const { _id } = await getUser(user, { _id: 1 });
  return WxPublics.getTicket(_id);
}

/**
 * 获取小程序二维码
 * @param user
 * @returns
 */
export async function wpTicket(user: string) {
  const { _id } = await getUser(user, { _id: 1 });
  return WeaApps.getTicket(_id);
}

/**
 * 获取用户单个协议告警配置
 * @param user
 * @param protocol
 */
export async function getUserAlarmProtocol(user: string, protocol: string) {
  /* const data = await userAlarmSetupModel
      .findOne(
        { user, 'ProtocolSetup.Protocol': protocol },
        { 'ProtocolSetup.$': 1 }
      )
      .lean();
    const setup = data
      ?.ProtocolSetup[0] as any as Uart.ProtocolConstantThreshold | null; */

  const [p] = (await userAlarmSetupModel.aggregate([
    {
      $match: {
        user,
      },
    },
    {
      $project: {
        ProtocolSetup: 1,
      },
    },
    {
      $project: {
        setup: '$ProtocolSetup',
      },
    },
    {
      $unwind: '$setup',
    },
    {
      $match: {
        'setup.Protocol': protocol,
      },
    },
  ])) as any;

  const { setup } = p || { setup: undefined };
  return {
    Protocol: protocol,
    ShowTag: setup?.ShowTag || [],
    Threshold: setup?.Threshold || [],
    AlarmStat: setup?.AlarmStat || [],
  } as Pick<
    Uart.ProtocolConstantThreshold,
    'Protocol' | 'AlarmStat' | 'ShowTag' | 'Threshold'
  >;
  //return obj;
}

/**
 * 获取用户设备运行数据
 * @param user
 * @param mac
 * @param pid
 */
export async function getTerminalData(
  user: string,
  mac: string,
  pid: number,
  filter: FindFilter<Uart.queryResultSave> = {
    _id: 0,
    Interval: 1,
    result: 1,
    time: 1,
    useTime: 1,
  }
) {
  const isBind = await isBindMac(user, mac);
  if (!isBind) {
    return null;
  } else {
    const model = getModelForClass(TerminalClientResultSingle);
    return await model.findOne({ mac, pid }, filter).lean();
  }
}

/**
 * 获取用户设备运行数据
 * @param user
 * @param mac
 * @param pid
 */
export async function getTerminalDataName(
  user: string,
  mac: string,
  pid: number,
  name: string
): Promise<Uart.queryResultArgument | null> {
  const isBind = await isBindMac(user, mac);
  if (!isBind) {
    return null;
  } else {
    const model = getModelForClass(TerminalClientResultSingle);
    const r = await model
      .findOne({ mac, pid, 'result.name': name }, { 'result.$': 1, _id: 0 })
      .lean();
    return r && r.result.length > 0 ? r.result[0] : null;
  }
}

/**
 * 获取用户设备运行数据
 * @param user
 * @param mac
 * @param pid
 * @deprecated 下一版本删除,请使用getTerminalDatasV2
 */
export async function getTerminalDatas(
  user: string,
  mac: string,
  pid: number,
  name: string | string[],
  start: number,
  end: number
) {
  const isBind = await isBindMac(user, mac);
  if (!isBind) {
    return null;
  } else {
    const model = getModelForClass(TerminalClientResult);
    if (typeof name === 'string') {
      return await model
        .find(
          {
            mac,
            pid,
            'result.name': name,
            timeStamp: { $gte: start, $lte: end },
          },
          { 'result.$': 1, timeStamp: 1, _id: 0, hasAlarm: 1 }
        )
        .lean();
    } else {
      return await model
        .find(
          {
            mac,
            pid,
            timeStamp: { $gte: start, $lte: end },
          },
          { result: 1, timeStamp: 1, _id: 0, hasAlarm: 1 }
        )
        .lean();
    }
  }
}

/**
 * 获取用户设备运行数据
 * @param user
 * @param mac
 * @param pid
 */
export async function getTerminalDatasV2(
  user: string,
  mac: string,
  pid: number,
  name: string | string[],
  start: number,
  end: number
) {
  const isBind = await isBindMac(user, mac);
  if (!isBind) {
    return null;
  } else {
    const model = getModelForClass(TerminalClientResult);
    return (await model.aggregate([
      {
        $match: {
          mac,
          pid,
          timeStamp: { $lt: end, $gt: start },
        },
      },
      { $project: { timeStamp: 1, result: 1 } },
      { $unwind: '$result' },
      {
        $match: {
          'result.name': typeof name === 'string' ? name : { $in: name },
        },
      },
      {
        $project: {
          name: '$result.name',
          value: '$result.parseValue',
          time: '$timeStamp',
          _id: 0,
        },
      },
    ])) as any as { name: string; value: string; time: number }[];
    /* if (typeof name === 'string') {
        return await model
          .find(
            {
              mac,
              pid,
              'result.name': name,
              timeStamp: { $gte: start, $lte: end },
            },
            { 'result.$': 1, timeStamp: 1, _id: 0, hasAlarm: 1 }
          )
          .lean();
      } else {
        return await model
          .find(
            {
              mac,
              pid,
              timeStamp: { $gte: start, $lte: end },
            },
            { result: 1, timeStamp: 1, _id: 0, hasAlarm: 1 }
          )
          .lean();
      } */
  }
}

/**
 * 设置用户自定义设置(协议配置)
 * @param user
 * @param Protocol 协议
 * @param type 操作类型
 * @param arg 参数
 * @returns
 */
export async function setUserSetupProtocol(
  user: string,
  Protocol: string,
  type: Uart.ConstantThresholdType,
  arg: any
) {
  // 获取用户告警配置
  let setup = await getUserAlarmSetup(user, {
    user: 1,
    tels: 1,
    mails: 1,
    ProtocolSetup: 1,
  }); //await UserAlarmSetup.findOne({ user: ctx.user }).lean<Pick<Uart.userSetup, 'user' | 'mails' | 'tels' | 'ProtocolSetup'>>()!
  // 如果没有初始配置则新建
  if (!setup) {
    setup = await initUserAlarmSetup(user);
  }
  // 如果如果没有ProtocolSetup属性或ProtocolSetup中没有此协议则加入
  if (
    !setup?.ProtocolSetup ||
    setup.ProtocolSetup.findIndex(el => el.Protocol === Protocol) === -1
  ) {
    await userAlarmSetupModel
      .updateOne(
        { user },
        { $push: { ProtocolSetup: { Protocol } as any } },
        { upsert: true }
      )
      .exec();
  }
  let result;
  switch (type) {
    case 'Threshold':
      {
        const { data }: { type: 'del' | 'add'; data: Uart.Threshold } = arg;

        if (arg.type === 'del') {
          result = await userAlarmSetupModel
            .findOneAndUpdate(
              { user, 'ProtocolSetup.Protocol': Protocol },
              { $pull: { 'ProtocolSetup.$.Threshold': { name: data.name } } }
            )
            .lean();
        } else {
          const has = await userAlarmSetupModel.findOne({
            user,
            ProtocolSetup: {
              $elemMatch: { Protocol: Protocol, 'Threshold.name': data.name },
            },
          });
          if (has) {
            // https://www.cnblogs.com/zhongchengyi/p/12162792.html
            result = await userAlarmSetupModel
              .findOneAndUpdate(
                { user },
                { $set: { 'ProtocolSetup.$[i1].Threshold.$[i2]': data } },
                {
                  arrayFilters: [
                    { 'i1.Protocol': Protocol },
                    { 'i2.name': data.name },
                  ],
                }
              )
              .lean();
          } else {
            result = await userAlarmSetupModel
              .findOneAndUpdate(
                { user, 'ProtocolSetup.Protocol': Protocol },
                { $push: { 'ProtocolSetup.$.Threshold': data } },
                { upsert: true }
              )
              .lean();
          }
        }
      }
      break;
    case 'ShowTag':
      {
        result = await userAlarmSetupModel
          .findOneAndUpdate(
            { user, 'ProtocolSetup.Protocol': Protocol },
            {
              $set: {
                'ProtocolSetup.$.ShowTag': lodash.compact(arg as string[]),
              },
            },
            { upsert: true }
          )
          .lean();
      }
      break;
    case 'AlarmStat':
      {
        const { name, alarmStat } = arg;
        // 检查系统中是否含有name的配置
        const has = await userAlarmSetupModel.findOne({
          user,
          ProtocolSetup: {
            $elemMatch: { Protocol: Protocol, 'AlarmStat.name': name },
          },
        });
        if (has) {
          // https://www.cnblogs.com/zhongchengyi/p/12162792.html
          result = await userAlarmSetupModel
            .findOneAndUpdate(
              { user },
              {
                $set: {
                  'ProtocolSetup.$[i1].AlarmStat.$[i2].alarmStat': alarmStat,
                },
              },
              {
                arrayFilters: [
                  { 'i1.Protocol': Protocol },
                  { 'i2.name': name },
                ],
              }
            )
            .lean();
        } else {
          result = await userAlarmSetupModel.findOneAndUpdate(
            { user, 'ProtocolSetup.Protocol': Protocol },
            { $push: { 'ProtocolSetup.$.AlarmStat': { name, alarmStat } } },
            { upsert: true }
          );
        }
      }
      break;
  }
  return result;
}

/**
 * 获取终端信息
 * @param user
 * @param mac
 * @returns
 */
export async function getUserTerminal(user: string, mac: string) {
  if (await isBindMac(user, mac)) {
    return await getTerminal(mac);
  } else {
    return await getTerminal(mac, {
      DevMac: 1,
      name: 1,
      mountNode: 1,
      _id: 0,
    });
  }
}

/**
 *  获取用户布局配置
 * @param user
 * @param id
 */
export async function getUserLayout(user: string, id: string) {
  return await layoutModel.findOne({ user, id }).lean();
}

/**
 *  获取用户布聚合设备
 * @param user
 * @param id
 */
export async function getAggregation(user: string, id: string) {
  return await useraggregModel.findOne({ user, id }).lean();
}

/**
 * 设置用户布局配置
 * @param id
 * @param type
 * @param bg
 * @param Layout
 */
export async function setUserLayout(
  user: string,
  id: string,
  type: string,
  bg: string,
  Layout: Uart.AggregationLayoutNode[]
) {
  return await layoutModel
    .updateOne({ id, user }, { $set: { type, bg, Layout } }, { upsert: true })
    .lean();
}

/**
 * 删除用户信息
 * @param user
 * @returns
 */
export async function deleteUser(user: string) {
  await layoutModel.deleteOne({ user });
  await useraggregModel.deleteOne({ user });
  await userbindModel.deleteOne({ user });
  await deleteUsersetup(user);
  return await userModel.deleteOne({ user });
}

/**
 * 添加聚合设备
 * @param name
 * @param aggs
 * @returns
 */
export async function addAggregation(
  user: string,
  name: string,
  aggs: Uart.AggregationDev[]
) {
  const aggObj: Uart.Aggregation = {
    user,
    id: '',
    name,
    aggregations: aggs,
    devs: [],
  };
  const { _id } = await useraggregModel.create(aggObj);
  const layout = {
    user,
    id: _id,
    bg: 'https://www.ladishb.com/site/upload/12192020__aggregation.jpg',
    type: 'agg',
    Layout: [],
  };
  await layoutModel.create(layout);
  return await useraggregModel
    .updateOne({ _id: new ObjectId(_id) }, { $set: { id: _id } })
    .lean();
}

/**
 * 删除聚合设备
 * @param user
 * @param id
 * @returns
 */
export async function deleteAggregation(user: string, id: string) {
  await layoutModel.deleteOne({ user, id }).lean();
  return await useraggregModel.deleteOne({ user, id }).lean();
}

/**
 * 添加用户
 * @param name
 * @param user
 * @param passwd
 * @param tel
 * @param mail
 * @param company
 * @returns
 */
export async function addUser(
  name: string,
  user: string,
  passwd: string,
  tel: string,
  mail: string,
  company: string
) {
  if (!user || !passwd) {
    return {
      code: 0,
      msg: '账号和密码不能为空',
    };
  }
  if (!tel || !RegexTel(tel)) {
    return {
      code: 0,
      msg: '手机号码格式不正确',
    };
  }
  if (!mail || !RegexMail(mail)) {
    return {
      code: 0,
      msg: '邮箱格式不正确',
    };
  }
  const u = await userModel.findOne({
    $or: [{ user }, { mail }, { tel }],
  });
  if (u) {
    if (u.user === user) {
      return {
        code: 0,
        msg: '账号已存在',
      };
    }
    if (u.tel === tel) {
      return {
        code: 0,
        msg: '手机号码已被注册',
      };
    }
    if (u.mail === mail) {
      return {
        code: 0,
        msg: '邮箱已被注册',
      };
    }
  }
  return {
    code: 200,
    data: await createUser({
      user,
      name,
      passwd,
      tel,
      mail,
      company,
    } as any),
  };
}

/**
 * 查询普通消息用户输入的关键字
 * @param key
 */
export async function seach_user_keywords(key: string) {
  const url = `https://www.ladishb.com/site/api/routlinks?key=${encodeURI(
    key
  )}`;
  const data = (await axios
    .get(url)
    .then(el => el.data)
    .catch(() => [])) as { rout: string; title: string }[];
  return data.length === 0
    ? ''
    : `匹配到如下链接\n
    ${data.slice(0, 20).map(el => {
      return `<a href="https://www.ladishb.com${el.rout}">${el.title
        .slice(0, 12)
        .trim()}...</a>\n\n`;
      // eslint-disable-next-line no-useless-escape
    })}`.replace(/(\,|^ )/g, '');
}

/**
 * 获取未确认告警数量
 * @param user
 * @returns
 */
export async function getAlarmunconfirmed(user: string) {
  const macs = await getUserBind(user);
  return await AlarmModel.countDocuments({
    mac: { $in: macs?.UTs || [] },
    isOk: false,
  });
}

/**
 * 变更用户组
 * @param user
 */
export async function toggleUserGroup(user: string) {
  const u = await getUser(user);
  const userGroup = u.userGroup === 'admin' ? 'user' : 'admin';
  await userModel.updateOne({ user }, { $set: { userGroup } });
  return userGroup;
}
