import * as path from 'path';
import { Provide, Config, App } from '@midwayjs/decorator';
import { IWebMiddleware, IMidwayKoaApplication, Context } from '@midwayjs/koa';
import { ApolloServer, ServerRegistration } from 'apollo-server-koa';
import { buildSchemaSync } from 'type-graphql';
import { UserRole } from "../util/constants";
import { authChecker } from "../util/authChecker";
import { Util } from '../util/util';
import { tokenUser } from "../interface"

@Provide('GraphQLMiddleware')
export class GraphqlMiddleware implements IWebMiddleware {
  @Config('apollo')
  config: ServerRegistration;

  @App()
  app: IMidwayKoaApplication;

  resolve() {
    const server = new ApolloServer({
      schema: buildSchemaSync({
        resolvers: [path.resolve(this.app.getBaseDir(), 'resolver/*')],
        container: this.app.getApplicationContext(),
        authChecker,
        authMode: 'error',
        emitSchemaFile: true,
      }),
      context: async ({ ctx }: { ctx: Context }) => {
        const token = ctx.header.authorization
        const language = ctx.header['accept-language'].split(";")[0]
        const util = await ctx.requestContext.getAsync<Util>('util')
        const user = await util.Secret_JwtVerify<tokenUser>(token.split(" ")[1].trim()).catch(() => null);
        return {
          user,
          language,
          currentReqUser: {
            role: user ? (user.userGroup === 'root' ? UserRole.ADMIN : UserRole.COMMON) : UserRole.UNLOGIN,
          }
        }
      }
    });
    console.log('Apollo-GraphQL Invoke');

    return server.getMiddleware(this.config);
  }
}