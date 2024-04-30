import {YakitRoute} from "@/routes/newRoute"
import {PageNodeItemProps, defaultWebFuzzerPageInfo, usePageInfo} from "@/store/pageInfo"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import React, {useEffect, useState} from "react"
import {shallow} from "zustand/shallow"
import cloneDeep from "lodash/cloneDeep"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {Form} from "antd"
import styles from "./FuzzerPageSetting.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {yakitFailed} from "@/utils/notification"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {ExtractorsPanel, MatchersPanel, VariablePanel} from "../HttpQueryAdvancedConfig/FuzzerConfigPanels"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"

interface FuzzerPageSettingProps {
    pageId: string
    defaultHttpResponse: string
}
const FuzzerPageSetting: React.FC<FuzzerPageSettingProps> = React.memo((props) => {
    const {pageId, defaultHttpResponse} = props
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
    useEffect(() => {
        getRemoteValue(RemoteGV.FuzzerSequenceSettingShow).then((data) => {
            try {
                setActiveKey(data ? JSON.parse(data) : ["匹配器", "数据提取器", "设置变量"])
            } catch (error) {
                yakitFailed("获取序列配置折叠面板的激活key失败:" + error)
            }
        })
    }, [])
    useUpdateEffect(() => {
        const newAdvancedConfigValue = initWebFuzzerPageInfo().advancedConfigValue
        form.setFieldsValue({...newAdvancedConfigValue})
        setAdvancedConfigValue({...newAdvancedConfigValue})
    }, [pageId])
    const onSetValue = useMemoizedFn((allFields: AdvancedConfigValueProps) => {
        onUpdatePageInfo(allFields)
    })
    const onUpdatePageInfo = useDebounceFn(
        (params: AdvancedConfigValueProps) => {
            if (!pageId) return
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
            if (!currentItem) return
            if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
                const newCurrentItem: PageNodeItemProps = {
                    ...currentItem,
                    pageParamsInfo: {
                        webFuzzerPageInfo: {
                            ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                            advancedConfigValue: {
                                ...advancedConfigValue,
                                ...params
                            }
                        }
                    }
                }
                updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
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
    /**修改匹配器和提取器 */
    const onEdit = useMemoizedFn((index, type: MatchingAndExtraction) => {
        // if (outsideShowResponseMatcherAndExtraction) {
        //     if (onShowResponseMatcherAndExtraction) onShowResponseMatcherAndExtraction("matchers", `ID:${index}`)
        // } else {
        //     setVisibleDrawer(true)
        //     setDefActiveKey(`ID:${index}`)
        //     setType(type)
        // }
    })
    const onAddMatchingAndExtractionCard = useMemoizedFn((type: MatchingAndExtraction) => {
        const keyMap = {
            matchers: "匹配器",
            extractors: "数据提取器"
        }
        if (activeKey?.findIndex((ele) => ele === keyMap[type]) === -1) {
            onSwitchCollapse([...activeKey, keyMap[type]])
        }
        // if (outsideShowResponseMatcherAndExtraction) {
        //     if (onShowResponseMatcherAndExtraction) onShowResponseMatcherAndExtraction(type, "ID:0")
        // } else {
        //     setType(type)
        //     setVisibleDrawer(true)
        // }
    })
    /**添加的额外操作，例如没有展开的时候点击添加需要展开该项 */
    const onAddExtra = useMemoizedFn((type: string) => {
        if (activeKey?.findIndex((ele) => ele === type) === -1) {
            onSwitchCollapse([...activeKey, type])
        }
    })
    return (
        <div className={styles["form-body"]}>
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
                        onEdit={onEdit}
                        onSetValue={onSetValue}
                    />
                    <ExtractorsPanel
                        key='数据提取器'
                        onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                        onEdit={onEdit}
                        onSetValue={onSetValue}
                    />
                    <VariablePanel
                        pageId={pageId}
                        key='设置变量'
                        defaultHttpResponse={defaultHttpResponse}
                        onAdd={onAddExtra}
                    />
                </YakitCollapse>

                <div className={styles["to-end"]}>已经到底啦～</div>
            </Form>
        </div>
    )
})

export default FuzzerPageSetting
