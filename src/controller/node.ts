import { Controller, Post, Body, Inject } from '@midwayjs/decorator';
import { RedisService } from '../service/redisService';
import * as _ from 'lodash';
import { ProvideSocketUser } from '../service/socketUserService';
import { ProvideSocketUart } from '../service/socketService';
import { alarm } from '../interface';
import axios from 'axios';
import { getBindMacUser } from '../util/base';
import { nodeHttp } from '../middleware/nodeHttpRequest';
import {
  getTerminal,
  setTerminal,
  setNodeRun,
  getStatTerminalDevs,
  setStatTerminalDevs,
  getMountDevInterval,
  getProtocol,
  updateTerminalResultSingle,
  saveTerminalResults,
  saveTerminalResultColletion,
} from '../service/deviceService';
import { RegexIP, RegexLocation, RegexUart, RegexICCID } from '../util/util';
import {
  incUseBytes,
  saveDataTransfinite,
  saveDevUseTime,
} from '../service/logService';
import { getUser } from '../service/userSevice';
import { terminalDataParse } from '../service/parseService';
import { terminalDataCheck } from '../service/checkService';
import { argumentAlarm, argumentAlarmReload } from '../service/alarmService';
import { NodeRunInfo, Terminal } from '../entity';

@Controller('/api/node', { middleware: [nodeHttp] })
export class NodeControll {
  @Inject()
  SocketUart: ProvideSocketUart;

  @Inject()
  SocketUser: ProvideSocketUser;
  /**
   * 上传dtu信息
   * @param info
   */
  @Post('/dtuInfo')
  async dtuInfo(@Body('info') info: Terminal) {
    // 获取terminal信息
    const terminal = await getTerminal(info.DevMac);
    if (terminal) {
      const {
        DevMac,
        ip,
        port,
        AT,
        PID,
        ver,
        Gver,
        iotStat,
        jw,
        uart,
        ICCID,
        signal,
      } = info;
      // 比较参数，如果有修改则更新数据库
      {
        const temp: any[] = [];
        if (terminal.ip !== ip && RegexIP(ip)) temp.push({ ip });
        if (terminal.port !== port && Number(port) > 0) temp.push({ port });
        if (terminal.PID !== PID) temp.push({ PID });
        if (AT) {
          if (terminal.AT !== AT) temp.push({ AT });
          if (terminal.ver !== ver) temp.push({ ver });
          if (terminal.Gver !== Gver) temp.push({ Gver });
          if (terminal.iotStat !== iotStat) temp.push({ iotStat });
          if (terminal.jw !== jw && RegexLocation(jw)) temp.push({ jw });
          if (terminal.uart !== uart && RegexUart(uart)) temp.push({ uart });
          if (terminal.ICCID !== ICCID && RegexICCID(ICCID))
            temp.push({ ICCID });
          if (terminal.signal !== signal)
            temp.push({ signal: Number(signal) || 0 });
        }

        if (temp.length > 0) {
          temp.push({ uptime: Date.now() });
          setTerminal(DevMac, Object.assign({}, ...temp));
        } else {
          setTerminal(DevMac, { uptime: new Date() as any });
        }
      }
      return {
        code: 200,
        msg: 'success',
      };
    }
    return {
      code: 0,
      msg: 'no terminal',
    };
  }

  /**
   * 上传节点运行状态
   * @param node
   * @param tcp
   */
  @Post('/nodeInfo')
  async nodeInfo(
    @Body('name') name: string,
    @Body('node') node: NodeRunInfo,
    @Body('tcp') tcp: number
  ) {
    return {
      code: 200,
      data: await setNodeRun(name, {
        ...node,
        Connections: tcp,
        updateTime: new Date(),
      }),
    };
  }

  /**
   * 上传查询数据
   * @param data
   */
  @Post('/queryData')
  async queryData(@Body('data') data: Uart.queryResult) {
    saveDevUseTime({
      timeStamp: data.timeStamp,
      useTime: data.useTime,
      Interval: data.Interval,
      mac: data.mac,
      pid: data.pid,
    });
    // 同一时间只处理设备的一次结果,避免处理同一设备异步之间告警错误提醒
    if (data.mac && !(await RedisService.hasParseSet(data.mac + data.pid))) {
      // 标记数据正在处理
      RedisService.setParseSet(data.mac + data.pid);
      {
        // 如果数据设备状态不在线,设置在线
        getStatTerminalDevs(data.mac, data.pid).then(async els => {
          if (!els) {
            // 设置
            setStatTerminalDevs(data.mac, data.pid, true);
            this.SocketUser.sendMacUpdate(data.mac);
          }
        });
        // 保存每个终端使用的数字节数
        // 保存每个查询指令使用的字节，以天为单位
        incUseBytes(
          data.mac,
          new Date(data.time).toLocaleDateString(),
          data.useBytes
        );
        RedisService.addQueryTerminaluseTime(data.mac, data.pid, data.useTime);
      }

      // 处理数据
      const parse = await terminalDataParse(data);

      // 数据转发配置
      {
        getBindMacUser(data.mac).then(async user => {
          if (user) {
            const { proxy } = await getUser(user);
            if (proxy) {
              axios
                .post(proxy, {
                  mac: data.mac,
                  timestamp: data.timeStamp,
                  data: parse,
                })
                .catch(() => {
                  console.error({
                    msg: 'proxy Error',
                    mac: data.mac,
                    user,
                    proxy,
                  });
                });
            }
          }
        });
      }

      /**
       * 如果解析数据为空,表示数据乱码,把查询时间*3
       */
      if (parse.length === 0) {
        const interval = await getMountDevInterval(data.mac);
        this.SocketUart.setTerminalMountDevCache(data.mac, interval * 3);
        /* console.error({
          msg: '解析数据为空,跳过后续操作',
          data,
        }); */
        return;
      }

      // 如果设备有用户绑定则进入检查流程

      const { a, r } = await this.check(data, parse);

      // 发送数据更新消息
      this.SocketUser.sendMacDateUpdate(data.mac, data.pid);

      {
        const alarmTag = await RedisService.hasArgumentAlarmLog(
          data.mac + data.pid
        );

        if (a.length > 0) {
          // 如果没有告警标记
          if (!alarmTag) {
            // 添加告警标志
            await RedisService.addArgumentAlarmLog(data.mac + data.pid);
            // 发送告警
            argumentAlarm(data.mac, data.pid, a);
            // 迭代告警信息,加入日志
            this.saveResultHistory(data, parse, a.length, r).then(el => {
              if (el) {
                a.forEach(el2 => {
                  saveDataTransfinite({
                    parentId: el._id,
                    mac: data.mac,
                    pid: data.pid,
                    devName: data.mountDev,
                    protocol: data.protocol,
                    timeStamp: el2.timeStamp,
                    tag: el2.tag,
                    msg: `${el2.argument}[${el2.data.parseValue}]`,
                    type: 'alarm',
                  }).then(async el => {
                    this.SocketUser.sendMacAlarm(data.mac, el as any);
                  });
                });
              }
            });
          } else {
            this.saveResultHistory(data, parse, a.length, r);
          }
        }
        // 如果有告警标志,清除告警标识并发送恢复提醒
        else {
          if (alarmTag) {
            await RedisService.delArgumentAlarmLog(data.mac + data.pid);
            argumentAlarmReload(data.mac, data.pid);
          }
          this.saveResultHistory(data, parse, a.length, r);
        }
      }
      // 清除标记
      RedisService.delParseSet(data.mac + data.pid);
    } else {
      // console.log({ time: new Date().toLocaleString(), data: data.mac, stat: await RedisService.getClient().keys("parseSet*") });
    }
    return {
      code: 200,
    };
  }

  // 检查数据
  async check(data: Uart.queryResult, parse: Uart.queryResultArgument[]) {
    const a: alarm[] = [];
    const r: Uart.queryResultArgument[] = [];
    // 获取协议指令条数
    const instructLen = (await getProtocol(data.protocol)).instruct
      .map(data => data.formResize.length)
      .reduce((pre, cur) => pre + cur);

    /**
     * 检查的必要条件
     * 1,需要有用户
     * 2,没有未处理的告警记录
     * 3,解析结果数量和协议解析数量需要一致
     */
    await updateTerminalResultSingle(
      data.mac,
      data.pid,
      _.omit({ ...data, result: parse }, ['mac', 'pid'])
    );
    if (parse.length === instructLen) {
      const { alarm, result } = await terminalDataCheck(data, parse);
      // 如果有告警
      if (alarm.length > 0) {
        a.push(...alarm);
        r.push(...result);
        // 写入到单例数据库
        await updateTerminalResultSingle(data.mac, data.pid, {
          result,
        });
      }

      //判断数据间隔时间大于30秒
      if (data.Interval > 3e4) {
        this.SocketUart.setTerminalMountDevCache(data.mac);
      }
    }
    return { a, r };
  }

  /**
   * 保存历史数据
   * @param data
   * @param parse
   * @param a
   * @param r
   * @returns
   */
  async saveResultHistory(
    data: Uart.queryResult,
    parse: Uart.queryResultArgument[],
    a: number,
    r: Uart.queryResultArgument[]
  ) {
    const key = data.mac + data.pid;
    const hisData = RedisService.terminalDataMap.get(key);
    const newData = data.contents.map(el => el.buffer.data);
    //console.log({ hisData, n: JSON.stringify(newData) });
    if (hisData && hisData === JSON.stringify(newData)) {
      //console.log(`key:${key} 数据重复`);
      return undefined;
    }
    //console.log(`key:${key} new数据--------------------------------------------------`);
    RedisService.terminalDataMap.set(key, JSON.stringify(newData));

    // 异步保存设备数据
    const { _id: parentId } = await saveTerminalResults({
      contents: data.contents.map(data => ({
        content: data.content,
        data: data.buffer.data,
      })),
    } as any);
    const { _id } = await saveTerminalResultColletion({
      ...data,
      parentId,
      result: r.length > 0 ? r : parse,
      hasAlarm: a,
    } as any);
    // 单例中的parentId只具备参考意义,可能不准确
    updateTerminalResultSingle(data.mac, data.pid, { parentId });
    return { parentId, _id };
  }
}
