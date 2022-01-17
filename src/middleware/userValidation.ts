import { Provide } from '@midwayjs/decorator';
import { Context, IMidwayKoaNext, IWebMiddleware } from '@midwayjs/koa';
import { Util } from '../util/util';
import { Logs } from '../service/logBase';

/**
 * 判断请求是否是
 */
@Provide()
export class token implements IWebMiddleware {
  resolve() {
    return async (ctx: Context, next: IMidwayKoaNext) => {
      const token = (ctx.header.token as string) || ctx.cookies.get('auth._token.local')
      if (/^\/api\/guest\/.*/.test(ctx.path)) {
        await next();
      } else {
        if (token && token !== 'false') {
          const util = await ctx.requestContext.getAsync(Util);

          const user = await util
            .Secret_JwtVerify<Uart.UserInfo>(
              token.split('%20').reverse()[0].trim()
            )
            .catch(err => {
              ctx.logger.warn(err);
              ctx.throw('token error');
              //throw new Error('token error');
            });
          ctx.request.body.token = {
            user: user.user,
            userGroup: user.userGroup,
            type: ctx.type || 'web',
          };

          ctx.requestContext.getAsync(Logs).then(el => {
            el.saveUserRequst(
              user.user,
              user.userGroup,
              ctx.path,
              ctx.request.body
            );
          });
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
