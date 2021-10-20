import { Provide } from '@midwayjs/decorator';
import { Context, IMidwayKoaNext, IWebMiddleware } from '@midwayjs/koa';
import { Device } from '../service/device';

/**
 * 校验数据来源
 */
@Provide()
export class nodeHttp implements IWebMiddleware {
  resolve() {
    return async (ctx: Context, next: IMidwayKoaNext) => {
      const nodes = await (
        await ctx.requestContext.getAsync(Device)
      ).getNodes();

      const ip = ctx.ip.split(':').reverse()[0];
      if (nodes.some(el => el.IP === ip)) {
        await next();
      } else throw new Error('nodeData premiss');
    };
  }
}
