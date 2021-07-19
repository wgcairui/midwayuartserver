import { Provide } from "@midwayjs/decorator"
import { getModelForClass } from "@midwayjs/typegoose"
import { AnyParamConstructor } from "@typegoose/typegoose/lib/types"
import { Nodes, Terminals, UartTerminalDataTransfinite, DtuBusy, MailSend, UseBytes, WXEvent, InstructQuery, SmsSend, UserLogin, UserRequst, DataClean, wxsubscribeMessage } from "../entity/log"
//import { SocketUser } from "../service/socketUser"

/**
 * 日至操作
 */
@Provide()
export class Logs {

    /* @Inject()
    SocketUser: SocketUser */


    private getModel<T>(cl: AnyParamConstructor<T>) {
        return getModelForClass(cl)
    }

    /**
     * 保存节点操作日志
     * @param doc 
     * @returns 
     */
    async saveNode(doc: Uart.logNodes) {
        return await this.getModel(Nodes).create(doc)
    }

    /**
     * 保存终端操作日志
     * @param doc 
     * @returns 
     */
    async saveTerminal(doc: Uart.logTerminals) {
        return await this.getModel(Terminals).create(doc as any)
    }

    /**
     * 保存普通告警事件
     * @param doc 
     * @returns 
     */
    async saveDataTransfinite(doc: Uart.uartAlarmObject) {
        // this.SocketUser.sendMacAlarm(doc.mac, doc)
        return await this.getModel(UartTerminalDataTransfinite).create(doc as any)
    }

    /**
     * 保存dtu工作状态变化
     * @param doc 
     * @returns 
     */
    async saveDtuBusy(doc: Uart.logDtuBusy) {
        return await this.getModel(DtuBusy).create(doc)
    }

    /**
     * 保存邮箱发送记录
     */
    async saveMail(doc: Uart.logMailSend) {
        return await this.getModel(MailSend).create(doc as any)
    }

    /**
     * 保存短信打算记录
     * @param doc 
     * @returns 
     */
    async saveSms(doc: Uart.logSmsSend) {
        return await this.getModel(SmsSend).create(doc as any)
    }

    /**
     * 保存微信服务器推送
     * @param doc 
     * @returns 
     */
    async saveWxEvent(doc: Uart.WX.wxValidation | Uart.WX.WxEvent) {
        return await this.getModel(WXEvent).create(doc as any)
    }

    /**
     * 保存推送到用户的微信消息
     */
    async saveWxsubscribeMessage(doc: Uart.WX.wxsubscribeMessage & { result: Uart.WX.wxRequest }) {
        return await this.getModel(wxsubscribeMessage).create(doc as any)
    }

    /**
     * 增加dtu流量使用记录
     * @param mac 
     * @param date 
     * @param useBytes 
     * @returns 
     */
    async incUseBytes(mac: string, date: string, useBytes: number) {
        return await this.getModel(UseBytes).updateOne({ mac, date }, { $inc: { useBytes } }, { upsert: true }).lean()
    }

    /**
     * 获取所有微信推送事件
     * @returns 
     */
    getWxEvent() {
        return this.getModel(WXEvent).find().lean()
    }

    /**
         * 获取设备使用流量
         */
    getUseBtyes(mac: string) {
        return this.getModel(UseBytes).find({ mac }, { date: 1, useBytes: 1, _id: 0 }).lean()
    }

    /**
     * 获取设备指定时段繁忙状态
     * @param mac 
     * @param start 
     * @param end 
     */
    getDtuBusy(mac: string, start: number, end: number) {
        return this.getModel(DtuBusy).find({ mac, timeStamp: { $lte: end, $gte: start } }, { stat: 1, timeStamp: 1, _id: 0 }).lean()
    }

    /**
     * 获取dtu发送指令记录
     * @param mac 
     * @returns 
     */
    logInstructQuery(mac: string) {
        return this.getModel(InstructQuery).find({ mac }).lean()
    }



    /**
     * 获取节点日志
     * @param start 
     * @param end 
     * @returns 
     */
    lognodes(start: number, end: number) {
        return this.getModel(Nodes).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

    /**
     * 获取终端日志
     * @param start 
     * @param end 
     * @returns 
     */
    logterminals(start: number, end: number) {
        return this.getModel(Terminals).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

    /**
     * 获取短信日志
     */
    logsmssends(start: number, end: number) {
        return this.getModel(SmsSend).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

    /**
     * 获取邮件日志
     */
    logmailsends(start: number, end: number) {
        return this.getModel(MailSend).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

    /**
     * 获取设备告警日志
     * @param start 
     * @param end 
     * @returns 
     */
    loguartterminaldatatransfinites(start: number, end: number) {
        return this.getModel(UartTerminalDataTransfinite).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

    /**
     * 获取用户登陆日志
     * @param start 
     * @param end 
     * @returns 
     */
    loguserlogins(start: number, end: number) {
        return this.getModel(UserLogin).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

    /**
     * 获取用户请求日志
     * @param start 
     * @param end 
     * @returns 
     */
    loguserrequsts(start: number, end: number) {
        return this.getModel(UserRequst).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

    /**
     * 获取定时清理记录
     * @param start 
     * @param end 
     * @returns 
     */
    logdataclean(start: number, end: number) {
        return this.getModel(DataClean).find({ timeStamp: { $lte: end, $gte: start } }).lean()
    }

}
