import { AnyParamConstructor } from '@typegoose/typegoose/lib/types';
import { Job, Queue, QueueScheduler, Worker } from 'bullmq';
import { getModel } from '../util/base';
import { WxPublics } from '../util/wxpublic';
import { saveInnerMessage, saveWxsubscribeMessage } from './logService';
import { sendMail } from './mailService';
import { RedisService } from './redisService';
import { sendSMS, SmsParams } from './smsService';

export interface WsData {
  token: string;
  event: string;
  data: any;
}

export interface MailData {
  mail: string;
  title: string;
  subject: string;
  body: string;
}

export enum QUEUE_NAME {
  /**
   * 短信
   */
  sms = 'sms',

  /**
   * 微信设备
   */
  wx = 'wx',

  /**
   * 邮件
   */
  mail = 'mail',

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
  log: Record<string, any>;
  mail: MailData;
  wx: Uart.WX.wxsubscribeMessage;
  // smsUartAlarm: SmsUartAlarm;
  sms: SmsParams;
}

/**
 * 消息队列
 */
class App {
  private QueueMap: Map<QUEUE_NAME, Queue>;
  private QueueSchedulerMap: Map<QUEUE_NAME, QueueScheduler>;
  private WorkMap: Map<QUEUE_NAME, Worker>;
  private parse: Record<
    QUEUE_NAME,
    (job: Job<any, any, string>) => Promise<void>
  >;

  constructor() {
    this.QueueMap = new Map();
    this.QueueSchedulerMap = new Map();
    this.WorkMap = new Map();

    this.parse = {
      [QUEUE_NAME.inner_Message]: this.innerMessage,
      [QUEUE_NAME.log]: this.log,
      [QUEUE_NAME.mail]: this.mail,
      [QUEUE_NAME.wx]: this.wx,
      [QUEUE_NAME.sms]: this.sms,
    };
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

    /**
     * 创建一个ws输出的队列
     */
    this.QueueMap.set(
      'wsOutput' as any,
      new Queue('wsOutput', { connection: RedisService.redisService })
    );
  }

  /**
   * 初始化消费程序
   * @param job 队列信息
   * @param id 队列id
   */
  private async initWork(job: Job, id: string) {
    console.log({ job, id });
    this.parse[job.name](job.data);
  }

  /**
   * 短信发送
   * @param job
   */
  private async sms(job: Job<SmsParams>) {
    await sendSMS(job.data);
  }

  /**
   * 邮件发送
   * @param job
   * @param {*} mail 接受邮箱
   * @param {*} title 标题
   * @param {*} subject 主题
   * @param {*} body  发送text或者html格式 // text: 'Hello world?', // plain text body
   */
  private async mail({ data }: Job<MailData>) {
    await sendMail(data.mail, data.title, data.subject, data.body);
  }

  /**
   * 微信告警推送消息
   * @param job
   */
  private async wx(job: Job<Uart.WX.wxsubscribeMessage>) {
    const el = await WxPublics.SendsubscribeMessageDevAlarm(job.data);
    await saveWxsubscribeMessage({ ...job.data, result: el });
  }

  /**
   * 保存处理内部消息
   * @param job
   */
  private async innerMessage(job: Job<Uart.logInnerMessages>) {
    await saveInnerMessage(job.data);
  }

  /**
   * 保存日志记录
   * @param job
   */
  private async log<T extends object>(
    job: Job<{ entity: AnyParamConstructor<T>; doc: T }>
  ) {
    const model = getModel(job.data.entity);
    await model.create(job.data.doc);
  }

  /**
   * 添加消息到队列
   * @param name
   * @param data
   */
  addJob<T extends keyof QUENAME_TYPE>(name: T, data: QUENAME_TYPE[T]) {
    const Queue = this.QueueMap.get(name as any);
    Queue && Queue.add(name, data);
  }

  /**
   * 添加日志记录
   * @param entity
   * @param doc
   */
  addJobLog<T extends object>(entity: AnyParamConstructor<T>, doc: T) {
    const Queue = this.QueueMap.get(QUEUE_NAME.log)!;
    Queue.add('log', {
      entity,
      doc,
    });
  }

  addJobWs(data: WsData) {
    const Queue = this.QueueMap.get('wsOutput' as any);
    Queue.add('wsOutput', data);
  }
}

export const MQ = new App();
