/* import { Aspect, IMethodAspect, JoinPoint, Provide } from "@midwayjs/decorator";
import { Context } from "@midwayjs/koa";
 */
/**
 * 拦截返回值
 */
/* @Provide()
@Aspect(APIController)
export class ApiAspect implements IMethodAspect {
    async afterReturn(point: JoinPoint, result: any) {
        const method = point.methodName
        const ctx = point.target.ctx as Context


        if (/(^set|^del|^update)/ig.test(method)) {
            console.log({ method, ctx: ctx.request.body, result });
        }

    }
} */

interface a1 {
  a: string;
  b: number;
}

interface b1 {
  c: string;
  d: Date;
}

type c = a1 & b1;

const d: c = {
  a: '',
  b: 0,
  c: '',
  d: new Date(),
};

type e = Partial<Record<keyof a1, string>>;

type e2 = Partial<Record<keyof b1, string>>;

const ss: e & e2 = {
  a: '',
  b: '',
};
