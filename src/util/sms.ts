import { Provide, Scope, ScopeEnum, Init, App } from "@midwayjs/decorator"
import { getModelForClass } from "@midwayjs/typegoose"
import * as core from "@alicloud/pop-core"
import { Application } from "@midwayjs/koa"
import { SecretApp } from "../entity/user"
import { SmsResult } from "../interface"


interface params {
    RegionId: string;
    PhoneNumbers: string;
    SignName: string;
    TemplateCode: string;
    TemplateParam: string;
}


@Provide()
@Scope(ScopeEnum.Singleton)
export class Sms {

    @App()
    app: Application

    private sms: core

    @Init()
    async init() {

        const model = getModelForClass(SecretApp)
        const key = await model.findOne({ type: 'aliSms' }).lean()
        this.sms = new core({
            accessKeyId: key.appid,
            accessKeySecret: key.secret,
            endpoint: 'https://dysmsapi.aliyuncs.com',
            apiVersion: '2017-05-25'
        })
    }


    /**
* 发送短信
* @param params  
*/
    async send(params: params): Promise<SmsResult> {
        //const tels = params.PhoneNumbers.split(",")
        // 迭代发送的手机号码,检查号码每天的发送次数,每个号码每天限额50
        const tels = params.PhoneNumbers.split(",")//.filter(el => !CacheAlarmSendNum.has(el) || CacheAlarmSendNum.get(el) as number < 51)
        params.PhoneNumbers = tels.join(',')
        // console.log(params);
        return await this.sms.request<SmsResult>('SendSms', params, { method: 'POST' }).then(el => {
            /* const data: Uart.logSmsSend = {
                tels,
                sendParams: params,
                Success: el
            }
            new LogSmsSend(data).save() */
            return el
        }).catch(e => {
            console.log(e);

            /* const data: Uart.logSmsSend = {
                tels,
                sendParams: params,
                Error: e
            } 
            new LogSmsSend(data).save()*/
            return e
        })
        // 如果发送成功,号码发送次数+1
        /* if (result.ok && params.TemplateCode !== 'SMS_190275627') {
            tels.forEach(tel => {
                const n = CacheAlarmSendNum.get(tel)
                CacheAlarmSendNum.set(tel, n ? n + 1 : 1)
            })
        } */
    }

    /**
     * 返回格式化的时间
     * @returns 
     */
    d() {
        const time = new Date()
        return `${time.getMonth() + 1}/${time.getDate()} ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`
    }

    /**
     * 短信发送校验码
     * @param tel 手机号 
     * @param code 验证码
     */
    async SendValidation(tel: string, code: string = (Math.random() * 10000).toFixed(0).padStart(4, "0")) {
        const TemplateParam = JSON.stringify({ code })
        const params: params = {
            "RegionId": "cn-hangzhou",
            "PhoneNumbers": tel,
            "SignName": "雷迪司科技湖北有限公司",
            "TemplateCode": "SMS_190275627",
            TemplateParam
        }
        return {
            code,
            data: await this.send(params)
        }
    }



    /**
     * 发送设备恢复/超时下线
     * @param Template 
     * @returns 
     */
    SmsDTUDevTimeOut(tels: string[], Template: { name: string, DTU: string, pid: string | number, devName: string, event: '超时' | '恢复' }) {
        const TemplateParam = JSON.stringify({ ...Template, time: this.d() })
        const params: params = {
            "RegionId": "cn-hangzhou",
            "PhoneNumbers": tels.join(','),
            "SignName": "雷迪司科技湖北有限公司",
            "TemplateCode": 'SMS_200701321',
            TemplateParam
        }
        return this.send(params)
    }


    /**
     * 发送设备超时下线
     * @param tels 
     * @param Template 
     * @returns 
     */
    SmsDTU(tels: string[], Template: { name: string, DTU: string, remind: '恢复上线' | '离线' }) {
        const TemplateParam = JSON.stringify({ ...Template, time: this.d() })
        const params: params = {
            "RegionId": "cn-hangzhou",
            "PhoneNumbers": tels.join(','),
            "SignName": "雷迪司科技湖北有限公司",
            "TemplateCode": 'SMS_200691431',
            TemplateParam
        }
        return this.send(params)
    }

    /**
     * 发送告警短信
     * @param tels 
     * @param type 
     * @param query 
     * @returns 
     */
    SendUartAlarm(tels: string[], type: '透传设备下线提醒' | '透传设备上线提醒' | '透传设备告警', query: { name: string, devname: string, air: string, event: string }) {
        const smsCode = {
            透传设备下线提醒: "SMS_189710812",
            透传设备上线提醒: "SMS_189710830",
            透传设备告警: 'SMS_189710878'
        }
        // 构建请求对象
        const queryObject = type === "透传设备告警" ? { name: query.name, devname: query.devname, air: query.air, event: query.event, time: this.d() } : { name: query.name, devname: query.devname, time: this.d() }
        const TemplateParam = JSON.stringify(queryObject)
        const params: params = {
            "RegionId": "cn-hangzhou",
            "PhoneNumbers": tels.join(','),
            "SignName": "雷迪司科技湖北有限公司",
            "TemplateCode": smsCode[type],
            TemplateParam
        }
        return this.send(params)
    }

}