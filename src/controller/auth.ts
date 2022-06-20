import {
  Inject,
  Controller,
  Get,
  Query,
  Body,
  Post,
} from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { login, loginHash, wplogin, wxlogin } from '../dto/user';
import { RedisService } from '../service/redisService';
import { AES, enc } from 'crypto-js';
import { code2Session, getPhone, registerUser } from '../dto/auth';
import { Validate } from '@midwayjs/validate';
import { TokenParse } from '../middleware/tokenParse';
import { MQ } from '../service/bullService';
import { Secret_JwtSign } from '../util/util';
import {
  getUser,
  BcryptComparePasswd,
  getToken,
  updateUserLoginlog,
  createUser,
  modifyUserInfo,
  getIdUser,
} from '../service/userSevice';
import { WeaApps } from '../util/weapp';
import { wxWebUserInfo } from '../util/open_web';
import { Users } from '../entity';

/**
 * 登录相关控制器
 */

@Controller('/api/auth')
export class AuthController {
  @Inject()
  ctx: Context;

  /**
   * 获取用户名
   * @param user
   * @returns
   */
  @Get('/user', { middleware: [TokenParse] })
  async user(@Body('user') user: Users) {
    return {
      code: user ? 200 : 0,
      user: user ? user.user : 'guest',
      userGroup: user ? user.userGroup : 'guest',
    };
  }

  /**
   * 获取用户组
   * @param user
   * @returns
   */
  @Get('/userGroup', { middleware: [TokenParse] })
  async userGroup(@Body('user') user: Users) {
    return { code: user ? 200 : 0, userGroup: user?.userGroup };
  }

  /**
   * 网页退出登录
   * @returns
   */
  @Post('/logout')
  async logout() {
    return { code: 200 };
  }

  /**
   * 获取加密hash
   * @param data
   * @returns
   */
  @Get('/hash')
  @Validate()
  async hash(@Query() data: loginHash) {
    const hash = await Secret_JwtSign({
      key: data.user,
      time: Date.now(),
    });
    RedisService.getClient().set(data.user, hash, 'EX', 120);
    return {
      code: 200,
      hash,
    };
  }

  /**
   * web登录
   * @param accont
   */
  @Post('/login')
  @Validate()
  async login(@Body() accont: login) {
    const hash = await RedisService.getClient().get(accont.user);
    if (!hash) {
      return {
        code: 1,
        msg: 'hash null',
      };
    }
    // 解密hash密码
    const decryptPasswd = AES.decrypt(accont.passwd, hash!).toString(enc.Utf8);
    //
    const user = await getUser(accont.user);
    //
    if (!user) {
      // user = await syncPesivUser(accont.user, decryptPasswd);
      if (!user) {
        return {
          code: 0,
          msg: 'user null',
        };
      }
    }
    // 比对校验密码
    const PwStat = await BcryptComparePasswd(accont.user, decryptPasswd);

    if (!PwStat) {
      return {
        code: 2,
        msg: 'passwd Error',
      };
    } else {
      RedisService.getClient().del(user.user);

      return {
        code: 200,
        token: await getToken(user.user),
        data: await updateUserLoginlog(user.user, this.ctx.ip),
      };
    }
  }

  @Post('/wxlogin')
  @Validate()
  async wxlogin(@Body() data: wxlogin) {
    const info = await wxWebUserInfo(data.code);
    let user = await getUser(info.unionid);
    // 如果没有用户则新建
    if (!user) {
      const users: Partial<Users> = {
        userId: info.unionid,
        user: info.unionid,
        name: info.nickname,
        avanter: info.headimgurl,
        passwd: info.unionid,
        rgtype: 'wx',
        userGroup: 'user',
        openId: info.openid,
        address: this.ctx.ip,
      };
      user = await createUser(users);
    } else {
      await updateUserLoginlog(user.user, this.ctx.ip);
    }
    return {
      code: 200,
      token: await getToken(user.user),
    };
  }

  // ----------------------------------------------
  /**
   * 以下是微信小程序端支持
   * https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  @Get('/code2Session')
  async code2Session(@Query() data: code2Session) {
    // 正确的话返回sessionkey
    const seesion = await WeaApps.UserOpenID(data.js_code);
    // 存储session
    await RedisService.setCode2Session(seesion.openid, seesion.session_key);
    // 检查unionid是否为已注册用户,
    const user = await getUser(seesion.unionid);
    if (user) {
      await updateUserLoginlog(user.user, this.ctx.ip, 'wx_login');
      // 如果没有小程序id,更新
      if (!user.wpId) {
        await modifyUserInfo(user.user, {
          wpId: seesion.openid,
        });
      }
      // 如果是测试用户组,清除wxid
      if (user.userGroup === 'test') {
        await modifyUserInfo(user.user, {
          wpId: '',
          userId: '',
          wxId: '',
        });
      }
      return {
        code: 200,
        data: {
          token: await getToken(user.user),
        },
      };
      // 如果登录携带扫码scene值,则是绑定小程序和透传账号
    } else if (data.scene) {
      const user = await getIdUser(data.scene);
      if (user) {
        await updateUserLoginlog(user.user, this.ctx.ip, 'wx_bind');
        await modifyUserInfo(user.user, {
          userId: seesion.unionid,
          wpId: seesion.openid,
        });
        return {
          code: 200,
          data: {
            token: await getToken(user.user),
          },
        };
      }
    }

    return {
      code: 0,
      data: seesion,
      msg: '用户未注册',
    };
  }

  /**
   * 小程序测试试用
   * @param data
   * @returns
   */
  @Get('/trial')
  async trial(@Query() data: code2Session) {
    // 正确的话返回sessionkey
    const seesion = await WeaApps.UserOpenID(data.js_code);
    // 存储session
    await RedisService.setCode2Session(seesion.openid, seesion.session_key);
    // 检查unionid是否为已注册用户,
    const user = await getUser('test');
    await updateUserLoginlog(
      user.user,
      this.ctx.ip,
      'wx_login-' + seesion.openid + '-trail'
    );
    return {
      code: 200,
      data: {
        token: await getToken(user.user),
      },
    };
  }

  /**
   * 解密电话字符串
   * @param data
   */
  @Post('/getphonenumber')
  @Validate()
  async getphonenumber(@Body() data: getPhone) {
    const session = await RedisService.getCode2Session(data.openid);
    return {
      code: 200,
      data: await WeaApps.BizDataCryptdecryptData(
        session,
        data.encryptedData,
        data.iv
      ),
    };
  }

  /**
   * 注册
   * @param data
   */
  @Post('/wxRegister')
  @Validate()
  async wxRegister(@Body() data: registerUser) {
    if (await getUser(data.tel)) {
      return {
        code: 0,
        msg: '手机号已被用户注册',
      };
    } else {
      MQ.addJob('inner_Message', {
        timeStamp: Date.now(),
        message: '微信用户注册',
        user: data.user,
        nikeName: data.getName(),
      });
      return {
        code: 200,
        data: await createUser({
          user: data.user,
          userId: data.user,
          wpId: data.openid,
          avanter: data.avanter,
          name: data.getName(),
          tel: data.tel,
          rgtype: 'wx',
        }),
      };
    }
  }

  /**
   * wp登录
   * @param accont
   */
  @Post('/wplogin')
  @Validate()
  async wplogin(@Body() accont: wplogin) {
    const user = await getUser(accont.user);
    if (!user) {
      //user = await syncPesivUser(accont.user, accont.passwd);
      if (!user) {
        return {
          code: 0,
          msg: '用户未注册,请使用微信注册',
        };
      }
    }

    if (!(await BcryptComparePasswd(accont.user, accont.passwd))) {
      return {
        code: 0,
        msg: '用户名或密码错误',
      };
    }
    if (
      user.userGroup !== 'test' &&
      user.userId &&
      user.userId !== accont.unionid
    ) {
      return {
        code: 0,
        msg: '账号已被其他微信用户绑定,请核对账号是否正确',
      };
    } else {
      await modifyUserInfo(user.user, {
        userId: accont.unionid,
        wpId: accont.openid,
        avanter: accont.avanter,
      });
    }
    await updateUserLoginlog(user.user, this.ctx.ip, 'wpLogin');
    return {
      code: 200,
      data: { token: await getToken(user.user) },
    };
  }
}
