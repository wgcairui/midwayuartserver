// src/decorator/logging.decorator.ts
import { createCustomParamDecorator } from '@midwayjs/decorator';

// 装饰器内部的唯一 id
export const USER_KEY = 'decorator:user_key';

export function User(): MethodDecorator {
  return createCustomParamDecorator(USER_KEY, {}) as any;
}
