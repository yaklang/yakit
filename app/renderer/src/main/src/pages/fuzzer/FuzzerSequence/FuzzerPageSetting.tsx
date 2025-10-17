import {YakitRoute} from "@/enums/yakitRoute"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import React, {useEffect, useRef, useState} from "react"
import {shallow} from "zustand/shallow"
import cloneDeep from "lodash/cloneDeep"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {Form} from "antd"
import styles from "./FuzzerPageSetting.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {yakitFailed} from "@/utils/notification"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {
    ExtractorsPanel,
    MatchersPanel,
    MatchersPanelEditProps,
    VariablePanel
} from "../HttpQueryAdvancedConfig/FuzzerConfigPanels"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {defaultWebFuzzerPageInfo} from "@/defaultConstants/HTTPFuzzerPage"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export interface DebugProps {
    httpResponse: string
    type: MatchingAndExtraction
    activeKey: string
    /**匹配器的排序 */
    order?: number
}
interface FuzzerPageSettingProps {
    pageId: string
    defaultHttpResponse: string
    triggerIn: boolean
    triggerOut: boolean
    setTriggerOut: (b: boolean) => void
    onDebug: (v: DebugProps) => void
}
const FuzzerPageSetting: React.FC<FuzzerPageSettingProps> = React.memo((props) => {
    const {pageId, defaultHttpResponse, onDebug, triggerIn, triggerOut, setTriggerOut} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const initWebFuzzerPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
        if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
            return currentItem.pageParamsInfo.webFuzzerPageInfo
        } else {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
    })
    const [form] = Form.useForm()
    const [activeKey, setActiveKey] = useState<string[]>() // Collapse打开的key
    const [advancedConfigValue, setAdvancedConfigValue] = useState<AdvancedConfigValueProps>(
        initWebFuzzerPageInfo().advancedConfigValue
    )

    const formBodyRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(formBodyRef)

    useEffect(() => {
        getRemoteValue(RemoteGV.FuzzerSequenceSettingShow).then((data) => {
            try {
                setActiveKey(data ? JSON.parse(data) : ["匹配器", "数据提取器", "设置变量"])
            } catch (error) {
                yakitFailed(t("FuzzerPageSetting.getSequenceConfigKeyFailed") + error)
            }
        })
    }, [])
    useUpdateEffect(() => {
        if (!inViewport) return
        const newAdvancedConfigValue = initWebFuzzerPageInfo().advancedConfigValue
        form.setFieldsValue({...newAdvancedConfigValue}) // form.setFieldsValue不会触发Form表单的 onValuesChange 事件
        setAdvancedConfigValue({...newAdvancedConfigValue})
    }, [pageId, inViewport, triggerIn])
    const onSetValue = useMemoizedFn((allFields: AdvancedConfigValueProps) => {
        onUpdatePageInfo(allFields)
    })
    const onUpdatePageInfo = useDebounceFn(
        (params: AdvancedConfigValueProps) => {
            if (!pageId) return
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
            if (!currentItem) return
            if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
                const newAdvancedConfigValue = {
                    ...advancedConfigValue,
                    ...params
                }
                const newCurrentItem: PageNodeItemProps = {
                    ...currentItem,
                    pageParamsInfo: {
                        webFuzzerPageInfo: {
                            ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                            advancedConfigValue: {
                                ...newAdvancedConfigValue
                            }
                        }
                    }
                }
                updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                // 主要目的是刷新外界的 pageId 下最新的值
                setTriggerOut(!triggerOut)
            }
        },
        {wait: 500, leading: true}
    ).run
    /**
     * @description 切换折叠面板，缓存activeKey
     */
    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
        setRemoteValue(RemoteGV.FuzzerSequenceSettingShow, JSON.stringify(key))
    })
    /**修改提取器 */
    const onEditExtractors = useMemoizedFn((index, type: MatchingAndExtraction) => {
        onDebug({
            httpResponse: defaultHttpResponse,
            type,
            activeKey: `ID:${index}`
        })
    })
    /**修改匹配器 */
    const onEditMatchers = useMemoizedFn((params: MatchersPanelEditProps) => {
        const {order, type, subIndex} = params
        onDebug({
            httpResponse: defaultHttpResponse,
            type,
            activeKey: `ID:${subIndex}`,
            order
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
    /**添加的额外操作，例如没有展开的时候点击添加需要展开该项 */
    const onAddExtra = useMemoizedFn((type: string) => {
        if (activeKey?.findIndex((ele) => ele === type) === -1) {
            onSwitchCollapse([...activeKey, type])
        }
    })
    return (
        <div className={styles["form-body"]} ref={formBodyRef}>
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
                    ...advancedConfigValue
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
                    />
                    <ExtractorsPanel
                        key='数据提取器'
                        onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                        onEdit={onEditExtractors}
                        onSetValue={onSetValue}
                    />
                    <VariablePanel
                        pageId={pageId}
                        key='设置变量'
                        defaultHttpResponse={defaultHttpResponse}
                        onAdd={onAddExtra}
                        onSetValue={onSetValue}
                    />
                </YakitCollapse>

                <div className={styles["to-end"]}>{t("YakitEmpty.end_of_list")}</div>
            </Form>
        </div>
    )
})

export default FuzzerPageSetting
