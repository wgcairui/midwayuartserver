import { RuleType, Rule } from '@midwayjs/decorator';

/**
 * code
 */
export class code2Session {
  @Rule(RuleType.string())
  js_code: string;

  @Rule(RuleType.string().allow())
  scene?: string;
}

export class getPhone {
  @Rule(RuleType.string())
  openid: string;

  @Rule(RuleType.string())
  encryptedData: string;

  @Rule(RuleType.string())
  iv: string;
}

export class registerUser {
  @Rule(RuleType.string())
  user: string;

  @Rule(RuleType.string())
  openid: string;

  @Rule(RuleType.string())
  name: string;

  @Rule(
    RuleType.string().pattern(
      /^(0|86|17951)?(13[0-9]|15[012356789]|166|17[3678]|18[0-9]|14[57])[0-9]{8}$/
    )
  )
  tel: string;

  @Rule(RuleType.string().uri())
  avanter: string;

  getName() {
    return !this.name || this.name === 'undefined'
      ? this.user.slice(this.user.length - 4)
      : this.name;
  }
}
