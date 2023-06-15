import { ReactNode } from "react"

export type MatchingAndExtraction = "matchers" | "extractors"

export interface MatcherAndExtractionCardProps extends MatcherAndExtractionProps {

}

export interface MatcherAndExtractionProps {
    httpResponse: string
    onClose: () => void
    onSave: (m: MatcherValueProps, e: ExtractorValueProps) => void
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    defActiveKey: string
    defActiveType: MatchingAndExtraction
}

export interface MatcherValueProps {
    filterMode: "drop" | 'retain' | 'onlyMatch'
    /**@name filterMode为onlyMatch,才会设置该值*/
    hitColor?: string
    matchersCondition: 'and' | 'or'
    matchersList: HTTPResponseMatcher[]
}

export interface ExtractorValueProps {
    extractorList: HTTPResponseExtractor[]
}

export interface MatcherCollapseProps extends MatcherAndExtractorProps {
    matcher: MatcherValueProps
    setMatcher: (m: MatcherValueProps) => void
}

export interface ExtractorCollapseProps extends MatcherAndExtractorProps {
    extractor: ExtractorValueProps
    setExtractor: (e: ExtractorValueProps) => void
}

interface MatcherAndExtractorProps {
    type: MatchingAndExtraction
    /**@name 不可编辑状态，不展示删除等相关操作按钮;且默认打开所有的Panel,不可点击关闭/打开等操作 */
    notEditable?: boolean
    defActiveKey: string
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
}

export interface MatcherItemProps extends MatcherItemAndExtractorItemProps {
    matcherItem: HTTPResponseMatcher
}

export interface ExtractorItemProps extends MatcherItemAndExtractorItemProps {
    extractorItem: HTTPResponseExtractor
}

interface MatcherItemAndExtractorItemProps {
    /**@name 不可编辑状态，不展示删除等相关操作按钮;且默认打开所有的Panel,不可点击关闭/打开等操作 */
    notEditable?: boolean
    onEdit: (f: string, v: any) => void
}

export interface MatchHTTPResponseParams {
    Matchers: HTTPResponseMatcher[];
    MatcherCondition: string;
    IsHTTPS?: boolean;
    HTTPResponse: string;
    HTTPRequest?: string;
}

export interface ColorSelectProps {
    size?: "small" | "large" | "max"
    value?: string
    onChange?: (value: string) => void;
}

export interface MatcherAndExtractionValueListProps {
    group: string[]
    notEditable?: boolean
    onEditGroup: (group: string[]) => void
    onAddGroup: () => void
}