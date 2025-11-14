import {TableCellToColorTag} from "@/components/TableVirtualResize/utils"
import {HTTPResponseExtractor, HTTPResponseMatcher} from "./MatcherAndExtractionCardType"

/**@name 过滤器模式 */
export const filterModeOptions = (t: (text: string) => string) => {
    return [
        {
            value: "drop",
            label: t("MatcherCollapse.discard")
        },
        {
            value: "match",
            label: t("MatcherCollapse.match")
        },
        {
            value: "onlyMatch",
            label: t("MatcherCollapse.onlyMatch")
        }
    ]
}

/**@name 条件关系 */
export const matchersConditionOptions = [
    {
        value: "and",
        label: "AND"
    },
    {
        value: "or",
        label: "OR"
    }
]
export const defaultSubMatcherItem: HTTPResponseMatcher = {
    MatcherType: "word",
    ExprType: "nuclei-dsl",
    Scope: "body",
    Group: [""],
    Condition: "and",
    Negative: false,
    SubMatchers: [],
    SubMatcherCondition: "",
    GroupEncoding: "",
    HitColor: "",
    Action: "",
    filterMode: "onlyMatch"
}
export const defaultMatcherItem: HTTPResponseMatcher = {
    MatcherType: "",
    ExprType: "",
    Scope: "",
    Group: [""],
    Condition: "",
    Negative: false,
    // ---------
    SubMatchers: [
        {
            ...defaultSubMatcherItem
        }
    ],
    SubMatcherCondition: "and",
    GroupEncoding: "",
    HitColor: TableCellToColorTag["RED"],
    Action: "",
    filterMode: "onlyMatch"
}

export const defaultExtractorItem: HTTPResponseExtractor = {
    Type: "regex",
    Scope: "raw",
    Groups: [""],
    // ---------
    Name: "data_0",
    RegexpMatchGroup: [],
    XPathAttribute: ""
}

export const matcherTypeList = (t: (text: string) => string) => {
    return [
        {label: t("MatcherCollapse.keyword"), value: "word"},
        {label: t("MatcherCollapse.regex"), value: "regex"},
        {label: t("MatcherCollapse.status_code"), value: "status_code"},
        {label: t("MatcherCollapse.hex"), value: "binary"},
        {label: t("MatcherCollapse.expression"), value: "expr"}
    ]
}

export const extractorTypeList = (t: (text: string) => string) => {
    return [
        {label: t("ExtractorItem.regex"), value: "regex"},
        {label: "XPath", value: "xpath"},
        {label: t("ExtractorItem.keyValuePair"), value: "kval"},
        {label: "JQ(*)", value: "json"},
        {label: t("ExtractorItem.expression"), value: "nuclei-dsl"}
    ]
}

export const ScopeList = (t: (text: string) => string) => {
    return [
        {label: t("MatcherItem.request_header"), value: "request_header"},
        {label: t("MatcherItem.request_body"), value: "request_body"},
        {label: t("MatcherItem.all_requests"), value: "request_raw"},
        {label: t("MatcherItem.request_url"), value: "request_url"}
    ]
}

export const defMatcherAndExtractionCode =
    "HTTP/1.1 200 OK\r\n" +
    "Date: Mon, 23 May 2005 22:38:34 GMT\r\n" +
    "Content-Type: text/html; charset=UTF-8\r\n" +
    "Content-Encoding: UTF-8\r\n" +
    "\r\n" +
    "<html>" +
    '<!doctype html>\n<html>\n<body>\n  <div id="result">%d</div>\n</body>\n</html>' +
    "</html>"
