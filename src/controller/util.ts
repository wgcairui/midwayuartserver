import { Controller, Post, Body } from '@midwayjs/decorator';
import { AmapIP2loction, AmapGPS2autonavi } from '../service/amapService';

@Controller('/api/util')
export class UtilControll {
  /**
   * 获取ip地址映射的物理地址
   * @param ip
   * @returns
   */
  @Post('/AMap/IP2loction')
  async IP2loction(@Body('ip') ip: string) {
    return {
      code: 200,
      data: await AmapIP2loction(ip),
    };
  }

  /**
   * gps格式转换为高德格式
   * @param locations
   * @param coordsys
   * @returns
   */
  @Post('/AMap/GPS2autonavi')
  async GPS2autonavi(
    @Body('locations') locations: string | string[],
    @Body('coordsys') coordsys: 'gps'
  ) {
    return {
      code: 200,
      data: await AmapGPS2autonavi(locations, coordsys),
    };
  }
}
