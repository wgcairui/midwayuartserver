import { Controller, Post, Get, Body } from '@midwayjs/decorator';
import { getAlarmProtocol, getProtocols } from '../service/deviceService';
import { SendValidation } from '../service/smsService';
import { Crc16modbus } from '../util/util';

@Controller('/api/open')
export class OpenControll {
  /**
   * 生成crc校验码
   * @param param0
   * @returns
   */
  @Post('/crc')
  async crc(@Body() data: any) {
    const { pid, instructN, address, value } = data;
    const c = Buffer.allocUnsafe(2);
    c.writeIntBE(address, 0, 2);
    const start = c.slice(0, 2).toString('hex');

    const d = Buffer.allocUnsafe(2);
    d.writeIntBE(value, 0, 2);
    const end = d.slice(0, 2).toString('hex');

    return {
      code: 200,
      data: Crc16modbus(pid, instructN + start + end),
    };
  }

  /**
   * 发送短信校验码
   * @param tel
   * @returns
   */
  @Post('/sendValidationSms')
  async sendValidationSms(@Body('tel') tel: string) {
    return await SendValidation(tel);
  }

  /**
   * 获取所有透传协议
   * @returns
   */
  @Post('/protocol')
  @Get('/protocol')
  async protocol() {
    return await getProtocols();
  }

  /**
   * 获取指定协议常量配置
   * @param protocol
   * @returns
   */
  @Post('/protocolSetup')
  async protocolSetup(@Body('protocol') protocol: string) {
    if (protocol) {
      return await getAlarmProtocol(protocol);
    }
  }
}
