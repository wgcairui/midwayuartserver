import { Init, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { Job, Queue, QueueScheduler, Worker } from 'bullmq';
import { RedisService } from './redis';

export enum QUEUE_NAME {
  sms = 'sms',
  wx = 'wx',

  dataParse = 'dataParse',
  dataCheck = 'dataCheck',

  log = 'log',
}

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

  private async initWork(job: Job, id: string) {
    console.log(job, id);
    const parse = {
      [QUEUE_NAME.dataCheck]: this.dataCheck(job.data),
    };
    parse[job.name](job.data);
  }

  private dataCheck(data: any) {
    console.log(data);
  }

  addJob(name: QUEUE_NAME, data: Record<string, any>) {
    console.log({ name, data });
  }
}
