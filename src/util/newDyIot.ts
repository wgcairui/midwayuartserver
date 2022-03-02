import * as Core from '@alicloud/pop-core'
import { Provide, Scope, ScopeEnum, Init } from '@midwayjs/decorator';
import { SecretApp } from '../entity/user';
import { getModelForClass } from '@typegoose/typegoose';

/**
 * ali_2无线物联服务api
 * 新版
 * @see https://help.aliyun.com/document_detail/375319.html
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class NewDyIot {
    iot: Core

    /**
     * 使用AK&SK初始化账号Client
     */
    @Init()
    async init() {
        const key = await getModelForClass(SecretApp)
            .findOne({ type: 'dyIot' })
            .lean();
        this.iot = new Core({
            accessKeyId: key.appid,
            accessKeySecret: key.secret,
            endpoint: 'https://linkcard.aliyuncs.com',
            apiVersion: '2021-05-20'
        });
    }

    /**
     * 内部调用
     * @param action 
     * @param params 
     * @param method 
     * @returns 
     */
    private async request<T>(action: String, params: Object = {}, method: "POST" | "GET" = 'POST') {
        return new Promise<SimResope<T>>((resolve, reject) => {
            this.iot.request(action, params, { method }).then((result: any) => {
                resolve(result)
            }, (ex) => {
                reject(ex)
            })
        })
    }

    /**
     * 查询物联网卡的流量信息
     * @param Iccid
     * @returns
     * @see https://next.api.aliyun.com/api/Linkcard/2021-05-20/GetCardFlowInfo?lang=NODEJS&params={}&sdkStyle=old
     */
    QueryCardFlowInfo(Iccid: string) {
        return this.request<SimUse>('GetCardFlowInfo', { Iccid })
    }

    /**
     * 换绑复用
     * @param Iccid
     * @returns
     * @see https://next.api.aliyun.com/api/Linkcard/2021-05-20/RebindResumeSingleCard?lang=NODEJS&params={}&sdkStyle=old
     */
    RebindResumeSingleCard(Iccid: string) {
        return this.request<boolean>('RebindResumeSingleCard', { Iccid })
    }

    /**
     * 卡的主动停用或复用
     * @param Iccid 
     * @param stat 
     */
    SwitchSim(Iccid: string, stat: 'ResumeSingleCard' | 'StopSingleCard') {
        return this.request<boolean>(stat, { Iccid })
    }

    /**
     * 查询物联网卡的明细信息
     * @param iccid
     * @returns
     */
    GetCardDetail(Iccid: string) {
        return this.request<SimInfo>('GetCardDetail', { Iccid })
    }

}
