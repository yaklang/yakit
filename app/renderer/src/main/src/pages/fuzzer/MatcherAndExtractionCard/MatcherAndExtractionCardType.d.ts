import { ReactNode } from "react"

export interface MatcherAndExtractionCardProps extends MatcherAndExtractionProps {
    defActiveKey: string
}

export interface MatcherAndExtractionProps {
    httpResponse:string
    onClose: () => void
    onSave: (m: MatcherValueProps, e: ExtractorValueProps) => void
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    defActiveKey: string
}

export interface MatcherValueProps {
    filterMode: "drop" | 'retain' | 'onlyMatch'
    matchersCondition: 'and' | 'or'
    matchersList: HTTPResponseMatcher[]
}

export interface ExtractorValueProps {
    extractorList: HTTPResponseExtractor[]
}

export interface MatcherCollapseProps {
    /**@name 不可编辑状态，不展示删除等相关操作按钮;且默认打开所有的Panel,不可点击关闭/打开等操作 */
    notEditable?: boolean
    matcher: MatcherValueProps
    setMatcher: (m: MatcherValueProps) => void
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
    /**@deprecated  Groups wenFuzzer废弃改用RuleGroups*/
    Groups: string[]
    RegexpMatchGroup: string[]
    XPathAttribute: string
    RuleGroups: ExtractorRule[]
}

export interface ExtractorRule {
    Name: string
    Rule: string
}
export interface labelNodeItemProps {
    label: string
    children: ReactNode
}

export interface MatcherItemProps {
    /**@name 不可编辑状态，不展示删除等相关操作按钮;且默认打开所有的Panel,不可点击关闭/打开等操作 */
    notEditable?: boolean
    matcherItem: HTTPResponseMatcher
    onEdit: (f: string, v: any) => void
}

export interface MatchHTTPResponseParams {
    Matchers: HTTPResponseMatcher[];
    MatcherCondition: string;
    IsHTTPS?: boolean;
    HTTPResponse: string;
    HTTPRequest?: string;
}