import { Provide, Scope, ScopeEnum, Init, Inject } from "@midwayjs/decorator"
import { wxApp, wxOpen, wxPublic } from "@cairui/wx-sdk"
import { UserService } from "./user"

/**
 * 微信开发套件
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class Wx {

    @Inject()
    private UserService: UserService

    /**
     * 公众号
     */
    MP?: wxPublic
    /**
     * 小程序
     */
    WP?: wxApp
    /**
     * 开放平台
     */
    OP?: wxOpen

    @Init()
    async init() {
        this.initMp()
        this.initOp()
        this.initWp()
    }

    /**
     * 初始化公众号
     */
    async initMp() {
        const mpSecret = await this.UserService.getUserSecret("wxmp")
        if (mpSecret) {
            this.MP = new wxPublic(mpSecret.appid, mpSecret.secret)
        }
    }

    /**
     * 初始化小程序对象
     */
    async initWp() {
        const wpSecret = await this.UserService.getUserSecret("wxwp")
        if (wpSecret) {
            this.WP = new wxApp(wpSecret.appid, wpSecret.secret)
        }
    }

    /**
     * 初始化开放平台
     */

    async initOp() {
        const opSecret = await this.UserService.getUserSecret('wxopen')
        if (opSecret) {
            this.OP = new wxOpen(opSecret.appid, opSecret.secret)
        }
    }

}