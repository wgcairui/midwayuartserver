import { IMiddleware } from '@midwayjs/core';
import { Provide } from '@midwayjs/decorator';
import { Context, NextFunction } from '@midwayjs/koa';
import { Secret_JwtVerify } from '../util/util';

/**
 * 解析请求是否携带token,是的话转换token数据
 */
@Provide()
export class TokenParse implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const token =
        (ctx.header.token as string) || ctx.cookies.get('auth._token.local');

      if (token && token !== 'false') {
        const user = await Secret_JwtVerify(token.split('%20').reverse()[0]);
        (ctx.request.body as any).user = user;
      }
      await next();
    };
  }
}
