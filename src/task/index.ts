import { Provide, Scope, ScopeEnum, TaskLocal } from '@midwayjs/decorator';

import { RedisService } from '../service/redisService';

@Provide()
@Scope(ScopeEnum.Singleton)
export class TaskSingle {
  /**
   * 每分钟更新一次终端信息
   */
  @TaskLocal('* * * * *')
  async initTerminalMap() {
    RedisService.initTerminalMap();
  }
}
