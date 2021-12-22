import { Provide, Inject, Logger } from '@midwayjs/decorator';
import axios from 'axios';
import { RedisService } from '../service/redis';
import { ILogger } from '@midwayjs/logger';

type apiType =
  | 'ip'
  | 'geocode/geo'
  | 'geocode/regeo'
  | 'assistant/coordinate/convert';

@Provide()
export class Amap {
  @Logger()
  log: ILogger;

  @Inject()
  RedisService: RedisService;

  /**
   * ip转gps
   * @param ip
   */
  async IP2loction(ip: string) {
    if (!(await this.RedisService.getloctionIp(ip))) {
      const result = await this.fecth<any>('ip', { ip });
      const loction = result.rectangle.split(';')[0];
      this.RedisService.setloctionIp(ip, loction);
    }
    return await this.RedisService.getloctionIp(ip);
  }

  /**
   *  GPS转高德坐标系
   * @param loctions 经纬度
   * @param coordsys 定位编码
   */
  async GPS2autonavi(
    loctions: string | string[],
    coordsys: 'gps' | 'mapbar' | 'baidu' = 'gps'
  ) {
    if (!loctions || loctions === '') return [''];
    const result = await this.fecth<any>(
      'assistant/coordinate/convert',
      { locations: loctions, coordsys }
    );
    return result.status === '1' ? result.locations.split(';') : [''];
  }

  // axios
  private async fecth<T extends any>(
    type: apiType,
    data: { [x: string]: string | string[] }
  ) {
    const res = await axios({
      url: 'https://restapi.amap.com/v3/' + type,
      params: {
        key: '0e99d0426f1afb11f2b95864ebd898d0',
        ...data,
      },
    });
    const result: any = res.data;
    if (result.status === '0') {
      this.log.error(result);
    }
    return result;
  }
}
