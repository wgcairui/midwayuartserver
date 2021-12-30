import { Provide, Inject, Controller, Post, Body } from '@midwayjs/decorator';
import { Device } from '../service/deviceBase';
import { UserService } from '../service/user';

@Provide()
@Controller('/api/ec')
export class ControllEc {
  @Inject()
  Device: Device;

  @Inject()
  UserService: UserService;

  /**
   * ec请求数据
   */
  @Post('/syncSetup')
  async syncSetup(@Body() mac: string) {
    console.log({ mac });
    return {
      code: 200,
      data: {
        protocol: await this.Device.getProtocols(),
        device: await this.Device.DevTypes(),
        constant: await this.Device.getAlarmProtocols(),
      },
    };
  }

  /**
   * 请求用户告警配置
   * @param user
   * @returns
   */
  @Post('/userSetup')
  async userSetup(@Body() user: string) {
    return {
      code: 200,
      data: await this.UserService.getUserAlarmSetup(user),
    };
  }
}
