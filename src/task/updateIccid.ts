import { Provide, TaskLocal } from '@midwayjs/decorator';
import { SocketUart } from '../service/socketService';
import { isEmpty } from 'lodash';
import * as moment from 'moment';
import {
  getTerminals,
  setTerminal,
  getMountDevInterval,
} from '../service/deviceService';
import { IccidExpire } from '../service/alarmService';
import { GetCardDetailV2 } from '../service/newDyIotService';
import {
  QueryCardFlowInfo,
  QueryIotCardOfferDtl,
} from '../service/dyiotService';

/**
 * 每天更新iccid数据
 */
@Provide()
export class UpdateIccid {
  /**
   * 每小时更新一次
   * @returns
   */
  @TaskLocal('0 * * * * ')
  async up() {
    const now = Date.now();
    const terminals = await getTerminals();
    // 刷选出有效的物联卡
    const terminalsFilter = terminals.filter(
      el =>
        el.ICCID &&
        el.ICCID.length === 20 &&
        el.name !== 'isv.IOT_RES_NOT_EXIST'
    );

    for (const ter of terminalsFilter) {
      const Iccid = ter.ICCID;

      const Info = { statu: false, version: 'ali_1' } as Uart.iccidInfo;

      try {
        const { Success, Data } = await GetCardDetailV2(Iccid);

        if (Success) {
          const CardInfo = Data.VsimCardInfo;
          const flowUsed = CardInfo.PeriodAddFlow.includes('KB')
            ? Number(CardInfo.PeriodAddFlow.split('KB')[0])
            : Number(CardInfo.PeriodAddFlow.split('MB')[0]) * 1024;

          const restOfFlow =
            Number(CardInfo.PeriodRestFlow.split('MB')[0]) * 1024;

          const iccidInfo: Uart.iccidInfo = {
            statu: true,
            expireDate: CardInfo.ExpireTime,
            resName: CardInfo.CredentialNo,
            resourceType: '',
            validDate: '',
            voiceTotal: 0,
            voiceUsed: 0,
            smsUsed: 0,
            flowResource: restOfFlow + flowUsed,
            restOfFlow,
            flowUsed,
            version: CardInfo.AliFee,
          };
          Object.assign(Info, iccidInfo);
        }
        // 如果是老版本物联卡接口会报错
      } catch (error) {
        const info = await QueryCardFlowInfo(Iccid);
        if (info.code === 'OK' && !isEmpty(info.cardFlowInfos?.cardFlowInfo)) {
          const data = info.cardFlowInfos
            .cardFlowInfo[0] as any as Uart.iccidInfo;
          Object.assign(Info, data, { statu: true });
        } else {
          // 保存数据
          await setTerminal(ter.DevMac, {
            remark: info.message,
            name: info.code,
          });
        }
      }
      // 保存数据
      await setTerminal(ter.DevMac, {
        iccidInfo: Info,
      });

      // 操作有效卡,且为老款物联卡
      if (Info.statu && Info.version === 'ali_1') {
        const data = Info;

        // 失效日期
        // const expireDate = new Date(data.expireDate).getTime();
        // 距离失效日期还有几天
        const hasExpireDate = moment(data.expireDate).diff(now, 'day');
        // 以使用的流量计算每天用量
        // const dayUse = data.flowUsed / (31 - hasExpireDate);
        // 剩余每天可使用的量
        const afterUse = data.restOfFlow / hasExpireDate;

        // 如果剩余量不足,修改查询间隔,避免超出使用流量,此流程不准确,获取的使用量会懈后
        // 小于10MB
        if (afterUse < 10240) {
          // 当前计算间隔
          const interVal = await getMountDevInterval(ter.DevMac);

          // Math.ceil(afterUse / dayUse);
          SocketUart.setTerminalMountDevCache(
            ter.DevMac,
            interVal * (Math.ceil(10240 / afterUse) + 1)
          );
        }
        /**
         * 如果卡会在5天内失效
         * 检查卡是否还有多的套餐
         */

        if (hasExpireDate <= 5) {
          if (data.version === 'ali_1') {
            const dtl = await QueryIotCardOfferDtl(ter.ICCID);
            if (dtl.code !== 'OK' || dtl.cardOfferDetail.detail.length < 2) {
              IccidExpire('root', ter.DevMac, ter.ICCID, data.expireDate);
            }
          } else {
            IccidExpire('root', ter.DevMac, ter.ICCID, data.expireDate);
          }
        }
      }
    }
    console.log(
      moment().format('YYYY-MM-DD H:M:s'),
      '::更新ICCIDs success,更新数量:',
      terminalsFilter.length
    );

    return {
      time: Date.now() - now,
      length: terminalsFilter.length,
    };
  }
}
