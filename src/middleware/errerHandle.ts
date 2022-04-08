import { Catch } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import * as moment from 'moment';

@Catch()
export class errerHandle {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async catch(err: any, ctx: Context) {
    // ...
    console.log({
      message: '全局错误捕获',
      method: ctx.method,
      query: ctx.query,
      body: ctx.body,
      param: ctx.url,
      ips: ctx.ips,
      time: moment().format('YYYY-MM-DD H:m:s'),
      err: err?.message || err,
    });

    return {
      code: 0,
      status: err.status ?? 500,
      message: err.message,
    };
  }
}
