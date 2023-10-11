import {WebFuzzerPageInfoProps} from "../../../store/pageInfo"
import {FuzzerResponse, FuzzerRequestProps} from "../HTTPFuzzerPage"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {MatcherAndExtractionRefProps} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {WebFuzzerType} from "../WebFuzzerPage/WebFuzzerPageType"
/**
 * @description 序列props
 * @property {string} pageId页面节点id
 * @function setType
 */
export interface FuzzerSequenceProps {
    groupId: string
    pageId?: string
    setType?: (s: WebFuzzerType) => void
}

/**
 *  @description 序列列表props
 *  @property {string} id 序列唯一标识
 *  @property {string} name 序列名称
 *  @property {string} pageId 页面id
 *  @property {string} pageGroupId 页面所属组id
 *  @property {WebFuzzerPageInfoProps} pageParams 页面缓存参数
 *  @property {boolean} disabled 序列item是否disabled状态
 */
export interface SequenceProps extends ExtraSettingProps {
    id: string
    name: string
    pageId: string
    pageGroupId: string
    pageName: string
    // pageParams: WebFuzzerPageInfoProps
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
 * @function onUpdateItemPage 更新序列item
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
    onUpdateItemPage: (s: SequenceProps) => void
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
    id: string
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
 * @property {React.ForwardedRef<SequenceResponseRefProps>} responseViewerRef 返回包调试匹配器和提取器时,验证是否保存
 * @property {boolean} loading 是否还在请求中
 * @property {FuzzerRequestProps} requestInfo
 * @property {ResponseProps} responseInfo
 * @property {Map<string, string>} extractedMap 返回包提取的响应数据
 * @property {string} hotPatchCode 热加载代码
 * @property {string} hotPatchCodeWithParamGetter 热加载相关,具体不清楚,现在好像暂时没有用这个
 * @function setHotPatchCode
 * @function setHotPatchCodeWithParamGetter
 */
export interface SequenceResponseProps {
    ref?: React.ForwardedRef<SequenceResponseRefProps>
    loading: boolean
    requestInfo?: WebFuzzerPageInfoProps
    responseInfo?: ResponseProps
    extractedMap: Map<string, string>
    hotPatchCode: string
    hotPatchCodeWithParamGetter: string
    setHotPatchCode: (s: string) => void
    setHotPatchCodeWithParamGetter: (s: string) => void
}

export interface SequenceResponseRefProps{
    validate:() => Promise<boolean>
}
/**
 * @description 返回响应头部
 * @property {boolean} disabled 展示全部按钮禁用状态
 * @property {number} droppedCount 丢弃响应数
 * @property {string} currentSequenceItemName 当前选中序列名称
 * @property {string} currentSequenceItemPageName 当前选中页面名称
 * @property {AdvancedConfigValueProps} advancedConfigValue 当前选中序列对应的页面高级配置数据
 * @property {ResponseProps} responseInfo 当前选中序列响应包数据详情
 * @function onShowAll 展示全部
 */
export interface SequenceResponseHeardProps {
    disabled: boolean
    droppedCount: number
    currentSequenceItemName: string
    currentSequenceItemPageName: string
    advancedConfigValue?: AdvancedConfigValueProps
    responseInfo?: ResponseProps
    onShowAll: () => void
}

/**
 * @description 展示全部的card
 * @property {boolean} showAllResponse 展示全部
 * @property {Map<string, ResponseProps>} responseMap 所有响应数据
 * @function setShowAllResponse
 */
export interface ResponseCardProps {
    showAllResponse: boolean
    responseMap: Map<string, ResponseProps>
    setShowAllResponse: () => void
}
