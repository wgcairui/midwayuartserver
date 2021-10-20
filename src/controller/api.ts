import {
  Provide,
  Controller,
  Inject,
  Post,
  Body,
  Validate,
  ALL,
} from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { UserService } from '../service/user';
import { Device } from '../service/device';
import { RedisService } from '../service/redis';
import { TencetMap } from '../service/tencetMap';
import {
  date,
  Api,
  mongoId,
  modifiTerminalName,
  mac,
  macPid,
  addMountDev,
  smsCode,
  alarmTels,
  protocol,
  terminalResults,
  InstructSet,
  setUserSetupProtocol,
  setAlias,
  id,
  setAggs,
  addAgg,
  updateAvanter,
  updateJw,
} from '../dto/user';
import { Sms } from '../decorator/smsValidation';
import { Util } from '../util/util';
import { SocketUart } from '../service/socketUart';
import * as lodash from 'lodash';
import { toDataURL } from 'qrcode';

@Provide()
@Controller('/api', { middleware: ['token'] })
export class ApiControll {
  @Inject()
  UserService: UserService;

  @Inject()
  Device: Device;

  @Inject()
  RedisService: RedisService;

  @Inject()
  ctx: Context;

  @Inject()
  TencetMap: TencetMap;

  @Inject()
  Util: Util;

  @Inject()
  SocketUart: SocketUart;

  /**
   * 添加用户
   * @param name
   * @param user
   * @param passwd
   * @param tel x
   * @param mail
   * @param company
   * @returns
   */
  @Post('/guest/addUser')
  addUser(
    @Body() name: string,
    @Body() user: string,
    @Body() passwd: string,
    @Body() tel: string,
    @Body() mail: string,
    @Body() company: string
  ) {
    return this.UserService.addUser(name, user, passwd, tel, mail, company);
  }

  /**
   * 获取用户绑定设备
   * @param token
   * @returns
   */
  @Post('/BindDev')
  @Validate()
  async BindDev(@Body(ALL) data: Api) {
    return {
      code: 200,
      data: await this.UserService.getUserBindDevices(data.token.user),
    };
  }

  /**
   * 获取用户告警信息
   * @param token
   */
  @Validate()
  @Post('/loguartterminaldatatransfinites')
  async loguartterminaldatatransfinites(@Body(ALL) data: date) {
    const alarms = await this.UserService.getUserAlarm(
      data.token.user,
      data.getStart(),
      data.getEnd(),
      { mac: 1, isOk: 1, pid: 1, devName: 1, tag: 1, msg: 1, timeStamp: 1 }
    );
    return {
      code: 200,
      data: alarms.map(el => {
        el.mac = this.RedisService.terminalMap.get(el.mac)?.name || el.mac;
        return el;
      }),
    };
  }

  /**
   * 获取用户信息
   * @param data
   * @returns
   */
  @Post('/userInfo')
  @Validate()
  async userinfo(@Body(ALL) data: Api) {
    return {
      code: 200,
      data: await this.UserService.getUser(data.token.user, {
        _id: 0,
        passwd: 0,
        createdAt: 0,
        updatedAt: 0,
      }),
    };
  }

  /**
   * 确认用户告警信息
   * @param user
   * @param id
   * @returns
   */
  @Post('/confrimAlarm')
  @Validate()
  async confrimAlarm(@Body(ALL) data: mongoId) {
    return {
      code: 200,
      data: await this.UserService.confrimAlarm(data.token.user, data.getId()),
    };
  }

  /**
   * 获取指定且在线的终端
   * @param mac
   * @returns
   */
  @Post('/getTerminalOnline')
  @Validate()
  async getTerminalOnline(@Body(ALL) data: mac) {
    const ter = await this.Device.getTerminal(data.mac);
    return {
      code: 200,
      data: ter && ter.online ? ter : null,
    };
  }

  /**
   * 修改用户设备别名
   * @returns
   */
  @Post('/modifyTerminal')
  @Sms()
  @Validate()
  async modifyTerminal(@Body(ALL) data: modifiTerminalName) {
    return {
      code: 200,
      data: await this.UserService.modifyTerminal(
        data.token.user,
        data.mac,
        data.name
      ),
    };
  }

  /**
   * 添加绑定设备
   * @param user
   * @param mac
   */
  @Post('/addUserTerminal')
  @Validate()
  async addUserTerminal(@Body(ALL) data: mac) {
    const d = await this.UserService.addUserTerminal(data.token.user, data.mac);
    return {
      code: d ? 200 : 0,
      data: d,
      msg: d ? 'success' : '设备已经被绑定',
    };
  }

  /**
   * 删除绑定设备
   * @param user
   * @param mac
   * @returns
   */
  @Post('/delUserTerminal')
  @Sms()
  @Validate()
  async delUserTerminal(@Body(ALL) data: mac) {
    return {
      code: 200,
      data: await this.UserService.delUserTerminal(data.token.user, data.mac),
    };
  }

  /**
   * 获取设备类型
   * @param Type
   * @returns
   */
  @Post('/getDevTypes')
  async getDevTypes(@Body() Type: string) {
    return {
      code: 200,
      data: await this.Device.getDevTypes(Type),
    };
  }

  /**
   * 删除终端挂载设备
   * @param mac
   * @param pid
   */
  @Post('/delTerminalMountDev')
  @Sms()
  @Validate()
  async delTerminalMountDev(@Body(ALL) data: macPid) {
    const d = await this.UserService.delTerminalMountDev(
      data.token.user,
      data.mac,
      data.pid
    );
    if (d) this.SocketUart.delTerminalMountDevCache(data.mac, data.pid);
    return {
      code: d ? 200 : 0,
      data: d,
      msg: d ? 'success' : 'mac is binding',
    };
  }

  /**
   *   添加用户终端挂载设备
   * @param mac
   * @param param2
   * @returns
   */
  @Post('/addTerminalMountDev')
  @Validate()
  @Sms()
  async addTerminalMountDev(@Body(ALL) data: addMountDev) {
    const d = await this.UserService.addTerminalMountDev(
      data.token.user,
      data.mac,
      data.mountDev
    );
    if (d) this.SocketUart.setTerminalMountDevCache(data.mac);
    return {
      code: d ? 200 : 0,
      data: d,
      msg: d ? 'success' : 'mac is binding',
    };
  }

  /**
   * 校验用户权限
   * @param data
   * @returns
   */
  @Post('/smsValidation')
  @Validate()
  async smsValidation(@Body(ALL) data: Api) {
    const sr = await this.UserService.sendValidation(data.token.user);
    if (sr.code) {
      await this.RedisService.setUserSmsCode(data.token.user, sr.data);
      return {
        code: 200,
        msg: sr.msg,
      };
    } else {
      return {
        code: 0,
        msg: sr.msg,
      };
    }
  }
  /**
   * 校验用户权限短信验证码
   * @param data
   * @returns
   */
  @Post('/smsCodeValidation')
  @Validate()
  async smsCodeValidation(@Body(ALL) data: smsCode) {
    const code = await this.RedisService.getUserSmsCode(data.token.user);
    if (code === data.code) {
      await this.RedisService.getClient().setex(
        this.ctx.cookies.get('auth._token.local'),
        60 * 60 * 72,
        'true'
      );
    }
    return {
      code: !code || code !== data.code ? 0 : 200,
      msg: !code
        ? '验证码已失效'
        : code !== data.code
        ? '验证码错误'
        : 'success',
    };
  }

  /**
   * 获取用户告警配置
   * @returns
   */
  @Post('/getUserAlarmSetup')
  @Validate()
  async getUserAlarmSetup(@Body(ALL) data: Api) {
    return {
      code: 200,
      data: await this.UserService.getUserAlarmSetup(data.token.user, {
        tels: 1,
        mails: 1,
      }),
    };
  }

  /**
   * 修改用户告警配置联系方式
   * @param user
   * @param tels 联系电话
   * @param mails 联系邮箱
   * @returns
   */
  @Post('/modifyUserAlarmSetupTel')
  @Sms()
  @Validate()
  async modifyUserAlarmSetupTel(@Body(ALL) data: alarmTels) {
    return {
      code: 200,
      data: await this.UserService.modifyUserAlarmSetupTel(
        data.token.user,
        data.tels,
        data.mails
      ),
    };
  }

  /**
   * 修改用户信息
   * @param user
   * @param data
   * @returns
   */
  @Post('/modifyUserInfo')
  @Sms()
  async modifyUserInfo(
    @Body() token: { user: string },
    @Body() data: Partial<Uart.UserInfo>
  ) {
    if (data.tel && this.Util.RegexTel(data.tel)) {
      const u = await this.UserService.getUser(data.tel as any);
      if (u && u.user !== token.user) {
        return {
          code: 0,
          msg: '手机号已被使用,请输入新的手机号',
        };
      }
    }
    return {
      code: 200,
      data: await this.UserService.modifyUserInfo(
        token.user,
        lodash.omit(data, 'user')
      ),
    };
  }

  /**
   * 获取公众号二维码
   * @param user
   * @returns
   */
  @Post('/mpTicket')
  @Validate()
  async mpTicket(@Body(ALL) data: Api) {
    const d = await this.UserService.mpTicket(data.token.user);
    return {
      code: typeof d === 'string' ? 200 : 0,
      data: d,
    };
  }

  /**
   * 获取小程序二维码
   * @param user
   * @returns
   */
  @Post('/wpTicket')
  @Validate()
  async wpTicket(@Body(ALL) data: Api) {
    const d = await this.UserService.wpTicket(data.token.user);
    return {
      code: typeof d === 'string' ? 200 : 0,
      data: d,
    };
  }

  /**
   * 获取用户单个协议告警配置
   * @param user
   * @param protocol
   */
  @Post('/getUserAlarmProtocol')
  @Validate()
  async getUserAlarmProtocol(@Body(ALL) data: protocol) {
    return {
      code: 200,
      data: await this.UserService.getUserAlarmProtocol(
        data.token.user,
        data.protocol
      ),
    };
  }

  /**
   * 获取单个协议告警配置
   * @param protocol
   */
  @Post('/getAlarmProtocol')
  @Validate()
  async getAlarmProtocol(@Body(ALL) data: protocol) {
    return {
      code: 200,
      data: await this.Device.getAlarmProtocol(data.protocol),
    };
  }

  /**
   * 获取用户设备运行数据
   * @param user
   * @param mac
   * @param pid
   */
  @Post('/getTerminalData')
  @Validate()
  async getTerminalData(@Body(ALL) data: macPid) {
    const d = await this.UserService.getTerminalData(
      data.token.user,
      data.mac,
      data.pid
    );
    return {
      code: d ? 200 : 0,
      data: d,
      msg: d ? 'success' : '设备没有数据',
    };
  }

  /**
   * 获取用户设备运行数据
   * @param user
   * @param mac
   * @param pid
   */
  @Post('/getTerminalDatas')
  @Validate()
  async getTerminalDatas(@Body(ALL) data: terminalResults) {
    const d = (await this.UserService.getTerminalDatas(
      data.token.user,
      data.mac,
      data.pid,
      data.name,
      data.getStart(),
      data.getEnd()
    )) as unknown as Uart.queryResultSave[];
    if (d) {
      if (d.length < 50) {
        return {
          code: 200,
          data: lodash.sortBy(d, 'timeStamp'),
        };
      }
      // 把结果拆分为块,50等分
      const len = Number.parseInt((d.length / 50).toFixed(0));
      const resultChunk = lodash.chunk(
        d.map(els => {
          els.tempValue = els.result[0].value;
          return els;
        }),
        len < 10 ? 10 : len
      );
      const arrs = resultChunk
        .map(el => [
          lodash.maxBy(el, 'tempValue')!,
          lodash.minBy(el, 'tempValue')!,
        ])
        .flat();
      return {
        code: 200,
        data: lodash.sortBy(arrs, 'timeStamp'),
      };
    } else {
      return {
        code: 0,
        msg: 'error nodata',
      };
    }
  }

  /**
   * 重置设备超时状态
   * @param mac
   * @param pid
   */
  @Post('/refreshDevTimeOut')
  @Validate()
  async refreshDevTimeOut(@Body(ALL) data: macPid) {
    await this.SocketUart.setTerminalMountDevCache(data.mac, data.interVal);
    return {
      code: 200,
      data: this.Device.setStatTerminalDevs(data.mac, data.pid),
      msg: 'success',
    };
  }

  /**
   * 固定发送设备操作指令
   * @param query
   * @param item
   * @returns
   */
  @Post('/SendProcotolInstructSet')
  @Sms()
  @Validate()
  async SendProcotolInstructSet(@Body(ALL) data: InstructSet) {
    const {
      token: { user },
      query,
      item,
    } = data;
    if (await this.UserService.isBindMac(user, query.DevMac)) {
      const protocol = await this.Device.getProtocol(query.protocol);
      // 携带事件名称，触发指令查询
      const Query: Uart.instructQuery = {
        protocol: query.protocol,
        DevMac: query.DevMac,
        pid: query.pid,
        type: protocol.Type,
        events: 'oprate' + Date.now() + query.DevMac,
        content: item.value,
      };
      // 检查操作指令是否含有自定义参数
      if (/(%i)/.test(item.value)) {
        // 如果识别字为%i%i,则把值转换为四个字节的hex字符串,否则转换为两个字节
        if (/%i%i/.test(item.value)) {
          const b = Buffer.allocUnsafe(2);
          b.writeIntBE(
            this.Util.ParseCoefficient(item.bl, Number(item.val)),
            0,
            2
          );
          Query.content = item.value.replace(
            /(%i%i)/,
            b.slice(0, 2).toString('hex')
          );
        } else {
          const val = this.Util.ParseCoefficient(
            item.bl,
            Number(item.val)
          ).toString(16);
          Query.content = item.value.replace(
            /(%i)/,
            val.length < 2 ? val.padStart(2, '0') : val
          );
        }
      }
      return {
        code: 200,
        data: await this.SocketUart.InstructQuery(Query),
        msg: 'success',
      };
    } else {
      return {
        code: 0,
        data: {
          ok: 0,
          msg: 'mac is undefine',
        } as Uart.ApolloMongoResult,
      };
    }
  }

  /**
   * 获取指定协议
   * @param protocol
   * @returns
   */
  @Post('/getProtocol')
  @Validate()
  async getProtocol(@Body(ALL) data: protocol) {
    return {
      code: 200,
      data: await this.Device.getProtocol(data.protocol),
    };
  }

  /**
   * 设置用户自定义设置(协议配置)
   * @param user
   * @param Protocol 协议
   * @param type 操作类型
   * @param arg 参数
   * @returns
   */
  @Post('/setUserSetupProtocol')
  @Validate()
  async setUserSetupProtocol(@Body(ALL) data: setUserSetupProtocol) {
    const d = await this.UserService.setUserSetupProtocol(
      data.token.user,
      data.protocol,
      data.type,
      data.arg
    );
    this.RedisService.setUserSetup(data.token.user, data.protocol);
    return {
      code: 200,
      data: d,
    };
  }

  /**
   * 设备设备别名
   * @param mac
   * @param pid
   * @param protocol
   * @param name
   * @param alias
   * @returns
   */
  @Post('/setAlias')
  @Validate()
  async setAlias(@Body(ALL) { mac, pid, protocol, name, alias }: setAlias) {
    return {
      code: 200,
      data: await this.Device.setAlias(mac, pid, protocol, name, alias),
    };
  }

  /**
   * 获取终端信息
   * @param user
   * @param mac
   * @returns
   */
  @Post('/getTerminal')
  @Validate()
  async getTerminal(@Body(ALL) data: mac) {
    return {
      code: 200,
      data: await this.UserService.getTerminal(data.token.user, data.mac),
    };
  }

  /**
   *
   * @returns 获取所以节点
   */
  @Post('/Nodes')
  async Nodes() {
    return {
      code: 200,
      data: await this.Device.getNodes(),
    };
  }

  /**
   *  获取用户布局配置
   * @param user
   * @param id
   */
  @Post('/getUserLayout')
  @Validate()
  async getUserLayout(@Body(ALL) data: id) {
    const layout = await this.UserService.getUserLayout(
      data.token.user,
      data.id
    );
    for (const i of layout.Layout) {
      (i as any).result = await this.UserService.getTerminalDataName(
        data.token.user,
        i.bind.mac,
        i.bind.pid,
        i.bind.name
      );
    }
    return {
      code: 200,
      data: layout,
    };
  }

  /**
   *  获取用户聚合设备
   * @param user
   * @param id
   */
  @Post('/getAggregation')
  @Validate()
  async getAggregation(@Body(ALL) data: id) {
    return {
      code: 200,
      data: await this.UserService.getAggregation(data.token.user, data.id),
    };
  }

  /**
   * 设置用户布局配置
   * @param id
   * @param type
   * @param bg
   * @param Layout
   */
  @Post('/setUserLayout')
  @Validate()
  async setUserLayout(@Body(ALL) data: setAggs) {
    return {
      code: 200,
      data: await this.UserService.setUserLayout(
        data.token.user,
        data.id,
        data.type,
        data.bg,
        data.Layout
      ),
    };
  }

  /**
   * 添加聚合设备
   * @param name
   * @param aggs
   * @returns
   */
  @Post('/addAggregation')
  @Validate()
  async addAggregation(@Body(ALL) data: addAgg) {
    return this.UserService.addAggregation(
      data.token.user,
      data.name,
      data.aggs
    );
  }

  /**
   * 删除聚合设备
   * @param user
   * @param id
   * @returns
   */
  @Post('/deleteAggregation')
  @Sms()
  async deleteAggregation(@Body(ALL) data: id) {
    return {
      code: 200,
      data: await this.UserService.deleteAggregation(data.token.user, data.id),
    };
  }

  /**
   * 重置密码到发送验证码
   * @param user
   * @returns
   */
  @Post('/guest/resetPasswdValidation')
  async resetPasswdValidation(@Body() user: string) {
    const u = await this.UserService.getUser(user);
    if (u) {
      const { code, data, msg } = await this.UserService.sendValidation(u.user);
      if (code === 200) {
        await this.RedisService.setUserSmsCode(user, data);
        return {
          code,
          msg,
        };
      } else {
        return {
          code,
          msg: '发送失败,请重试',
        };
      }
    } else {
      return {
        code: 0,
        msg: '无此账号',
      };
    }
  }

  /**
   * 重置用户密码
   * @param user
   * @param passwd
   * @param code
   * @returns
   */
  @Post('/guest/resetUserPasswd')
  async resetUserPasswd(
    @Body() user: string,
    @Body() passwd: string,
    @Body() code: string
  ) {
    const lcode = await this.RedisService.getUserSmsCode(user);
    if (lcode) {
      if (lcode === code) {
        return {
          code: 200,
          data: await this.UserService.resetUserPasswd(user, passwd),
          msg: 'success',
        };
      } else {
        return {
          code: 0,
          msg: '验证码错误,请重新操作',
        };
      }
    } else {
      return {
        code: 0,
        msg: '验证码已失效或未注册,请重新操作',
      };
    }
  }

  /**
   * 更新用户头像和昵称
   * @param nickName 昵称
   * @param avanter 头像链接
   */
  @Validate()
  @Post('/updateAvanter')
  async updateAvanter(@Body(ALL) data: updateAvanter) {
    return {
      code: 200,
      data: await this.UserService.modifyUserInfo(data.token.user, {
        avanter: data.avanter,
        name: data.nickName,
      }),
    };
  }

  /**
   * 用于解绑微信和透传账号的绑定关系
   */
  @Post('/unbindwx')
  @Validate()
  @Sms()
  async unbindwx(@Body(ALL) data: Api) {
    const user = await this.UserService.getUser(data.token.user);
    if (user.rgtype === 'wx') {
      await this.UserService.deleteUser(user.user);
    } else {
      await this.UserService.modifyUserInfo(user.user, {
        wpId: '',
        userId: '',
      });
    }
    return {
      code: 200,
    };
  }

  /**
   * 获取未确认告警数量
   */
  @Post('/getAlarmunconfirmed')
  @Validate()
  async getAlarmunconfirmed(@Body(ALL) data: Api) {
    return {
      code: 200,
      data: await this.UserService.getAlarmunconfirmed(data.token.user),
    };
  }

  /**
   * 获取gps定位的详细地址
   * @param location
   * @returns
   */
  @Post('/getGPSaddress')
  async getGPSaddress(@Body() location: string) {
    const r = await this.TencetMap.geocoder(location);
    return {
      code: r.status === 0 ? 200 : 0,
      data: r.result,
      msg: r.message,
    };
  }

  /**
   * 更新dtugps定位
   * @param data
   * @returns
   */
  @Post('/updateGps')
  @Validate()
  async updateGps(@Body(ALL) data: updateJw) {
    return {
      code: 200,
      data: await this.UserService.modifyTerminalJw(
        data.token.user,
        data.mac,
        data.jw
      ),
    };
  }

  /**
   * 获取指定注册设备
   * @param id
   * @returns
   */
  @Post('/getRegisterDev')
  async getRegisterDev(@Body() id: string) {
    return {
      code: 200,
      data: await this.Device.getRegisterDev(id),
    };
  }

  /**
   * 转换字符串到二维码
   * @param code
   * @returns
   */
  @Post('/qr')
  async qr(@Body() code: string) {
    return {
      code: 200,
      data: await toDataURL(code),
    };
  }
}
