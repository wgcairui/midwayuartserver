import { Controller, Post, Get, Body, Inject } from '@midwayjs/decorator';
import { Util } from '../util/util';
import { Sms } from '../util/sms';
import { Device } from '../service/deviceBase';

@Controller('/api/open')
export class OpenControll {
  @Inject()
  Util: Util;

  @Inject()
  Sms: Sms;

  @Inject()
  Device: Device;

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
      data: this.Util.Crc16modbus(pid, instructN + start + end),
    };
  }

  /**
   * 发送短信校验码
   * @param tel
   * @returns
   */
  @Post('/sendValidationSms')
  async sendValidationSms(@Body('tel') tel: string) {
    return await this.Sms.SendValidation(tel);
  }

  /**
   * 获取所有透传协议
   * @returns
   */
  @Post('/protocol')
  @Get('/protocol')
  async protocol() {
    return await this.Device.getProtocols();
  }

  /**
   * 获取指定协议常量配置
   * @param protocol
   * @returns
   */
  @Post('/protocolSetup')
  async protocolSetup(@Body('protocol') protocol: string) {
    if (protocol) {
      return await this.Device.getAlarmProtocol(protocol);
    }
  }
}
