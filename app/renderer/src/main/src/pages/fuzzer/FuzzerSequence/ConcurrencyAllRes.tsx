import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useCreation, useUpdateEffect, useSize} from "ahooks"
import {Form} from "antd"
import {shallow} from "zustand/shallow"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ExtractorsPanel, MatchersPanel, MatchersPanelEditProps} from "../HttpQueryAdvancedConfig/FuzzerConfigPanels"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {ResponseProps} from "./FuzzerSequenceType"
import {MatcherValueProps, ExtractorValueProps} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {defaultAdvancedConfigValue} from "@/defaultConstants/HTTPFuzzerPage"
import {HTTPFuzzerPageTable, HTTPFuzzerPageTableQuery} from "../components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {FuzzerConcurrentLoad} from "../FuzzerConcurrentLoad/FuzzerConcurrentLoad"
import {SecondNodeTitle, SecondNodeExtra, FuzzerShowSuccess} from "../HTTPFuzzerPage"
import {emptyFuzzer} from "@/defaultConstants/HTTPFuzzerPage"

import styles from "./ConcurrencyAllRes.module.scss"

export interface ConcurrencyAllResProps {
    responseInfo?: ResponseProps
    loading: boolean
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    groupPageId: string
    onDebug: (params: {httpResponse: string; type: MatchingAndExtraction; activeKey: string; order?: number}) => void
    onShowAll: () => void
    inViewport: boolean
    onMatchSubmit?: () => void
    onOpenMatcherDrawer?: () => void
}

export const ConcurrencyAllRes: React.FC<ConcurrencyAllResProps> = React.memo((props) => {
    const {
        responseInfo,
        loading,
        groupPageId,
        onDebug,
        onShowAll,
        inViewport,
        onMatchSubmit,
        onOpenMatcherDrawer
    } = props

    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )

    const [form] = Form.useForm()
    const [activeKey, setActiveKey] = useState<string[]>(["匹配器", "数据提取器"])
    const [showSuccess, setShowSuccess] = useState<FuzzerShowSuccess>("true")
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [affixSearch, setAffixSearch] = useState<string>("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState<string>("")
    const [showExtra, setShowExtra] = useState<boolean>(false)
    const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)
    const successTableRef = useRef<any>()
    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)
    const {
        successFuzzer = [],
        failedFuzzer = [],
        successCount = 0,
        failedCount = 0,
        fuzzerTableMaxData = 200,
        fuzzerResChartData = []
    } = responseInfo || {}

    const cachedTotal = useCreation(() => {
        return failedCount + successCount
    }, [failedCount, successCount])

    const defaultHttpResponse: string = useMemo(() => {
        if (responseInfo && successFuzzer.length > 0) {
            const firstSuccessResponse = successFuzzer[0]
            return new TextDecoder().decode(firstSuccessResponse.ResponseRaw || new Uint8Array())
        }
        return ""
    }, [responseInfo, successFuzzer])

    useEffect(() => {
        getRemoteValue(RemoteGV.FuzzerSequenceSettingShow).then((data) => {
            try {
                setActiveKey(data ? JSON.parse(data) : ["匹配器", "数据提取器"])
            } catch (error) {
                yakitFailed(`${t("ConcurrencyAllRes.get_config_key_failed")}${error}`)
            }
        })
    }, [t])

    // 获取并发模式的配置值
    const pageData = queryPagesDataById(YakitRoute.HTTPFuzzer, groupPageId)
    const concurrencyConfig = pageData?.pageParamsInfo?.ConcurrencyAdvancedConfigValue

    const advancedConfigValue = useMemo<AdvancedConfigValueProps>(() => {
        // 并发模式使用独立的配置,不与单个请求混用
        if (concurrencyConfig) {
            return {
                ...defaultAdvancedConfigValue,
                ...concurrencyConfig,
                // 确保 matchers 和 extractors 存在
                matchers: concurrencyConfig.matchers || [],
                extractors: concurrencyConfig.extractors || []
            }
        }
        
        // 如果没有并发配置,使用默认值
        return {
            ...defaultAdvancedConfigValue,
            matchers: [],
            extractors: []
        }
    }, [concurrencyConfig])

    // 当配置变化时,更新表单以回显最新值
    useUpdateEffect(() => {
        const newConfig = {
            matchers: advancedConfigValue.matchers || [],
            extractors: advancedConfigValue.extractors || []
        }
        form.setFieldsValue(newConfig)
    }, [advancedConfigValue.matchers, advancedConfigValue.extractors])

    useUpdateEffect(() => {
        if (successTableRef.current) {
            successTableRef.current.setCurrentSelectItem(undefined)
            successTableRef.current.setFirstFull(true)
        }
        setIsRefresh(!isRefresh)
        setQuery({})
    }, [responseInfo?.id])

    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
        setRemoteValue(RemoteGV.FuzzerSequenceSettingShow, JSON.stringify(key))
    })

    const onEditMatchers = useMemoizedFn((params: MatchersPanelEditProps) => {
        const {order, type, subIndex} = params
        onDebug({
            httpResponse: defaultHttpResponse,
            type,
            activeKey: `ID:${subIndex}`,
            order
        })
    })

    const onEditExtractors = useMemoizedFn((index: number, type: MatchingAndExtraction) => {
        onDebug({
            httpResponse: defaultHttpResponse,
            type,
            activeKey: `ID:${index}`
        })
    })

    const onAddMatchingAndExtractionCard = useMemoizedFn((type: MatchingAndExtraction) => {
        const keyMap = {
            matchers: "匹配器",
            extractors: "数据提取器"
        }
        if (activeKey?.findIndex((ele) => ele === keyMap[type]) === -1) {
            onSwitchCollapse([...activeKey, keyMap[type]])
        }
        onDebug({
            httpResponse: defaultHttpResponse,
            type,
            activeKey: `ID:0`
        })
    })

    const onSetValue = useMemoizedFn((allFields: Partial<AdvancedConfigValueProps>) => {
        if (!pageData) return

        // 获取当前并发配置
        const currentConfig = concurrencyConfig || {
            concurrent: 20,
            minDelaySeconds: 0,
            maxDelaySeconds: 0,
            repeatTimes: 0,
            disableUseConnPool: false,
            matchers: [],
            extractors: []
        }

        // MatchersPanel 和 ExtractorsPanel 已经通过 form.getFieldsValue() 合并了所有字段
        // 所以这里直接使用 allFields 中的 matchers 和 extractors
        const newMatchersAndExtractors = {
            matchers: allFields.matchers || [],
            extractors: allFields.extractors || []
        }

        // 保存到页面配置
        const newConfig = {
            ...currentConfig,
            ...newMatchersAndExtractors
        }

        const newPageData: PageNodeItemProps = {
            ...pageData,
            pageParamsInfo: {
                ...pageData.pageParamsInfo,
                ConcurrencyAdvancedConfigValue: newConfig
            }
        }
        updatePagesDataCacheById(YakitRoute.HTTPFuzzer, newPageData)
    })

    const handleMatchSubmit = useMemoizedFn(()=>{
        if (concurrencyConfig?.matchers?.length || concurrencyConfig?.extractors?.length) {
            onMatchSubmit?.()
        } else {
            onOpenMatcherDrawer?.()
        }
    })


    const onApply = useMemoizedFn(()=>{
        if(!cachedTotal){
            yakitNotify("warning", `请发送多个请求包后再应用`)
            return;
        }
        handleMatchSubmit()
    })

    const moreLimtAlertMsg = useMemo(
        () => (
            <div style={{fontSize: 12}}>
                {t("HTTPFuzzerPage.response_overflow", {maxData: fuzzerTableMaxData})}
                <YakitButton type='text' onClick={onShowAll} style={{padding: 0}}>
                    {t("HTTPFuzzerPage.trafficAnalysis")}
                </YakitButton>
                {t("HTTPFuzzerPage.view_all_suffix")}
            </div>
        ),
        [fuzzerTableMaxData, onShowAll, t]
    )
    const secondNodeExtra = useMemoizedFn(() => (
        <SecondNodeExtra
            onlyOneResponse={false}
            cachedTotal={cachedTotal}
            rsp={emptyFuzzer}
            valueSearch={affixSearch}
            onSearchValueChange={(value) => {
                setAffixSearch(value)
                if (value === "" && defaultResponseSearch !== "") {
                    setDefaultResponseSearch("")
                }
            }}
            onSearch={() => {
                setDefaultResponseSearch(affixSearch)
            }}
            matchSubmit={handleMatchSubmit}
            successFuzzer={successFuzzer}
            failedFuzzer={failedFuzzer}
            secondNodeSize={secondNodeSize}
            query={query}
            setQuery={(q) => {
                setQuery({...q})
            }}
            isShowMatch={true}
            sendPayloadsType='concurrencyAllRes'
            setShowExtra={setShowExtra}
            showResponseInfoSecondEditor={showResponseInfoSecondEditor}
            setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
            onShowAll={onShowAll}
        />
    ))

    return (
        <div className={styles["concurrency-all-res"]}>
            <div className={styles["concurrency-header"]}>
                <span className={styles["header-title"]}>{t("MatcherItem.all_responses")}</span>
            </div>
            <YakitResizeBox
                lineDirection='right'
                firstNode={
                    <div className={styles["left-panel"]}>
                        <div className={styles["panel-body"]}>
                            <Form
                                form={form}
                                colon={false}
                                onValuesChange={(changedFields, allFields) => {
                                    onSetValue(allFields)
                                }}
                                size='small'
                                labelCol={{span: 10}}
                                wrapperCol={{span: 14}}
                                initialValues={{
                                    matchers: advancedConfigValue.matchers || [],
                                    extractors: advancedConfigValue.extractors || []
                                }}
                            >
                                <YakitCollapse
                                    activeKey={activeKey}
                                    onChange={(key) => onSwitchCollapse(key)}
                                    destroyInactivePanel={true}
                                    bordered={false}
                                >
                                    <MatchersPanel
                                        key='匹配器'
                                        onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                                        onEdit={onEditMatchers}
                                        onSetValue={onSetValue}
                                        onApply={onApply}
                                    />
                                    <ExtractorsPanel
                                        key='数据提取器'
                                        onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                                        onEdit={onEditExtractors}
                                        onSetValue={onSetValue}
                                        onApply={onApply}
                                    />
                                </YakitCollapse>
                                <div className={styles["to-end"]}>{t("YakitEmpty.end_of_list")}</div>
                            </Form>
                        </div>
                    </div>
                }
                firstMinSize={300}
                firstRatio='300px'
                secondNode={
                    <div className={styles["right-panel"]}>
                        <div className={styles["response-list"]}>
                            <div className={styles["response-header"]}>
                                <SecondNodeTitle
                                    cachedTotal={cachedTotal}
                                    onlyOneResponse={false}
                                    rsp={emptyFuzzer}
                                    successFuzzerLength={successCount}
                                    failedFuzzerLength={failedCount}
                                    showSuccess={showSuccess}
                                    setShowSuccess={(v) => {
                                        setShowSuccess(v)
                                        setQuery({})
                                    }}
                                    showConcurrentAndLoad={true}
                                    selectionByteCount={0}
                                />
                                {secondNodeExtra()}
                            </div>
                            <div className={styles["response-body"]} ref={secondNodeRef}>
                                {showSuccess === "true" && (
                                    <HTTPFuzzerPageTable
                                        ref={successTableRef}
                                        isRefresh={isRefresh}
                                        success={true}
                                        data={successFuzzer}
                                        query={query}
                                        setQuery={setQuery}
                                        extractedMap={new Map()}
                                        isEnd={loading}
                                        onDebug={(response) => {
                                            onDebug({
                                                httpResponse: response,
                                                type: "matchers",
                                                activeKey: "ID:0",
                                                order: 0
                                            })
                                        }}
                                        moreLimtAlertMsg={moreLimtAlertMsg}
                                        fuzzerTableMaxData={fuzzerTableMaxData}
                                    />
                                )}
                                {showSuccess === "false" && (
                                    <HTTPFuzzerPageTable
                                        isRefresh={isRefresh}
                                        success={false}
                                        data={failedFuzzer}
                                        query={query}
                                        setQuery={setQuery}
                                        isEnd={loading}
                                        extractedMap={new Map()}
                                    />
                                )}
                                {showSuccess === "Concurrent/Load" && (
                                    <div style={{height: "100%", overflowY: "auto", overflowX: "hidden"}}>
                                        <FuzzerConcurrentLoad
                                            inViewportCurrent={inViewport}
                                            fuzzerResChartData={fuzzerResChartData}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                }
            />
        </div>
    )
})