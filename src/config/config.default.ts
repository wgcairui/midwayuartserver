import { RedisOptions } from 'ioredis';
import { ConnectOptions } from 'mongoose';
import { tencetMapConfig } from '../interface';
import { Options as ossOptions } from 'ali-oss';
import { IMidwayKoaConfigurationOptions } from '@midwayjs/koa';
import { IMidwaySocketIOConfigurationOptions } from '@midwayjs/socketio';

import ossKey = require('./oss.json');

export const mongoose = {
  uri: `mongodb://${
    process.env.NODE_Docker === 'docker' ? 'mongo' : '127.0.0.1'
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
  host: process.env.NODE_Docker === 'docker' ? 'redis' : '127.0.0.1', // Redis host
  family: 4, // 4 (IPv4) or 6 (IPv6)
  password: '',
  db: 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const task = {
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

// normal oss bucket
export const oss: Record<string, ossOptions> = {
  client: {
    accessKeyId: ossKey.accessKeyId,
    accessKeySecret: ossKey.accessKeySecret,
    bucket: 'besiv-uart',
    endpoint: 'oss-cn-hangzhou.aliyuncs.com',
    timeout: '60s',
  },
};

/**
 * logger配置
 */
export const midwayLogger = {
  default: {
    level: 'warn',
    consoleLevel: 'info',
  },
};

/**
 * koa配置
 */
export const koa: IMidwayKoaConfigurationOptions = {
  port: 9010,
  hostname: '0.0.0.0',
  keys: [],
};

export const bodyParser = {
  enableTypes: ['json', 'form', 'text', 'xml'],
  formLimit: '100mb',
  jsonLimit: '1mb',
  textLimit: '1mb',
  xmlLimit: '1mb',
}

/**
 * socketio配置
 */
export const socketIO: IMidwaySocketIOConfigurationOptions = {
  path: '/client',
  /* cors: {
    origin: "http://120.202.61.88:9010",
    methods: ["GET", "POST"]
  } */
};
