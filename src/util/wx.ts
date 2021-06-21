import { Provide, Scope, ScopeEnum, Init } from "@midwayjs/decorator"
import { getModelForClass } from "@midwayjs/typegoose"
import { wxApp, wxOpen, wxPublic } from "@cairui/wx-sdk"
import { SecretApp } from "../entity/user"

/**
 * 微信开发套件
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class Wx {

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

    private async getKey(type: 'wxopen' | "wxmp" | 'wxmpValidaton' | 'wxwp') {
        const model = getModelForClass(SecretApp)
        return await model.findOne({ type }).lean()
    }

    /**
     * 初始化公众号
     */
    async initMp() {
        const mpSecret = await this.getKey("wxmp")
        if (mpSecret) {
            this.MP = new wxPublic(mpSecret.appid, mpSecret.secret)
        }
    }

    /**
     * 初始化小程序对象
     */
    async initWp() {
        const wpSecret = await this.getKey("wxwp")
        if (wpSecret) {
            this.WP = new wxApp(wpSecret.appid, wpSecret.secret)
        }
    }

    /**
     * 初始化开放平台
     */

    async initOp() {
        const opSecret = await this.getKey('wxopen')
        if (opSecret) {
            this.OP = new wxOpen(opSecret.appid, opSecret.secret)
        }
    }

}