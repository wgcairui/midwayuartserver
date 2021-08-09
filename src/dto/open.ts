import { RuleType, Rule } from "@midwayjs/decorator"

/**
 * 开放crc校验
 */
export class crc {
    @Rule(RuleType.number().required())
    protocolType: number;

    @Rule(RuleType.number().required())
    pid: number;

    @Rule(RuleType.string().required())
    instructN: string;

    @Rule(RuleType.number().required())
    address: number;

    @Rule(RuleType.number().required())
    value: number
}