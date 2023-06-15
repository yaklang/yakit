import React, {ReactNode, useEffect, useState} from "react"
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
    MatchHTTPResponseParams,
    ColorSelectProps,
    MatchingAndExtraction,
    ExtractorCollapseProps,
    ExtractorItemProps,
    MatcherAndExtractionValueListProps
} from "./MatcherAndExtractionCardType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {HTTPPacketEditor, NewHTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import styles from "./MatcherAndExtraction.module.scss"
import {
    ChevronDownIcon,
    ChevronRightIcon,
    ColorSwatchIcon,
    PencilAltIcon,
    PlusIcon,
    RemoveIcon,
    ResizerIcon,
    TrashIcon
} from "@/assets/newIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Collapse} from "antd"
import classNames from "classnames"
import {useCreation, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitModalConfirm, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import _ from "lodash"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {randomString} from "@/utils/randomUtil"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

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
                        <NewHTTPPacketEditor
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
    const {onClose, onSave, extractorValue, matcherValue, defActiveKey, httpResponse, defActiveType} = props
    const [type, setType] = useState<MatchingAndExtraction>(defActiveType)
    const [matcher, setMatcher] = useState<MatcherValueProps>(matcherValue)
    const [extractor, setExtractor] = useState<ExtractorValueProps>(extractorValue)
    useEffect(() => {
        setType(defActiveType)
    }, [defActiveType])
    useEffect(() => {
        setMatcher(_.cloneDeepWith(matcherValue))
    }, [matcherValue])
    useEffect(() => {
        setExtractor(_.cloneDeepWith(extractorValue))
    }, [extractorValue])
    const onIsEmpty = useMemoizedFn(() => {
        const matcherEmptyList = matcher.matchersList.filter((item) => isMatcherItemEmpty(item))
        const extractorEmptyList = extractor.extractorList.filter((item) => isExtractorEmpty(item))
        return matcherEmptyList.length > 0 || extractorEmptyList.length > 0
    })
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
            matchersList: [...matcher.matchersList, _.cloneDeepWith(defaultMatcherItem)]
        })
    })
    const onAddExtractors = useMemoizedFn(() => {
        if (extractor.extractorList.filter((i) => isExtractorEmpty(i)).length > 0) {
            yakitNotify("error", "已有空匹配器条件")
            return
        }
        setExtractor({
            ...extractor,
            extractorList: [...extractor.extractorList, _.cloneDeepWith(defaultExtractorItem)]
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
        ipcRenderer
            .invoke("ExtractHTTPResponse", {
                HTTPResponse: httpResponse,
                Extractors: extractor.extractorList
            })
            .then((obj: {Values: {Key: string; Value: string}[]}) => {
                console.log("obj", obj)
                if (!obj) {
                    yakitNotify("error", "匹配不到有效结果")
                    return
                }
                if ((obj?.Values || []).length <= 0) {
                    yakitNotify("error", "匹配不到有效结果")
                    return
                }
                showYakitModal({
                    title: "提取结果",
                    width: "60%",
                    footer: <></>,
                    content: (
                        <div style={{margin: 24}}>
                            {obj.Values.map((i) => {
                                return <p>{`${i.Key}: ${i.Value}`}</p>
                            })}
                        </div>
                    )
                })
            })
    })
    const onApply = useMemoizedFn(() => {
        if (onIsEmpty()) {
            onApplyConfirm()
        } else {
            onSave(matcher, extractor)
            onClose()
        }
    })
    const onApplyConfirm = useMemoizedFn(() => {
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
                            Groups: item.Groups.filter((g) => g !== "")
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
    })
    const onCheckClose = useMemoizedFn(() => {
        // 关闭优先检测是否有空的条件
        if (onIsEmpty()) {
            onApplyConfirm()
            return
        }
        // 没有空的条件，再检测两次的值是否一致,不一致需提示用户
        if (_.isEqual(matcherValue, matcher) && _.isEqual(extractorValue, extractor)) {
            onClose()
        } else {
            let m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "不应用",
                onOkText: "应用",
                icon: <ExclamationCircleOutlined />,
                onOk: () => {
                    onApply()
                    m.destroy()
                },
                onCancel: () => {
                    onClose()
                    m.destroy()
                },
                content: "是否应用修改的内容"
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
                            const {value} = e.target
                            setType(value)
                            if (value === "matchers" && matcher.matchersList.length === 0) {
                                setMatcher({
                                    ...matcher,
                                    matchersList: [_.cloneDeepWith(defaultMatcherItem)]
                                })
                            }
                            if (value === "extractors" && extractor.extractorList.length === 0) {
                                setExtractor({
                                    ...extractor,
                                    extractorList: [_.cloneDeepWith(defaultExtractorItem)]
                                })
                            }
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
            <MatcherCollapse type={type} matcher={matcher} setMatcher={setMatcher} defActiveKey={defActiveKey} />
            <ExtractorCollapse
                type={type}
                extractor={extractor}
                setExtractor={setExtractor}
                defActiveKey={defActiveKey}
            />
        </div>
    )
})

export const MatcherCollapse: React.FC<MatcherCollapseProps> = React.memo((props) => {
    const {type, matcher, setMatcher, notEditable, defActiveKey} = props
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
        <div
            className={classNames("yakit-collapse", styles["matching-extraction-content"], {
                [styles["matching-extraction-content-hidden"]]: type !== "matchers"
            })}
        >
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
                    {matcher.filterMode === "onlyMatch" && (
                        <ColorSelect
                            value={matcher.hitColor}
                            onChange={(value) => {
                                setMatcher({
                                    ...matcher,
                                    hitColor: value
                                })
                            }}
                        />
                    )}
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
            <MatcherAndExtractionValueList
                group={matcherItem.Group}
                notEditable={notEditable}
                onEditGroup={(g) => {
                    onEdit("Group", g)
                }}
                onAddGroup={() => {
                    if (isMatcherItemEmpty(matcherItem)) {
                        yakitNotify("error", "请将已添加条件配置完成后再新增")
                        return
                    } else {
                        matcherItem.Group.push("")
                        onEdit("Group", matcherItem.Group)
                    }
                }}
            />
        </>
    )
})

const MatcherAndExtractionValueList: React.FC<MatcherAndExtractionValueListProps> = React.memo((props) => {
    const {group, notEditable, onEditGroup, onAddGroup} = props
    return (
        <div className={styles["matching-extraction-list-value"]}>
            {group.map((groupItem, number) => (
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
                                        group[number] = value
                                        onEditGroup(group)
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
                                    group.splice(number, 1)
                                    onEditGroup(group)
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
                        <YakitButton type='text' icon={<PlusIcon style={{height: 16}} />} onClick={() => onAddGroup()}>
                            添加匹配内容
                        </YakitButton>
                    </div>
                </LabelNodeItem>
            )}
        </div>
    )
})

export const ExtractorCollapse: React.FC<ExtractorCollapseProps> = React.memo((props) => {
    const {type, extractor, setExtractor, defActiveKey, notEditable} = props
    const [activeKey, setActiveKey] = useState<string>("ID:0")
    const [editNameVisible, setEditNameVisible] = useState<boolean>(false)

    useEffect(() => {
        setActiveKey(defActiveKey)
    }, [defActiveKey])
    useEffect(() => {
        const length = extractor.extractorList.length
        setActiveKey(`ID:${length - 1}`)
    }, [extractor.extractorList.length])
    const onEdit = useMemoizedFn((field: string, value, index: number) => {
        if (notEditable) return
        extractor.extractorList[index][field] = value
        setExtractor({
            ...extractor,
            extractorList: [...extractor.extractorList]
        })
    })
    return (
        <div
            className={classNames("yakit-collapse", styles["matching-extraction-content"], {
                [styles["matching-extraction-content-hidden"]]: type !== "extractors"
            })}
        >
            <Collapse
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string)}
                accordion
                ghost
                expandIcon={(e) => (e.isActive ? <ChevronDownIcon /> : <ChevronRightIcon />)}
                className={styles["matcher-extraction-collapse"]}
            >
                {extractor.extractorList.map((extractorItem, index) => (
                    <Panel
                        header={
                            <div className={styles["collapse-panel-header"]}>
                                <span className={classNames(styles["header-id"])}>
                                    <span>{extractorItem.Name || `ID ${index}`}</span>
                                    <YakitPopover
                                        overlayClassName={styles["edit-name-popover"]}
                                        content={
                                            <div
                                                className={styles["edit-name-popover-content"]}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            >
                                                <div className={styles["edit-name-popover-content-title"]}>
                                                    修改名称
                                                </div>
                                                <YakitInput
                                                    value={extractorItem.Name || `ID ${index}`}
                                                    onChange={(e) => {
                                                        if (e.target.value.length > 20) {
                                                            yakitNotify("error", "字符长度不超过20")
                                                            return
                                                        }
                                                        onEdit("Name", e.target.value, index)
                                                    }}
                                                    maxLength={20}
                                                />
                                            </div>
                                        }
                                        placement='top'
                                        trigger={["click"]}
                                        visible={editNameVisible}
                                        onVisibleChange={setEditNameVisible}
                                    >
                                        <PencilAltIcon
                                            className={classNames({
                                                [styles["icon-active"]]: editNameVisible
                                            })}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                        />
                                    </YakitPopover>
                                </span>
                                <span>[{extractorTypeList.find((e) => e.value === extractorItem.Type)?.label}]</span>
                                {extractorItem.Groups.length > 0 ? (
                                    <span className={classNames("content-ellipsis", styles["header-number"])}>
                                        {extractorItem.Groups.length}
                                    </span>
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
                                        extractor.extractorList.splice(index, 1)
                                        setExtractor({
                                            ...extractor,
                                            extractorList: [...extractor.extractorList]
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
                        <ExtractorItem
                            extractorItem={extractorItem}
                            notEditable={notEditable}
                            onEdit={(field, value) => onEdit(field, value, index)}
                        />
                    </Panel>
                ))}
            </Collapse>
        </div>
    )
})

export const ExtractorItem: React.FC<ExtractorItemProps> = React.memo((props) => {
    const {notEditable, extractorItem, onEdit} = props
    const onRenderTypeExtra: ReactNode = useCreation(() => {
        switch (extractorItem.Type) {
            case "regex":
                return (
                    <LabelNodeItem label='匹配正则分组'>
                        <YakitInputNumber
                            value={extractorItem.RegexpMatchGroup[0] || 0}
                            onChange={(value) => onEdit("RegexpMatchGroup", [value])}
                            type='horizontal'
                        />
                    </LabelNodeItem>
                )
            case "xpath":
                return (
                    <LabelNodeItem label='XPath 参数'>
                        <YakitInput
                            value={extractorItem.XPathAttribute}
                            onChange={(e) => onEdit("XPathAttribute", e.target.value)}
                        />
                    </LabelNodeItem>
                )
            default:
                return <></>
        }
    }, [extractorItem.Type, extractorItem.RegexpMatchGroup, extractorItem.XPathAttribute])
    return (
        <>
            <>
                <div
                    className={classNames(styles["collapse-panel-condition"], {
                        [styles["collapse-panel-condition-notEditable"]]: notEditable
                    })}
                >
                    <LabelNodeItem label='提取类型'>
                        <YakitRadioButtons
                            value={extractorItem.Type}
                            onChange={(e) => {
                                onEdit("Type", e.target.value)
                            }}
                            buttonStyle='solid'
                            options={extractorTypeList}
                        />
                    </LabelNodeItem>
                    <LabelNodeItem label='提取范围'>
                        <YakitRadioButtons
                            value={extractorItem.Scope}
                            onChange={(e) => {
                                onEdit("Scope", e.target.value)
                            }}
                            buttonStyle='solid'
                            options={[
                                {label: "响应头", value: "body"},
                                {label: "响应体", value: "header"},
                                {label: "Raw", value: "raw"}
                            ]}
                        />
                    </LabelNodeItem>
                    {onRenderTypeExtra}
                </div>
                <MatcherAndExtractionValueList
                    group={extractorItem.Groups}
                    notEditable={notEditable}
                    onEditGroup={(g) => {
                        onEdit("Group", g)
                    }}
                    onAddGroup={() => {
                        if (isExtractorEmpty(extractorItem)) {
                            yakitNotify("error", "请将已添加条件配置完成后再新增")
                            return
                        } else {
                            extractorItem.Groups.push("")
                            onEdit("Groups", extractorItem.Groups)
                        }
                    }}
                />
            </>
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
const colors = [
    {
        color: "red",
        title: "红色"
    },
    {
        color: "green",
        title: "绿色"
    },
    {
        color: "blue",
        title: "蓝色"
    },
    {
        color: "yellow",
        title: "黄色"
    },
    {
        color: "orange",
        title: "橙色"
    },
    {
        color: "purple",
        title: "紫色"
    },
    {
        color: "cyan",
        title: "天蓝色"
    },
    {
        color: "grey",
        title: "灰色"
    }
]
export const ColorSelect: React.FC<ColorSelectProps> = React.memo((props) => {
    const {value, onChange, size} = props
    const [isShowColor, setIsShowColor] = useState<boolean>(false)

    return (
        <YakitPopover
            overlayClassName={styles["color-select-popover"]}
            content={
                <div className={styles["color-select-content"]}>
                    <span className={styles["hit-color"]}>命中颜色</span>
                    <div className={styles["color-list"]}>
                        {colors.map((colorItem) => (
                            <div
                                className={classNames(styles["color-list-item"], {
                                    [styles["color-list-item-active"]]: value === colorItem.color
                                })}
                                key={colorItem.color}
                                onClick={() => {
                                    if (onChange) onChange(colorItem.color)
                                    setIsShowColor(false)
                                }}
                            >
                                <div
                                    className={classNames(styles["color-chunk"], styles[`color-bg-${colorItem.color}`])}
                                />
                                <span>{colorItem.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            }
            placement='bottomLeft'
            visible={isShowColor}
            onVisibleChange={setIsShowColor}
        >
            <div
                className={classNames(styles["color-select-btn"], {
                    [styles["color-select-btn-active"]]: isShowColor,
                    [styles["color-select-btn-small"]]: size === "small",
                    [styles[`color-bg-${value}`]]: !!value
                })}
            >
                {!value && <ColorSwatchIcon />}
            </div>
        </YakitPopover>
    )
})
