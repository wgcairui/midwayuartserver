import { Provide } from "@midwayjs/decorator";
import * as jsonwebtoken from "jsonwebtoken";
import * as CryptoJS from "crypto-js";
import * as bcrypt from "bcryptjs";
const saltRounds = 10;

/**
 * 工具链
 */
@Provide()
export class Util {
    /**
     * token盐值
     */
    private secret: string;
    /**
     * token过期时间
     */
    private tokenExpiresTime: number;
    /**
     * crypto 十六位十六进制数作为密钥
     */
    private cryptoKey: CryptoJS.lib.WordArray;
    /**
     * crypto 十六位十六进制数作为密钥偏移量
     */
    private cryptoIv: CryptoJS.lib.WordArray;
    constructor() {
        this.secret = "ladisWebSite"
        this.tokenExpiresTime = 1000 * 60 * 60 * 5
        this.cryptoKey = CryptoJS.enc.Utf8.parse("94nxeywgxwbakx83")
        this.cryptoIv = CryptoJS.enc.Utf8.parse("xheg73k0kxhw83nx")
    }

    /**
    *加密函数
    *payload为加密的数据，数据类型string or object
    * @param {*} { payload, option }
    * @returns
    */
    Secret_JwtSign(payload: string | object | Buffer, options?: jsonwebtoken.SignOptions) {
        const result: Promise<string> = new Promise((resolve, reject) => {
            const opt = Object.assign({ expiresIn: this.tokenExpiresTime }, options || {});
            jsonwebtoken.sign(payload, this.secret, opt, (err, encodeURI) => {
                if (err) reject(err)
                resolve(encodeURI as string)
            })
        })
        return result
    }

    /**
     * 解密函数
     * @param token 
     */
    Secret_JwtVerify<T>(token: string): Promise<T> {
        const result = new Promise<T>((resolve, reject) => {
            jsonwebtoken.verify(token, this.secret, (err, decode) => {
                if (err) reject(err)
                resolve(decode as any)
            })
        })
        return result
    }

    /**
     * 解密字符串
     * @param word 加密的字符串
     * @returns 
     */
    Crypto_Decrypto(word: string) {
        let encryptedHexStr = CryptoJS.enc.Hex.parse(word);
        let srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
        let decrypt = CryptoJS.AES.decrypt(srcs, this.cryptoKey, {
            iv: this.cryptoIv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });
        let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
        return decryptedStr.toString();
    }

    /**
     * 加密字符串
     * @param word 原始字符串
     * @returns 
     */
    Crypto_Encrypto(word: string) {
        let srcs = CryptoJS.enc.Utf8.parse(word);
        let encrypted = CryptoJS.AES.encrypt(srcs, this.cryptoKey, {
            iv: this.cryptoIv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });
        return encrypted.ciphertext.toString().toUpperCase();
    }



    /**
     * 加密密码
     * @param passwd 明文密码
     */
    BcryptDo(passwd: any): Promise<string> {
        return new Promise((resolve, reject) => {
            bcrypt.genSalt(saltRounds, (err, salt) => {
                if (err) reject(err);
                bcrypt.hash(passwd, salt, (err, hash) => {
                    if (err) reject(err);
                    resolve(hash);
                });
            });
        });
    };

    /**
     * 校验密码
     * @param passwd 明文密码 
     * @param hash 加密后的字符串hash
     */
    BcryptCompare(passwd: any, hash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            bcrypt.compare(passwd, hash, (err, some) => {
                if (err) reject(err);
                resolve(some);
            });
        });
    };
}