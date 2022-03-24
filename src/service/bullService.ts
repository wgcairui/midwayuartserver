import { Job, Queue, QueueScheduler, Worker } from 'bullmq';
import { Secret_JwtVerify } from '../util/util';
import { saveInnerMessage } from './logService';
import { RedisService } from './redisService';

export enum QUEUE_NAME {
  /**
   * 短信
   */
  sms = 'sms',
  /**
   * 微信
   */
  wx = 'wx',

  /**
   * 数据解析
   */
  dataParse = 'dataParse',
  /**
   * 数据检查
   */
  dataCheck = 'dataCheck',

  /**
   * 日志
   */
  log = 'log',

  /**
   * 站内信
   */
  inner_Message = 'inner_Message',
}

interface QUENAME_TYPE {
  inner_Message: Uart.logInnerMessages;
}

/**
 * 消息队列
 */
class App {
  private QueueMap: Map<QUEUE_NAME, Queue>;
  private QueueSchedulerMap: Map<QUEUE_NAME, QueueScheduler>;
  private WorkMap: Map<QUEUE_NAME, Worker>;

  constructor() {
    this.QueueMap = new Map();
    this.QueueSchedulerMap = new Map();
    this.WorkMap = new Map();
    this.start();
  }

  private start() {
    // 迭代事件,创建队列
    Object.values(QUEUE_NAME).forEach(name => {
      this.QueueMap.set(
        name,
        new Queue(name, { connection: RedisService.redisService })
      );

      this.QueueSchedulerMap.set(
        name,
        new QueueScheduler(name, { connection: RedisService.redisService })
      );

      this.WorkMap.set(
        name,
        new Worker(name, this.initWork, {
          connection: RedisService.redisService,
        })
      );
    });

    new Worker('wsInput', this.wsConnect, {
      connection: RedisService.redisService,
    });
  }

  /**
   * 初始化消费程序
   * @param job 队列信息
   * @param id 队列id
   */
  private async initWork(job: Job, id: string) {
    console.log({ job, id });
    const parse = {
      [QUEUE_NAME.dataCheck]: this.dataCheck(),
      [QUEUE_NAME.inner_Message]: this.innerMessage(job),
    };
    parse[job.name](job.data);
  }

  private dataCheck() {}

  /**
   * 保存处理内部消息
   * @param job
   */
  private async innerMessage(job: Job<Uart.logInnerMessages>) {
    await saveInnerMessage(job.data);
  }

  /**
   * 处理wx ws接受程序触发的队列
   * @param job
   */
  private async wsConnect(job: Job<{ token: string }>) {
    const token = job.data.token;
    console.log(token);
    try {
      const users = await Secret_JwtVerify<Uart.UserInfo>(token);
      RedisService.addWsToken(users.user, token);
    } catch (error: any) {
      console.error('wsConnect Error', error.message || '');
    }
  }

  /**
   * 添加消息到队列
   * @param name
   * @param data
   */
  addJob<T extends keyof QUENAME_TYPE>(name: T, data: QUENAME_TYPE[T]) {
    const Queue = this.QueueMap.get(name as any);
    Queue && Queue.add(data.mac || data.user || data.message, data);
  }
}

export const MQ = new App();
