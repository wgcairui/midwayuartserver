import { Controller, Inject, Post, Body } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { RedisService } from '../service/redisService';
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
  setUserSetupProtocol as setUserSetupProtocolDto,
  setAlias,
  id,
  setAggs,
  addAgg,
  updateAvanter,
  updateJw,
  terminalResultsV2,
} from '../dto/user';
import { Sms } from '../decorator/smsValidation';
import { SocketUart } from '../service/socketService';
import * as lodash from 'lodash';
import { toDataURL } from 'qrcode';
import { Validate } from '@midwayjs/validate';
import { userValidation } from '../middleware/userValidation';
import { MQ } from '../service/bullService';
import {
  getAlarmProtocol,
  getDevTypes,
  getNodes,
  getProtocol,
  getRegisterDev,
  getTerminal,
  setStatTerminalDevs,
  setAlias as setAlia,
} from '../service/deviceService';
import { RegexTel, ParseCoefficient } from '../util/util';
import {
  addUser,
  getUserBindDevices,
  getUserAlarm,
  getUser,
  confrimAlarm,
  modifyTerminal,
  addUserTerminal,
  delUserTerminal,
  delTerminalMountDev,
  addTerminalMountDev,
  sendValidation,
  getUserAlarmSetup,
  modifyUserAlarmSetupTel,
  modifyUserInfo,
  mpTicket,
  wpTicket,
  getUserAlarmProtocol,
  getTerminalData,
  getTerminalDatas,
  getTerminalDatasV2,
  isBindMac,
  getUserLayout,
  getTerminalDataName,
  getAggregation,
  setUserLayout,
  addAggregation,
  deleteAggregation,
  resetUserPasswd,
  deleteUser,
  getAlarmunconfirmed,
  modifyTerminalJw,
  setUserSetupProtocol,
} from '../service/userSevice';
import { TencetMapGeocoder } from '../service/tencetMapService';

@Controller('/api', { middleware: [userValidation] })
export class ApiControll {
  @Inject()
  ctx: Context;

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
  async addUser(
    @Body()
    user: Pick<
      Uart.UserInfo,
      'user' | 'name' | 'passwd' | 'tel' | 'mail' | 'company'
    >
  ) {
    MQ.addJob('inner_Message', {
      timeStamp: Date.now(),
      user: user.user,
      nikeName: user.name,
      message: '新增用户',
      data: user,
    });
    return addUser(
      user.name,
      user.user,
      user.passwd,
      user.tel as any,
      user.mail,
      user.company
    );
  }

  /**
   * 获取用户绑定设备
   * @param token
   * @returns
   */
  @Post('/BindDev')
  @Validate()
  async BindDev(@Body() data: Api) {
    return {
      code: 200,
      data: await getUserBindDevices(data.token.user),
    };
  }

  /**
   * 获取用户告警信息
   * @param token
   */
  @Validate()
  @Post('/loguartterminaldatatransfinites')
  async loguartterminaldatatransfinites(@Body() data: date) {
    const alarms = await getUserAlarm(
      data.token.user,
      data.getStart(),
      data.getEnd(),
      { mac: 1, isOk: 1, pid: 1, devName: 1, tag: 1, msg: 1, timeStamp: 1 }
    );
    return {
      code: 200,
      data: alarms.map(el => {
        el.mac = RedisService.terminalMap.get(el.mac)?.name || el.mac;
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
  async userinfo(@Body() { token }: Api) {
    const data = await getUser(token.user, {
      _id: 0,
      passwd: 0,
    });
    return {
      code: 200,
      data,
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
  async confrimAlarm(@Body() data: mongoId) {
    return {
      code: 200,
      data: await confrimAlarm(data.token.user, data.getId()),
    };
  }

  /**
   * 获取指定且在线的终端
   * @param mac
   * @returns
   */
  @Post('/getTerminalOnline')
  @Validate()
  async getTerminalOnline(@Body() data: mac) {
    const ter = await getTerminal(data.mac);
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
  async modifyTerminal(@Body() data: modifiTerminalName) {
    return {
      code: 200,
      data: await modifyTerminal(data.token.user, data.mac, data.name),
    };
  }

  /**
   * 添加绑定设备
   * @param user
   * @param mac
   */
  @Post('/addUserTerminal')
  @Validate()
  async addUserTerminal(@Body() data: mac) {
    if (data.token.userGroup === 'test') {
      return {
        code: 0,
        msg: '测试账户无法绑定新设备',
      };
    }
    const d = await addUserTerminal(data.token.user, data.mac);
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
  async delUserTerminal(@Body() data: mac) {
    return {
      code: 200,
      data: await delUserTerminal(data.token.user, data.mac),
    };
  }

  /**
   * 获取设备类型
   * @param Type
   * @returns
   */
  @Post('/getDevTypes')
  async getDevTypes(@Body('Type') Type: string) {
    return {
      code: 200,
      data: await getDevTypes(Type),
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
  async delTerminalMountDev(@Body() data: macPid) {
    const d = await delTerminalMountDev(data.token.user, data.mac, data.pid);
    if (d) (await SocketUart()).delTerminalMountDevCache(data.mac, data.pid);
    return {
      code: d ? 200 : 0,
      data: d,
      msg: d ? 'success' : 'mac is binding',
    };
  }

  /**
   * 添加用户终端挂载设备
   * @param mac
   * @param param2
   * @returns
   */
  @Post('/addTerminalMountDev')
  @Validate()
  @Sms()
  async addTerminalMountDev(@Body() data: addMountDev) {
    const d = await addTerminalMountDev(
      data.token.user,
      data.mac,
      data.mountDev
    );
    if (d) (await SocketUart()).setTerminalMountDevCache(data.mac);
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
  async smsValidation(@Body() data: Api) {
    const sr = await sendValidation(data.token.user);
    if (sr.code) {
      await RedisService.setUserSmsCode(data.token.user, sr.data);
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
  async smsCodeValidation(@Body() data: smsCode) {
    const code = await RedisService.getUserSmsCode(data.token.user);
    if (code === data.code) {
      await RedisService.getClient().setex(
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
  async getUserAlarmSetup(@Body() data: Api) {
    return {
      code: 200,
      data: await getUserAlarmSetup(data.token.user, {
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
  async modifyUserAlarmSetupTel(@Body() data: alarmTels) {
    return {
      code: 200,
      data: await modifyUserAlarmSetupTel(
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
    @Body('token') token: { user: string },
    @Body('data') data: Partial<Uart.UserInfo>
  ) {
    if (data.tel && RegexTel(data.tel)) {
      const u = await getUser(data.tel as any);
      if (u && u.user !== token.user) {
        return {
          code: 0,
          msg: '手机号已被使用,请输入新的手机号',
        };
      }
    }
    return {
      code: 200,
      data: await modifyUserInfo(token.user, lodash.omit(data, 'user')),
    };
  }

  /**
   * 获取公众号二维码
   * @param user
   * @returns
   */
  @Post('/mpTicket')
  @Validate()
  async mpTicket(@Body() data: Api) {
    const d = await mpTicket(data.token.user);
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
  async wpTicket(@Body() data: Api) {
    const d = await wpTicket(data.token.user);
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
  async getUserAlarmProtocol(@Body() data: protocol) {
    return {
      code: 200,
      data: await getUserAlarmProtocol(data.token.user, data.protocol),
    };
  }

  /**
   * 获取单个协议告警配置
   * @param protocol
   */
  @Post('/getAlarmProtocol')
  @Validate()
  async getAlarmProtocol(@Body() data: protocol) {
    return {
      code: 200,
      data: await getAlarmProtocol(data.protocol),
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
  async getTerminalData(@Body() data: macPid) {
    const d = await getTerminalData(data.token.user, data.mac, data.pid);
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
   * @deprecated 下一版本删除,请使用getTerminalDatasV2
   */
  @Post('/getTerminalDatas')
  @Validate()
  async getTerminalDatas(@Body() data: terminalResults) {
    const d = (await getTerminalDatas(
      data.token.user,
      data.mac,
      data.pid,
      data.name,
      data.getStart(),
      data.getEnd()
    )) as any as Partial<Uart.queryResultSave[]>;
    if (d) {
      // 如果参数是数组,刷选出请求的数组
      if (typeof data.name === 'object') {
        const nameSet = new Set(data.name);
        d.forEach(
          el =>
            (el.result = el.result
              .filter(el2 => nameSet.has(el2.name))
              .map(el3 => ({ name: el3.name, value: el3.value } as any)))
        );
      }
      // 如果参数是数组,或结果小于50条,直接返回数据
      if (d.length < 50 || typeof data.name === 'object') {
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
   * 获取用户设备运行数据
   * @param user
   * @param mac
   * @param pid
   */
  @Post('/getTerminalDatasV2')
  @Validate()
  async getTerminalDatasV2(@Body() data: terminalResultsV2) {
    const d = await getTerminalDatasV2(
      data.token.user,
      data.mac,
      data.pid,
      data.name,
      data.start,
      data.end
    );

    // 如果参数是数组,或结果小于50条,直接返回数据
    if (d.length < 50 || typeof data.name === 'object') {
      return {
        code: 200,
        data: d,
      };
    }
    // 把结果拆分为块,50等分
    const len = Number.parseInt((d.length / 50).toFixed(0));
    const resultChunk = lodash.chunk(d, len < 10 ? 10 : len);
    const arrs = resultChunk
      .map(el => [lodash.maxBy(el, 'value')!, lodash.minBy(el, 'value')!])
      .flat();
    return {
      code: 200,
      data: arrs,
    };
  }

  /**
   * 重置设备超时状态
   * @param mac
   * @param pid
   */
  @Post('/refreshDevTimeOut')
  @Validate()
  async refreshDevTimeOut(@Body() data: macPid) {
    await (
      await SocketUart()
    ).setTerminalMountDevCache(data.mac, data.interVal);
    return {
      code: 200,
      data: setStatTerminalDevs(data.mac, data.pid),
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
  async SendProcotolInstructSet(@Body() data: InstructSet) {
    const {
      token: { user },
      query,
      item,
    } = data;

    if (await isBindMac(user, query.DevMac)) {
      const protocol = await getProtocol(query.protocol);
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
          const parseValue = ParseCoefficient(item.bl, Number(item.val));
          b.writeIntBE(Number(parseValue), 0, 2);
          Query.content = item.value.replace(
            /(%i%i)/,
            b.slice(0, 2).toString('hex')
          );
        } else {
          const val = ParseCoefficient(item.bl, Number(item.val)).toString(16);
          Query.content = item.value.replace(
            /(%i)/,
            val.length < 2 ? val.padStart(2, '0') : val
          );
        }
      }
      MQ.addJob('inner_Message', {
        timeStamp: Date.now(),
        user: data.token.user,
        message: '用户操作设备',
        data: { query, item },
      });
      return {
        code: 200,
        data: await (await SocketUart()).InstructQuery(Query),
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
  async getProtocol(@Body() data: protocol) {
    return {
      code: 200,
      data: await getProtocol(data.protocol),
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
  async setUserSetupProtocols(@Body() data: setUserSetupProtocolDto) {
    const d = await setUserSetupProtocol(
      data.token.user,
      data.protocol,
      data.type,
      data.arg
    );
    RedisService.setUserSetup(data.token.user, data.protocol);
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
  async setAlias(@Body() { mac, pid, protocol, name, alias }: setAlias) {
    return {
      code: 200,
      data: await setAlia(mac, pid, protocol, name, alias),
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
  async getTerminalSingle(@Body() datas: mac) {
    const data = await getTerminal(datas.mac);

    return {
      code: 200,
      data,
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
      data: await getNodes(),
    };
  }

  /**
   *  获取用户布局配置
   * @param user
   * @param id
   */
  @Post('/getUserLayout')
  @Validate()
  async getUserLayout(@Body() data: id) {
    const layout = await getUserLayout(data.token.user, data.id);
    for (const i of layout.Layout) {
      (i as any).result = await getTerminalDataName(
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
  async getAggregation(@Body() data: id) {
    return {
      code: 200,
      data: await getAggregation(data.token.user, data.id),
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
  async setUserLayout(@Body() data: setAggs) {
    return {
      code: 200,
      data: await setUserLayout(
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
  async addAggregation(@Body() data: addAgg) {
    return addAggregation(data.token.user, data.name, data.aggs);
  }

  /**
   * 删除聚合设备
   * @param user
   * @param id
   * @returns
   */
  @Post('/deleteAggregation')
  @Sms()
  async deleteAggregation(@Body() data: id) {
    return {
      code: 200,
      data: await deleteAggregation(data.token.user, data.id),
    };
  }

  /**
   * 重置密码到发送验证码
   * @param user
   * @returns
   */
  @Post('/guest/resetPasswdValidation')
  async resetPasswdValidation(@Body('user') user: string) {
    const u = await getUser(user);
    if (u) {
      const { code, data, msg } = await sendValidation(u.user);
      if (code === 200) {
        await RedisService.setUserSmsCode(user, data);
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
    @Body('user') user: string,
    @Body('passwd') passwd: string,
    @Body('code') code: string
  ) {
    const lcode = await RedisService.getUserSmsCode(user);
    if (lcode) {
      if (lcode === code) {
        return {
          code: 200,
          data: await resetUserPasswd(user, passwd),
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
  async updateAvanter(@Body() data: updateAvanter) {
    return {
      code: 200,
      data: await modifyUserInfo(data.token.user, {
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
  async unbindwx(@Body() data: Api) {
    const user = await getUser(data.token.user);
    if (user.rgtype === 'wx') {
      await deleteUser(user.user);
    } else {
      await modifyUserInfo(user.user, {
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
  async getAlarmunconfirmed(@Body() data: Api) {
    return {
      code: 200,
      data: await getAlarmunconfirmed(data.token.user),
    };
  }

  /**
   * 获取gps定位的详细地址
   * @param location
   * @returns
   */
  @Post('/getGPSaddress')
  async getGPSaddress(@Body('location') location: string) {
    const r = await TencetMapGeocoder(location);
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
  async updateGps(@Body() data: updateJw) {
    return {
      code: 200,
      data: await modifyTerminalJw(data.token.user, data.mac, data.jw),
    };
  }

  /**
   * 获取指定注册设备
   * @param id
   * @returns
   */
  @Post('/getRegisterDev')
  async getRegisterDev(@Body('id') id: string) {
    return {
      code: 200,
      data: await getRegisterDev(id),
    };
  }

  /**
   * 转换字符串到二维码
   * @param code
   * @returns
   */
  @Post('/qr')
  async qr(@Body('code') code: string) {
    return {
      code: 200,
      data: await toDataURL(code),
    };
  }

  /**
   * 获取设备对应协议
   * @param data
   */
  @Post('/getTerminalPidProtocol')
  async getTerminalPidProtocol(@Body() data: macPid) {
    const t = await getTerminal(data.mac, { mountDevs: 1 });
    const m = t.mountDevs?.find(el => el.pid === data.pid);
    return {
      code: 200,
      data: m,
    };
  }

  /**
   * 获取协议配置
   */
  @Post('/getProtocolSetup')
  async getProtocolSetup(
    @Body('protocol') protocol: string,
    @Body('type') type: Uart.ConstantThresholdType,
    @Body('user') user?: string
  ) {
    const sys = await getAlarmProtocol(protocol, { [type]: 1 });
    const u = user ? await getUserAlarmProtocol(user, protocol) : undefined;

    return {
      code: 200,
      data: {
        sys: sys[type],
        user: u ? u[type] : [],
      },
    };
  }
}
