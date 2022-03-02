import { Provide, Inject, TaskLocal } from '@midwayjs/decorator';
import { Device } from '../service/deviceBase';
import { DyIot } from '../util/dyiot';
import { SocketUart } from '../service/socketUart';
import { Alarm } from '../service/alarm';
import { NewDyIot } from '../util/newDyIot';

/**
 * 每天更新iccid数据
 */
@Provide()
export class UpdateIccid {
  @Inject()
  DyIot: DyIot;

  @Inject()
  newDyIot: NewDyIot

  @Inject()
  Device: Device;

  @Inject()
  SocketUart: SocketUart;

  @Inject()
  Alarm: Alarm;

  @TaskLocal('0 7 * * * ')
  async up() {
    const now = Date.now();
    const terminals = await this.Device.getTerminals();
    const terminalsFilter = terminals.filter(
      el => el.ICCID && el.ICCID.length === 20
    );

    for (const ter of terminalsFilter) {
      const Iccid = ter.ICCID

      try {
        const { Success, Data } = await this.newDyIot.GetCardDetail(Iccid)
        if (Success) {
          const CardInfo = Data.VsimCardInfo
          const iccidInfo: Uart.iccidInfo = {
            statu: true,
            expireDate: CardInfo.ExpireTime,
            resName: '',
            resourceType: '',
            validDate: '',
            voiceTotal: 0,
            voiceUsed: 0,
            smsUsed: 0,
            flowResource: Number(CardInfo.PeriodAddFlow.split("MB")[0]) * 1024,
            restOfFlow: Number(CardInfo.PeriodRestFlow.split("MB")[0]) * 1024,
            flowUsed: 0
          }
          await this.Device.setTerminal(ter.DevMac, {
            iccidInfo: iccidInfo as any,
          });

        } else {
          const info = await this.DyIot.QueryCardFlowInfo(ter.ICCID);
          if (info.code === 'OK') {
            const data = info.cardFlowInfos.cardFlowInfo[0];
            const iccidInfo: Partial<Uart.iccidInfo> = data
              ? { statu: true, ...data }
              : { statu: false };
            await this.Device.setTerminal(ter.DevMac, {
              iccidInfo: iccidInfo as any,
            });

            if (data) {
              // 失效日期
              const expireDate = new Date(data.expireDate).getTime();
              // 距离失效日期还有几天
              const hasExpireDate = Math.floor((expireDate - now) / 864e5);
              // 以使用的流量计算每天用量
              const dayUse = data.flowUsed / (31 - hasExpireDate);
              // 剩余每天可使用的量
              const afterUse = data.restOfFlow / hasExpireDate;

              // 如果剩余量不足,修改查询间隔,避免超出使用流量,此流程不准确,获取的使用量会懈后
              if (afterUse < dayUse) {
                const interVal =
                  (await this.Device.getMountDevInterval(ter.DevMac)) *
                  Math.ceil(afterUse / dayUse);
                this.SocketUart.setTerminalMountDevCache(ter.DevMac, interVal);
              }
              /**
               * 如果卡会在三天内失效
               * 检查卡是否还有多的套餐
               */

              if (expireDate - now < 864e5 * 3) {
                const dtl = await this.DyIot.QueryIotCardOfferDtl(ter.ICCID);
                if (dtl.code !== 'OK' || dtl.cardOfferDetail.detail.length < 2) {
                  this.Alarm.IccidExpire('root', ter.DevMac, ter.ICCID, expireDate);
                }
              }
            }
          }
        }
      } catch (error) {
        console.log({
          Iccid,
          error
        });
      }


    }
    console.log('更新ICCIDs success', terminalsFilter.length);

    return {
      time: Date.now() - now,
      length: terminalsFilter.length,
    };
  }
}
