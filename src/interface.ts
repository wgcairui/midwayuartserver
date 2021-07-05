/**
 * @description User-Service parameters
 */
import { Types } from "mongoose"

export type tokenUser = Pick<Uart.UserInfo, "user" | "userGroup">

export interface f {
  _id: string
  __v: number
  createdAt: Date
  updatedAt: Date
  lastDate: Date
  [x: string]: any
}

export type filter<T> = Partial<Record<keyof f, 0 | 1>> & Partial<Record<keyof T, 0 | 1>>

export const ObjectId = Types.ObjectId

export type MongoTypesId = Types.ObjectId

export interface SmsResult {
  "Message": string
  "RequestId": string
  "BizId": string
  "Code": string
}

export interface alarm {
  /**
   * 告警参数参数
   */
  argument: string
  /**
   * 标签
   */
  tag: 'ups' | 'Threshold' | 'AlarmStat'
  /**
   * 时间戳
   */
  timeStamp: number
  /**
   * 携带数据
   */
  data: Uart.queryResultArgument
  /**
   * 约束
   */
  contant?: Uart.Threshold | Uart.ConstantAlarmStat
}

/**
 * tencetd地图配置
 */
export interface tencetMapConfig {
  key: string
  apiUrl: string
  SK: string
}