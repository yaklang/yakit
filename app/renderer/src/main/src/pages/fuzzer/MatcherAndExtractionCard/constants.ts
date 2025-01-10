import {TableCellToColorTag} from "@/components/TableVirtualResize/utils"
import {HTTPResponseExtractor, HTTPResponseMatcher} from "./MatcherAndExtractionCardType"

/**@name 过滤器模式 */
export const filterModeOptions = [
    {
        value: "drop",
        label: "丢弃"
    },
    {
        value: "match",
        label: "保留"
    },
    {
        value: "onlyMatch",
        label: "仅匹配"
    }
]

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

export const matcherTypeList = [
    {label: "关键字", value: "word"},
    {label: "正则表达式", value: "regex"},
    {label: "状态码", value: "status_code"},
    {label: "十六进制", value: "binary"},
    {label: "表达式", value: "expr"}
]

export const extractorTypeList = [
    {label: "正则表达式", value: "regex"},
    {label: "XPath", value: "xpath"},
    {label: "键值对", value: "kval"},
    {label: "JQ(*)", value: "json"},
    {label: "表达式", value: "nuclei-dsl"}
]

export const defMatcherAndExtractionCode =
    "HTTP/1.1 200 OK\r\n" +
    "Date: Mon, 23 May 2005 22:38:34 GMT\r\n" +
    "Content-Type: text/html; charset=UTF-8\r\n" +
    "Content-Encoding: UTF-8\r\n" +
    "\r\n" +
    "<html>" +
    '<!doctype html>\n<html>\n<body>\n  <div id="result">%d</div>\n</body>\n</html>' +
    "</html>"
