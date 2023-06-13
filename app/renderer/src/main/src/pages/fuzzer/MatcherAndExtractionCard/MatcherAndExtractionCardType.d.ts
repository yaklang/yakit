import { ReactNode } from "react"

export interface MatcherAndExtractionCardProps extends MatcherAndExtractionProps {
    defCodeValue?: string
}

export interface MatcherAndExtractionProps {
    onClose: () => void
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
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
    matcher: MatcherValueProps
    setMatcher: (m: MatcherValueProps) => void
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
export interface labelNodeItemProps{
    label:string
    children:ReactNode
}