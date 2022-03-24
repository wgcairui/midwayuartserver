import { IMiddleware } from '@midwayjs/core';
import { Provide } from '@midwayjs/decorator';
import { Context, NextFunction } from '@midwayjs/koa';
import { getNodes } from '../service/deviceService';

/**
 * 校验数据来源
 */
@Provide()
export class nodeHttp implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const nodes = await getNodes();

      const nodeSet = new Set(nodes.map(({ IP }) => IP));
      const ip = ctx.ip.split(':').reverse()[0];

      if (nodeSet.has(ip)) {
        await next();
      } else {
        const err = new Error('nodeData premiss');
        ctx.logger.warn(err);
        throw err;
      }
    };
  }
}
