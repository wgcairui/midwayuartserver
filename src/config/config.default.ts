import { RedisOptions } from 'ioredis';
import { ConnectOptions } from 'mongoose';
import { tencetMapConfig } from '../interface';

export const mongoose = {
  uri: `mongodb://${
    process.env.NODE_Docker === 'docker' ? 'mongo' : '192.168.1.151'
  }:27017/UartServer`,
  options: {
    dbName: 'UartServer',
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
  } as ConnectOptions,
};

export const redis: RedisOptions = {
  port: 6379, // Redis port
  host: process.env.NODE_Docker === 'docker' ? 'redis' : 'uart.ladishb.com', //"127.0.0.1", // Redis host
  family: 4, // 4 (IPv4) or 6 (IPv6)
  password: '',
  db: 0,
};

export const taskConfig = {
  redis: `redis://${redis.host}:${redis.port}`, //任务依赖redis，所以此处需要加一个redis
  prefix: 'midway-task', // 这些任务存储的key，都是midway-task开头，以便区分用户原有redis里面的配置。
  defaultJobOptions: {
    repeat: {
      tz: 'Asia/Shanghai', // Task等参数里面设置的比如（0 0 0 * * *）本来是为了0点执行，但是由于时区不对，所以国内用户时区设置一下。
    },
  },
};

export const tencetMap: tencetMapConfig = {
  key: '7LGBZ-JLHWW-UCHRM-OIJG6-PNBLV-6ZBCN',
  apiUrl: 'https://apis.map.qq.com',
  SK: 'VNXI1sCXNvFIAZFeRT7ghlnLeOuiZWt',
};
