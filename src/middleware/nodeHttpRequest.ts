import { IMiddleware } from '@midwayjs/core';
import { Provide } from '@midwayjs/decorator';
import { Context, NextFunction } from '@midwayjs/koa';
import { Device } from '../service/deviceBase';

/**
 * 校验数据来源
 */
@Provide()
export class nodeHttp implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const nodes = await (
        await ctx.requestContext.getAsync(Device)
      ).getNodes();

      const ip = ctx.ip.split(':').reverse()[0];
      try {
        if (nodes.some(el => el.IP === ip)) {
          await next();
        } else {
          const err = new Error('nodeData premiss');
          ctx.logger.warn(err);
          throw err;
        }
      } catch (error) {
        ctx.throw('nodeData premiss');
      }
    };
  }
}
