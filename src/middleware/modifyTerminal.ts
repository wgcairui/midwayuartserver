import { Provide } from '@midwayjs/decorator';
import { Context, IMidwayKoaNext, IWebMiddleware } from '@midwayjs/koa';
import { SocketUser } from '../service/socketUserBase';

/**
 * 解析请求是否携带token,是的话转换token数据
 */
@Provide()
export class modifyTerminal implements IWebMiddleware {
  resolve() {
    return async (ctx: Context, next: IMidwayKoaNext) => {
      await next();
      const path = ctx.request.path.split("/").reverse()[0]
        
      
      
      if(/^(modify|set).*terminal/i.test((path)) ){
        console.log(path);
          const body = ctx.request.body
          if(body && 'mac' in body){
            const socket = await ctx.requestContext.getAsync(SocketUser);
            socket.sendMacUpdate(body.mac)
          }
      }
      
      
    };
  }
}
