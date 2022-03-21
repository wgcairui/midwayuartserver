import { Catch } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';

@Catch()
export class errerHandle {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async catch(err: any, _ctx: Context) {
    // ...
    console.log({err});

    return {
      code: 0,
      status: err.status ?? 500,
      message: err.message,
    };
  }
}
