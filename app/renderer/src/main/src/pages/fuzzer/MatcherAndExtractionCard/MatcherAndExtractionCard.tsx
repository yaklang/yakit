import React, {useEffect, useState} from "react"
import {
    ExtractorValueProps,
    HTTPResponseExtractor,
    HTTPResponseMatcher,
    MatcherValueProps,
    MatcherAndExtractionCardProps,
    MatcherAndExtractionProps,
    MatcherCollapseProps,
    labelNodeItemProps
} from "./MatcherAndExtractionCardType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {HTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import styles from "./MatcherAndExtraction.module.scss"
import {ChevronDownIcon, ChevronRightIcon, PlusIcon, RemoveIcon} from "@/assets/newIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Collapse} from "antd"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"

const {ipcRenderer} = window.require("electron")

const {Panel} = Collapse
/**@name 过滤器模式 */
export const filterModeOptions = [
    {
        value: "drop",
        label: "丢弃"
    },
    {
        value: "retain",
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

export const defaultMatcherItem: HTTPResponseMatcher = {
    MatcherType: "word",
    ExprType: "nuclei-dsl",
    Scope: "body",
    Group: [""],
    Condition: "and",
    Negative: false,
    // ---------
    SubMatchers: [],
    SubMatcherCondition: "",
    GroupEncoding: ""
}

export const defaultExtractorItem: HTTPResponseExtractor = {
    Type: "regex",
    Scope: "raw",
    Groups: [""],
    // ---------
    Name: "",
    RegexpMatchGroup: [],
    XPathAttribute: ""
}

const isMatcherItemEmpty = (i: HTTPResponseMatcher) => {
    return (i?.Group || []).map((i) => i.trim()).join("") === ""
}

const isExtractorEmpty = (item: HTTPResponseExtractor) => {
    return (item?.Groups || []).map((i) => i.trim()).join("") === ""
}

const matcherTypeList = [
    {label: "关键字", value: "word"},
    {label: "正则表达式", value: "regex"},
    {label: "状态码", value: "status_code"},
    {label: "十六进制", value: "binary"},
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

export const MatcherAndExtractionCard: React.FC<MatcherAndExtractionCardProps> = React.memo((props) => {
    const {defCodeValue, ...restProps} = props
    const [codeValue, setCodeValue] = useState<string>(defMatcherAndExtractionCode)
    useEffect(() => {
        setCodeValue(defCodeValue || "")
    }, [defCodeValue])
    return (
        <div className={styles["matching-extraction-resize-box"]}>
            <YakitResizeBox
                firstNode={
                    <div className={styles["matching-extraction-editor"]}>
                        <HTTPPacketEditor
                            bordered={false}
                            noHeader={true}
                            originValue={StringToUint8Array(codeValue)}
                            onChange={(e) => setCodeValue(Uint8ArrayToString(e))}
                        />
                    </div>
                }
                secondMinSize={530}
                secondNode={<MatcherAndExtraction {...restProps} />}
                secondNodeStyle={{paddingLeft: 0}}
                lineDirection='right'
            />
        </div>
    )
})

const MatcherAndExtraction: React.FC<MatcherAndExtractionProps> = React.memo((props) => {
    const {onClose, extractorValue, matcherValue} = props
    const [type, setType] = useState<"matchers" | "extractors">("matchers")
    const [matcher, setMatcher] = useState<MatcherValueProps>(matcherValue)
    const [extractor, setExtractor] = useState<ExtractorValueProps>(extractorValue)

    useEffect(() => {
        setMatcher(matcherValue)
    }, [matcherValue])
    useEffect(() => {
        setExtractor(extractorValue)
    }, [extractorValue])
    const onAddCondition = useMemoizedFn(() => {
        switch (type) {
            case "matchers":
                onAddMatcher()
                break
            case "extractors":
                onAddExtractors()
                break
            default:
                break
        }
    })
    const onAddMatcher = useMemoizedFn(() => {
        if (matcher.matchersList.filter((i) => isMatcherItemEmpty(i)).length > 0) {
            yakitNotify("error", "已有空匹配器条件")
            return
        }
        setMatcher({
            ...matcher,
            matchersList: [...matcher.matchersList, defaultMatcherItem]
        })
    })
    const onAddExtractors = useMemoizedFn(() => {
        if (extractor.extractorList.filter((i) => isExtractorEmpty(i)).length > 0) {
            yakitNotify("error", "已有空匹配器条件")
            return
        }
        setExtractor({
            ...extractor,
            extractorList: [...extractor.extractorList, defaultExtractorItem]
        })
    })
    const onExecute = useMemoizedFn(() => {
        switch (type) {
            case "matchers":
                onExecuteMatcher()
                break
            case "extractors":
                onExecuteExtractors()
                break
            default:
                break
        }
    })
    const onExecuteMatcher = useMemoizedFn(() => {
        // ipcRenderer.invoke("MatchHTTPResponse", {
        //     HTTPResponse: data,
        //     Matchers: matchers,
        //     MatcherCondition: condition,
        // }).then((data: { Matched: boolean }) => {
        //     setMatched(data.Matched)
        // })
    })
    const onExecuteExtractors = useMemoizedFn(() => {
        // ipcRenderer.invoke("ExtractHTTPResponse", {
        //     Extractors: extractors,
        //     HTTPResponse: data,
        // }).then((obj: { Values: { Key: string, Value: string }[] }) => {
        //     if (!obj) {
        //         failed("匹配不到有效结果")
        //         return
        //     }
        //     if ((obj?.Values || []).length <= 0) {
        //         failed("匹配不到有效结果")
        //         return
        //     }
        //     showYakitModal({
        //         title: "提取结果",
        //         width: "60%",
        //         content: (
        //             <Space style={{margin: 24}} direction={"vertical"}>
        //                 {obj.Values.map(i => {
        //                     return `${i.Key}: ${i.Value}`
        //                 })}
        //             </Space>
        //         )
        //     })
        // })
    })
    return (
        <div className={styles["matching-extraction"]}>
            <div className={styles["matching-extraction-heard"]}>
                <div className={styles["matching-extraction-title"]}>
                    <YakitRadioButtons
                        value={type}
                        onChange={(e) => {
                            setType(e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "matchers",
                                label: "匹配器"
                            },
                            {
                                value: "extractors",
                                label: "数据提取器"
                            }
                        ]}
                    />
                    <span className={styles["matching-extraction-title-tip"]}>
                        已添加 <span className={styles["primary-number"]}>2</span> 条
                    </span>
                </div>
                <div className={styles["matching-extraction-extra"]}>
                    <YakitButton type='outline1' icon={<PlusIcon />} onClick={() => onAddCondition()}>
                        添加条件
                    </YakitButton>
                    <YakitButton type='outline1' onClick={() => onExecute()}>
                        调试执行
                    </YakitButton>
                    <YakitButton type='primary'>应用</YakitButton>
                    <RemoveIcon className={styles["remove-icon"]} onClick={() => onClose()} />
                </div>
            </div>
            <MatcherCollapse matcher={matcher} setMatcher={setMatcher} />
        </div>
    )
})

const MatcherCollapse: React.FC<MatcherCollapseProps> = React.memo((props) => {
    const {matcher, setMatcher} = props
    const [activeKey, setActiveKey] = useState<string[]>(["0"])
    useEffect(() => {
        setActiveKey(matcher.matchersList.map((_, i) => `ID:${i}`))
    }, [matcher.matchersList.length])
    const onEdit = useMemoizedFn((field: string, value, index: number) => {
        matcher.matchersList[index][field] = value
        setMatcher({
            ...matcher,
            matchersList: [...matcher.matchersList]
        })
    })
    return (
        <div className={classNames("yakit-collapse", styles["matching-extraction-content"])}>
            <div className={styles["matching-extraction-condition"]}>
                <div className={styles["condition-mode"]}>
                    <span className={styles["condition-mode-text"]}>过滤器模式</span>
                    <YakitRadioButtons
                        value={matcher.filterMode}
                        onChange={(e) => {
                            setMatcher({
                                ...matcher,
                                filterMode: e.target.value
                            })
                        }}
                        buttonStyle='solid'
                        options={filterModeOptions}
                    />
                </div>
                <div className={styles["condition-mode"]}>
                    <span className={styles["condition-mode-text"]}>条件关系</span>
                    <YakitRadioButtons
                        value={matcher.matchersCondition}
                        onChange={(e) => {
                            setMatcher({
                                ...matcher,
                                matchersCondition: e.target.value
                            })
                        }}
                        buttonStyle='solid'
                        options={matchersConditionOptions}
                    />
                </div>
            </div>
            <Collapse
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                ghost
                expandIcon={(e) => (e.isActive ? <ChevronDownIcon /> : <ChevronRightIcon />)}
                className={styles["matcher-extraction-collapse"]}
            >
                {matcher.matchersList.map((matcherItem, index) => (
                    <Panel
                        header={
                            <div className={styles["collapse-panel-header"]}>
                                <span className={styles["header-id"]}>ID&nbsp;{index}</span>
                                <span>[{matcherTypeList.find((e) => e.value === matcherItem.MatcherType)?.label}]</span>
                                <span className={styles["header-number"]}>{matcherItem.Group.length}</span>
                            </div>
                        }
                        key={`ID:${index}`}
                    >
                        <div className={styles["collapse-panel-condition"]}>
                            <LabelNodeItem label='匹配类型'>
                                <YakitRadioButtons
                                    value={matcherItem.MatcherType}
                                    onChange={(e) => {
                                        onEdit("MatcherType", e.target.value, index)
                                    }}
                                    buttonStyle='solid'
                                    options={matcherTypeList}
                                />
                            </LabelNodeItem>
                            <LabelNodeItem label='匹配位置'>
                                <YakitRadioButtons
                                    value={matcherItem.Scope}
                                    onChange={(e) => {
                                        onEdit("Scope", e.target.value, index)
                                    }}
                                    buttonStyle='solid'
                                    options={[
                                        {label: "状态码", value: "status_code"},
                                        {label: "响应头", value: "all_headers"},
                                        {label: "响应体", value: "body"},
                                        {label: "全部响应", value: "raw"}
                                    ]}
                                />
                            </LabelNodeItem>
                            <LabelNodeItem label='条件关系'>
                                <YakitRadioButtons
                                    value={matcherItem.Condition}
                                    onChange={(e) => {
                                        onEdit("Condition", e.target.value, index)
                                    }}
                                    buttonStyle='solid'
                                    options={[
                                        {label: "AND", value: "and"},
                                        {label: "OR", value: "or"}
                                    ]}
                                />
                            </LabelNodeItem>
                            <LabelNodeItem label='不匹配（取反）'>
                                <YakitSwitch
                                    checked={matcherItem.Negative}
                                    onChange={(checked) => onEdit("Negative", checked, index)}
                                />
                            </LabelNodeItem>
                        </div>
                        <div className={styles["matching-extraction-list-value"]}></div>
                    </Panel>
                ))}
            </Collapse>
        </div>
    )
})

const LabelNodeItem: React.FC<labelNodeItemProps> = React.memo((props) => {
    return (
        <div className={styles["label-node"]}>
            <span className={styles["label"]}>{props.label}</span>
            {props.children}
        </div>
    )
})
