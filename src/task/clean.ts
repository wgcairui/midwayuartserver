import { Provide, TaskLocal } from '@midwayjs/decorator';
import { Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { chunk } from 'lodash';
import { saveClean } from '../service/logService';
import {
  DtuBusyLogEntity,
  TerminalParseDataEntity,
  TerminalPrimavelDataEntity,
  UartTerminalDataTransfiniteEntityLogEntity,
  UserRequstLogEntity,
} from '../entity';

/**
 * 每天清理历史记录中重复的数据
 */
@Provide()
export class Clean {
  @TaskLocal('0 22 * * * ')
  async clean() {
    try {
      console.log(`${new Date().toString()} ### start clean Data.....`);
      const now = Date.now();
      const count = {
        NumUserRequst: await this.CleanUserRequst(),
        useTime: 0,
        CleanClientresultsTimeOut: await this.CleanClientresultsTimeOut(),
        NumClientresults: await this.CleanClientresults(),
        timeStamp: Date.now(),
      };
      await this.CleanDtuBusy();
      count.useTime = Date.now() - now;
      console.log(`${new Date().toString()} ### end clean Data.....`, count);
      await saveClean(count);
      return count;
    } catch (error) {
      console.error('Data Clean Error', error?.message);
    }
  }

  /**
   * 清洗告警数据
   */
  async Uartterminaldatatransfinites() {
    console.log('清洗告警数据');
    console.time('Uartterminaldatatransfinites');
    const MapUartterminaldatatransfinites: Map<string, Uart.uartAlarmObject> =
      new Map();
    const Query = UartTerminalDataTransfiniteEntityLogEntity.find({ __v: 0 });
    const cur = Query.cursor();
    const len = await Query.countDocuments();
    const deleteids: Types.ObjectId[] = [];
    const allids: Types.ObjectId[] = [];
    for (let doc = await cur.next(); doc != null; doc = await cur.next()) {
      const tag = doc.mac + doc.pid + doc.tag;
      const _id = new Types.ObjectId(doc._id);
      allids.push(_id);
      const old = MapUartterminaldatatransfinites.get(tag);
      if (old && old.msg === doc.msg) {
        // 比较同一个设备连续的告警,告警相同则删除后一个记录
        deleteids.push(_id);
      } else {
        MapUartterminaldatatransfinites.set(tag, doc as any);
      }
    }

    // 批量删除告警日志
    await UartTerminalDataTransfiniteEntityLogEntity.deleteMany({
      _id: { $in: deleteids },
    }).exec();
    // 更新标签
    await UartTerminalDataTransfiniteEntityLogEntity.updateMany(
      { _id: { $in: allids } },
      { $inc: { __v: 1 as any } }
    ).exec();
    console.timeEnd('Uartterminaldatatransfinites');
    return deleteids.length + '/' + len;
  }

  /**
   * 清洗请求数据
   */
  async CleanUserRequst() {
    console.log('清洗请求数据');
    console.time('CleanUserRequst');
    const MapUserRequst: Map<string, Uart.logUserRequst> = new Map();
    const Query = UserRequstLogEntity.find({ __v: 0 });
    const cur = Query.cursor();
    const len = await Query.countDocuments();
    const deleteids: Types.ObjectId[] = [];
    const allids: Types.ObjectId[] = [];
    for (let doc = await cur.next(); doc != null; doc = await cur.next()) {
      const tag = doc.user + doc.type;
      const _id = new Types.ObjectId(doc._id);
      allids.push(_id);
      const old = MapUserRequst.get(tag);
      // 比较同一个设备连续的告警,告警相同则删除后一个记录
      if (
        (old &&
          JSON.stringify(doc.argument) === JSON.stringify(old.argument)) ||
        !doc.type
      ) {
        deleteids.push(_id);
      } else MapUserRequst.set(tag, doc);
    }
    // 批量删除告警日志
    await UserRequstLogEntity.deleteMany({ _id: { $in: deleteids } }).exec();
    // 更新标签
    await UserRequstLogEntity.updateMany(
      { _id: { $in: allids } },
      { $inc: { __v: 1 as any } }
    ).exec();
    console.timeEnd('CleanUserRequst');
    // 清除缓存
    return deleteids.length + '/' + len;
  }

  /**
   * 清洗设备原始Result
   * 把所有不在现有dtu列表的设备结果集删除
   */
  async CleanClientresults() {
    console.log('================清洗设备原始Result===================');
    console.time('CleanClientresults');
    const MapClientresults: Map<string, Map<string, string>> = new Map();
    // 文档实例

    const ColltionQuery = TerminalParseDataEntity.find({ __v: 0 });
    const Colltioncur = ColltionQuery.cursor();

    const len = await ColltionQuery.countDocuments();
    const deleteids: string[] = [];
    const allids: string[] = [];

    console.log({ len });

    for (
      let doc = await this.next(Colltioncur);
      doc != null;
      doc = await this.next(Colltioncur)
    ) {
      // const _id: string = doc._id
      const key = doc.mac + doc.pid;
      const oldDoc = MapClientresults.get(key);

      if (oldDoc) {
        // 比较每个content查询下buffer.data的数据，有不一致则更新缓存，一致的话计入待删除array
        const isrepeat = doc.result.some(el => {
          const oldData = oldDoc.get(el.name);
          return !oldData || oldData !== el.value;
        });
        if (isrepeat)
          MapClientresults.set(
            key,
            new Map(doc.result.map(el => [el.name, el.value]))
          );
        else {
          deleteids.push(doc.parentId);
        }
      } else {
        MapClientresults.set(
          key,
          new Map(doc.result.map(el => [el.name, el.value]))
        );
      }
      allids.push(doc.parentId);
    }
    console.log({
      time: new Date().toLocaleTimeString(),
      deleteids: deleteids.length,
      allids: allids.length,
    });
    MapClientresults.clear();

    for (const del of chunk(deleteids, 1e5)) {
      const statData = await TerminalParseDataEntity.find(
        { parentId: { $in: del }, hasAlarm: 0 },
        { parentId: 1 }
      ).lean();
      const statIds = statData.map(el => el.parentId);

      await TerminalPrimavelDataEntity.deleteMany({
        _id: { $in: statIds.map(el => new Types.ObjectId(el)) },
      });
      await TerminalParseDataEntity.deleteMany({ parentId: { $in: statIds } });
    }
    // 更新标签
    console.log(`cleanData allids length:${allids.length}`);

    for (const all of chunk(allids, 1e5)) {
      await TerminalParseDataEntity.updateMany(
        { parentId: { $in: all } },
        { $inc: { __v: 1 } }
      );
    }

    console.timeEnd('CleanClientresults');
    return deleteids.length + '/' + len;
  }

  next<T>(curs: mongoose.Cursor<T, any>) {
    return new Promise<T>(resolve => {
      curs.next((err, doc) => {
        resolve(doc);
      });
    });
  }

  /**
   * 把所有1个月前的设备结果集删除
   */
  async CleanClientresultsTimeOut() {
    console.log('=============把所有1个月前的设备结果集删除=================');
    console.time('CleanClientresultsTimeOut');
    const lastM = Date.now() - 2.592e9 * 1;

    const colltion = TerminalParseDataEntity.find(
      { timeStamp: { $lt: lastM } },
      { parentId: 1 }
    );
    // 获取要删除的文档游标
    const colltionCur = colltion.cursor();
    // 获取总长度
    const len = await TerminalParseDataEntity.countDocuments();
    // 要删除的文档长度
    const deletedCount = await colltion.countDocuments();
    // 保存需要删除的解析文档id
    const parentIdSet = new Set<string>();
    // 保存需要删除的原始解析文档id
    const idSet = new Set<string>();

    /**
     * 需要分批次取出数据删除,一次全部取出容易导致爆栈
     */
    for (
      let doc = await this.next(colltionCur);
      doc != null;
      doc = await this.next(colltionCur)
    ) {
      parentIdSet.add(doc.parentId);
      idSet.add(doc.id);
      // 每10000条删除一次
      if (idSet.size > 10000) {
        // 删除过期的解析文档
        const parentIds = [...parentIdSet].map(el => new Types.ObjectId(el));
        await TerminalPrimavelDataEntity.deleteMany({
          _id: { $in: parentIds },
        });
        parentIdSet.clear();
        // 删除过期的原始文档
        const ids = [...idSet].map(el => new Types.ObjectId(el));
        await TerminalParseDataEntity.deleteMany({
          _id: { $in: ids },
        });
        idSet.clear();
      }
    }

    console.timeEnd('CleanClientresultsTimeOut');
    return deletedCount + '/' + len;
  }

  /**
   * 清洗dtuBusy
   */
  async CleanDtuBusy() {
    console.log('清洗dtuBusy');
    console.time('CleanDtuBusy');
    const BusyMap: Map<string, { _id: Types.ObjectId } & Uart.logDtuBusy> =
      new Map();
    const cur = DtuBusyLogEntity.find({ __v: 0 }).cursor();
    const deleteIds: Types.ObjectId[] = [];
    const allIds: Types.ObjectId[] = [];
    for (let doc = await cur.next(); doc != null; doc = await cur.next()) {
      const old = BusyMap.get(doc.mac);
      if (old && (doc.timeStamp === old.timeStamp || doc.stat === old.stat)) {
        deleteIds.push(old._id);
        BusyMap.set(doc.mac, doc as any);
      } else BusyMap.set(doc.mac, doc as any);
      allIds.push(doc._id);
    }
    // 一次性处理的条目数量太多,切块后多次处理
    const deleteChunk = chunk(deleteIds, 1e5);
    for (const del of deleteChunk) {
      await DtuBusyLogEntity.deleteMany({ _id: { $in: del } });
    }
    const updateChunk = chunk(allIds, 1e5);
    for (const update of updateChunk) {
      await DtuBusyLogEntity.updateMany(
        { _id: { $in: update } },
        { $set: { __v: 1 } }
      );
    }
    console.timeEnd('CleanDtuBusy');
  }
}
