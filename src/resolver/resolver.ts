import { Provide, Inject } from '@midwayjs/decorator';
import { Resolver, Query, Authorized, Arg, Mutation, Ctx } from 'type-graphql';
import { Node, UserCreateInput, BindDevice } from "../graphql/user";
import { IContext } from '../interface';
import { UserRole } from "../util/constants";
import { UserService } from "../service/user"

@Provide()
@Resolver()
export default class UserResolver {

    @Inject()
    UserService: UserService

    @Authorized(UserRole.ADMIN)
    @Query(returns => String)
    GetAllUsers(@Arg('user', type => String) user: string) {

        return user
    }
    /**
     * 获取节点
     * @param IP 
     * @param Name 
     */
    @Query(() => Node)
    async Node(@Arg('IP', type => String) IP: String, @Arg("Name", type => String) Name: string) {

        /* return await NodeClient.findOne({
            $or: [{ IP: IP || "" }, { Name: Name || "" }]
        }); */
    }
    /**
     * 获取所有节点信息
     */
    @Query(() => [Node])
    async Nodes() {
        //return ctx.$Event.Cache.CacheNode.values();
    }

    /**
     * 获取用户病毒设备
     * @param ctx 
     * @returns 
     */
    @Authorized(UserRole.ADMIN, UserRole.COMMON)
    @Query(returns => BindDevice, { nullable: true })
    async BindDevice(@Ctx() ctx: IContext) {
        return this.UserService.getUserBindDevices(ctx.user.user)
    }

    @Mutation(returns => String, { nullable: true })
    CreateUser(@Arg('id', type => UserCreateInput) createParams: UserCreateInput) {

        return '';
    }

}