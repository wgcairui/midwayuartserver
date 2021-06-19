import { DefaultConfig } from "@midwayjs/typegoose"
import { RedisOptions } from "ioredis"
import { ServerRegistration } from 'apollo-server-koa';
import { StoreConfig } from "cache-manager"
import { GetMiddlewareOptions } from 'apollo-server-koa/dist/ApolloServer';

export type ExtendedConfig = DefaultConfig & {
    apollo: GetMiddlewareOptions;
};

export const mongoose: DefaultConfig = {
    uri: `mongodb://${process.env.NODE_Docker === 'docker' ? 'mongo' : 'localhost'}:27017/UartServer`,
    options: {
        dbName: "UartServer",
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex:true
    }
}

export const cache: StoreConfig = {
    store: "memory",
    ttl: 6000,
    options: {
        max: 1000,
        ttl: 6000
    }
}

export const apollo: ServerRegistration = {
    path: "/graphql"
} as any

export const redis: RedisOptions = {
    port: 6379, // Redis port
    host: process.env.NODE_Docker === 'docker' ? 'redis' : 'localhost',//"127.0.0.1", // Redis host
    family: 4, // 4 (IPv4) or 6 (IPv6)
    password: "",
    db: 0
}

export const taskConfig = {
    redis: `redis://${redis.host}:${redis.port}`, //任务依赖redis，所以此处需要加一个redis
    prefix: 'midway-task',            // 这些任务存储的key，都是midway-task开头，以便区分用户原有redis里面的配置。
    defaultJobOptions: {
        repeat: {
            tz: "Asia/Shanghai"           // Task等参数里面设置的比如（0 0 0 * * *）本来是为了0点执行，但是由于时区不对，所以国内用户时区设置一下。
        }
    }
}