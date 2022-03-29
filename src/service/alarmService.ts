import { alarm } from '../interface';
import { parseTime } from '../util/util';
import { getTerminal } from './deviceService';
import { getUser } from './userSevice';
import { TencetMapGeocoder, TencetMapIp } from './tencetMapService';
import { getMactoUser } from '../util/base';
import { MQ } from './bullService';
import { SmsParams } from './smsService';

const enum Config {
  /**
   * 公众号通用告警模板
   */
  TemplateIdUniversal = 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
  /**
   * 透传小程序ID
   */
  wpId = 'wx38800d0139103920',
}

/**
 * 超时/恢复告警提醒
 * @param mac 设备号
 * @param pid 设备pid
 * @param devName 设备名称
 * @param event 事件名称
 * @param time 时间
 * @returns
 */
export async function timeOutAlarm(
  mac: string,
  pid: number,
  devName: string,
  event: '超时' | '恢复',
  time: number | Date
) {
  const user = await getMactoUser(mac);
  if (user) {
    const ter = await getTerminal(mac);
    if (user.wxid) {
      const postData: Uart.WX.wxsubscribeMessage = {
        touser: user.wxid,
        template_id: Config.TemplateIdUniversal,
        miniprogram: {
          appid: Config.wpId,
          pagepath: '/pages/index/alarm/alarm',
        },
        data: {
          first: {
            value: `设备[${ter.name}/${devName}]连接${event}${
              event === '超时' ? `,请检查设备 ${devName} 连接状态` : ''
            }`,
            color: '#173177',
          },
          device: {
            value: `${ter.name}/${devName}`,
            color: '#173177',
          },
          time: {
            value: parseTime(time),
            color: '#173177',
          },
          remark: {
            value: event,
            color: '#173177',
          },
        },
      };
      MQ.addJob('wx', postData);
    } else if (user.tels && user.tels.length > 0) {
      const Template = {
        pid,
        devName,
        event,
        name: user.name,
        DTU: ter.name,
      };
      const TemplateParam = JSON.stringify({ ...Template, time: parseTime() });
      const params: SmsParams = {
        RegionId: 'cn-hangzhou',
        PhoneNumbers: user.tels.join(','),
        SignName: '雷迪司科技湖北有限公司',
        TemplateCode: 'SMS_200701321',
        TemplateParam,
      };
      MQ.addJob('sms', params);
    } else if (user.mails && user.mails.length > 0) {
      const body = `<p><strong>尊敬的${user.name}</strong></p>
                <hr />
                <p><strong>您的DTU <em>${ter.name}</em> ${
        pid ? '挂载的 ' + devName : ''
      } 告警</strong></p>
                <p><strong>告警时间:&nbsp; </strong>${parseTime()}</p>
                <p><strong>告警事件:</strong>&nbsp; ${event}</p>
                <p>您可登录 <a title="透传服务平台" href="https://uart.ladishb.com" target="_blank" rel="noopener">LADS透传服务平台</a> 查看处理(右键选择在新标签页中打开)</p>
                <hr />
                <p>&nbsp;</p>
                <p>扫码使用微信小程序查看</p>
                <p><img src="https://www.ladishb.com/upload/3312021__LADS_Uart.5df2cc6.png" alt="weapp" width="430" height="430" /></p>
                <p>&nbsp;</p>`;

      MQ.addJob('mail', {
        mail: user.mails.join(','),
        title: 'Ladis透传平台',
        subject: '设备告警',
        body,
      });
    }
  }
}

/**
 * 设备上线离线提醒
 * @param mac 设备mac
 * @param event 事件
 * @param time 时间
 * @returns
 */
export async function offline(
  mac: string,
  event: '恢复上线' | '离线',
  time: number | Date
) {
  const user = await getMactoUser(mac);
  if (user) {
    const ter = await getTerminal(mac);
    if (user.wxid) {
      const postData: Uart.WX.wxsubscribeMessage = {
        touser: user.wxid,
        template_id: Config.TemplateIdUniversal,
        miniprogram: {
          appid: Config.wpId,
          pagepath: '/pages/index/alarm/alarm',
        },
        data: {
          first: {
            value: `设备[${ter.name}]${event}${
              event === '离线' ? ',请检查设备或网络状态' : ''
            }`,
            color: '#173177',
          },
          device: {
            value: `${ter.name}`,
            color: '#173177',
          },
          time: {
            value: parseTime(time),
            color: '#173177',
          },
          remark: {
            value: event,
            color: '#173177',
          },
        },
      };
      // eslint-disable-next-line quotes
      MQ.addJob('wx', postData);
    } else if (user.tels?.length > 0) {
      const data: SmsParams = {
        RegionId: 'cn-hangzhou',
        PhoneNumbers: user.tels.join(','),
        SignName: '雷迪司科技湖北有限公司',
        TemplateCode: 'SMS_200691431',
        TemplateParam: JSON.stringify({
          name: user.name,
          DTU: ter.name,
          time: parseTime(time),
          remind: event,
        }),
      };
      MQ.addJob('sms', data);
    } else if (user.mails?.length > 0) {
      const body = `<p><strong>尊敬的${user.name}</strong></p>
                <hr />
                <p><strong>您的DTU <em>${ter.name}</em> ${event}</strong></p>
                <p><strong>时间:&nbsp; </strong>${parseTime()}</p>
                <p><strong>事件:</strong>&nbsp; ${event}</p>
                <p>您可登录 <a title="透传服务平台" href="https://uart.ladishb.com" target="_blank" rel="noopener">LADS透传服务平台</a> 查看处理(右键选择在新标签页中打开)</p>
                <hr />
                <p>&nbsp;</p>
                <p>扫码使用微信小程序查看</p>
                <p><img src="https://www.ladishb.com/upload/3312021__LADS_Uart.5df2cc6.png" alt="weapp" width="430" height="430" /></p>
                <p>&nbsp;</p>`;
      MQ.addJob('mail', {
        mail: user.mails.join(','),
        title: 'Ladis透传平台',
        subject: '设备告警',
        body,
      });
    }
  }
}

/**
 * 发送参数告警
 * @param mac
 * @param pid
 * @param time
 */
export async function argumentAlarm(mac: string, pid: number, alarm: alarm[]) {
  const user = await getMactoUser(mac);
  if (user) {
    const ter = await getTerminal(mac);
    const dev = ter.mountDevs.find(el => el.pid === pid);

    if (user.wxid) {
      const param: Uart.WX.wxsubscribeMessage = {
        touser: user.wxid,
        template_id: Config.TemplateIdUniversal,
        miniprogram: {
          appid: Config.wpId,
          pagepath: '/pages/index/alarm/alarm',
        },
        data: {
          first: {
            value: `[ ${ter.name}-${dev.mountDev} ] 运行异常`,
            color: '#F56C6C',
          },
          device: {
            value: `${ter.name}-${dev.mountDev}`,
            color: '#173177',
          },
          time: {
            value: parseTime(alarm[0].timeStamp),
            color: '#173177',
          },
          remark: {
            value: alarm
              .map(el => {
                const str =
                  el.tag === 'ups'
                    ? ''
                    : el.tag === 'Threshold'
                    ? [
                        (el.contant as Uart.Threshold).min,
                        (el.contant as Uart.Threshold).max,
                      ].join('~')
                    : '';
                return `${el.argument} ${el.data.parseValue} ${
                  str && str.trim().length > 0 ? `,参考值: [ ${str} ]` : ''
                }`;
              })
              .join('\n'),
            color: '#F56C6C',
          },
        },
      };
      MQ.addJob('wx', param);
    }
    if (user.tels) {
      const remind =
        alarm.length === 1
          ? `${alarm[0].argument}[${alarm[0].data.parseValue}]`
          : `${alarm
              .map(el => el.argument)
              .slice(0, 2)
              .join(',')}等告警`;
      const TemplateParam = JSON.stringify({
        name: user.name,
        DTU: ter.name,
        pid: pid,
        devname: dev.mountDev,
        time: parseTime(alarm[0].timeStamp),
        remind,
      });
      const param: SmsParams = {
        RegionId: 'cn-hangzhou',
        PhoneNumbers: user.tels.join(','),
        SignName: '雷迪司科技湖北有限公司',
        TemplateCode: 'SMS_200701342',
        TemplateParam,
      };
      MQ.addJob('sms', param);
    }
    if (user.mails) {
      const body = `<p><strong>尊敬的${user.name}</strong></p>
                <hr />
                <p><strong>您的DTU <em>${ter.name}</em> 挂载的 ${
        dev.mountDev
      } 告警</strong></p>
                <p><strong>告警时间:&nbsp; </strong>${parseTime(
                  alarm[0].timeStamp
                )}</p>
                ${alarm.map(el => {
                  const str =
                    el.tag === 'ups'
                      ? ''
                      : el.tag === 'AlarmStat'
                      ? (el.contant as Uart.ConstantAlarmStat).alarmStat
                      : [
                          (el.contant as Uart.Threshold).min,
                          (el.contant as Uart.Threshold).max,
                        ].join('~');
                  return `<p><strong>告警事件:</strong>&nbsp; ${el.argument}</p>
                    <p><strong>实际值: </strong>&nbsp;${el.data.parseValue}</p>
                    <p><strong>参考值: </strong>&nbsp;${str}</p>`;
                })}
                <p>您可登录 <a title="透传服务平台" href="https://uart.ladishb.com" target="_blank" rel="noopener">LADS透传服务平台</a> 查看处理(右键选择在新标签页中打开)</p>
                <hr />
                <p>&nbsp;</p>
                <p>扫码或点击程序码使用微信小程序查看</p>
                <a href="weixin://dl/business/?t=203U27hghyu" target="_blank"><img src="https://www.ladishb.com/upload/3312021__LADS_Uart.5df2cc6.png" alt="weapp" width="430" height="430" /></a>
                <p>&nbsp;</p>`;

      MQ.addJob('mail', {
        mail: user.mails.join(','),
        title: 'Ladis透传平台',
        subject: '设备告警',
        body,
      });
    }
  }
}

/**
 * 发送参数告警恢复
 * @param mac
 * @param pid
 */
export async function argumentAlarmReload(mac: string, pid: number) {
  const user = await getMactoUser(mac);
  if (user) {
    const ter = await getTerminal(mac);
    const dev = ter.mountDevs.find(el => el.pid === pid);

    if (user.wxid) {
      const postData: Uart.WX.wxsubscribeMessage = {
        touser: user.wxid,
        template_id: Config.TemplateIdUniversal,
        miniprogram: {
          appid: Config.wpId,
          pagepath: '/pages/index/alarm/alarm',
        },
        data: {
          first: {
            value: `[ ${ter.name}-${dev.mountDev} ] 运行恢复`,
            color: '#67C23A',
          },
          device: {
            value: `${ter.name}-${dev.mountDev}`,
            color: '#67C23A',
          },
          time: {
            value: parseTime(),
            color: '#67C23A',
          },
          remark: {
            value: `设备 ${dev.mountDev} 异常告警已全部消除`,
            color: '#67C23A',
          },
        },
      };

      MQ.addJob('wx', postData);
    }

    if (user.tels) {
      const TemplateParam = JSON.stringify({
        name: user.name,
        DTU: ter.name,
        pid: pid,
        devname: dev.mountDev,
        time: parseTime(),
        remind: `设备 ${dev.mountDev} 异常告警已全部消除`,
      });
      const param: SmsParams = {
        RegionId: 'cn-hangzhou',
        PhoneNumbers: user.tels.join(','),
        SignName: '雷迪司科技湖北有限公司',
        TemplateCode: 'SMS_200701342',
        TemplateParam,
      };
      MQ.addJob('sms', param);
    }
    if (user.mails) {
      const body = `<p><strong>尊敬的${user.name}</strong></p>
                <hr />
                <p><strong>您的DTU <em>${ter.name}</em> 挂载的 ${
        dev.mountDev
      } 异常告警已全部消除</strong></p>
                <p><strong>恢复时间:&nbsp; </strong>${parseTime()}</p>
                <p>您可登录 <a title="透传服务平台" href="https://uart.ladishb.com" target="_blank" rel="noopener">LADS透传服务平台</a> 查看处理(右键选择在新标签页中打开)</p>
                <hr />
                <p>&nbsp;</p>
                <p>扫码或点击程序码使用微信小程序查看</p>
                <a href="weixin://dl/business/?t=203U27hghyu" target="_blank"><img src="https://www.ladishb.com/upload/3312021__LADS_Uart.5df2cc6.png" alt="weapp" width="430" height="430" /></a>
                <p>&nbsp;</p>`;

      MQ.addJob('mail', {
        mail: user.mails.join(','),
        title: 'Ladis透传平台',
        subject: '设备告警恢复',
        body,
      });
    }
  }
}

/**
 * 设备上下线提醒
 * @param mac
 * @param type
 */
export async function macOnOff_line(mac: string, type: '上线' | '离线') {
  const user = await getMactoUser(mac);
  if (user && user.wxid) {
    const ter = await getTerminal(mac);
    const address = ter.jw
      ? (await TencetMapGeocoder(ter.jw.split(',').reverse().join(','))).result
          .address
      : await TencetMapIp(ter.ip)
          .then(el => el.result.ad_info.city)
          .catch(() => '未获取到地址');

    const postData: Uart.WX.wxsubscribeMessage = {
      touser: user.wxid,
      template_id: Config.TemplateIdUniversal,
      miniprogram: {
        appid: Config.wpId,
        pagepath: '/pages/index/alarm/alarm',
      },
      data: {
        first: {
          value: `[ ${ter.name} ] 已${type}`,
          color: '#303133',
        },
        device: {
          value: `${ter.name}`,
          color: '#303133',
        },
        time: {
          value: parseTime(),
          color: '#303133',
        },
        remark: {
          value: `${type}地址:${address}(依赖ip定位,不保证精确,仅供参考)`,
          color: '#303133',
        },
      },
    };

    MQ.addJob('wx', postData);
  }
}

/**
 * 物联卡即将失效提醒
 * @param u
 * @param mac
 * @param iccid
 * @param expire 失效时间
 */
export async function IccidExpire(
  u: string,
  mac: string,
  iccid: string,
  expire: string | number
) {
  const user = await getUser(u);
  const ter = await getTerminal(mac);
  if (user && user.wxId) {
    const postData: Uart.WX.wxsubscribeMessage = {
      touser: user.wxId,
      template_id: Config.TemplateIdUniversal,
      data: {
        first: {
          value: `[ ${iccid} ] 即将失效`,
          color: '#303133',
        },
        device: {
          value: `${ter.name}`,
          color: '#303133',
        },
        time: {
          value: parseTime(expire),
          color: '#303133',
        },
        remark: {
          value: `${iccid}即将失效,请尽快处理`,
          color: '#303133',
        },
      },
    };
    MQ.addJob('wx', postData);
  }
  if (user && user.mail) {
    const body = `<p><strong>尊敬的${u}</strong></p>
            <hr />
            <p><strong>您的4G DTU <em>${
              ter.name
            }</em> 使用的物联卡 ${iccid} 即将失效</strong></p>
            <p><strong>告警时间:&nbsp; </strong>${parseTime(expire)}</p>
           `;
    MQ.addJob('mail', {
      mail: user.mail,
      title: 'Ladis透传平台',
      subject: 'ICCID即将失效',
      body,
    });
  }
}
