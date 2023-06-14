import React, {useEffect, useState} from "react"
import {
    ExtractorValueProps,
    HTTPResponseExtractor,
    HTTPResponseMatcher,
    MatcherValueProps,
    MatcherAndExtractionCardProps,
    MatcherAndExtractionProps,
    MatcherCollapseProps,
    labelNodeItemProps,
    MatcherItemProps,
    MatchHTTPResponseParams
} from "./MatcherAndExtractionCardType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {HTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import styles from "./MatcherAndExtraction.module.scss"
import {ChevronDownIcon, ChevronRightIcon, PlusIcon, RemoveIcon, ResizerIcon, TrashIcon} from "@/assets/newIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Collapse} from "antd"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import _ from "lodash"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {randomString} from "@/utils/randomUtil"

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
    XPathAttribute: "",
    RuleGroups: [{Name: "", Rule: ""}]
}

const isMatcherItemEmpty = (i: HTTPResponseMatcher) => {
    return (i?.Group || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}

const isExtractorEmpty = (item: HTTPResponseExtractor) => {
    return (item?.Groups || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}

export const matcherTypeList = [
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
    const {httpResponse, ...restProps} = props
    const [codeValue, setCodeValue] = useState<string>(httpResponse || defMatcherAndExtractionCode)
    useEffect(() => {
        setCodeValue(httpResponse || "")
    }, [httpResponse])
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
                secondNode={<MatcherAndExtraction {...restProps} httpResponse={codeValue} />}
                secondNodeStyle={{paddingLeft: 0}}
                lineDirection='right'
            />
        </div>
    )
})

const MatcherAndExtraction: React.FC<MatcherAndExtractionProps> = React.memo((props) => {
    const {onClose, onSave, extractorValue, matcherValue, defActiveKey, httpResponse} = props
    const [type, setType] = useState<"matchers" | "extractors">("matchers")
    const [matcher, setMatcher] = useState<MatcherValueProps>(matcherValue)
    const [extractor, setExtractor] = useState<ExtractorValueProps>(extractorValue)

    useEffect(() => {
        setMatcher(_.cloneDeepWith(matcherValue))
    }, [matcherValue])
    useEffect(() => {
        setExtractor(_.cloneDeepWith(extractorValue))
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
            matchersList: [...matcher.matchersList, _.cloneDeepWith({...defaultMatcherItem, Id: randomString(8)})]
        })
    })
    const onAddExtractors = useMemoizedFn(() => {
        if (extractor.extractorList.filter((i) => isExtractorEmpty(i)).length > 0) {
            yakitNotify("error", "已有空匹配器条件")
            return
        }
        setExtractor({
            ...extractor,
            extractorList: [...extractor.extractorList, _.cloneDeepWith({...defaultExtractorItem, Id: randomString(8)})]
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
        const matchHTTPResponseParams: MatchHTTPResponseParams = {
            HTTPResponse: httpResponse,
            Matchers: matcher.matchersList,
            MatcherCondition: matcher.matchersCondition
        }
        ipcRenderer.invoke("MatchHTTPResponse", matchHTTPResponseParams).then((data: {Matched: boolean}) => {
            if (data.Matched) {
                yakitNotify("success", "匹配成功")
            } else {
                yakitNotify("error", "匹配失败")
            }
        })
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
    const onApply = useMemoizedFn(() => {
        const matcherEmptyList = matcher.matchersList.filter((item) => isMatcherItemEmpty(item))
        const extractorEmptyList = extractor.extractorList.filter((item) => isExtractorEmpty(item))
        if (matcherEmptyList.length > 0 || extractorEmptyList.length > 0) {
            let m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "取消",
                onOkText: "确定",
                icon: <ExclamationCircleOutlined />,
                onOk: () => {
                    const newMatchersList: HTTPResponseMatcher[] = []
                    matcher.matchersList.forEach((item) => {
                        if (item.Group.findIndex((g) => g === "") !== 0) {
                            newMatchersList.push({
                                ...item,
                                Group: item.Group.filter((g) => g !== "")
                            })
                        }
                    })
                    const newExtractorList: HTTPResponseExtractor[] = []
                    extractor.extractorList.forEach((item) => {
                        if (item.Groups.findIndex((g) => g === "") !== 0) {
                            newExtractorList.push({
                                ...item,
                                Groups: item.Groups.filter((g) => !g)
                            })
                        }
                    })
                    onSave({...matcher, matchersList: newMatchersList}, {...extractor, extractorList: newExtractorList})
                    onClose()
                    m.destroy()
                },
                onCancel: () => {
                    m.destroy()
                },
                content: "有条件未配置完成是否确定要应用？"
            })
        } else {
            onSave(matcher, extractor)
            onClose()
        }
    })
    const onCheckClose = useMemoizedFn(() => {
        if (_.isEqual(matcherValue, matcher) && _.isEqual(extractorValue, extractor)) {
            onClose()
        } else {
            let m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "不保存",
                onOkText: "保存",
                icon: <ExclamationCircleOutlined />,
                onOk: () => onApply(),
                onCancel: () => {
                    onClose()
                    m.destroy()
                },
                content: "是否保存修改的内容"
            })
        }
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
                        已添加
                        <span className={styles["primary-number"]}>
                            {type === "matchers" ? matcher.matchersList.length : extractor.extractorList.length}
                        </span>
                        条
                    </span>
                </div>
                <div className={styles["matching-extraction-extra"]}>
                    <YakitButton type='outline1' icon={<PlusIcon />} onClick={() => onAddCondition()}>
                        添加条件
                    </YakitButton>
                    <YakitButton type='outline1' onClick={() => onExecute()}>
                        调试执行
                    </YakitButton>
                    <YakitButton type='primary' onClick={() => onApply()}>
                        应用
                    </YakitButton>
                    <RemoveIcon className={styles["remove-icon"]} onClick={() => onCheckClose()} />
                </div>
            </div>
            <MatcherCollapse matcher={matcher} setMatcher={setMatcher} defActiveKey={defActiveKey} />
        </div>
    )
})

export const MatcherCollapse: React.FC<MatcherCollapseProps> = React.memo((props) => {
    const {matcher, setMatcher, notEditable, defActiveKey} = props
    const [activeKey, setActiveKey] = useState<string>("ID:0")
    useEffect(() => {
        setActiveKey(defActiveKey)
    }, [defActiveKey])
    useEffect(() => {
        const length = matcher.matchersList.length
        setActiveKey(`ID:${length - 1}`)
    }, [matcher.matchersList.length])
    const onEdit = useMemoizedFn((field: string, value, index: number) => {
        if (notEditable) return
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
                onChange={(key) => setActiveKey(key as string)}
                accordion
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
                                {matcherItem.Group.length > 0 ? (
                                    <span className={styles["header-number"]}>{matcherItem.Group.length}</span>
                                ) : (
                                    <YakitTag color='danger' size='small'>
                                        暂未设置条件
                                    </YakitTag>
                                )}
                            </div>
                        }
                        extra={
                            !notEditable && (
                                <TrashIcon
                                    className={styles["trash-icon"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        matcher.matchersList.splice(index, 1)
                                        setMatcher({
                                            ...matcher,
                                            matchersList: [...matcher.matchersList]
                                        })
                                        if (index === 0) {
                                            setActiveKey(`ID:${index + 1}`)
                                        } else {
                                            setActiveKey(`ID:${index - 1}`)
                                        }
                                    }}
                                />
                            )
                        }
                        key={`ID:${index}`}
                    >
                        <MatcherItem
                            matcherItem={matcherItem}
                            notEditable={notEditable}
                            onEdit={(field, value) => onEdit(field, value, index)}
                        />
                    </Panel>
                ))}
            </Collapse>
        </div>
    )
})

export const MatcherItem: React.FC<MatcherItemProps> = React.memo((props) => {
    const {notEditable, matcherItem, onEdit} = props
    return (
        <>
            <div
                className={classNames(styles["collapse-panel-condition"], {
                    [styles["collapse-panel-condition-notEditable"]]: notEditable
                })}
            >
                <LabelNodeItem label='匹配类型'>
                    <YakitRadioButtons
                        value={matcherItem.MatcherType}
                        onChange={(e) => {
                            onEdit("MatcherType", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={matcherTypeList}
                    />
                </LabelNodeItem>
                <LabelNodeItem label='匹配位置'>
                    <YakitRadioButtons
                        value={matcherItem.Scope}
                        onChange={(e) => {
                            onEdit("Scope", e.target.value)
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
                            onEdit("Condition", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {label: "AND", value: "and"},
                            {label: "OR", value: "or"}
                        ]}
                    />
                </LabelNodeItem>
                <LabelNodeItem label='不匹配(取反)'>
                    <YakitSwitch checked={matcherItem.Negative} onChange={(checked) => onEdit("Negative", checked)} />
                </LabelNodeItem>
            </div>
            <div className={styles["matching-extraction-list-value"]}>
                {matcherItem.Group.map((groupItem, number) => (
                    <LabelNodeItem label={`Data_${number}`} key={`Data_${number}`}>
                        <div className={styles["matcher-item-textarea-body"]}>
                            {notEditable ? (
                                <div className={styles["matcher-item-text"]}>{groupItem}</div>
                            ) : (
                                <>
                                    <textarea
                                        value={groupItem}
                                        onChange={(e) => {
                                            const {value} = e.target
                                            matcherItem.Group[number] = value
                                            onEdit("Group", matcherItem.Group)
                                        }}
                                        rows={1}
                                        placeholder='请输入...'
                                        className={styles["matcher-item-textarea"]}
                                    />
                                    <ResizerIcon className={styles["resizer-icon"]} />
                                </>
                            )}
                        </div>
                        {!notEditable && (
                            <div className={styles["matcher-item-operate"]}>
                                <TrashIcon
                                    className={styles["trash-icon"]}
                                    onClick={() => {
                                        matcherItem.Group.splice(number, 1)
                                        onEdit("Group", matcherItem.Group)
                                    }}
                                />
                            </div>
                        )}
                    </LabelNodeItem>
                ))}
                {!notEditable && (
                    <LabelNodeItem label={""}>
                        <div className={styles["add-matcher"]}>
                            <div className={styles["divider"]} />
                            <YakitButton
                                type='text'
                                icon={<PlusIcon style={{height: 16}} />}
                                onClick={() => {
                                    if (isMatcherItemEmpty(matcherItem)) {
                                        yakitNotify("error", "请将已添加条件配置完成后再新增")
                                        return
                                    } else {
                                        matcherItem.Group.push("")
                                        onEdit("Group", matcherItem.Group)
                                    }
                                }}
                            >
                                添加匹配内容
                            </YakitButton>
                        </div>
                    </LabelNodeItem>
                )}
            </div>
        </>
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
