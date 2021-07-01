import { Inject, Controller, Get, Provide, Query, Body, Post, Validate, ALL } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { UserService } from '../service/user';
import { login, loginHash, wxlogin } from "../dto/user"
import { Util } from "../util/util"
import { RedisService } from "../service/redis"
import { Wx } from "../util/wx"
import { AES, enc } from "crypto-js"
@Provide()
@Controller('/api/auth', { middleware: ['tokenParse'] })
export class AuthController {
  @Inject()
  ctx: Context;

  @Inject()
  userService: UserService;

  @Inject()
  Util: Util

  @Inject()
  RedisService: RedisService

  @Inject()
  Wx: Wx

  /**
   * 获取用户名
   * @param user 
   * @returns 
   */
  @Get('/user')
  async user(@Body() user: Uart.UserInfo) {
    return { code: user ? 200 : 0, user: user.user };
  }

  /**
   * 获取用户组
   * @param user 
   * @returns 
   */
  @Get("/userGroup")
  async userGroup(@Body() user: Uart.UserInfo) {
    return { code: user ? 200 : 0, userGroup: user?.userGroup }
  }

  /**
   * 网页退出登录
   * @returns 
   */
  @Post("/logout")
  async logout() {
    return { code: 200 }
  }


  /**
   * 获取加密hash
   * @param data 
   * @returns 
   */
  @Get("/hash")
  @Validate()
  async hash(@Query(ALL) data: loginHash) {
    const user = await this.userService.getUser(data.user)
    if (user) {
      const hash = await this.Util.Secret_JwtSign({ key: user.creatTime, time: Date.now() })
      this.RedisService.getClient().set(data.user, hash, "EX", 120)
      return {
        code: 0,
        hash
      }
    }
  }

  /**
   * web登录
   * @param accont 
   */
  @Post("/login")
  @Validate()
  async login(@Body(ALL) accont: login) {
    const user = await this.userService.getUser(accont.user)
    if (!user) {
      return {
        code: 0,
        msg: 'user null'
      }
    }
    const hash = await this.RedisService.getClient().get(user.user)
    if (!hash) {
      return {
        code: 1,
        msg: 'hash null'
      }
    }
    // 解密hash密码
    const decryptPasswd = AES.decrypt(accont.passwd, hash!).toString(enc.Utf8)
    // 比对校验密码
    const PwStat = this.Util.BcryptCompare(user.passwd, decryptPasswd)
    if (!PwStat) {
      return {
        code: 2,
        msg: 'passwd Error'
      }
    }

    this.RedisService.getClient().del(user.user)

    return {
      code: 200,
      token: await this.Util.Secret_JwtSign({ user: user.user, userGroup: user.userGroup }),
      data: await this.userService.updateUserLoginlog(user.user, this.ctx.ip)
    }
  }

  @Post("/wxlogin")
  @Validate()
  async wxlogin(@Body(ALL) data: wxlogin) {
    const info = await this.Wx.OP.userInfo(data.code)
    let user = await this.userService.getUser(info.unionid)
    // 如果没有用户则新建
    if (!user) {
      const users: Uart.UserInfo = {
        userId: info.unionid,
        user: info.unionid,
        name: info.nickname,
        avanter: info.headimgurl,
        passwd: info.unionid,
        rgtype: "wx",
        userGroup: "user",
        openId: info.openid,
        address: this.ctx.ip
      }
      user = await this.userService.createUser(users)
    } else {
      await this.userService.updateUserLoginlog(user.user, this.ctx.ip)
    }
    return {
      code: 200,
      token: await this.Util.Secret_JwtSign({ user: user.user, userGroup: user.userGroup })
    }
  }
}
