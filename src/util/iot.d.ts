/**
 * 
 * 
 */
interface SimResope<T = boolean> {
    /**
     * 调用失败时，返回的错误信息
     */
    ErrorMessage: string,
    /**
     * 调用失败时，返回的错误码。更多信息，请参见错误码
     * @see https://help.aliyun.com/document_detail/375339.htm?spm=a2c4g.11186623.0.0.7aeb65a8hJcamn
     */
    Code: string,
    /**
     * 是否调用成功。
     * true：调用成功。
     * false：调用失败
     */
    Success: boolean,
    /**
     * 根据当前所在地展示对应语言的错误提示
     */
    LocalizedMessage: string,
    /**
     * 阿里云为该请求生成的唯一标识符
     */
    RequestId: string,
    Data: T
}

/**
 * sim卡信息
 */
interface SimInfo {
    /**
     * 多网卡的子卡详情
     */
    ListPsimCards: [],
    /**
     * 卡的详情
     */
    VsimCardInfo: {
        /**
         * 卡的具体状态。

10：测试期。

20：静默期。

100：使用中。

150：部分使用中。

200：主动停用。

300：达量停用。

400：信控停用。

500：换绑停用。

600：实名停用。

700：异常停用。

40：已停机。

50：已销户。
         */
        OsStatus: string,
        /**
         * 私网网段（定向卡）
         */
        PrivateNetworkSegment: string,
        /**
         * 周期累计流量
         */
        PeriodAddFlow: string,
        /**
         * 周期剩余流量
         */
        PeriodRestFlow: string,
        /**
         * 流量类型。

singlecard：单卡通用流量。

directionalcard：单卡定向流量。

sameflowcard：同档位池共享流量。

directional_sameflowcard：同档位池共享定向流量。

unityPayPool：统付池通用流量。

GREcard ：统付池定向流量
         */
        DataType: string,
        /**
         * 套餐是否自动续费。

true：是。

flase：否
         */
        IsAutoRecharge: boolean,
        /**
         * 开户时间
         */
        OpenAccountTime: string,
        /**
         * 卡状态。

10：可测试。

20：未使用。

30：使用中。

35：已停用。

40：已停机。

50：已销户
         */
        Status: "10" | '20' | '30' | '35' | '40' | '50'
        /**
         * 激活方式。

first_data_record：首话单激活。

carrier_status_push：运营商状态推送激活。

silence_expire：静默期结束激活。

manage：手动激活。

test_flow_depleted：测试流量超套激活
         */
        ActiveType: "first_data_record" | "carrier_status_push" | "silence_expire" | "manage" | "test_flow_depleted",
        /**
         * 套餐结算周期。

1101：月度。

1103：季度。

1106：半年度。

1112：年度
         */
        Period: '1101' | '1103' | '1106' | '1112',
        /**
         * 运营商。

CMCC：移动。

CUCC：联通。

CTCC：电信。

VNO：虚拟运营商
         */
        Vendor: "CMCC" | "CUCC" | "CTCC" | "VNO",
        SimType: string,
        ApnName: string
        DataLevel: string
        CredentialNo: string
        /**
         * 凭证类型
         */
        CertifyType: string,
        /**
         * 激活时间
         */
        ActiveTime: string,
        /**
         * 卡的ICCID
         */
        Iccid: string,
        /**
         * 定向分组名
         */
        DirectionalGroupName: string,
        /**
         * 套餐到期时间
         */
        ExpireTime: string
    }
}

/**
 * 流量使用情况
 */
interface SimUse {
    /**
     * 网络数据
     */
    ListVendorDetail: any[];
    /**
     * 套餐包信息
     */
    ListPackageDTO: {
        /**
         * 套餐生效时间
         */
        EffectiveTime: string;
        /**
         * 套餐名称
         */
        PackageName: string;
        /**
         * 套餐到期时间
         */
        ExpireTime: string;
        /**
         * 备注
         */
        Remark: string;
    }[];
    /**
     * 月用量详情
     */
    ListCardMonthFlow: {
        /**
         * 流量月份
         */
        Month: string;
        /**
         * 月总流量统计
         */
        FlowCount: string;
        /**
         * 每日用量
         */
        ListDayFlow: {
            /**
             * 流量日期
             */
            Day: string;
            /**
             * 日用量
             */
            Flow: string;
        }[]
    }[];
}
