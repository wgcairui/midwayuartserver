import { Provide } from '@midwayjs/decorator';
import { Context, IMidwayKoaNext, IWebMiddleware } from '@midwayjs/koa';
import { Util } from '../util/util';

/**
 * 解析请求是否携带token,是的话转换token数据
 */
@Provide()
export class TokenParse implements IWebMiddleware {
  resolve() {
    return async (ctx: Context, next: IMidwayKoaNext) => {
      const token =
        ctx.cookies.get('auth._token.local') || (ctx.header.token as string);
      if (token && token !== 'false') {
        const util = await ctx.requestContext.getAsync<Util>('util');
        const user = await util.Secret_JwtVerify(token.split('%20')[1]);
        (ctx.request.body as any).user = user;
      }
      await next();
    };
  }
}
