import { Provide } from "@midwayjs/decorator"
import { getModelForClass } from "@midwayjs/typegoose"
import { AnyParamConstructor } from "@typegoose/typegoose/lib/types"
import { Terminal } from "../entity/node"
import { DevArgumentAlias, DevConstant, DevType, Protocols } from "../entity/protocol"

@Provide()

export class Device {
    private getModel<T>(cl: AnyParamConstructor<T>) {
        return getModelForClass(cl)
    }

    /**
     * 获取指定终端
     * @param macs 
     * @returns 
     */
    async getTerminal(macs: string | string[]) {
        const model = this.getModel(Terminal)
        if (typeof macs === 'string') {
            return await model.findOne({ DevMac: macs }).lean()
        } else {
            return await model.find({ DevMac: { $in: macs } }).lean()
        }
    }

    /**
     * 获取指定且在线的终端
     * @param mac 
     * @returns 
     */
    async getTerminalOnline(mac: string) {
        const model = this.getModel(Terminal)
        const terminal = await model.findOne({ DevMac: mac }).lean()
        return (!terminal || !terminal.online) ? null : terminal
    }

    /**
     * 获取设备类型
     * @param Type 
     * @returns 
     */
    async getDevTypes(Type: string) {
        const model = getModelForClass(DevType)
        return await model.find({ Type }).lean()
    }

    /**
   * 获取单个协议告警配置
   * @param protocol 
   */
    async getAlarmProtocol(protocol: string) {
        const model = this.getModel(DevConstant)
        const setup = await model.findOne({ Protocol: protocol }).lean() as unknown as Uart.ProtocolConstantThreshold
        const obj: Uart.ProtocolConstantThreshold = {
            Protocol: protocol,
            ProtocolType: setup.ProtocolType,
            ShowTag: setup?.ShowTag || [],
            Threshold: setup?.Threshold || [],
            AlarmStat: setup?.AlarmStat || [],
            Constant: setup?.Constant || {} as any,
            OprateInstruct: setup?.OprateInstruct || []
        }
        return obj
    }

    /**
     * 获取指定的协议
     * @param protocol 
     * @returns 
     */
    async getProtocol(protocol: string) {
        const model = this.getModel(Protocols)
        return await model.findOne({ Protocol: protocol }).lean()
    }

    /**
     * 获取所有协议
     * @returns 
     */
    async getProtocols() {
        const model = this.getModel(Protocols)
        return await model.find().lean()
    }

    /**
     * 获取mac设备协议别名
     * @param mac 
     * @param pid 
     * @param protocol 
     */
    async getProtocolAlias(mac: string, pid: number, protocol: string) {
        const model = this.getModel(DevArgumentAlias)
        return await model.findOne({ mac, pid, protocol }).lean()
    }

    /**
     * 设备设备别名
     * @param mac 
     * @param pid 
     * @param protocol 
     * @param name 
     * @param alias 
     * @returns 
     */
    async setAlias(mac: string, pid: number, protocol: string, name: string, alias: string) {
        const data = await this.getProtocolAlias(mac, pid, protocol)
        const model = this.getModel(DevArgumentAlias)
        let result;
        // $数组操作符需要查询匹配到数组数据，否则会报错误
        if (data && data.alias.findIndex(el => el.name === name) !== -1) {
            result = await model.updateOne({ mac, pid: Number(pid), protocol, 'alias.name': name }, { $set: { 'alias.$.alias': alias } }, { multi: true })
        } else {
            result = await model.updateOne({ mac, pid: Number(pid), protocol }, { $push: { alias: { name, alias } } }, { upsert: true })
        }
        return result
    }
}