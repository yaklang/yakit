import React, {ReactNode, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
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
    MatcherAndExtractionValueListProps,
    ExtractionResultsContentProps,
    MatcherAndExtractionDrawerProps,
    MatcherAndExtractionValueProps,
    MatcherCollapseRefProps,
    FilterEmptySubMatcherFunctionProps
} from "./MatcherAndExtractionCardType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {NewHTTPPacketEditor} from "@/utils/editors"
import styles from "./MatcherAndExtraction.module.scss"
import {
    AdjustmentsIcon,
    ColorSwatchIcon,
    PencilAltIcon,
    PlusIcon,
    RemoveIcon,
    ResizerIcon,
    TrashIcon
} from "@/assets/newIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Alert, Descriptions} from "antd"
import classNames from "classnames"
import {useCreation, useMap, useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitModalConfirm, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import _, {cloneDeep} from "lodash"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {RuleContent} from "@/pages/mitm/MITMRule/MITMRuleFromModal"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AutoTextarea} from "../components/AutoTextarea/AutoTextarea"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {
    defMatcherAndExtractionCode,
    defaultMatcherItem,
    defaultExtractorItem,
    filterModeOptions,
    matchersConditionOptions,
    matcherTypeList,
    extractorTypeList,
    defaultSubMatcherItem
} from "./constants"
import {shallow} from "zustand/shallow"
import {useMenuHeight} from "@/store/menuHeight"
import {TableCellToColorTag} from "@/components/TableVirtualResize/utils"
import {openPacketNewWindow} from "@/utils/openWebsite"
import {useCampare} from "@/hook/useCompare/useCompare"

const {ipcRenderer} = window.require("electron")

const {YakitPanel} = YakitCollapse

const isMatcherItemEmpty = (i: HTTPResponseMatcher) => {
    return (i?.Group || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}

const isExtractorEmpty = (item: HTTPResponseExtractor) => {
    return (item?.Groups || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}

export const MatcherAndExtractionCard: React.FC<MatcherAndExtractionCardProps> = React.memo((props) => {
    const {httpResponse, ...restProps} = props
    const [codeValue, setCodeValue] = useState<string>(httpResponse || defMatcherAndExtractionCode)
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
    useEffect(() => {
        setCodeValue(httpResponse || defMatcherAndExtractionCode)
        setRefreshTrigger(!refreshTrigger)
    }, [httpResponse])
    return (
        <div className={styles["matching-extraction-resize-box"]}>
            <YakitResizeBox
                firstNode={
                    <div className={styles["matching-extraction-editor"]}>
                        <NewHTTPPacketEditor
                            showDownBodyMenu={false}
                            refreshTrigger={refreshTrigger}
                            bordered={false}
                            noHeader={true}
                            originValue={codeValue}
                            onChange={setCodeValue}
                            onClickOpenPacketNewWindowMenu={() => {
                                openPacketNewWindow({
                                    request: {
                                        originValue: codeValue
                                    }
                                })
                            }}
                        />
                    </div>
                }
                secondMinSize={530}
                firstMinSize={300}
                secondNode={<MatcherAndExtraction {...restProps} httpResponse={codeValue} />}
                secondNodeStyle={{paddingLeft: 0}}
                lineDirection='right'
            />
        </div>
    )
})

export const MatcherAndExtraction: React.FC<MatcherAndExtractionProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            pageType,
            onClose,
            onSave,
            extractorValue,
            matcherValue,
            defActiveKey,
            httpResponse,
            defActiveType,
            defActiveKeyAndOrder
        } = props
        const [type, setType] = useState<MatchingAndExtraction>(defActiveType)
        const [matcher, setMatcher] = useState<MatcherValueProps>(matcherValue)
        const [extractor, setExtractor] = useState<ExtractorValueProps>(extractorValue)
        const [executeLoading, setExecuteLoading] = useState<boolean>(false)

        const contentRef = useRef<any>(null)
        const matcherCollapseRef = useRef<MatcherCollapseRefProps>({
            setActiveKey: () => {}
        })
        const {width} = useSize(contentRef) || {width: 0}

        useImperativeHandle(
            ref,
            () => ({
                validate: onValidate
            }),
            [matcher, extractor]
        )

        useEffect(() => {
            setType(defActiveType)
        }, [defActiveType])

        const matcherValueCom = useCampare(matcherValue)
        useEffect(() => {
            setMatcher({
                ..._.cloneDeepWith(matcherValue),
                matchersList:
                    defActiveType === "matchers" && matcherValue.matchersList.length === 0
                        ? [_.cloneDeepWith(defaultMatcherItem)]
                        : _.cloneDeepWith(matcherValue.matchersList)
            })
        }, [matcherValueCom, defActiveType])
        const extractorValueCom = useCampare(extractorValue)
        useEffect(() => {
            setExtractor({
                ..._.cloneDeepWith(extractorValue),
                extractorList:
                    defActiveType === "extractors" && extractorValue.extractorList.length === 0
                        ? [_.cloneDeepWith(defaultExtractorItem)]
                        : _.cloneDeepWith(extractorValue.extractorList)
            })
        }, [extractorValueCom, defActiveType])

        const isEffectiveExtractor: boolean = useMemo(() => {
            return (
                extractor?.extractorList?.filter((i) => !((i?.Groups || []).map((i) => i.trim()).join("") === ""))
                    .length <= 0
            )
        }, [extractor.extractorList])
        const onValidate = useMemoizedFn(() => {
            return new Promise((resolve: (val: MatcherAndExtractionValueProps) => void, reject) => {
                const matcherAndExtractor = onClearEmptyGroups()
                const data: MatcherAndExtractionValueProps = {
                    matcher: {
                        ...matcher,
                        matchersList: matcherAndExtractor.newMatchersList
                    },
                    extractor: {
                        ...extractor,
                        extractorList: matcherAndExtractor.newExtractorList
                    }
                }
                // 没有空的条件，再检测两次的值是否一致,不一致需提示用户
                if (_.isEqual(matcherValue, data.matcher) && _.isEqual(extractorValue, data.extractor)) {
                    resolve(data)
                } else {
                    let m = YakitModalConfirm({
                        width: 420,
                        type: "white",
                        onCancelText: "不应用",
                        onOkText: "应用",
                        icon: <ExclamationCircleOutlined />,
                        onOk: () => {
                            resolve(data)
                            m.destroy()
                        },
                        onCancel: () => {
                            reject(false)
                            // m.destroy()
                        },
                        content: "是否应用修改的内容"
                    })
                }
            })
        })
        const onAddCondition = useMemoizedFn((type: MatchingAndExtraction) => {
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
            if (
                matcher.matchersList.filter((i) => i.SubMatchers.findIndex((ele) => isMatcherItemEmpty(ele)) !== -1)
                    .length > 0
            ) {
                yakitNotify("error", "已有空匹配器条件")
                return
            }
            const newMatchersList = [...matcher.matchersList, _.cloneDeepWith(defaultMatcherItem)]
            setMatcher({
                ...matcher,
                matchersList: newMatchersList
            })
            matcherCollapseRef.current.setActiveKey(newMatchersList.length - 1, "ID:0")
        })
        const onAddExtractors = useMemoizedFn(() => {
            if (extractor.extractorList.filter((i) => isExtractorEmpty(i)).length > 0) {
                yakitNotify("error", "已有空匹配器条件")
                return
            }
            setExtractor({
                ...extractor,
                extractorList: [
                    ...extractor.extractorList,
                    _.cloneDeepWith({...defaultExtractorItem, Name: `data_${extractor.extractorList.length}`})
                ]
            })
        })
        const onExecute = useMemoizedFn(() => {
            switch (type) {
                case "matchers":
                    break
                case "extractors":
                    onExecuteExtractors()
                    break
                default:
                    break
            }
        })

        const onExecuteExtractors = useMemoizedFn(() => {
            if (isEffectiveExtractor) {
                yakitNotify("error", "没有有效提取器（都为空）")
                return
            }
            setExecuteLoading(true)
            ipcRenderer
                .invoke("ExtractHTTPResponse", {
                    HTTPResponse: httpResponse,
                    Extractors: extractor.extractorList
                })
                .then((obj: {Values: {Key: string; Value: string}[]}) => {
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
                        content: <ExtractionResultsContent list={obj.Values || []} />
                    })
                })
                .catch((err) => {
                    yakitNotify("error", "数据提取报错:" + err)
                })
                .finally(() =>
                    setTimeout(() => {
                        setExecuteLoading(false)
                    }, 200)
                )
        })
        const onApplyConfirm = useMemoizedFn(() => {
            const matcherAndExtractor = onClearEmptyGroups()
            if (onIsDuplicateName(matcherAndExtractor.newExtractorList)) return
            onSave(
                {...matcher, matchersList: matcherAndExtractor.newMatchersList},
                {...extractor, extractorList: matcherAndExtractor.newExtractorList}
            )
            onClose()
        })
        /**
         * 提取器名称是否重名 并提示
         * @returns bool
         */
        const onIsDuplicateName = useMemoizedFn((list: HTTPResponseExtractor[]) => {
            let isDuplicateName = false
            const names = list.map((e) => e.Name)
            const nameLength = names.length
            let newNames: string[] = []
            for (let index = 0; index < nameLength; index++) {
                const namesElement = names[index]
                const n = newNames.findIndex((n) => n === namesElement)
                if (n === -1) {
                    newNames.push(namesElement)
                } else {
                    isDuplicateName = true
                    yakitNotify("error", `【${namesElement}】名称重复，请修改后再应用`)
                    break
                }
            }
            return isDuplicateName
        })
        /**
         * @returns 返回过滤空值的Group的匹配器和提取器数据
         */
        const onClearEmptyGroups = useMemoizedFn(() => {
            const newMatchersList: HTTPResponseMatcher[] = []
            matcher.matchersList.forEach((item) => {
                const subMatcher: HTTPResponseMatcher[] = []
                item.SubMatchers.forEach((subItem) => {
                    if (subItem.Group.join("") === "") return
                    subMatcher.push({
                        ...subItem,
                        Group: subItem.Group.filter((g) => g !== "")
                    })
                })
                if (subMatcher.length > 0) {
                    newMatchersList.push({
                        ...item,
                        SubMatchers: subMatcher
                    })
                }
            })
            const newExtractorList: HTTPResponseExtractor[] = []
            extractor.extractorList.forEach((item) => {
                if (item.Groups.join("") === "") return
                newExtractorList.push({
                    ...item,
                    Groups: item.Groups.filter((g) => g !== "")
                })
            })
            return {
                newMatchersList,
                newExtractorList
            }
        })

        const onCheckClose = useMemoizedFn(() => {
            const matcherAndExtractor = onClearEmptyGroups()
            const data = {
                matcher: {
                    ...matcher,
                    matchersList: matcherAndExtractor.newMatchersList
                },
                extractor: {
                    ...extractor,
                    extractorList: matcherAndExtractor.newExtractorList
                }
            }
            // 没有空的条件，再检测两次的值是否一致,不一致需提示用户
            if (_.isEqual(matcherValue, data.matcher) && _.isEqual(extractorValue, data.extractor)) {
                onClose()
                return
            } else {
                let m = YakitModalConfirm({
                    width: 420,
                    type: "white",
                    onCancelText: "不应用",
                    onOkText: "应用",
                    icon: <ExclamationCircleOutlined />,
                    onOk: () => {
                        onApplyConfirm()
                        m.destroy()
                    },
                    onCancel: () => {
                        onClose()
                        // m.destroy()
                    },
                    content: "是否应用修改的内容"
                })
            }
        })
        const isSmallMode: boolean = useMemo(() => {
            if (width) {
                return width < 550
            } else {
                return false
            }
        }, [width])
        return (
            <YakitSpin spinning={executeLoading}>
                <div className={styles["matching-extraction"]} ref={contentRef}>
                    <div className={styles["matching-extraction-heard"]}>
                        <div className={styles["matching-extraction-title"]}>
                            {pageType === "webfuzzer" ? (
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
                                    size={isSmallMode ? "small" : "middle"}
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
                            ) : (
                                "匹配器"
                            )}
                            <span className={styles["matching-extraction-title-tip"]}>
                                已添加
                                <span className={styles["primary-number"]}>
                                    {type === "matchers" ? matcher.matchersList.length : extractor.extractorList.length}
                                </span>
                                条
                            </span>
                        </div>
                        <div className={styles["matching-extraction-extra"]}>
                            <>
                                {type === "matchers" ? (
                                    <YakitButton
                                        type='outline1'
                                        icon={<PlusIcon />}
                                        onClick={() => onAddCondition("matchers")}
                                        size={isSmallMode ? "small" : undefined}
                                    >
                                        添加匹配器
                                    </YakitButton>
                                ) : (
                                    <>
                                        <YakitButton
                                            type='outline1'
                                            icon={<PlusIcon />}
                                            onClick={() => onAddCondition("extractors")}
                                            size={isSmallMode ? "small" : undefined}
                                        >
                                            添加条件
                                        </YakitButton>
                                        <YakitButton
                                            type='outline1'
                                            onClick={() => onExecute()}
                                            size={isSmallMode ? "small" : undefined}
                                        >
                                            调试执行
                                        </YakitButton>
                                    </>
                                )}
                            </>
                            <YakitButton
                                type='primary'
                                onClick={() => onApplyConfirm()}
                                size={isSmallMode ? "small" : undefined}
                            >
                                应用
                            </YakitButton>
                            <RemoveIcon className={styles["remove-icon"]} onClick={() => onCheckClose()} />
                        </div>
                    </div>
                    <MatcherCollapse
                        ref={matcherCollapseRef}
                        type={type}
                        matcher={matcher}
                        setMatcher={setMatcher}
                        defActiveKeyAndOrder={defActiveKeyAndOrder}
                        httpResponse={httpResponse}
                        isSmallMode={isSmallMode}
                        pageType={pageType}
                    />
                    {pageType === "webfuzzer" && (
                        <ExtractorCollapse
                            type={type}
                            extractor={extractor}
                            setExtractor={setExtractor}
                            defActiveKey={defActiveKey}
                            httpResponse={httpResponse}
                            isSmallMode={isSmallMode}
                        />
                    )}
                </div>
            </YakitSpin>
        )
    })
)

const isMatcherEmpty = (matchersList) => {
    return matchersList?.filter((i) => !((i?.Group || []).map((i) => i.trim()).join("") === "")).length <= 0
}
export const onFilterEmptySubMatcher = (param: FilterEmptySubMatcherFunctionProps) => {
    const {matchers, index, subIndex} = param
    const matchersCopy = cloneDeep(matchers)
    let newMatchers: HTTPResponseMatcher[] = []
    matchersCopy.forEach((m, n) => {
        if (n === index) {
            m.SubMatchers = m.SubMatchers.filter((_, s) => s !== subIndex)
        }
        if (m.SubMatchers.length > 0) {
            newMatchers.push(m)
        }
    })
    return newMatchers
}
export const MatcherCollapse: React.FC<MatcherCollapseProps> = React.memo(
    forwardRef((props, ref) => {
        const {type, matcher, setMatcher, notEditable, defActiveKeyAndOrder, httpResponse, isSmallMode, pageType} =
            props
        const [activeKey, {set: setActiveKey, get: getActiveKey}] = useMap<number, string>(
            new Map([[0, `${defActiveKeyAndOrder.defActiveKey || "ID:0"}`]])
        )
        const [executingItemList, setExecutingItemList] = useState<number[]>([])

        useImperativeHandle(
            ref,
            () => ({
                setActiveKey: (order, activeKey) => {
                    setActiveKey(order, activeKey)
                }
            }),
            []
        )
        useUpdateEffect(() => {
            setActiveKey(defActiveKeyAndOrder.order, defActiveKeyAndOrder.defActiveKey)
        }, [defActiveKeyAndOrder])
        const onEditMatcher = useMemoizedFn((params: {field: string; value: string; index: number}) => {
            if (notEditable) return
            const {field, value, index} = params
            matcher.matchersList[index][field] = value
            setMatcher({
                ...matcher,
                matchersList: [...matcher.matchersList]
            })
        })
        const onEditSubMatcher = useMemoizedFn(
            (params: {field: string; value: string[]; index: number; subIndex: number}) => {
                if (notEditable) return
                const {field, value, index, subIndex} = params
                matcher.matchersList[index].SubMatchers[subIndex][field] = value
                setMatcher({
                    ...matcher,
                    matchersList: [...matcher.matchersList]
                })
            }
        )
        const onAddSubCondition = useMemoizedFn((subItem: HTTPResponseMatcher, number: number) => {
            if (notEditable) return
            if (isMatcherEmpty(subItem.SubMatchers)) {
                yakitNotify("error", "该匹配器已有空匹配器条件")
                return
            }
            try {
                matcher.matchersList[number] = {
                    ...matcher.matchersList[number],
                    SubMatchers: [...matcher.matchersList[number].SubMatchers, _.cloneDeepWith(defaultSubMatcherItem)]
                }
                setMatcher({
                    ...matcher,
                    matchersList: [...matcher.matchersList]
                })
                const activeKey = matcher.matchersList[number].SubMatchers.length - 1
                setActiveKey(number, `ID:${activeKey}`)
            } catch (error) {
                yakitNotify("error", `添加匹配器条件失败:${error}`)
            }
        })
        const onExecuteMatcher = useMemoizedFn((subItem: HTTPResponseMatcher, number: number) => {
            if (notEditable) return
            const matchers = matcher.matchersList[number]
            const matchHTTPResponseParams: MatchHTTPResponseParams = {
                HTTPResponse: httpResponse,
                Matchers: matchers.SubMatchers,
                MatcherCondition: matchers.SubMatcherCondition
            }
            if (isMatcherEmpty(matchers.SubMatchers)) {
                yakitNotify("error", "所有匹配条件均为空，请先设置条件")
                return
            }
            setExecutingItemList((v) => [...v, number])
            ipcRenderer
                .invoke("MatchHTTPResponse", matchHTTPResponseParams)
                .then((data: {Matched: boolean}) => {
                    if (data.Matched) {
                        yakitNotify("success", "匹配成功")
                    } else {
                        yakitNotify("error", "匹配失败")
                    }
                })
                .catch((err) => {
                    yakitNotify("error", "匹配报错:" + err)
                })
                .finally(() =>
                    setTimeout(() => {
                        setExecutingItemList((v) => v.filter((ele) => ele !== number))
                    }, 200)
                )
        })
        const onRemoveMatcher = useMemoizedFn((number: number) => {
            if (notEditable) return
            setMatcher({
                ...matcher,
                matchersList: matcher.matchersList.filter((_, i) => i !== number)
            })
        })
        const onRemoveSubMatcher = useMemoizedFn((number: number, subIndex: number) => {
            if (notEditable) return
            try {
                const params: FilterEmptySubMatcherFunctionProps = {
                    matchers: matcher.matchersList,
                    index: number,
                    subIndex
                }
                const newMatchers = onFilterEmptySubMatcher(params)
                setMatcher({
                    ...matcher,
                    matchersList: [...newMatchers]
                })
                if (subIndex === 0) {
                    setActiveKey(number, `ID:${subIndex + 1}`)
                } else {
                    setActiveKey(number, `ID:${subIndex - 1}`)
                }
            } catch (error) {
                yakitNotify("error", `onRemoveSubMatcher 失败:${error}`)
            }
        })
        return (
            <div
                className={classNames(styles["matching-extraction-content"], {
                    [styles["matching-extraction-content-hidden"]]: type !== "matchers"
                })}
            >
                <Alert
                    message={
                        pageType === "webfuzzer"
                            ? "多个匹配器是为了同时达到多个功能效果，比如染不同颜色或丢包的同时染色，如需要转成yaml只能配置一个匹配器"
                            : "应用匹配器后，流量先经过匹配器条件过滤后，再根据规则/热加载配置进一步处理"
                    }
                    type='warning'
                    style={{marginBottom: 8}}
                />
                {/* key值待优化 */}
                {matcher.matchersList.map((item, number) => (
                    <div className={styles["matching-list-item"]} key={number}>
                        <YakitSpin spinning={executingItemList.includes(number)}>
                            <div className={styles["matching-extraction-condition"]}>
                                <div className={styles["matching-extraction-condition-left"]}>
                                    <div className={styles["condition-mode"]}>
                                        <span className={styles["condition-mode-text"]}>过滤器模式</span>
                                        <YakitRadioButtons
                                            value={item.filterMode}
                                            onChange={(e) => {
                                                onEditMatcher({
                                                    field: "filterMode",
                                                    value: e.target.value,
                                                    index: number
                                                })
                                            }}
                                            buttonStyle='solid'
                                            options={filterModeOptions}
                                            size={isSmallMode ? "small" : "middle"}
                                        />
                                        {item.filterMode === "onlyMatch" && (
                                            <ColorSelect
                                                value={item.HitColor}
                                                onChange={(value) => {
                                                    onEditMatcher({field: "HitColor", value: value, index: number})
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className={styles["condition-mode"]}>
                                        <span className={styles["condition-mode-text"]}>条件关系</span>
                                        <YakitRadioButtons
                                            value={item.SubMatcherCondition}
                                            onChange={(e) => {
                                                onEditMatcher({
                                                    field: "SubMatcherCondition",
                                                    value: e.target.value,
                                                    index: number
                                                })
                                            }}
                                            buttonStyle='solid'
                                            options={matchersConditionOptions}
                                            size={isSmallMode ? "small" : "middle"}
                                        />
                                    </div>
                                </div>
                                {!notEditable && (
                                    <div className={styles["matching-extraction-condition-right"]}>
                                        <YakitButton
                                            type='outline1'
                                            icon={<PlusIcon />}
                                            onClick={() => onAddSubCondition(item, number)}
                                            size={isSmallMode ? "small" : undefined}
                                        >
                                            添加条件
                                        </YakitButton>
                                        <YakitButton
                                            type='outline1'
                                            onClick={() => onExecuteMatcher(item, number)}
                                            size={isSmallMode ? "small" : undefined}
                                        >
                                            调试执行
                                        </YakitButton>
                                        {number > 0 && (
                                            <TrashIcon
                                                className={styles["trash-icon"]}
                                                onClick={() => onRemoveMatcher(number)}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                            <YakitCollapse
                                activeKey={getActiveKey(number)}
                                onChange={(key) => setActiveKey(number, key as string)}
                                accordion
                                className={styles["matcher-extraction-collapse"]}
                            >
                                {item.SubMatchers.map((matcherItem, subIndex) => (
                                    <YakitPanel
                                        header={
                                            <div className={styles["collapse-panel-header"]}>
                                                <span className={styles["header-id"]}>ID&nbsp;{subIndex}</span>
                                                <span>
                                                    [
                                                    {
                                                        matcherTypeList.find((e) => e.value === matcherItem.MatcherType)
                                                            ?.label
                                                    }
                                                    ]
                                                </span>
                                                {matcherItem.Group.length > 0 ? (
                                                    <span className={styles["header-number"]}>
                                                        {matcherItem.Group.length}
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
                                                        onRemoveSubMatcher(number, subIndex)
                                                    }}
                                                />
                                            )
                                        }
                                        key={`ID:${subIndex}`}
                                    >
                                        <MatcherItem
                                            matcherItem={matcherItem}
                                            notEditable={notEditable}
                                            onEdit={(field, value) =>
                                                onEditSubMatcher({field, value, subIndex, index: number})
                                            }
                                            httpResponse={httpResponse}
                                            isSmallMode={isSmallMode}
                                        />
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                        </YakitSpin>
                    </div>
                ))}
            </div>
        )
    })
)

export const MatcherItem: React.FC<MatcherItemProps> = React.memo((props) => {
    const {notEditable, matcherItem, onEdit, httpResponse, isSmallMode} = props

    return (
        <>
            <div
                className={classNames(styles["collapse-panel-condition"], {
                    [styles["collapse-panel-condition-notEditable"]]: notEditable
                })}
            >
                <LabelNodeItem label='匹配类型' column={isSmallMode}>
                    <YakitRadioButtons
                        value={matcherItem.MatcherType}
                        onChange={(e) => {
                            onEdit("MatcherType", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={matcherTypeList}
                    />
                </LabelNodeItem>
                <LabelNodeItem label='匹配位置' column={isSmallMode}>
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
                <LabelNodeItem label='条件关系' column={isSmallMode}>
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
                <LabelNodeItem label='不匹配(取反)' column={isSmallMode}>
                    <YakitSwitch checked={matcherItem.Negative} onChange={(checked) => onEdit("Negative", checked)} />
                </LabelNodeItem>
            </div>
            <MatcherAndExtractionValueList
                httpResponse={httpResponse}
                showRegex={matcherItem.MatcherType === "regex"}
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

export const MatcherAndExtractionValueList: React.FC<MatcherAndExtractionValueListProps> = React.memo((props) => {
    const {showRegex, group, notEditable, onEditGroup, onAddGroup, httpResponse} = props
    const onChangeGroupItemValue = useMemoizedFn((v: string, number: number) => {
        group[number] = v
        onEditGroup(group)
    })
    return (
        <div className={styles["matching-extraction-list-value"]}>
            {group.map((groupItem, number) => (
                <LabelNodeItem label={`${!showRegex ? number : "Regexp"}`} key={`Data_${number}`}>
                    <div className={styles["matcher-item-textarea-body"]}>
                        {notEditable ? (
                            <div className={styles["matcher-item-text"]}>{groupItem}</div>
                        ) : (
                            <>
                                <AutoTextarea
                                    value={groupItem}
                                    onChange={(e) => {
                                        onChangeGroupItemValue(e.target.value, number)
                                    }}
                                    placeholder='请输入...'
                                    className={styles["matcher-item-textarea"]}
                                />
                                <ResizerIcon className={styles["resizer-icon"]} />
                            </>
                        )}
                    </div>
                    {!notEditable && (
                        <div className={styles["matcher-item-operate"]}>
                            {showRegex && (
                                <RuleContent
                                    getRule={(rule) => {
                                        onChangeGroupItemValue(rule, number)
                                    }}
                                    defaultCode={httpResponse}
                                >
                                    <AdjustmentsIcon className={styles["adjustments-icon"]} />
                                </RuleContent>
                            )}
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
            {!notEditable && !showRegex && (
                <LabelNodeItem label={""}>
                    <div className={styles["add-matcher"]}>
                        <div className={styles["divider"]} />
                        <YakitButton
                            type='text'
                            icon={<PlusIcon />}
                            style={{justifyContent: "flex-start"}}
                            onClick={() => onAddGroup()}
                        >
                            添加匹配内容
                        </YakitButton>
                    </div>
                </LabelNodeItem>
            )}
        </div>
    )
})

export const ExtractorCollapse: React.FC<ExtractorCollapseProps> = React.memo((props) => {
    const {type, extractor, setExtractor, defActiveKey, notEditable, httpResponse, isSmallMode} = props

    const [activeKey, setActiveKey] = useState<string>(defActiveKey || "ID:0")
    const [editNameVisible, setEditNameVisible] = useState<boolean>(false)
    const [currentIndex, setCurrentIndex] = useState<number>()

    useUpdateEffect(() => {
        setActiveKey(defActiveKey)
    }, [defActiveKey])
    useUpdateEffect(() => {
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
    const onEditName = useMemoizedFn((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const {value} = e.target
        if (value.length > 20) {
            yakitNotify("error", "字符长度不超过20")
            return
        }
        onEdit("Name", value || `data_${index}`, index)
    })
    return (
        <div
            className={classNames(styles["matching-extraction-content"], {
                [styles["matching-extraction-content-hidden"]]: type !== "extractors"
            })}
            style={{paddingTop: 8}}
        >
            <YakitCollapse
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string)}
                accordion
                className={styles["matcher-extraction-collapse"]}
            >
                {extractor.extractorList.map((extractorItem, index) => (
                    <YakitPanel
                        header={
                            <div className={styles["collapse-panel-header"]}>
                                <span className={classNames(styles["header-id"])}>
                                    <span>{extractorItem.Name || `data_${index}`}</span>
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
                                                    defaultValue={extractorItem.Name}
                                                    onChange={(e) => {
                                                        onEditName(e, index)
                                                    }}
                                                    onBlur={(e) => {
                                                        onEditName(e, index)
                                                    }}
                                                    maxLength={20}
                                                />
                                            </div>
                                        }
                                        placement='top'
                                        trigger={["click"]}
                                        visible={editNameVisible && currentIndex === index}
                                        onVisibleChange={setEditNameVisible}
                                    >
                                        <PencilAltIcon
                                            className={classNames({
                                                [styles["icon-active"]]: editNameVisible && currentIndex === index
                                            })}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setCurrentIndex(index)
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
                            httpResponse={httpResponse}
                            isSmallMode={isSmallMode}
                        />
                    </YakitPanel>
                ))}
            </YakitCollapse>
        </div>
    )
})

export const ExtractorItem: React.FC<ExtractorItemProps> = React.memo((props) => {
    const {notEditable, extractorItem, onEdit, httpResponse, isSmallMode} = props
    const onRenderTypeExtra: ReactNode = useCreation(() => {
        switch (extractorItem.Type) {
            case "regex":
                return (
                    <LabelNodeItem label='匹配正则分组'>
                        <YakitInputNumber
                            value={extractorItem.RegexpMatchGroup[0] || 0}
                            onChange={(value) => onEdit("RegexpMatchGroup", [value])}
                            type='horizontal'
                            min={0}
                            size='small'
                        />
                    </LabelNodeItem>
                )
            case "xpath":
                return (
                    <LabelNodeItem label='XPath 参数'>
                        <YakitInput
                            value={extractorItem.XPathAttribute}
                            onChange={(e) => onEdit("XPathAttribute", e.target.value)}
                            size='small'
                        />
                    </LabelNodeItem>
                )
            default:
                return <></>
        }
    }, [extractorItem.Type, extractorItem.RegexpMatchGroup, extractorItem.XPathAttribute])
    return (
        <>
            <div
                className={classNames(styles["collapse-panel-condition"], {
                    [styles["collapse-panel-condition-notEditable"]]: notEditable
                })}
            >
                <LabelNodeItem label='提取类型' column={isSmallMode}>
                    <YakitRadioButtons
                        value={extractorItem.Type}
                        onChange={(e) => {
                            onEdit("Type", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={extractorTypeList}
                    />
                </LabelNodeItem>
                <LabelNodeItem label='提取范围' column={isSmallMode}>
                    <YakitRadioButtons
                        value={extractorItem.Scope}
                        onChange={(e) => {
                            onEdit("Scope", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {label: "响应头", value: "header"},
                            {label: "响应体", value: "body"},
                            {label: "Raw", value: "raw"}
                        ]}
                    />
                </LabelNodeItem>
                {onRenderTypeExtra}
            </div>
            <MatcherAndExtractionValueList
                httpResponse={httpResponse}
                showRegex={extractorItem.Type === "regex"}
                group={extractorItem.Groups}
                notEditable={notEditable}
                onEditGroup={(g) => {
                    onEdit("Groups", g)
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
    )
})

export const LabelNodeItem: React.FC<labelNodeItemProps> = React.memo((props) => {
    const {column} = props
    return (
        <div
            className={classNames(
                styles["label-node"],
                {
                    [styles["label-node-column"]]: column
                },
                props.className
            )}
        >
            <span className={classNames(styles["label"], props.labelClassName)}>{props.label}</span>
            {props.children}
        </div>
    )
})
const colors: {color: string; title: string}[] = [
    {
        color: TableCellToColorTag["RED"],
        title: "红色"
    },
    {
        color: TableCellToColorTag["GREEN"],
        title: "绿色"
    },
    {
        color: TableCellToColorTag["BLUE"],
        title: "蓝色"
    },
    {
        color: TableCellToColorTag["YELLOW"],
        title: "黄色"
    },
    {
        color: TableCellToColorTag["ORANGE"],
        title: "橙色"
    },
    {
        color: TableCellToColorTag["PURPLE"],
        title: "紫色"
    },
    {
        color: TableCellToColorTag["CYAN"],
        title: "青色"
    },
    {
        color: TableCellToColorTag["GREY"],
        title: "灰色"
    }
]
export const ColorSelect: React.FC<ColorSelectProps> = React.memo((props) => {
    const {value, onChange, size} = props
    const [isShowColor, setIsShowColor] = useState<boolean>(false)

    const getColorClassName = useMemoizedFn((content?: string) => {
        if (!content) return ""

        let colorClassName = ""
        try {
            const color = content.split("_").pop() || ""
            if (TableCellToColorTag[color]) {
                colorClassName = `color-bg-${color.toLowerCase()}`
            }
        } catch (error) {}
        return colorClassName
    })
    return (
        <YakitPopover
            overlayClassName={styles["color-select-popover"]}
            content={
                <div className={styles["color-select-content"]}>
                    <span className={styles["hit-color"]}>命中颜色</span>
                    <div className={styles["color-list"]}>
                        {colors.map((colorItem) => {
                            let colorClassName = getColorClassName(colorItem.color)
                            return (
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
                                    <div className={classNames(styles["color-chunk"], colorClassName)} />
                                    <span>{colorItem.title}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            }
            placement='bottom'
            visible={isShowColor}
            onVisibleChange={setIsShowColor}
        >
            <div
                className={classNames(styles["color-select-btn"], {
                    [styles["color-select-btn-active"]]: isShowColor,
                    [styles["color-select-btn-small"]]: size === "small",
                    [getColorClassName(value)]: !!value && getColorClassName(value)
                })}
            >
                {!value && <ColorSwatchIcon />}
            </div>
        </YakitPopover>
    )
})

export const ExtractionResultsContent: React.FC<ExtractionResultsContentProps> = React.memo((props) => {
    const {list = []} = props
    return (
        <div className={classNames(styles["extract-results"], "yakit-descriptions")}>
            <Descriptions bordered size='small' column={2}>
                {list.map((item, index) => (
                    <Descriptions.Item
                        label={<YakitCopyText showText={item.Key} />}
                        key={`${item.Key}-${item.Value}`}
                        span={2}
                    >
                        {item.Value ? <YakitCopyText showText={item.Value} /> : ""}
                    </Descriptions.Item>
                ))}
            </Descriptions>
        </div>
    )
})

export const MatcherAndExtractionDrawer: React.FC<MatcherAndExtractionDrawerProps> = React.memo((props) => {
    const {
        pageType = "webfuzzer",
        visibleDrawer,
        defActiveType,
        httpResponse,
        defActiveKey,
        matcherValue,
        extractorValue,
        onClose,
        onSave,
        defActiveKeyAndOrder
    } = props
    const {menuBodyHeight} = useMenuHeight(
        (s) => ({
            menuBodyHeight: s.menuBodyHeight
        }),
        shallow
    )
    const heightDrawer = useMemo(() => {
        return menuBodyHeight.firstTabMenuBodyHeight - 40
    }, [menuBodyHeight.firstTabMenuBodyHeight])

    return (
        <YakitDrawer
            mask={false}
            visible={visibleDrawer}
            width='100vh'
            headerStyle={{display: "none"}}
            style={{height: visibleDrawer ? heightDrawer : 0}}
            contentWrapperStyle={{height: heightDrawer, boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
            bodyStyle={{padding: 0}}
            placement='bottom'
        >
            <MatcherAndExtractionCard
                pageType={pageType}
                defActiveType={defActiveType}
                httpResponse={httpResponse}
                defActiveKey={defActiveKey}
                matcherValue={matcherValue}
                extractorValue={extractorValue}
                onClose={onClose}
                onSave={onSave}
                defActiveKeyAndOrder={defActiveKeyAndOrder}
            />
        </YakitDrawer>
    )
})
