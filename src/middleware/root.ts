import { Provide } from '@midwayjs/decorator';
import { Context, IMidwayKoaNext, IWebMiddleware } from '@midwayjs/koa';
import { Util } from '../util/util';
import { Logs } from '../service/logBase';

/**
 * 校验用户组是否正确
 */
@Provide()
export class root implements IWebMiddleware {
  resolve() {
    return async (ctx: Context, next: IMidwayKoaNext) => {
      const token =
        (ctx.header.token as string) || ctx.cookies.get('auth._token.local');

      if (!token || token === 'false') throw new Error('token null');

      const util = await ctx.requestContext.getAsync(Util);
      const user = await util
        .Secret_JwtVerify<Uart.UserInfo>(token.split('%20').reverse()[0].trim())
        .catch(() => {
          ctx.logger.warn('token error');
          ctx.throw('token error');
        });
      if (!['root', 'admin'].includes(user.userGroup)) {
        ctx.logger.warn('user %s error', user.user);
        ctx.throw('user error');
      }

      ctx.requestContext.getAsync(Logs).then(el => {
        el.saveUserRequst(
          user.user,
          user.userGroup,
          ctx.path,
          ctx.request.body
        );
      });

      await next();
    };
  }
}
