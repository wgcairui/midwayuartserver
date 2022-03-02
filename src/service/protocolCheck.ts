/* eslint-disable @typescript-eslint/no-unused-vars */
import { Provide, Inject, Scope, ScopeEnum } from '@midwayjs/decorator';
import { RedisService } from '../service/redis';
import { Device } from './deviceBase';
import { UserService } from '../service/user';
import { SocketUart } from '../service/socketUart';
import { alarm } from '../interface';
// 优化方向-> 把每个用户的每条协议参数检查都缓存起来，管理员或用户更新设置的时候更新指定的缓存

@Provide()
@Scope(ScopeEnum.Singleton)
export class ProtocolCheck {
  @Inject()
  RedisService: RedisService;

  @Inject()
  Device: Device;

  @Inject()
  UserService: UserService;

  @Inject()
  SocketUart: SocketUart;

  /**
   *  获取设备的别名
   * @param mac 设备mac
   * @param pid 设备pid
   * @param protocol 设备协议
   * @param name 设备名称
   * @returns 别名
   */
  /* private getProtocolAlias(mac: string, pid: string | number, protocol: string, name: string) {
        const alias = this.ctx.Cache.CacheAlias.get(mac + pid + protocol)
        return alias?.get(name) || name
    } */

  /**
   * 检查参数
   * @param query 设备参数集
   */
  public async check(
    user: string,
    query: Uart.queryResult,
    result: Uart.queryResultArgument[]
  ) {
    const AlarmEvents: alarm[] = [];
    const setup = await this.RedisService.getUserSetup(user, query.protocol);
    if (setup.Threshold.size > 0) {
      this.checkThreshold(result, setup.Threshold).forEach(el => {
        el.alarm = true;
        AlarmEvents.push({
          argument: el.name,
          tag: 'Threshold',
          timeStamp: Date.now(),
          data: el,
          contant: setup.Threshold.get(el.name),
        });
      });
    }

    if (setup.AlarmStat.size > 0) {
      this.checkAlarm(result, setup.AlarmStat).forEach(el => {
        const value = this.RedisService.parseUnit(el.unit!, el.value);
        if (value) {
          el.alarm = true;
          AlarmEvents.push({
            argument: el.name,
            tag: 'AlarmStat',
            timeStamp: Date.now(),
            data: el,
            contant: setup.AlarmStat.get(el.name),
          });
        }
      });
    }
    const cu = await this.checkUPS(query);
    if (cu) AlarmEvents.push(cu);
    return { alarm: AlarmEvents, result };
  }

  /**
   * 检查参数阈值
   * @param result 设备参数集
   * @param setup 用户告警设置
   * @returns 超出阈值的参数结果数组
   */
  private checkThreshold(
    result: Uart.queryResultArgument[],
    setup: Map<string, Uart.Threshold>
  ) {
    return result.filter(el => {
      const ther = setup.get(el.name);
      if (ther) {
        const argumentVal = parseInt(el.value);
        return argumentVal > ther.max || argumentVal < ther.min;
      } else return false;
    });
  }

  /**
   * 遍历结果集，比较告警设置是否包含参数值，返回符合条件的参数
   * @param result 设备参数集
   * @param setup 用户告警设置
   *  @returns 超出阈值的参数结果数组
   */
  private checkAlarm(
    result: Uart.queryResultArgument[],
    setup: Map<string, Uart.ConstantAlarmStat>
  ) {
    return result.filter(el => {
      const alarm = setup.get(el.name);
      return alarm && !alarm.alarmStat.includes(el.value);
    });
  }

  /**
   * 检查UPS
   * @param Query
   */
  private async checkUPS(Query: Uart.queryResult): Promise<alarm | void> {
    // 4、判断UPS是否有故障信息：每1秒钟查询一下指令QGS，检测返回的信息(MMM.M HH.H LLL.L NN.N QQQ.Q DDD KKK.K VVV.V SSS.S XXX.X TTT.T b9b8b7b6b5b4b3b2b1b0<cr>,
    if (Query.type === 232 && Query.content.includes('QGS')) {
      const index = Query.contents.findIndex(el => el.content === 'QGS');
      const Res = Buffer.from(Query.contents[index].buffer.data)
        .toString('utf8')
        .split(' ')[11];
      if (Res) {
        const [_b9, _b8, _b7, _b6, _b5, b4, _b3, _b2, _b1, _b0, _a9, _a8] =
          Res.split('').map(el => Number(el));
        // 在 b4位置的数据位为1还是0，为1时表示UPS有故障了，则使用“QFS”故障查询指令，查询UPS故障信息。返回的信息数据
        if (b4) {
          // console.log({ b9, b8, b7, b6, b5, b4, b3, b2, b1, b0, a9, a8 });
          const { ok, upserted } = await this.SocketUart.InstructQuery({
            DevMac: Query.mac,
            protocol: Query.protocol,
            pid: Query.pid,
            type: Query.type,
            content: 'QFS',
            events: Date.now() + 'QFS',
          });
          if (ok) {
            const [kk, _pp, _ff, _oo, _ee, _ll, _cc, _hh, _nn, _bb, _tt, _ss] =
              Buffer.from(upserted).toString('utf8', 1).split(' ');
            if (kk !== 'OK') {
              const hashtable = {
                0x01: '规定时间内，bus电压未达到设定值',
                0x02: 'Bus电压超过上限值',
                0x03: 'Bus电压低于下限值',
                0x04: '正负Bus电压之差超出允许范围',
                0x05: 'Bus电压下降斜率过快',
                0x06: 'PFC输入电感电流过大',
                0x11: '规定时间内，inverter电压未达到设定值',
                0x12: 'Inverter电压超过上限值',
                0x13: 'Inverter电压低于下限值',
                0x14: 'L1 inverter相短路',
                0x15: 'L2 inverter相短路',
                0x16: 'L3 inverter相短路',
                0x17: 'L1L2 inverter线短路',
                0x18: 'L2L3 inverter线短路',
                0x19: 'L3L1 inverter线短路',
                0x1a: 'L1 inverter负功超出允许范围',
                0x1b: 'L2 inverter负功超出允许范围',
                0x1c: 'L3 inverter负功超出允许范围',
                0x21: 'Battery scr短路故障',
                0x22: 'Line scr短路故障',
                0x23: 'Inverter relay开路故障',
                0x24: 'Inverter relay短路故障',
                0x25: '输入输出线路接反',
                0x26: '电池反接故障',
                0x27: '电池电压过高，远超出over charge点',
                0x28: '电池电压过低，远低于shut down点',
                0x29: '电池fuse开路故障',
                0x31: 'CAN bus通信故障',
                0x32: '主机信号线路故障',
                0x33: '同步信号线路故障',
                0x34: '同步触发信号线路故障',
                0x35: '并机通信线路丢失故障',
                0x36: '输出严重不均流故障',
                0x41: 'UPS工作温度过高故障',
                0x42: '控制板中CPU间通信故障',
                0x43: '过载故障',
                0x44: '风扇模组故障',
                0x45: '充电器故障',
                0x46: '机型错误',
                0x47: '控制板与通讯板MCU通信故障',
                0x48: '控制板韧体版本不兼容',
              };
              const event = hashtable[Buffer.from(kk, 'hex').toJSON().data[0]];
              console.log(
                `### 发送其他故障消息:${Query.mac}/${Query.pid}/${Query.mountDev}, event:QFS(${event})`
              );
              return {
                argument: event || '未知错误',
                tag: 'ups',
                timeStamp: Date.now(),
                data: {
                  name: event,
                  value: '告警',
                  parseValue: '告警',
                  unit: '',
                },
              };
            }
          }
        }
      }
    }
  }
}
