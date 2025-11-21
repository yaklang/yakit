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
import {Alert, Descriptions, Divider} from "antd"
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
    defaultSubMatcherItem,
    ScopeList,
    MatchersAndExtractorsUseInstructions
} from "./constants"
import {shallow} from "zustand/shallow"
import {useMenuHeight} from "@/store/menuHeight"
import {TableCellToColorTag} from "@/components/TableVirtualResize/utils"
import {openPacketNewWindow} from "@/utils/openWebsite"
import {useCampare} from "@/hook/useCompare/useCompare"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {Trans} from "react-i18next"
import i18n from "@/i18n/i18n"
import MDEditor from "@uiw/react-md-editor"
import { YakitSegmented } from "@/components/yakitUI/YakitSegmented/YakitSegmented"
const {Markdown} = MDEditor

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
            httpRequest = "",
            isHttps = false,
            defActiveType,
            defActiveKeyAndOrder,
            hasApplyBtn = false
        } = props
        const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
        const [type, setType] = useState<MatchingAndExtraction>(defActiveType)
        const [matcher, setMatcher] = useState<MatcherValueProps>(matcherValue)
        const [extractor, setExtractor] = useState<ExtractorValueProps>(extractorValue)
        const [executeLoading, setExecuteLoading] = useState<boolean>(false)

        const contentRef = useRef<any>(null)
        
        const onShowUseInstructions = useMemoizedFn(() => {
            const m = showYakitModal({
                title: t("MatcherAndExtraction.matchersAndExtractorsUseInstructions"),
                type: "white",
                onOkText: "我知道了",
                onOk: () => m.destroy(),
                cancelButtonProps: {style: {display: "none"}},
                width: "60%",
                maskClosable: false,
                content: (
                    <div className={styles["extract-results"]}>
                        <Markdown source={MatchersAndExtractorsUseInstructions} />
                    </div>
                )
            })
        })
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
                        onCancelText: t("YakitButton.do_not_apply"),
                        onOkText: t("YakitButton.apply"),
                        icon: <ExclamationCircleOutlined />,
                        onOk: () => {
                            resolve(data)
                            m.destroy()
                        },
                        onCancel: () => {
                            reject(false)
                            // m.destroy()
                        },
                        content: t("MatcherAndExtraction.apply_changes_prompt")
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
                yakitNotify("error", t("MatcherAndExtraction.empty_matcher_exists"))
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
                yakitNotify("error", t("MatcherAndExtraction.empty_matcher_exists"))
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
                yakitNotify("error", t("MatcherAndExtraction.no_valid_extractor"))
                return
            }
            setExecuteLoading(true)
            ipcRenderer
                .invoke("ExtractHTTPResponse", {
                    HTTPResponse: httpResponse,
                    HTTPRequest: httpRequest,
                    IsHTTPS: isHttps,
                    Extractors: extractor.extractorList
                })
                .then((obj: {Values: {Key: string; Value: string}[]}) => {
                    if (!obj) {
                        yakitNotify("error", t("MatcherAndExtraction.no_valid_match_found"))
                        return
                    }
                    if ((obj?.Values || []).length <= 0) {
                        yakitNotify("error", t("MatcherAndExtraction.no_valid_match_found"))
                        return
                    }
                    showYakitModal({
                        title: t("MatcherAndExtraction.extractionResult"),
                        width: "60%",
                        footer: <></>,
                        content: <ExtractionResultsContent list={obj.Values || []} />
                    })
                })
                .catch((err) => {
                    yakitNotify("error", t("MatcherAndExtraction.data_extraction_error") + err)
                })
                .finally(() =>
                    setTimeout(() => {
                        setExecuteLoading(false)
                    }, 200)
                )
        })
        const onApplyConfirm = useMemoizedFn((type: 'save'| 'apply'='save') => {
            const matcherAndExtractor = onClearEmptyGroups()
            if (onIsDuplicateName(matcherAndExtractor.newExtractorList)) return
            onSave(
                {...matcher, matchersList: matcherAndExtractor.newMatchersList},
                {...extractor, extractorList: matcherAndExtractor.newExtractorList},
                type === 'apply'
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
                    yakitNotify("error", t("MatcherAndExtraction.duplicate_name_error", {namesElement}))
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
                    onCancelText: t("YakitButton.doNotSave"),
                    onOkText: t("YakitButton.save"),
                    icon: <ExclamationCircleOutlined />,
                    onOk: () => {
                        onApplyConfirm('save')
                        m.destroy()
                    },
                    onCancel: () => {
                        onClose()
                        // m.destroy()
                    },
                    content: t("MatcherAndExtraction.save_changes_prompt")
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
                                            label: t("MatcherAndExtraction.matcher")
                                        },
                                        {
                                            value: "extractors",
                                            label: t("MatcherAndExtraction.extractor")
                                        }
                                    ]}
                                />
                            ) : (
                                t("MatcherAndExtraction.matcher")
                            )}
                            <Trans
                                i18nKey='MatcherAndExtraction.matching_extraction_tip'
                                ns='webFuzzer'
                                components={{count: <span className={styles["primary-number"]} />}}
                                values={{
                                    num:
                                        type === "matchers"
                                            ? matcher.matchersList.length
                                            : extractor.extractorList.length
                                }}
                            />
                            <YakitButton 
                                type="text" 
                                onClick={onShowUseInstructions}
                            >
                                    {t("MatcherAndExtraction.useInstructions")}
                            </YakitButton>
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
                                        {t("MatcherAndExtraction.addMatcher")}
                                    </YakitButton>
                                ) : (
                                    <>
                                        <YakitButton
                                            type='outline1'
                                            icon={<PlusIcon />}
                                            onClick={() => onAddCondition("extractors")}
                                            size={isSmallMode ? "small" : undefined}
                                        >
                                            {t("MatcherAndExtraction.addCondition")}
                                        </YakitButton>
                                        <YakitButton
                                            type='outline1'
                                            onClick={() => onExecute()}
                                            size={isSmallMode ? "small" : undefined}
                                        >
                                            {t("MatcherAndExtraction.debugExecute")}
                                        </YakitButton>
                                    </>
                                )}
                            </>
                            <YakitButton
                                type= {hasApplyBtn ? "outline1" : 'primary'}
                                onClick={() => onApplyConfirm('save')}
                                size={isSmallMode ? "small" : undefined}
                            >
                                {t("YakitButton.save")}
                            </YakitButton>
                            {hasApplyBtn && <YakitButton
                                type='primary'
                                onClick={() => onApplyConfirm('apply')}
                                size={isSmallMode ? "small" : undefined}
                            >
                                {t("YakitButton.apply")}
                            </YakitButton>}
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
        const {t, i18n} = useI18nNamespaces(["webFuzzer"])
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
                yakitNotify("error", t("MatcherCollapse.emptyMatcherConditionExists"))
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
                yakitNotify("error", `${t("MatcherCollapse.addMatcherConditionFailed")}${error}`)
            }
        })
        const onExecuteMatcher = useMemoizedFn((subItem: HTTPResponseMatcher, number: number) => {
            if (notEditable) return
            const matchers = matcher.matchersList[number]
            const matchHTTPResponseParams: MatchHTTPResponseParams = {
                HTTPResponse: httpResponse,
                HTTPRequest: httpRequest,
                IsHTTPS: isHttps,
                Matchers: matchers.SubMatchers,
                MatcherCondition: matchers.SubMatcherCondition
            }
            if (isMatcherEmpty(matchers.SubMatchers)) {
                yakitNotify("error", t("MatcherCollapse.allMatcherConditionsEmpty"))
                return
            }
            setExecutingItemList((v) => [...v, number])
            ipcRenderer
                .invoke("MatchHTTPResponse", matchHTTPResponseParams)
                .then((data: {Matched: boolean}) => {
                    if (data.Matched) {
                        yakitNotify("success", t("MatcherCollapse.matchSuccess"))
                    } else {
                        yakitNotify("error", t("MatcherCollapse.matchFailed"))
                    }
                })
                .catch((err) => {
                    yakitNotify("error", t("MatcherCollapse.matchError") + err)
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
                yakitNotify("error", `${t("MatcherCollapse.onRemoveSubMatcherFailed")}${error}`)
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
                            ? t("MatcherCollapse.multipleMatchersExplanation")
                            : t("MatcherCollapse.matcherApplicationFlow")
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
                                        <span className={styles["condition-mode-text"]}>
                                            {t("MatcherCollapse.filter_mode")}
                                        </span>
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
                                            options={filterModeOptions(t)}
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
                                        <span className={styles["condition-mode-text"]}>
                                            {t("MatcherCollapse.condition_relation")}
                                        </span>
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
                                            {t("MatcherCollapse.addCondition")}
                                        </YakitButton>
                                        <YakitButton
                                            type='outline1'
                                            onClick={() => onExecuteMatcher(item, number)}
                                            size={isSmallMode ? "small" : undefined}
                                        >
                                            {t("MatcherCollapse.debugExecute")}
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
                                                        matcherTypeList(t).find(
                                                            (e) => e.value === matcherItem.MatcherType
                                                        )?.label
                                                    }
                                                    ]
                                                </span>
                                                {matcherItem.Group.length > 0 ? (
                                                    <span className={styles["header-number"]}>
                                                        {matcherItem.Group.length}
                                                    </span>
                                                ) : (
                                                    <YakitTag color='danger' size='small'>
                                                        {t("MatcherCollapse.no_condition_set")}
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
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])

    const requestList = ScopeList(t),
        isRequest = requestList.some(({value})=> value === matcherItem.Scope)
    return (
        <>
            <div
                className={classNames(styles["collapse-panel-condition"], {
                    [styles["collapse-panel-condition-notEditable"]]: notEditable
                })}
            >
                <LabelNodeItem label={t("MatcherItem.match_type")} column={isSmallMode}>
                    <YakitRadioButtons
                        value={matcherItem.MatcherType}
                        onChange={(e) => {
                            onEdit("MatcherType", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={matcherTypeList(t)}
                    />
                </LabelNodeItem>
                <LabelNodeItem label={t("MatcherItem.match_range")} column={isSmallMode}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <YakitSegmented
                            size='small'
                            value={isRequest ? t("HTTPFuzzerPageTable.request") : t("HTTPFuzzerPageTable.response")}
                            onChange={(value) => {
                                // 选中响应选中响应体，选中请求选中请求体
                                onEdit("Scope", value ===  t("HTTPFuzzerPageTable.request") ? "request_body" : "body")
                            }}
                            options={[
                                t("HTTPFuzzerPageTable.response"),
                                t("HTTPFuzzerPageTable.request")
                            ]}
                        />
                    <Divider type={"vertical"} />
                    <YakitRadioButtons
                        value={matcherItem.Scope}
                        onChange={(e) => {
                            onEdit("Scope", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={isRequest ? requestList : [
                            {label: t("MatcherItem.status_code"), value: "status_code"},
                            {label: t("MatcherItem.response_header"), value: "all_headers"},
                            {label: t("MatcherItem.response_body"), value: "body"},
                            {label: t("MatcherItem.all_responses"), value: "raw"}
                        ]}
                    />
                    </div>
                </LabelNodeItem>
                <LabelNodeItem label={t("MatcherItem.condition_relation")} column={isSmallMode}>
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
                <LabelNodeItem label={t("MatcherItem.no_match_invert")} column={isSmallMode}>
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
                        yakitNotify("error", t("MatcherItem.complete_conditions_before_adding"))
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
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
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
                                    placeholder={t("YakitInput.please_enter")}
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
                            {t("MatcherAndExtractionValueList.add_match_content")}
                        </YakitButton>
                    </div>
                </LabelNodeItem>
            )}
        </div>
    )
})

export const ExtractorCollapse: React.FC<ExtractorCollapseProps> = React.memo((props) => {
    const {type, extractor, setExtractor, defActiveKey, notEditable, httpResponse, isSmallMode} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])

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
            yakitNotify("error", t("ExtractorCollapse.max_length_20"))
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
                                                    {t("ExtractorCollapse.edit_name")}
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
                                <span>[{extractorTypeList(t).find((e) => e.value === extractorItem.Type)?.label}]</span>
                                {extractorItem.Groups.length > 0 ? (
                                    <span className={classNames("content-ellipsis", styles["header-number"])}>
                                        {extractorItem.Groups.length}
                                    </span>
                                ) : (
                                    <YakitTag color='danger' size='small'>
                                        {t("ExtractorCollapse.no_condition_set")}
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
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])

    const requestList = ScopeList(t),
        isRequest = requestList.some(({value})=> value === extractorItem.Scope)
    const onRenderTypeExtra: ReactNode = useCreation(() => {
        switch (extractorItem.Type) {
            case "regex":
                return (
                    <LabelNodeItem label={t("ExtractorItem.match_regex_group")} column={isSmallMode}>
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
                    <LabelNodeItem label={t("ExtractorItem.xpath_parameters")}>
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
    }, [extractorItem.Type, extractorItem.RegexpMatchGroup, extractorItem.XPathAttribute, i18n.language])
    return (
        <>
            <div
                className={classNames(styles["collapse-panel-condition"], {
                    [styles["collapse-panel-condition-notEditable"]]: notEditable
                })}
            >
                <LabelNodeItem label={t("ExtractorItem.extraction_type")} column={isSmallMode}>
                    <YakitRadioButtons
                        value={extractorItem.Type}
                        onChange={(e) => {
                            onEdit("Type", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={extractorTypeList(t)}
                    />
                </LabelNodeItem>
                <LabelNodeItem label={t("ExtractorItem.extraction_scope")} column={isSmallMode}>
                   <div style={{display: 'flex', alignItems: 'center'}}>
                        <YakitSegmented
                            size='small'
                            value={isRequest ? t("HTTPFuzzerPageTable.request") : t("HTTPFuzzerPageTable.response")}
                            onChange={(value) => {
                                // 选中响应选中响应体，选中请求选中请求体
                                onEdit("Scope", value ===  t("HTTPFuzzerPageTable.request") ? "request_body" : "body")
                            }}
                            options={[
                                t("HTTPFuzzerPageTable.response"),
                                t("HTTPFuzzerPageTable.request")
                            ]}
                        />
                    <Divider type={"vertical"} />
                    <YakitRadioButtons
                        value={extractorItem.Scope}
                        onChange={(e) => {
                            onEdit("Scope", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={isRequest ? requestList :[
                            {label: t("ExtractorItem.response_header"), value: "header"},
                            {label: t("ExtractorItem.response_body"), value: "body"},
                            {label: "Raw", value: "raw"}
                        ]}
                    />
                    </div>
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
                        yakitNotify("error", t("ExtractorItem.complete_conditions_before_adding"))
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
            <span className={classNames(styles["label"], props.labelClassName)} style={{width: i18n.language === "zh" ? 104 : 130}}>{props.label}</span>
            {props.children}
        </div>
    )
})
const colors: (t: (text: string) => string) => {color: string; title: string}[] = (t) => {
    return [
        {
            color: TableCellToColorTag["RED"],
            title: t("YakitTable.red")
        },
        {
            color: TableCellToColorTag["GREEN"],
            title: t("YakitTable.green")
        },
        {
            color: TableCellToColorTag["BLUE"],
            title: t("YakitTable.blue")
        },
        {
            color: TableCellToColorTag["YELLOW"],
            title: t("YakitTable.yellow")
        },
        {
            color: TableCellToColorTag["ORANGE"],
            title: t("YakitTable.orange")
        },
        {
            color: TableCellToColorTag["PURPLE"],
            title: t("YakitTable.purple")
        },
        {
            color: TableCellToColorTag["CYAN"],
            title: t("YakitTable.cyan")
        },
        {
            color: TableCellToColorTag["GREY"],
            title: t("YakitTable.grey")
        }
    ]
}
export const ColorSelect: React.FC<ColorSelectProps> = React.memo((props) => {
    const {value, onChange, size} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
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
                    <span className={styles["hit-color"]}>{t("ColorSelect.hit_color")}</span>
                    <div className={styles["color-list"]}>
                        {colors(t).map((colorItem) => {
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
        httpRequest,
        isHttps,
        defActiveKey,
        matcherValue,
        extractorValue,
        onClose,
        onSave,
        defActiveKeyAndOrder,
        hasApplyBtn
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
                httpRequest={httpRequest}
                isHttps={isHttps}
                defActiveKey={defActiveKey}
                matcherValue={matcherValue}
                extractorValue={extractorValue}
                onClose={onClose}
                onSave={onSave}
                defActiveKeyAndOrder={defActiveKeyAndOrder}
                hasApplyBtn={hasApplyBtn}
            />
        </YakitDrawer>
    )
})
