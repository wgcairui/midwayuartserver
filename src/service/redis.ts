import { Provide, Scope, ScopeEnum, Config, Init, Autoload, Inject, App } from "@midwayjs/decorator"
import { Application } from "@midwayjs/koa"
import * as redis from "ioredis"
import { Device } from "../service/device"
import { UserService } from '../service/user'

interface userSetupMap {
    Threshold: Map<string, Uart.Threshold>,
    AlarmStat: Map<string, Uart.ConstantAlarmStat>,
}



@Autoload()
@Provide()
@Scope(ScopeEnum.Singleton)
export class RedisService {

    @App()
    App: Application

    @Inject()
    private Device: Device

    @Config('redis')
    private redisConfig: redis.RedisOptions


    redisService: redis.Redis

    /**
      *  缓存协议方法
      */
    protocolInstructMap: Map<string, Map<string, Uart.protocolInstruct>>
    /**
       * 用于配置
       */
    userSetup: Map<string, Map<string, userSetupMap>>

    @Init()
    async init() {
        this.redisService = new redis(this.redisConfig)
        this.protocolInstructMap = new Map()
        this.userSetup = new Map()
        //  this.clear()
    }

    getClient() {
        return this.redisService
    }

    /**
     * 执行清理工作
     */
    async clear() {
        const redis = this.redisService
        // 清理节点映射
        const nodes = await redis.keys("sid*")
        /* const on = await redis.keys("OnlineTime*")
        const off = await redis.keys("OfflineTime") */
        const all = [...nodes]//, ...on, ...off]
        console.log('clear all', all);
        if (all.length > 0) await redis.del(all)

    }

    /**
     * 添加参数告警发送状态
     * @param key 
     * @returns 
     */
    addArgumentAlarmLog(key: string) {
        return this.redisService.setex('ArgumentAlarm' + key, 60 * 60 * 24, '1')
    }

    /**
     * 判断参数告警发送状态
     * @param key 
     * @returns 
     */
    async hasArgumentAlarmLog(key: string) {
        return Boolean(await this.redisService.exists('ArgumentAlarm' + key))
    }

    /**
     * 删除参数告警发送状态
     * @param key 
     * @returns 
     */
    delArgumentAlarmLog(key: string) {
        return this.redisService.del('ArgumentAlarm' + key)
    }

    /**
   * 获取协议解析结果
   * @param protocol 设备协议
   */
    async getProtocolInstruct(protocol: string) {
        const instructMap = this.protocolInstructMap.get(protocol)
        if (!instructMap) {
            await this.setProtocolInstruct(protocol)
        }
        return this.protocolInstructMap.get(protocol)!
    }
    /** 
     * 设置协议解析
     * @param protocol 设备协议 
     */
    async setProtocolInstruct(protocol: string) {
        const Protocol = await this.Device.getProtocol(protocol)
        try {
            const ins = new Map(Protocol.instruct.map(el => [el.name, el]))
            // 缓存协议方法
            this.protocolInstructMap.set(protocol, ins)
        } catch (error) {
            console.log(Protocol);
        }
    }

    /**
   * 获取用户告警配置
   * @param user 用户名称
   * @param protocol 设备协议名称
   */
    async getUserSetup(user: string, protocol: string) {
        const setup = this.userSetup.get(user)?.get(protocol)
        if (!setup) {
            return this.setUserSetup(user, protocol)
        } else {
            return setup
        }
    }

    /**
     * 设置用户的告警配置缓存
     * @param user 用户名称
     * @param protocol 设备协议名称
     */
    async setUserSetup(user: string, protocol: string) {
        // 获取用户个性化配置实例
        const UserSetup = await (await this.App.getApplicationContext().getAsync(UserService)).getUserAlarmProtocol(user, protocol)
        // 协议参数阀值,状态
        const Constant = await this.Device.getAlarmProtocol(protocol)
        const cache = this.userSetup.get(user) || this.userSetup.set(user, new Map()).get(user)!
        // 如果缓存没有协议，新建缓存
        if (!cache.has(protocol)) {
            cache.set(protocol, {
                Threshold: new Map(Constant.Threshold.map(el => [el.name, el])),
                AlarmStat: new Map(Constant.AlarmStat.map(el => [el.name, el]))
            })
        }
        // 获取用户+协议 缓存实例
        const setup = cache.get(protocol)!

        // 
        setup.Threshold = new Map(Constant.Threshold.map(el => [el.name, el]))

        // 如果用户有阈值设置&&阈值设置有protocol,迭代用户设置加入到缓存
        UserSetup.Threshold.forEach(el => {
            setup.Threshold.set(el.name, el)
        })

        // 如果用户有状态设置&&状态设置有protocol,迭代用户设置加入到缓存
        setup.AlarmStat = new Map(Constant.AlarmStat.map(el => [el.name, el]))
        UserSetup.AlarmStat.forEach(el => {
            setup.AlarmStat.set(el.name, el)
        })

        return setup
    }

    /**
     * 设置每个设备查询每个设备查询消耗的时间
     * @param mac 
     * @param pid 
     * @param useTime 
     * @returns 
     */
    addQueryTerminaluseTime(mac: string, pid: number, useTime: number) {
        return this.redisService.lpush('QueryTerminaluseTime' + mac + pid, useTime)
    }

    /**
     * 获取查询消耗的时间,指定长度
     * @param mac 
     * @param pid 
     * @param length 
     * @returns 
     */
    async getQueryTerminaluseTime(mac: string, pid: number, length: number): Promise<number[]> {
        const hash = 'QueryTerminaluseTime' + mac + pid
        const len = await this.redisService.llen(hash)
        return await this.redisService.lrange(hash, len > length ? len - length : 0, len) as any
    }

    /**
     * 清理查询消耗的时间
     * @param mac 
     * @param pid 
     */
    async clearQueryTerminaluseTime(mac: string, pid: number,) {
        const hash = 'QueryTerminaluseTime' + mac + pid
        const len = await this.redisService.llen(hash)
        return await this.redisService.ltrim(hash, 0, len)
    }

    /**
     * 设置用户短信验证码缓存
     * @param user 用户名
     * @param code 验证码
     */
    setUserSmsCode(user: string, code: number | string) {
        return this.redisService.setex(user + 'sms', 6 * 60, code)
    }

    /**
     * 获取用户短信验证码缓存
     * @param user 用户名
     */
    getUserSmsCode(user: string) {
        return this.redisService.get(user + 'sms')
    }

    /**
     * 设置设备上线时间
     * @param mac 
     * @param time 
     * @returns 
     */
    setMacOnlineTime(mac: string) {
        return this.redisService.set("OnlineTime" + mac, Date.now())
    }

    /**
     * 获取设备上线时间
     * @param mac 
     * @returns 
     */
    async getMacOnlineTime(mac: string) {
        return Number(await this.redisService.get("OnlineTime" + mac))
    }

    /**
     * 删除设备上线记录
     * @param mac 
     * @returns 
     */
    delMacOnlineTime(mac: string) {
        return this.redisService.del("OnlineTime" + mac)
    }

    /**
     * 设置设备下线时间
     * @param mac 
     * @param time 
     * @returns 
     */
    setMacOfflineTime(mac: string) {
        return this.redisService.set("OfflineTime" + mac, Date.now())
    }

    /**
     * 获取设备下线时间
     * @param mac 
     * @returns 
     */
    async getMacOfflineTime(mac: string) {
        return Number(await this.redisService.get("OfflineTime" + mac))
    }

    /**
     * 删除设备下线记录
     * @param mac 
     * @returns 
     */
    delMacOfflineTime(mac: string) {
        return this.redisService.del("OfflineTime" + mac)
    }

    /**
     * 添加设备繁忙状态
     * @param mac 
     * @returns 
     */
    addDtuWorkBus(mac: string | string[]) {
        return this.redisService.sadd("DtuWorkBus", [...[mac].flat()])
    }

    /**
     * 删除设备繁忙状态
     * @param mac 
     * @returns 
     */
    delDtuWorkBus(mac: string | string[]) {
        return this.redisService.srem("DtuWorkBus", [...[mac].flat()])
    }

    /**
     * 是否设备繁忙状态
     * @param mac 
     * @returns 
     */
    hasDtuWorkBus(mac: string) {
        return this.redisService.sismember("DtuWorkBus", mac)
    }

    /**
     * 增加设备掉线提醒发送记录次数
     * @param hash 
     * @returns 
     */
    setTimeOutMonutDevSmsSend(hash: string) {
        this.redisService.setex("TimeOutMonutDevSmsSend" + hash, 864e5, 1)

    }

    /**
     * 是否含有设备掉线提醒发送记录次数
     * @param hash 
     * @returns 
     */
    hasTimeOutMonutDevSmsSend(hash: string) {
        return this.redisService.exists('TimeOutMonutDevSmsSend' + hash)
    }

    /**
     * 获取设备掉线提醒发送记录次数
     * @param hash 
     * @returns 
     */
    /* getTimeOutMonutDevSmsSend(hash: string) {
        return this.redisService.hget('TimeOutMonutDevSmsSend'+ hash)
    } */

    /**
         * 删除设备掉线提醒发送记录次数
         * @param hash 
         * @returns 
         */
    delTimeOutMonutDevSmsSend(hash: string) {
        return this.redisService.del('TimeOutMonutDevSmsSend' + hash)
    }

    /**
     * 设置查询指令和实际指令的映射
     * @param content 查询指令
     * @param ProtocolInstructName 实际指令 
     * @returns 
     */
    setContentToInstructName(content: string, ProtocolInstructName: string) {
        return this.redisService.set('ContentToInstructName' + content, ProtocolInstructName)
    }

    /**
     * 获取查询指令和实际指令的映射
     * @param content 查询指令
     * @returns 
     */
    getContentToInstructName(content: string) {
        return this.redisService.get('ContentToInstructName' + content)
    }

    /**
     * 判断查询指令和实际指令的映射
     * @param content 查询指令
     * @returns 
     */
    hasContentToInstructName(content: string) {
        return this.redisService.exists('ContentToInstructName' + content)
    }

    /**
     * 删除查询指令和实际指令的映射
     * @param content 查询指令
     * @returns 
     */
    delContentToInstructName(content: string) {
        return this.redisService.del('ContentToInstructName' + content)
    }


    /**
    * 
    * @param unit 协议参数单位
    * @val 值
    */
    async parseUnit(unit: string, val: string) {
        const hash = "Unit_" + unit + val
        if (!await this.redisService.exists(hash)) {
            const arr = unit
                .replace(/(\{|\}| )/g, "")
                .split(",")
                .map(el => el.split(":"))
            //.map(el => ({ [el[0]]: el[1] }));
            for (const [key, v] of arr) {
                await this.redisService.set("Unit_" + unit + key, v)
            }
        }
        return await this.redisService.get(hash)
    }

    /**
     * 设置ip和地址的映射
     * @param ip 
     * @param loction 
     * @returns 
     */
    setloctionIp(ip: string, loction: string) {
        return this.redisService.set(ip, loction)
    }

    /**
     * 获取ip和地址的映射
     * @param ip 
     * @returns 
     */
    getloctionIp(ip: string) {
        return this.redisService.get(ip)
    }

    /**
     * 保存小程序用户获取到的session
     * @param openId 
     * @param session 
     */
    setCode2Session(openId: string, session: string) {
        return this.redisService.setex(openId, 8e4, session)
    }

    /**
     * 获取小程序用户的session
     * @param openId 
     * @param session 
     */
    getCode2Session(openId: string) {
        return this.redisService.get(openId)
    }


    /**
     * 设备处理进程,失效10s
     * @param hash 
     * @returns 
     */
    setParseSet(hash: string) {
        return this.redisService.setex("parseSet" + hash, 10, 1)
    }

    /**
     * del设备处理进程
     * @param hash 
     * @returns 
     */
    delParseSet(hash: string) {
        return this.redisService.del("parseSet" + hash)
    }

    /**
     * has设备处理进程
     * @param hash 
     * @returns 
     */
    async hasParseSet(hash: string) {
        return Boolean(await this.redisService.exists("parseSet" + hash))
    }

    /**
     * 设置节点socketId和名称的映射
     * @param id 
     * @param name 
     * @returns 
     */
    setSocketSid(id: string, name: string) {
        return this.redisService.set("sid" + id, name)
    }

    /**
     * get节点socketId和名称的映射
     * @param id 
     * @param name 
     * @returns 
     */
    getSocketSid(id: string) {
        return this.redisService.get("sid" + id)
    }

    /**
     * del节点socketId和名称的映射
     * @param id 
     * @returns 
     */
    delSocketSid(id: string) {
        return this.redisService.del("sid" + id)
    }
}