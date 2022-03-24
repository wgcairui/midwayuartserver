import { Provide } from '@midwayjs/decorator';
import { Context, NextFunction } from '@midwayjs/koa';
import { IMiddleware } from '@midwayjs/core';
import { Secret_JwtVerify } from '../util/util';
import { saveUserRequst } from '../service/logService';

/**
 * 校验用户组是否正确
 */
@Provide()
export class root implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const token =
        (ctx.header.token as string) || ctx.cookies.get('auth._token.local');

      if (!token || token === 'false') throw new Error('token null');

      const user = await Secret_JwtVerify<Uart.UserInfo>(
        token.split('%20').reverse()[0].trim()
      ).catch(() => {
        ctx.logger.warn('token error');
        ctx.throw('token error');
      });
      if (!['root', 'admin'].includes(user.userGroup)) {
        ctx.logger.warn('user %s error', user.user);
        ctx.throw('user error');
      }

      saveUserRequst(user.user, user.userGroup, ctx.path, ctx.request.body);

      await next();
    };
  }
}
