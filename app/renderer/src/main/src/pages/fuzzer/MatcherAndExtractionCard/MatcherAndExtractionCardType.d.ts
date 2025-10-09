import {ReactNode} from "react"
import {FilterMode} from "../HTTPFuzzerPage"

export interface FilterEmptySubMatcherFunctionProps {
    matchers: HTTPResponseMatcher[]
    index: number
    subIndex: number
}
export type MatchingAndExtraction = "matchers" | "extractors"

export interface MatcherActiveKey {
    order: number
    defActiveKey: string
}
export interface MatcherAndExtractionCardProps extends MatcherAndExtractionProps {}

export interface MatcherAndExtractionProps {
    ref?: React.ForwardedRef<MatcherAndExtractionRefProps>
    httpResponse: string
    onClose: () => void
    onSave: (m: MatcherValueProps, e: ExtractorValueProps) => void
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    defActiveKey: string
    defActiveType: MatchingAndExtraction
    defActiveKeyAndOrder: MatcherActiveKey
    pageType: MatcherAndExtractionDrawerPageType
}

export interface MatcherAndExtractionRefProps {
    validate: () => Promise<MatcherAndExtractionValueProps>
}
export interface MatcherAndExtractionValueProps {
    matcher: MatcherValueProps
    extractor: ExtractorValueProps
}

export interface MatcherValueProps {
    matchersList: HTTPResponseMatcher[]
}

export interface ExtractorValueProps {
    extractorList: HTTPResponseExtractor[]
}

export interface MatcherCollapseProps extends MatcherAndExtractorProps {
    ref?: React.ForwardedRef<MatcherCollapseRefProps>
    pageType: MatcherAndExtractionDrawerPageType
    matcher: MatcherValueProps
    setMatcher: (m: MatcherValueProps) => void
    httpResponse: string
    defActiveKeyAndOrder: MatcherActiveKey
}

export interface MatcherCollapseRefProps {
    setActiveKey: (o: number, a: string) => void
}

export interface ExtractorCollapseProps extends MatcherAndExtractorProps {
    extractor: ExtractorValueProps
    setExtractor: (e: ExtractorValueProps) => void
    httpResponse: string
    defActiveKey: string
}

interface MatcherAndExtractorProps {
    isSmallMode: boolean
    type: MatchingAndExtraction
    /**@name 不可编辑状态，不展示删除等相关操作按钮;且默认打开所有的Panel,不可点击关闭/打开等操作 */
    notEditable?: boolean
}

export interface HTTPResponseMatcher {
    SubMatchers: HTTPResponseMatcher[]
    SubMatcherCondition: string
    MatcherType: string
    Scope: string
    Condition: string
    Group: string[]
    GroupEncoding: string
    Negative: boolean
    ExprType: string
    HitColor: string
    /**@name retain:保留 discard:丢弃 不传就是匹配 */
    Action: string

    /**@name 前端使用 过滤器模式 */
    filterMode: FilterMode
}

export interface HTTPResponseExtractor {
    Name: string
    Type: string
    Scope: string
    Groups: string[]
    RegexpMatchGroup: string[]
    XPathAttribute: string
}

export interface labelNodeItemProps {
    label: string
    children: ReactNode
    column?: boolean
    className?: string
    labelClassName?: string
}

export interface MatcherItemProps extends MatcherItemAndExtractorItemProps {
    matcherItem: HTTPResponseMatcher
    httpResponse: string
}

export interface ExtractorItemProps extends MatcherItemAndExtractorItemProps {
    extractorItem: HTTPResponseExtractor
    httpResponse: string
}

interface MatcherItemAndExtractorItemProps {
    isSmallMode?: boolean
    /**@name 不可编辑状态，不展示删除等相关操作按钮;且默认打开所有的Panel,不可点击关闭/打开等操作 */
    notEditable?: boolean
    onEdit: (f: string, v: any) => void
}

export interface MatchHTTPResponseParams {
    Matchers: HTTPResponseMatcher[]
    MatcherCondition: string
    IsHTTPS?: boolean
    HTTPResponse: string
    HTTPRequest?: string
}

export interface ColorSelectProps {
    size?: "small" | "large" | "max"
    value?: string
    onChange?: (value: string) => void
}

export interface MatcherAndExtractionValueListProps {
    /**@name 是否显示正则表达式icon */
    showRegex: boolean
    group: string[]
    notEditable?: boolean
    onEditGroup: (group: string[]) => void
    onAddGroup: () => void
    httpResponse: string
}

export interface ExtractionResultsContentProps {
    list: {Key: string; Value: string}[]
}

type MatcherAndExtractionDrawerPageType = "webfuzzer" | "History_Analysis"
export interface MatcherAndExtractionDrawerProps {
    pageType?: MatcherAndExtractionDrawerPageType
    visibleDrawer: boolean
    defActiveType: MatchingAndExtraction
    httpResponse: string
    /**提取器默认选中 */
    defActiveKey: string
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    onClose: () => void
    onSave: (m: MatcherValueProps, e: ExtractorValueProps) => void
    /**匹配器默认选中 */
    defActiveKeyAndOrder: MatcherActiveKey
}
