import { Rule, RuleType } from '@midwayjs/validate';
import { Types } from 'mongoose';

/**
 * 日期参数
 */
export class date {
  @Rule(RuleType.string().allow())
  start?: string;

  @Rule(RuleType.string().allow())
  end?: string;

  getStart() {
    return new Date(this.start).getTime();
  }

  getEnd() {
    return new Date(this.end).getTime();
  }
}

export class macDate extends date {
  @Rule(RuleType.string())
  mac: string;
}

@Rule(date)
export class userDate extends date {
  @Rule(RuleType.string())
  user: string;
}

@Rule(date)
export class IdDate extends date {
  @Rule(RuleType.string().allow())
  id?: string;

  getId() {
    return new Types.ObjectId(this.id);
  }
}

export class mountDev {
  @Rule(RuleType.string())
  Type: string;

  @Rule(RuleType.string())
  mountDev: string;

  @Rule(RuleType.string())
  protocol: string;

  @Rule(RuleType.number())
  pid: number;
}

export class registerDev {
  @Rule(RuleType.array())
  ids: string[];

  @Rule(mountDev)
  mountDev: Uart.TerminalMountDevs;
}
