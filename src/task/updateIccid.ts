import { Provide, TaskLocal } from '@midwayjs/decorator';
// import * as moment from 'moment';
// import {
//   getTerminals,
//   updateIccidInfo,
// } from '../service/deviceService';

/**
 * 每天更新iccid数据
 */

@Provide()
export class UpdateIccid {
  @TaskLocal('0 22 * * * ') // 每隔1分钟执行一次：0 /1 * * *
  async up() {
    // const now = Date.now();
    // const terminals = await getTerminals();
    // // 刷选出有效的物联卡
    // const terminalsFilter = terminals.filter(
    //   el =>
    //     el.ICCID &&
    //     el.ICCID.length === 20
    // );

    // for (const ter of terminalsFilter) {
    //   await updateIccidInfo(ter.DevMac)
    // }
    // console.log(
    //   moment().format('YYYY-MM-DD H:M:s'),
    //   '::更新ICCIDs success,更新数量:',
    //   terminalsFilter.length
    // );

    // return {
    //   time: Date.now() - now,
    //   length: terminalsFilter.length,
    // };
  }

  }