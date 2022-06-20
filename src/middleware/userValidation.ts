import { Provide } from '@midwayjs/decorator';
import { Context, NextFunction } from '@midwayjs/koa';
import { IMiddleware } from '@midwayjs/core';
import { Secret_JwtVerify } from '../util/util';
import { saveUserRequst } from '../service/logService';
import { Users } from '../entity';

/**
 * 判断请求是否是
 */
@Provide()
export class userValidation implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const token =
        (ctx.header.token as string) || ctx.cookies.get('auth._token.local');
      if (/^\/api\/guest\/.*/.test(ctx.path)) {
        await next();
      } else {
        if (token && token !== 'false') {
          const user = await Secret_JwtVerify<Users>(
            token.split('%20').reverse()[0].trim()
          ).catch(err => {
            ctx.logger.warn(err);
            ctx.throw('token error');
            //throw new Error('token error');
          });
          ctx.request.body.token = {
            user: user.user,
            userGroup: user.userGroup,
            type: ctx.type || 'web',
          };

          saveUserRequst(user.user, user.userGroup, ctx.path, ctx.request.body);
        } else {
          ctx.body = {
            code: 0,
            data: 'token null',
          };
          return;
          // ctx.throw('token null')
          // throw new Error('token null')
        }
        await next();
      }
    };
  }
}
