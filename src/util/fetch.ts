import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * wx axios请求
 * @param config
 * @returns
 */
export const fetch = async <T extends Uart.WX.wxRequest>(
  config: AxiosRequestConfig
) => {
  const res: AxiosResponse<T> = await axios(config).catch(err => {
    console.log({ config, data: config.data });
    throw new Error(err);
  });
  if (res.data.errcode) {
    console.log({ data: res.data, config });
    throw new Error(res.data.errmsg);
  }
  return res.data;
};

/**
 * 组装url和请求参数
 * @param url
 * @param args
 * @returns
 */
export const parseUrl = (url: string, args: Record<string, string>) => {
  const P = new URLSearchParams(args);
  const U = new URL(url);
  U.search = P.toString();
  return U.toString();
};
