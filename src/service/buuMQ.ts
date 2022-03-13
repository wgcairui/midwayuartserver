import { Init, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { Job, Queue, QueueScheduler, Worker } from 'bullmq';
import { RedisService } from './redis';


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
  inner_Message = "inner_Message"
}

interface QUENAME_TYPE {
  inner_Message: Uart.logInnerMessages
}


/**
 * 消息队列
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class MQ {
  QueueMap: Map<QUEUE_NAME, Queue>;
  QueueSchedulerMap: Map<QUEUE_NAME, QueueScheduler>;
  WorkMap: Map<QUEUE_NAME, Worker>;

  @Inject()
  redis: RedisService;

  @Init()
  init() {
    // 迭代事件,创建队列
    Object.values(QUEUE_NAME).forEach(name => {
      this.QueueMap.set(
        name,
        new Queue(name, { connection: this.redis.redisService })
      );

      this.QueueSchedulerMap.set(
        name,
        new QueueScheduler(name, { connection: this.redis.redisService })
      );

      this.WorkMap.set(
        name,
        new Worker(name, this.initWork, {
          connection: this.redis.redisService,
        })
      );
    });
  }

  /**
   * 初始化消费程序
   * @param job 队列信息
   * @param id 队列id
   */
  private async initWork(job: Job, id: string) {
    console.log(job, id);
    const parse = {
      [QUEUE_NAME.dataCheck]: this.dataCheck(job),
      [QUEUE_NAME.inner_Message]: this.innerMessage(job)
    };
    parse[job.name](job.data);
  }

  private dataCheck(data: any) {
  }

  /**
   * 处理内部消息
   * @param job
   */
  private innerMessage(job: Job<Uart.logInnerMessages>) {

  }

  /**
   * 添加消息到队列
   * @param name 
   * @param data 
   */
  addJob<T extends keyof QUENAME_TYPE>(name: T, data: QUENAME_TYPE[T]) {
    const Queue = this.QueueMap.get(name as any)
    Queue && Queue.add(data.mac || data.user || data.message, data)
  }



}
