import { Provide, Init, Inject } from '@midwayjs/decorator';
import { getModelForClass, ReturnModelType, } from "@midwayjs/typegoose"
import { BeAnObject } from '@typegoose/typegoose/lib/types';
import { Users, UserBindDevice, UserAggregation, SecretApp, UserAlarmSetup } from "../entity/user"
import { UartTerminalDataTransfinite, UserLogin } from "../entity/log"
import { Device } from "./device"
import { filter, MongoTypesId } from '../interface';
import { Terminal } from '../entity/node';

@Provide()
export class UserService {
  private userModel: ReturnModelType<typeof Users, BeAnObject>
  private loguserModel: ReturnModelType<typeof UserLogin, BeAnObject>;
  private userbindModel: ReturnModelType<typeof UserBindDevice, BeAnObject>;
  private useraggregModel: ReturnModelType<typeof UserAggregation, BeAnObject>;
  private userAlarmSetupModel: ReturnModelType<typeof UserAlarmSetup, BeAnObject>;
  private AlarmModel: ReturnModelType<typeof UartTerminalDataTransfinite, BeAnObject>;

  @Init()
  async init() {
    this.userModel = getModelForClass(Users)
    this.loguserModel = getModelForClass(UserLogin)
    this.userbindModel = getModelForClass(UserBindDevice)
    this.useraggregModel = getModelForClass(UserAggregation)
    this.userAlarmSetupModel = getModelForClass(UserAlarmSetup)
    this.AlarmModel = getModelForClass(UartTerminalDataTransfinite)
  }

  @Inject()
  Device: Device

  getUsers() {
    return this.userModel.find().lean()
  }

  /**
   * 使用用户名或邮箱获取用户信息
   * @param user 
   * @param filter 刷选
   * @returns 
   */
  getUser(user: string, filter: filter<Uart.UserInfo> = { _id: 0 }) {
    return this.userModel.findOne({ $or: [{ user }, { mail: user }, { userId: user }] }, filter).lean()
  }

  /**
   * 创建用户
   * @param user 
   * @returns 
   */
  async createUser(user: Partial<Uart.UserInfo>) {
    const u = await this.userModel.create(user as any)
    await this.userAlarmSetupModel.create({ user: u.user, tels: (u?.tel) ? [u.tel] : [], mails: (u?.mail) ? [u.mail] : [], ProtocolSetup: [] })
    await this.loguserModel.create({ user: u.user, type: '用户注册', address: user.address, msg: '' })
    return u
  }

  /**
   * 更新用户登录记录
   * @param address
   */
  async updateUserLoginlog(user: string, address: string, msg: string = '') {
    return {
      user: await this.userModel.update({ user }, { $set: { modifyTime: new Date(), address } }).lean(),
      log: await this.loguserModel.create({ user, type: '用户登录', address, msg })
    }
  }

  /**
   * 获取用户绑定
   * @param user 
   * @returns 
   */
  private getUserBind(user: string) {
    return this.userbindModel.findOne({ user }, { UTs: 1 }).lean()
  }


  /**
   * 获取用户绑定设备
   * @param user 
   */
  async getUserBindDevices(user: string) {
    const bind = await this.getUserBind(user)
    return {
      UTs: await this.Device.getTerminal(bind.UTs || []),
      ECs: [],
      AGG: await this.useraggregModel.find({ user }).lean()
    }
  }

  /**
   * 获取第三方密匙信息
   * @param type 
   * @returns 
   */
  async getUserSecret(type: 'aliSms' | "mail" | "hf" | 'wxopen' | "wxmp" | 'wxmpValidaton' | 'wxwp') {
    const model = getModelForClass(SecretApp)
    return await model.findOne({ type }).lean()
  }

  /**
   * 获取用户告警
   * @param user 
   * @param start 
   * @param end 
   * @returns 
   */
  async getUserAlarm(user: string, start: number, end: number, filter: filter<Uart.uartAlarmObject> = { _id: 0 }) {
    const bind = await this.getUserBind(user)
    return this.AlarmModel.find({ mac: { $in: bind.UTs || [] }, timeStamp: { $gte: start, $lte: end } }, filter).lean()
  }

  /**
   * 确认用户告警信息
   * @param user 
   * @param id 
   * @returns 
   */
  async confrimAlarm(user: string, id?: MongoTypesId) {
    const bind = await this.getUserBind(user)
    if (id) {
      return await this.AlarmModel.updateOne({ _id: id, mac: { $in: bind.UTs } }, { $set: { isOk: true } }).lean()
    } else {
      return await this.AlarmModel.updateMany({ mac: { $in: bind.UTs } }, { $set: { isOk: true } }).lean()
    }
  }

  /**
   * 修改用户设备别名
   * @param user 
   * @param mac 
   * @param name 
   * @returns 
   */
  async modifyTerminal(user: string, mac: string, name: string) {
    const bind = await this.getUserBind(user)
    console.log(bind.UTs, mac);

    if (bind.UTs.includes(mac)) {
      const model = getModelForClass(Terminal)
      return await model.updateOne({ DevMac: mac }, { $set: { name } }).lean()
    } else throw new Error('mac Error')
  }

  /**
   * 添加绑定设备
   * @param user 
   * @param mac 
   */
  async addUserTerminal(user: string, mac: string) {
    const isBind = await this.userbindModel.findOne({ UTs: mac })
    if (isBind) {
      return null
    } else {
      return await this.userbindModel.updateOne({ user }, { $addToSet: { UTs: mac } }).lean()
    }
  }

  /**
   * 删除绑定设备
   * @param user 
   * @param mac 
   * @returns 
   */
  async delUserTerminal(user: string, mac: string) {
    return await this.userbindModel.updateOne({ user }, { $pull: { UTs: mac } }).lean()
  }

  /**
   * 删除终端挂载设备
   * @param mac 
   * @param pid 
   */
  async delTerminalMountDev(user: string, mac: string, pid: number) {
    const isBind = await this.userbindModel.findOne({ user, UTs: mac })
    if (!isBind) {
      return null
    } else {
      const model = getModelForClass(Terminal)
      return await model.updateOne({ DevMac: mac }, { $pull: { mountDevs: { pid } } }).lean()
    }
  }
}
