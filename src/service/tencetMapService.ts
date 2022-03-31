import axios from 'axios';
import { URL } from 'url';
import { tencetMap } from '../config/config.default';

// 腾讯位置服务
interface result {
  /* 状态码，0为正常,
310请求参数信息有误，
311Key格式错误,
306请求有护持信息请检查字符串,
110请求来源未被授权 */
  status: number;
  request_id: string;
  message: string;
  result: any;
}

/**
 * 由坐标到坐标所在位置的文字描述的转换  location= 39.984154,116.307490
 * @param location
 */
export async function TencetMapGeocoder(location: string) {
  return fecth('geocoder/v1', { location });
}

/**
 * 通过终端设备IP地址获取其当前所在地理位置
 * @param ip
 */
export async function TencetMapIp(ip: string) {
  return fecth('location/v1/ip', { ip });
}

/**
 * 实现从其它地图供应商坐标系或标准GPS坐标系，批量转换到腾讯地图坐标系
 * @param locations
 * @param type
 */
export async function TencetMapTranslate(
  locations: string | string[],
  type = '1'
) {
  return fecth('coord/v1/translate', {
    lacations: Array.isArray(locations) ? locations.join(';') : locations,
    type,
  });
}

/**
 * /本接口提供由地址描述到所述位置坐标的转换，与逆地址解析的过程正好相反
 * @param address
 */
export async function TencetMapAddressTolacatin(address: string) {
  return fecth('geocoder/v1', { address });
}

// fecth
async function fecth(
  type: 'geocoder/v1' | 'location/v1/ip' | 'coord/v1/translate',
  data: { [x: string]: string }
) {
  const url = new URL('/ws/' + type, tencetMap.apiUrl);
  let query = '?key=' + tencetMap.key;
  for (const i in data) {
    query += `&${i}=${data[i]}`;
  }
  /* const sig = MD5(url.pathname + query + tencetMap.SK)
        query += '&sig=' + sig */
  try {
    const res = await axios({
      url: url.toString() + query,
    });
    const result_1: result = res.data;
    if (result_1.status !== 0) {
      console.log(result_1);
    }
    return result_1;
  } catch (e) {
    console.log({ type, data });
    throw new Error(e);
  }
}
