import {
  Inject,
  Controller,
  Get,
  Provide,
  Query,
  Body,
  Post,
  Validate,
  ALL,
} from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { UserService } from '../service/user';
import { login, loginHash, wplogin, wxlogin } from '../dto/user';
import { Util } from '../util/util';
import { RedisService } from '../service/redis';
import { Wx } from '../util/wx';
import { Logs } from '../service/log';
import { AES, enc } from 'crypto-js';
import { code2Session, getPhone, registerUser } from '../dto/auth';

/**
 * 登录相关控制器
 */
@Provide()
@Controller('/api/auth')
export class AuthController {
  @Inject()
  ctx: Context;

  @Inject()
  userService: UserService;

  @Inject()
  Util: Util;

  @Inject()
  RedisService: RedisService;

  @Inject()
  Wx: Wx;

  @Inject()
  logs: Logs;

  /**
   * 获取用户名
   * @param user
   * @returns
   */
  @Get('/user', { middleware: ['tokenParse'] })
  async user(@Body() user: Uart.UserInfo) {
    return {
      code: user ? 200 : 0,
      user: user.user,
      userGroup: user?.userGroup,
    };
  }

  /**
   * 获取用户组
   * @param user
   * @returns
   */
  @Get('/userGroup', { middleware: ['tokenParse'] })
  async userGroup(@Body() user: Uart.UserInfo) {
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
  async hash(@Query(ALL) data: loginHash) {
    const hash = await this.Util.Secret_JwtSign({
      key: data.user,
      time: Date.now(),
    });
    this.RedisService.getClient().set(data.user, hash, 'EX', 120);
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
  async login(@Body(ALL) accont: login) {
    const hash = await this.RedisService.getClient().get(accont.user);
    if (!hash) {
      return {
        code: 1,
        msg: 'hash null',
      };
    }
    // 解密hash密码
    const decryptPasswd = AES.decrypt(accont.passwd, hash!).toString(enc.Utf8);
    //
    let user = await this.userService.getUser(accont.user);
    //
    if (!user) {
      user = await this.userService.syncPesivUser(accont.user, decryptPasswd);
      if (!user) {
        return {
          code: 0,
          msg: 'user null',
        };
      }
    }
    // 比对校验密码
    const PwStat = await this.userService.BcryptComparePasswd(
      accont.user,
      decryptPasswd
    );

    if (!PwStat) {
      return {
        code: 2,
        msg: 'passwd Error',
      };
    } else {
      this.RedisService.getClient().del(user.user);

      return {
        code: 200,
        token: await this.userService.getToken(user.user),
        data: await this.userService.updateUserLoginlog(user.user, this.ctx.ip),
      };
    }
  }

  @Post('/wxlogin')
  @Validate()
  async wxlogin(@Body(ALL) data: wxlogin) {
    const info = await this.Wx.OP.userInfo(data.code);
    let user = await this.userService.getUser(info.unionid);
    // 如果没有用户则新建
    if (!user) {
      const users: Uart.UserInfo = {
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
      user = await this.userService.createUser(users);
    } else {
      await this.userService.updateUserLoginlog(user.user, this.ctx.ip);
    }
    return {
      code: 200,
      token: await this.userService.getToken(user.user),
    };
  }

  // ----------------------------------------------
  /**
   * 以下是微信小程序端支持
   * https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  @Get('/code2Session')
  async code2Session(@Query(ALL) data: code2Session) {
    // 正确的话返回sessionkey
    const seesion = await this.Wx.WP.UserOpenID(data.js_code);
    // 存储session
    await this.RedisService.setCode2Session(
      seesion.openid,
      seesion.session_key
    );
    // 检查unionid是否为已注册用户,
    const user = await this.userService.getUser(seesion.unionid);
    if (user) {
      await this.userService.updateUserLoginlog(
        user.user,
        this.ctx.ip,
        'wx_login'
      );
      // 如果没有小程序id,更新
      if (!user.wpId) {
        await this.userService.modifyUserInfo(user.user, {
          wpId: seesion.openid,
        });
      }
      // 如果是测试用户组,清除wxid
      if (user.userGroup === 'test') {
        await this.userService.modifyUserInfo(user.user, {
          wpId: '',
          userId: '',
          wxId: '',
        });
      }
      return {
        code: 200,
        data: {
          token: await this.userService.getToken(user.user),
        },
      };
      // 如果登录携带扫码scene值,则是绑定小程序和透传账号
    } else if (data.scene) {
      const user = await this.userService.getIdUser(data.scene);
      if (user) {
        await this.userService.updateUserLoginlog(
          user.user,
          this.ctx.ip,
          'wx_bind'
        );
        await this.userService.modifyUserInfo(user.user, {
          userId: seesion.unionid,
          wpId: seesion.openid,
        });
        return {
          code: 200,
          data: {
            token: await this.userService.getToken(user.user),
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
  async trial(@Query(ALL) data: code2Session) {
    // 正确的话返回sessionkey
    const seesion = await this.Wx.WP.UserOpenID(data.js_code);
    // 存储session
    await this.RedisService.setCode2Session(
      seesion.openid,
      seesion.session_key
    );
    // 检查unionid是否为已注册用户,
    const user = await this.userService.getUser('test');
    await this.userService.updateUserLoginlog(
      user.user,
      this.ctx.ip,
      'wx_login-'+seesion.openid+'-trail'
    );
    return {
      code: 200,
      data: {
        token: await this.userService.getToken(user.user),
      },
    };

  }

  /**
   * 解密电话字符串
   * @param data
   */
  @Post('/getphonenumber')
  @Validate()
  async getphonenumber(@Body(ALL) data: getPhone) {
    const session = await this.RedisService.getCode2Session(data.openid);
    return {
      code: 200,
      data: await this.Wx.WP.BizDataCryptdecryptData(
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
  async wxRegister(@Body(ALL) data: registerUser) {
    if (await this.userService.getUser(data.tel)) {
      return {
        code: 0,
        msg: '手机号已被用户注册',
      };
    } else {
      return {
        code: 200,
        data: await this.userService.createUser({
          user: data.user,
          userId: data.user,
          wpId: data.openid,
          avanter: data.avanter,
          name: data.getName(),
          tel: Number(data.tel),
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
  async wplogin(@Body(ALL) accont: wplogin) {
    let user = await this.userService.getUser(accont.user);
    if (!user) {
      user = await this.userService.syncPesivUser(accont.user, accont.passwd);
      if (!user) {
        return {
          code: 0,
          msg: '用户未注册,请使用微信注册',
        };
      }
    }

    if (
      !(await this.userService.BcryptComparePasswd(accont.user, accont.passwd))
    ) {
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
      await this.userService.modifyUserInfo(user.user, {
        userId: accont.unionid,
        wpId: accont.openid,
        avanter: accont.avanter,
      });
    }
    await this.userService.updateUserLoginlog(
      user.user,
      this.ctx.ip,
      'wpLogin'
    );
    return {
      code: 200,
      data: { token: await this.userService.getToken(user.user) },
    };
  }
}
