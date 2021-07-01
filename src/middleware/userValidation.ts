import { Provide } from "@midwayjs/decorator";
import { Context, IMidwayKoaNext, IWebMiddleware } from "@midwayjs/koa";
import { Util } from "../util/util";

@Provide()
export class token implements IWebMiddleware {
    resolve() {
        return async (ctx: Context, next: IMidwayKoaNext) => {
            const token = ctx.cookies.get("auth._token.local")
            if (/^\/api\/guest\/.*/.test(ctx.path)) {
                await next()
            } else {
                if (token && token !== 'false') {
                    const util = await ctx.requestContext.getAsync<Util>('util')
                    const user = await util.Secret_JwtVerify<Uart.UserInfo>(token.split("%20")[1]);
                    ctx.request.body.token = {
                        user: user.user,
                        userGroup: user.userGroup
                    }
                } else
                    throw new Error('token null')
                await next()
            }
        }
    }
}