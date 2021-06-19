import { Provide, Scope, ScopeEnum, Config, Init, Autoload } from "@midwayjs/decorator"
import * as redis from "ioredis"

@Autoload()
@Provide()
@Scope(ScopeEnum.Singleton)
export class RedisService {

    @Config('redis')
    private redisConfig: redis.RedisOptions


    private redisService: redis.Redis

    @Init()
    async init() {
        this.redisService = new redis(this.redisConfig)
    }

    getClient() {
        return this.redisService
    }
}