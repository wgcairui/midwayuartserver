import { Provide, Controller, Inject, Post, Body } from '@midwayjs/decorator';
import { Amap } from '../service/amap';

@Provide()
@Controller('/api/util')
export class UtilControll {
  @Inject()
  Amap: Amap;

  /**
   * 获取ip地址映射的物理地址
   * @param ip
   * @returns
   */
  @Post('/AMap/IP2loction')
  async IP2loction(@Body() ip: string) {
    return {
      code: 200,
      data: await this.Amap.IP2loction(ip),
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
    @Body() locations: string | string[],
    @Body() coordsys: 'gps'
  ) {
    return {
      code: 200,
      data: await this.Amap.GPS2autonavi(locations, coordsys),
    };
  }
}
