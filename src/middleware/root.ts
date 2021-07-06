import { Provide } from "@midwayjs/decorator";
import { Context, IMidwayKoaNext, IWebMiddleware } from "@midwayjs/koa";
import { Util } from "../util/util";

/**
 * 校验用户组是否正确
 */
@Provide()
export class root implements IWebMiddleware {
    resolve() {
        return async (ctx: Context, next: IMidwayKoaNext) => {
            const token = ctx.cookies.get("auth._token.local") || ctx.header.token as string
            if (!token || token === 'false') throw new Error('token null')

            const util = await ctx.requestContext.getAsync(Util)
            const user = await util.Secret_JwtVerify<Uart.UserInfo>(token.split("%20").reverse()[0].trim()).catch(err => {
                console.log({ token, err });
                throw new Error('token error')
            });
            if (!['root', 'admin'].includes(user.userGroup)) throw new Error('user error')

            await next()
        }
    }
}