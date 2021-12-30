import { getModelForClass } from "@typegoose/typegoose";
import { AnyParamConstructor } from "@typegoose/typegoose/lib/types";
import { UserBindDevice } from "../entity/user";


/**
 * 获取数据库实体
 * @param cl 
 * @returns 
 */
export const getModel = <T>(cl: AnyParamConstructor<T>) => {
    return getModelForClass(cl);
}



/**
   * 获取绑定设备所属用户
   * @param mac
   */
export const getBindMacUser = async (mac: string) => {
    const t = await getModel(UserBindDevice).findOne({ UTs: mac }).lean();
    return t ? t.user : null;
}