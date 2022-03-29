import { modelOptions, prop } from '@typegoose/typegoose';
import { Schema } from 'mongoose';
import { DevConstant } from './protocol';

@modelOptions({
  schemaOptions: { collection: 'users' },
  options: { allowMixed: 0 },
})
export class Users {
  @prop()
  public avanter: string;
  @prop({ default: 'web', type: Schema.Types.Mixed })
  public rgtype!: Uart.registerType;

  @prop({ unique: true })
  public userId: string;

  @prop()
  public name: string;

  @prop({ index: true, trim: true, unique: true })
  public user!: string;

  @prop({ enum: ['root', 'admin', 'user'], trim: true, default: 'user' })
  public userGroup!: string;

  @prop({ minlength: 10, maxlength: 200 })
  public passwd!: string;

  // https://www.jianshu.com/p/4dd08c935f00
  @prop()
  public mail: string;

  @prop()
  public company: string;

  @prop({ unique: true, sparse: true })
  public tel: string;

  @prop({ default: new Date() })
  public creatTime: Date;

  @prop()
  public modifyTime: Date;

  @prop()
  public address: string;

  @prop({ default: true })
  public status: boolean;

  @prop()
  public wpId: string;

  @prop()
  public wxId: string;

  @prop()
  public openId: string;

  @prop()
  public proxy?: string;

  @prop()
  public remark: string;
}

/**
 *  用户绑定设备
 */
@modelOptions({ schemaOptions: { collection: 'user.binddevices' } })
export class UserBindDevice {
  @prop()
  public user!: string;

  @prop({ type: String, default: [] })
  public ECs: string[];

  @prop({ type: String, default: [] })
  public ECsShare: string[];

  @prop({ type: String, default: [] })
  public UTs: string[];

  @prop({ type: String, default: [] })
  public UTsShare: string[];
}

class aggregation {
  @prop()
  public DevMac!: string;

  @prop()
  public name!: string;

  @prop()
  public Type!: string;

  @prop()
  public mountDev!: string;

  @prop()
  public protocol!: string;

  @prop({ default: 0 })
  public pid: number;
}

/**
 * 用户聚合设备
 */
@modelOptions({
  schemaOptions: { collection: 'user.aggregations' },
  options: { allowMixed: 0 },
})
export class UserAggregation {
  @prop()
  public user!: string;

  @prop()
  public id!: string;

  @prop()
  public name: string;

  @prop({ type: aggregation, _id: false })
  public aggregations: aggregation[];
}

class bind {
  @prop()
  public mac!: string;

  @prop()
  public pid!: number;

  @prop()
  public name!: string;
}

class Layout {
  @prop()
  public x: number;

  @prop()
  public y: number;

  @prop()
  public id: string;

  @prop()
  public name: string;

  @prop()
  public color: string;

  @prop({ type: bind, _id: false })
  public bind: bind;
}
/**
 * 用户布局设置
 */
@modelOptions({ schemaOptions: { collection: 'user.layouts' } })
export class UserLayout {
  @prop()
  public user!: string;

  @prop()
  public type: string;

  @prop()
  public id: string;

  @prop()
  public bg: string;

  @prop({ type: () => Layout, _id: false })
  public Layout: Layout[];
}

/**
 * 微信用户信息
 */
@modelOptions({
  schemaOptions: { timestamps: true, collection: 'user.wxpubilcs' },
  options: { allowMixed: 0 },
})
export class wxUser {
  /**
   * 用户是否订阅该公众号标识，值为0时，代表此用户没有关注该公众号，拉取不到其余信息
   */
  @prop()
  public subscribe: number;
  /**
   * 用户的标识，对当前公众号唯一
   */
  @prop()
  public openid!: string;
  /**
   * 用户的昵称
   */
  @prop()
  public nickname: string;
  /**
   * 用户的性别，值为1时是男性，值为2时是女性，值为0时是未知
   */
  @prop()
  public sex: number;
  /**
   * 用户的语言，简体中文为zh_CN
   */
  @prop()
  public language: string;
  /**
   * 用户所在城市
   */
  @prop()
  public city: string;
  /**
   * 用户所在省份
   */
  @prop()
  public province: string;
  /**
   * 用户所在国家
   */
  @prop()
  public country: string;
  /**
   * 用户头像，最后一个数值代表正方形头像大小（有0、46、64、96、132数值可选，0代表640*640正方形头像），用户没有头像时该项为空。若用户更换头像，原有头像URL将失效。
   */
  @prop()
  public headimgurl: string;
  /**
   * 用户关注时间，为时间戳。如果用户曾多次关注，则取最后关注时间
   */
  @prop()
  public subscribe_time: number;
  /**
   * 只有在用户将公众号绑定到微信开放平台帐号后，才会出现该字段。
   */
  @prop()
  public unionid: string;
  /**
   * 公众号运营者对粉丝的备注，公众号运营者可在微信公众平台用户管理界面对粉丝添加备注
   */
  @prop()
  public remark: string;
  /**
   * 用户所在的分组ID（兼容旧的用户分组接口）
   */
  @prop()
  public groupid: number;
  /**
   * 户被打上的标签ID列表
   */
  @prop({ type: Number })
  public tagid_list: number[];
  /**
   * 返回用户关注的渠道来源，ADD_SCENE_SEARCH 公众号搜索，ADD_SCENE_ACCOUNT_MIGRATION 公众号迁移，ADD_SCENE_PROFILE_CARD 名片分享，ADD_SCENE_QR_CODE 扫描二维码，ADD_SCENE_PROFILE_LINK 图文页内名称点击，ADD_SCENE_PROFILE_ITEM 图文页右上角菜单，ADD_SCENE_PAID 支付后关注，ADD_SCENE_WECHAT_ADVERTISEMENT 微信广告，ADD_SCENE_OTHERS 其他
   */
  @prop()
  public subscribe_scene: string;

  @prop()
  public qr_scene: number;

  @prop()
  public qr_scene_str: string;
}

/**
 * 用户告警设备
 */
@modelOptions({
  schemaOptions: { collection: 'user.alarmsetups' },
  options: { allowMixed: 0 },
})
export class UserAlarmSetup {
  @prop()
  user!: string;

  @prop({ type: [String], default: [] })
  tels: string[];

  @prop({ type: [String], default: [] })
  mails: string[];

  @prop({ type: [String], default: [] })
  wxs: string[];

  @prop({ type: DevConstant, _id: false })
  ProtocolSetup: DevConstant[];
}

/**
 * 记录gps解析
 */
@modelOptions({
  schemaOptions: { timestamps: true, collection: 'amap.loctioncaches' },
})
export class AMapLoctionCache {
  @prop()
  key: string;

  @prop()
  val: string;
}

/**
 * 记录第三方组件密匙信息
 */
@modelOptions({
  schemaOptions: { timestamps: true, collection: 'secret.apps' },
})
export class SecretApp {
  @prop()
  type: string;

  @prop()
  appid: string;

  @prop()
  secret: string;
}

/**
 * 记录pesiv用户密码盐值
 */
@modelOptions({ schemaOptions: { timestamps: true, collection: 'user.salts' } })
export class Salt {
  @prop()
  user: string;

  @prop()
  salt: string;
}
