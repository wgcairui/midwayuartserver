import axios from 'axios';
import { RedisService } from './redisService';

type apiType =
  | 'ip'
  | 'geocode/geo'
  | 'geocode/regeo'
  | 'assistant/coordinate/convert';

/**
 * ip转gps
 * @param ip
 */
export async function AmapIP2loction(ip: string) {
  if (!(await RedisService.getloctionIp(ip))) {
    const result = await fecth<any>('ip', { ip });
    if (!result || !result.rerectangle) {
      return result?.message || '地址解析失败';
    }
    const loction = result.rectangle.split(';')[0];
    RedisService.setloctionIp(ip, loction);
  }
  return await RedisService.getloctionIp(ip);
}

/**
 *  GPS转高德坐标系
 * @param loctions 经纬度
 * @param coordsys 定位编码
 */
export async function AmapGPS2autonavi(
  loctions: string | string[],
  coordsys: 'gps' | 'mapbar' | 'baidu' = 'gps'
) {
  if (!loctions || loctions === '') return [''];
  const result = await fecth<any>('assistant/coordinate/convert', {
    locations: loctions,
    coordsys,
  });
  return result.status === '1' ? result.locations.split(';') : [''];
}

// axios
async function fecth<T>(
  type: apiType,
  data: { [x: string]: string | string[] | T }
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
    console.error(result);
  }
  return result;
}
