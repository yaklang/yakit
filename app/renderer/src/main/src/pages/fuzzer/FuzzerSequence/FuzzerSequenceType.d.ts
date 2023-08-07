import { WebFuzzerPageInfoProps } from "../../../store/pageNodeInfo";
import { FuzzerResponse, FuzzerRequestProps } from "../HTTPFuzzerPage";

/**
 * @description 序列props
 * @property {string} pageId页面节点id
 */
export interface FuzzerSequenceProps {
    pageId: string
}

/**
 *  @description 序列列表props
 *  @property {string} id 序列唯一标识
 *  @property {string} pageId 页面id
 *  @property {string} pageGroupId 页面所属组id
 *  @property {WebFuzzerPageInfoProps} pageParams 页面缓存参数
 *  @property {boolean} disabled 序列item是否disabled状态
 */
export interface SequenceProps extends ExtraSettingProps {
    id: string
    pageId: string
    pageGroupId: string
    pageName: string
    pageParams: WebFuzzerPageInfoProps
    disabled?: boolean
}
/**
 * @description 额外的一些序列配置
 */
export interface ExtraSettingProps {
    /**@name 是否继承Cookies */
    inheritCookies: boolean
    /**@name 是否继承变量 */
    inheritVariables: boolean
}
/**
 * @description 序列item
 * @property {SequenceProps} item
 * @property {number} index 下标
 * @property {number} errorIndex 当前错误状态的index
 * @property {boolean} isDragging 是否在拖拽中
 * @property {boolean} isShowLine 是否显示线
 * @property {boolean} disabled 
 * @property {SequenceProps} pageNodeList 原始的页面节点list，用来做下拉选中选择
 * @function onUpdateItem 更新序列item
 * @function onApplyOtherNodes 应用到其他节点事件
 * @function onRemove 删除
 * @function onSelect 选中
 */
export interface SequenceItemProps {
    item: SequenceProps
    index: number
    errorIndex: number
    isSelect: boolean
    isDragging: boolean
    isShowLine: boolean
    disabled?: boolean
    pageNodeList: SequenceProps[]
    onUpdateItem: (s: SequenceProps) => void
    onApplyOtherNodes: (e: ExtraSettingProps) => void
    onRemove: (s: SequenceProps) => void
    onSelect: (s: SequenceProps) => void
}
/**
 * @description 返回参数
 * @property {string} id fuzzerIndex
 * @property {number} successCount 成功的数量
 * @property {number} failedCount 失败的数量
 * @property {FuzzerResponse} onlyOneResponse 只有一条返回记录
 * @property {FuzzerResponse[]} successFuzzer 成功数据list
 * @property {FuzzerResponse[]} failedFuzzer 成功数据list
 */
export interface ResponseProps {
    id:string
    successCount: number
    failedCount: number
    onlyOneResponse: FuzzerResponse
    successFuzzer: FuzzerResponse[]
    failedFuzzer: FuzzerResponse[]
}
/**
 * @description HTTPFuzzerSequence接口返回类型
 * @property {FuzzerRequestProps} Request
 * @property {FuzzerResponse} Response
 */
export interface FuzzerSequenceResponse {
    Request: FuzzerRequestProps
    Response: FuzzerResponse
}
/**
 * @description 请求和响应
 * @property {boolean} loading 是否还在请求中
 * @property {FuzzerRequestProps} requestInfo
 * @property {ResponseProps} responseInfo
 */
export interface SequenceResponseProps {
    loading:boolean
    requestInfo?: WebFuzzerPageInfoProps
    responseInfo?: ResponseProps
}