import * as devmongoConfig from './config/config.devmongo';
import * as defaultConfig from './config/config.default';
import { Configuration, App } from '@midwayjs/decorator';
import * as koa from '@midwayjs/koa';
import * as Socket from '@midwayjs/socketio';
import * as Ws from '@midwayjs/ws';
import * as typegoose from '@midwayjs/typegoose';
import * as task from '@midwayjs/task';
import * as oss from '@midwayjs/oss';
import * as Validation from '@midwayjs/validate';
import * as info from '@midwayjs/info';
import { errerHandle } from './middleware/errerHandle';

@Configuration({
  conflictCheck: true,
  imports: [koa, Socket, Ws, typegoose, task, oss, Validation, info],
  importConfigs: [{ default: defaultConfig, devmongo: devmongoConfig }],
})
export class AutoConfiguration {
  @App()
  app: koa.Application;

  async onReady() {
    this.app.useMiddleware(require('@koa/cors')({ origin: '*' }));
    /* this.app.useMiddleware(require('koa-body')({
      multipart: true,
      formidable: {
        maxFileSize: 1024 * 1024 * 100 * 100,
      }
    })) */
    this.app.useFilter([errerHandle]);
  }
}
