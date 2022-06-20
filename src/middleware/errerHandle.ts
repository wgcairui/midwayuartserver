import { Catch } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import * as moment from 'moment';

@Catch()
export class errerHandle {
  async catch(err: any, ctx: Context) {
    console.log({
      message: '全局错误捕获',
      method: ctx.method,
      query: ctx.query,
      body: ctx.body,
      param: ctx.url,
      ip: ctx.ip,
      time: moment().format('YYYY-MM-DD H:m:s'),
      err: err?.message || err,
      code: err?.code || -1000,
      status: err?.status || -1000,
    });

    return {
      code: 0,
      status: err.status ?? 500,
      message: err.message,
    };
  }
}
