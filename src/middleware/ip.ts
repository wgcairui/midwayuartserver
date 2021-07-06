import { Provide } from "@midwayjs/decorator";
import { Context, IMidwayKoaNext, IWebMiddleware } from "@midwayjs/koa";

/**
 * 转换ip
 */
@Provide()
export class ip implements IWebMiddleware {
    resolve() {
        return async (ctx: Context, next: IMidwayKoaNext) => {
            ctx.ip = ctx.headers["x-real-ip"] as string | null || ctx.ip
            await next()
        }
    }
}