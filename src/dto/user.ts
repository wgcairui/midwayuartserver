import { Rule, RuleType } from "@midwayjs/decorator"
import { ObjectId } from "../interface"


export class loginHash {
    @Rule(RuleType.string().required())
    user: string
}

@Rule(loginHash)
export class login extends loginHash {

    @Rule(RuleType.string().required())
    passwd: string
}

export class wxlogin {
    @Rule(RuleType.string().required())
    code: string

    @Rule(RuleType.string().required().equal('e0bwU6jnO2KfIuTgBQNDVxlsy7iGtoF3A8rWpSCM5RzZ1dmYJcLHqPhXav4Ek9lIC6P4cULfktXj5Wcwa3GcCBCYRMWidUzZyJyTqu'))
    state: string
}

type Group = 'root' | 'user' | 'guest'
class token {
    @Rule(RuleType.string().required())
    user: string

    @Rule(RuleType.string().required())
    userGroup: Group
}

export class Api {
    @Rule(token)
    token: token
}

/**
 * 日期参数
 */
@Rule(Api)
export class date extends Api {
    @Rule(RuleType.string().required())
    start: string

    @Rule(RuleType.string().required())
    end: string

    getStart() {
        return new Date(this.start).getTime()
    }

    getEnd() {
        return new Date(this.end).getTime()
    }
}

/**
 * mongoId参数
 */
@Rule(Api)
export class mongoId extends Api {
    @Rule(RuleType.string())
    id?: string

    getId() {
        return this.id ? ObjectId(this.id) : null
    }
}

/**
 * mac
 */
@Rule(Api)
export class mac extends Api {
    @Rule(RuleType.string().required())
    mac: string
}

/**
 * PId
 */
@Rule(mac)
export class macPid extends mac {
    @Rule(RuleType.number().required())
    pid: number
}

/**
 * 修改用户设备别名
 */
@Rule(Api)
export class modifiTerminalName extends Api {
    @Rule(RuleType.string().required())
    mac: string

    @Rule(RuleType.string().required())
    name: string
}