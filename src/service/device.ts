import { Provide } from "@midwayjs/decorator"
import { getModelForClass } from "@midwayjs/typegoose"
import { AnyParamConstructor } from "@typegoose/typegoose/lib/types"
import { Terminal } from "../entity/node"
import { DevConstant, DevType } from "../entity/protocol"

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
}