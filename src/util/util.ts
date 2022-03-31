/* eslint-disable no-useless-escape */
import { verify, sign, SignOptions } from 'jsonwebtoken';
import * as CryptoJS from 'crypto-js';
import * as bcrypt from 'bcryptjs';
import { crc16modbus } from 'crc';
import * as os from 'os';
import * as moment from 'moment';

const saltRounds = 10;
/**
 * token盐值
 */
const secret = 'ladisWebSite';
/**
 * token过期时间
 */
const tokenExpiresTime = 1000 * 60 * 60 * 5;
/**
 * crypto 十六位十六进制数作为密钥
 */
const cryptoKey = CryptoJS.enc.Utf8.parse('94nxeywgxwbakx83');
/**
 * crypto 十六位十六进制数作为密钥偏移量
 */
const cryptoIv = CryptoJS.enc.Utf8.parse('xheg73k0kxhw83nx');

/**
 *加密函数
 *payload为加密的数据，数据类型string or object
 * @param {*} { payload, option }
 * @returns
 */
export function Secret_JwtSign(
  payload: string | object | Buffer,
  options?: SignOptions
) {
  const result: Promise<string> = new Promise((resolve, reject) => {
    const opt = Object.assign({ expiresIn: tokenExpiresTime }, options || {});
    sign(payload, secret, opt, (err, encodeURI) => {
      if (err) reject(err);
      resolve(encodeURI as string);
    });
  });
  return result;
}

/**
 * 解密函数
 * @param token
 */
export function Secret_JwtVerify<T>(token: string): Promise<T> {
  const result = new Promise<T>((resolve, reject) => {
    verify(token, secret, (err, decode) => {
      if (err) reject(err);
      resolve(decode as any);
    });
  });
  return result;
}

/**
 * 解密字符串
 * @param word 加密的字符串
 * @returns
 */
export function Crypto_Decrypto(word: string) {
  const encryptedHexStr = CryptoJS.enc.Hex.parse(word);
  const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
  const decrypt = CryptoJS.AES.decrypt(srcs, cryptoKey, {
    iv: cryptoIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
  return decryptedStr.toString();
}

/**
 * 加密字符串
 * @param word 原始字符串
 * @returns
 */
export function Crypto_Encrypto(word: string) {
  const srcs = CryptoJS.enc.Utf8.parse(word);
  const encrypted = CryptoJS.AES.encrypt(srcs, cryptoKey, {
    iv: cryptoIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString().toUpperCase();
}

/**
 * 加密密码
 * @param passwd 明文密码
 */
export function BcryptDo(passwd: any): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) reject(err);
      bcrypt.hash(passwd, salt, (err, hash) => {
        if (err) reject(err);
        resolve(hash);
      });
    });
  });
}

/**
 * 校验密码
 * @param passwd 明文密码
 * @param hash 加密后的字符串hash
 */
export function BcryptCompare(passwd: any, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(passwd, hash, (err, some) => {
      if (err) reject(err);
      resolve(some);
    });
  });
}

/**
 * 生成modbus16校验码
 * @param address pid
 * @param instruct 指令
 */
export function Crc16modbus(address: number, instruct: string): string {
  const body = address.toString(16).padStart(2, '0') + instruct;
  const crc = crc16modbus(Buffer.from(body, 'hex'))
    .toString(16)
    .padStart(4, '0');
  const [a, b, c, d] = [...crc];
  return body + c + d + a + b;
}

/**
 * 使用于非标协议前置脚本,转换脚本为Function
 * @param fun 命令字符串
 */
export function ParseFunction(fun: string) {
  const content = fun.replace(/(^function\(pid,instruct\)\{|\}$)/g, '');
  return new Function('pid', 'instruct', content);
}

/**
 * 适用于非标协议后置脚本
 * @param fun
 */
export function ParseFunctionEnd(fun: string) {
  const content = fun.replace(/(^function\(content,arr\)\{|\}$)/g, '');
  return new Function('content', 'arr', content);
}

/**
 * 转换参数值系数
 * @param fun 转换函数
 * @param val 待转换的值
 */
export function ParseCoefficient(fun: string, val: number) {
  if (Number(fun)) return (Number(fun) * val) as number;
  else {
    const [arg, ...f] = fun.replace(/(^\(|\)$)/g, '').split(',');
    const Fun = new Function(arg, `return ${f.join(',')}`);
    return Fun(val) as number | string;
  }
}

/**
 * 序列化时间
 * @param time
 */
export function parseTime(time: string | number | Date = new Date()) {
  return moment(time).format('M-D H:m:s');
}

/**
 *
 * @param t
 * @param c
 * @param n
 * @param b
 */
export function FillString(
  t: string | Buffer,
  c: string,
  n: number,
  b: boolean
): Buffer | string {
  if (t === '' || c.length !== 1 || n <= t.length) return t;
  for (let i = 0; i < n - t.length; i++) {
    if (b === true) t = c + t;
    else t += c;
  }
  return t;
}

/**
 * 16进制转单精度浮点数
 * @param t
 */
export function HexToSingle(t = Buffer.from([0, 0, 0, 0])): number {
  if (t.byteLength !== 4) return 0;
  const t1: string = parseInt(t.toString('hex'), 16).toString(2);
  const t2 = <string>FillString(t1, '0', 32, true);
  const s = t2.substring(0, 1);
  const e = t2.substring(1, 9);
  let m = t2.substring(9);
  const e1 = parseInt(e, 2) - 127;
  m = '1' + m;
  if (e1 >= 0) {
    m = m.substr(0, e1 + 1) + '.' + m.substring(e1 + 1);
  } else {
    m = '0.' + FillString(m, '0', m.length - e1 - 1, true);
  }
  if (!m.includes('.')) m = m + '.0';

  const a = m.split('.');
  const mi = parseInt(a[0], 2);
  let mf = 0;
  for (let i = 0; i < a[1].length; i++) {
    mf += parseFloat(a[1].charAt(i)) * 2 ** -(i + 1);
  }
  let m1 = mi + mf;
  if (parseInt(s) === 1) m1 = 0 - m1;

  return Number.parseFloat(m1.toFixed(2));
}
/**
 * 单精度浮点数转Hex
 * @param t
 */
export function SingleToHex(t = 0) {
  if (t === 0) return '00000000';
  let s: number, e: number, m: string;
  if (t > 0) s = 0;
  else {
    s = 1;
    t = 0 - t;
  }
  m = t.toString(2);
  if (parseInt(m) >= 1) {
    if (!m.includes('.')) m = m + '.0';
    e = m.indexOf('.') - 1;
  } else e = 1 - m.indexOf('1');

  if (e >= 0) m = m.replace('.', '');
  else m = m.substring(m.indexOf('1'));

  if (m.length > 24) m = m.substr(0, 24);
  else m = <string>FillString(m, '0', 24, false);

  m = m.substring(1);
  const e1 = (e + 127).toString(2);
  const e2 = <string>FillString(e1, '0', 8, true);
  const r = parseInt(s + e2 + m, 2).toString(16);
  const r1 = <string>FillString(r, '0', 8, true);
  return Buffer.from(r1, 'hex');
}
/**
 * 整数转高低字节
 * @param str
 */
export function Value2BytesInt16(str = 0) {
  const arr: number[] = [];
  // 创建一个空buffer，
  const buffer = Buffer.alloc(2);
  // 写入一个有符号的 16 位整数值，可以是负数
  buffer.writeInt16BE(str, 0);
  // 转换为高低字节，封装为字节数组
  buffer.forEach(el => arr.push(el));
  return arr;
}
/**
 * Buffer转单精度浮点数
 * @param buffer
 * @param start
 */
export function BufferToFlot(buffer: Buffer, start: number) {
  // buffer转换为字符串,截取4位值
  const buf = buffer.toString('hex', start, 4);
  //16进制转2进制
  const bit16 = parseInt(buf, 16);
  const bit2 = bit16.toString(2);
  //slice表示数组的截取，并转化为十进制数
  const bit10 = parseInt(bit2.slice(0, 8), 2);
  //获得尾数
  const M2 = bit2.slice(8, 64);
  //将二进制的尾数转化为十进制的小数
  let M10 = 0.0;
  for (let i = 0; i < M2.length; i++) {
    M10 = M10 + (M2 as any)[i] * Math.pow(2, -1 * (i + 1));
  }
  //最后利用公式转化为十进制
  const value = Math.pow(2, bit10 - 127) * (1 + M10);
  // 保留小数点后一位
  return parseInt(value.toFixed(1));
}
// 混淆号码
export function Mixtel(tel?: number) {
  return tel
    ? String(tel)
        .split('')
        .map((el, index) => {
          if (index > 2 && index < 8) el = '*';
          return el;
        })
        .join('')
    : '';
}

/**
 * 正则匹配经纬度
 * @param location 经纬度
 * @param reserver 是否反转经纬
 */
export function RegexLocation(location: string, reserver = false) {
  const str = reserver ? location.split(',').reverse().join(',') : location;
  return /^-?1[0-8][0-9]\.[0-9]{6,7}\,-?[0-9]{2}\.[0-9]{6,7}$/.test(str);
}
/**
 * 正则匹配ip
 * @param ip
 */
export function RegexIP(ip: string) {
  return /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(
    ip
  );
}
/**
 * 正则匹配dtu通讯参数
 * @param uart
 */
export function RegexUart(uart: string) {
  return /^([0-9]{4}|[0-9]{5})\,[0-9]\,[0-9]\,.*/.test(uart);
}
/**
 * 正则匹配ICCID
 * @param ICCID
 */
export function RegexICCID(ICCID: string) {
  return /[0-9]{18,22}/.test(ICCID);
}

/**
 * 正则匹配手机号码
 * @param tel
 */
export function RegexTel(tel: string | number) {
  return /^(0|86|17951)?(13[0-9]|15[012356789]|166|17[3678]|18[0-9]|14[57])[0-9]{8}$/.test(
    String(tel)
  );
}

/**
 * 正则匹配邮箱账号
 * @param mail
 */
export function RegexMail(mail: string) {
  return /\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(mail);
}

/**
 * 获取服务器运行状态
 */
export function NodeInfo(): Uart.nodeInfo {
  const hostname: string = os.hostname();
  const totalmem: number = os.totalmem() / 1024 / 1024 / 1024;
  const freemem: number = (os.freemem() / os.totalmem()) * 100;
  const loadavg: number[] = os.loadavg();
  const type: string = os.type();
  const uptime: number = os.uptime() / 60 / 60;

  return {
    hostname,
    totalmem: totalmem.toFixed(1) + 'GB',
    freemem: freemem.toFixed(1) + '%',
    loadavg: loadavg.map(el => parseFloat(el.toFixed(1))),
    type,
    uptime: uptime.toFixed(0) + 'h',
    version: os.version(),
    usecpu: parseFloat(loadavg[2].toFixed(2)),
    usemen: 100 - parseFloat(freemem.toFixed(2)),
  };
}
