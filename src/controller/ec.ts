import { Controller, Post, Body } from '@midwayjs/decorator';
import {
  DevTypes,
  getAlarmProtocols,
  getProtocols,
} from '../service/deviceService';
import { getUserAlarmSetup } from '../service/userSevice';

@Controller('/api/ec')
export class ControllEc {
  /**
   * ec请求数据
   */
  @Post('/syncSetup')
  async syncSetup(@Body('mac') mac: string) {
    console.log({ mac });
    return {
      code: 200,
      data: {
        protocol: await getProtocols(),
        device: await DevTypes(),
        constant: await getAlarmProtocols(),
      },
    };
  }

  /**
   * 请求用户告警配置
   * @param user
   * @returns
   */
  @Post('/userSetup')
  async userSetup(@Body('user') user: string) {
    return {
      code: 200,
      data: await getUserAlarmSetup(user),
    };
  }
}
