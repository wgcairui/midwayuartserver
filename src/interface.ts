/**
 * @description User-Service parameters
 */
export interface IUserOptions {
  uid: number;
}



import type { UserRole } from "./util/constants";
import { Types } from "mongoose"

export type tokenUser = Pick<Uart.UserInfo, "user" | "userGroup">

export interface IContext {
  user: tokenUser
  language: string
  currentReqUser: {
    role: UserRole;
  };
}

export interface f {
  _id: string
  __v: number
  createdAt: Date
  updatedAt: Date
  lastDate: Date
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