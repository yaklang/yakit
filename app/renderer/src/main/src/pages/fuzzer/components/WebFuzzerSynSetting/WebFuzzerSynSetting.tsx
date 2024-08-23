import {WebFuzzerSynSettingFormValueProps, WebFuzzerSynSettingProps} from "./WebFuzzerSynSettingType"
import styles from "./WebFuzzerSynSetting.module.scss"
import React, {useEffect, useState} from "react"
import {Checkbox, Form} from "antd"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useMemoizedFn} from "ahooks"
import {PageNodeItemProps, PageProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {yakitNotify} from "@/utils/notification"
import {AdvancedConfigValueProps} from "../../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {toolDelInvalidKV} from "@/utils/tool"

const rangeList = [
    {
        value: "all",
        label: "所有页面"
    },
    {
        value: "batch",
        label: "自定义页面"
    }
]
const types = [
    {
        value: "config",
        label: "配置"
    },
    {
        value: "rule",
        label: "规则"
    }
]
const getConfigValue = (value: AdvancedConfigValueProps) => {
    const config = {
        ...value,
        matchers: undefined,
        extractors: undefined,
        params: undefined,
        methodGet: undefined,
        methodPost: undefined,
        cookie: undefined,
        headers: undefined
    }
    return toolDelInvalidKV(config)
}
const getRuleValue = (value: AdvancedConfigValueProps) => {
    const rule = {
        matchers: value.matchers,
        extractors: value.extractors,
        params: value.params,
        methodGet: value.methodGet,
        methodPost: value.methodPost,
        cookie: value.cookie,
        headers: value.headers
    }
    return toolDelInvalidKV(rule)
}
const WebFuzzerSynSetting: React.FC<WebFuzzerSynSettingProps> = React.memo((props) => {
    const {pages, setPagesData, queryPagesDataById} = usePageInfo(
        (s) => ({
            pages: s.pages,
            setPagesData: s.setPagesData,
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const {pageId, onClose} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [currentSelectPage, setCurrentSelectPage] = useState<PageNodeItemProps>()
    const [pageList, setPageList] = useState<PageNodeItemProps[]>([])
    const [form] = Form.useForm()
    const range = Form.useWatch("range", form)

    useEffect(() => {
        const wfPage: PageProps | undefined = pages.get(YakitRoute.HTTPFuzzer)
        if (wfPage) {
            const newPageList = wfPage.pageList.filter((ele) => !ele.pageId.endsWith("group")) // 排除组的数据
            const currentSelectPage: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
            setPageList(newPageList)
            setCurrentSelectPage(currentSelectPage)
        }
    }, [pages])

    const onCancel = useMemoizedFn(() => {
        onClose()
    })
    const onSyn = useMemoizedFn(() => {
        form.validateFields().then((value: WebFuzzerSynSettingFormValueProps) => {
            const wfPageList: PageProps | undefined = pages.get(YakitRoute.HTTPFuzzer)
            if (!wfPageList) {
                yakitNotify("error", "WF页面数据为空")
                return
            }
            if (
                !(
                    currentSelectPage &&
                    currentSelectPage.pageParamsInfo &&
                    currentSelectPage.pageParamsInfo.webFuzzerPageInfo
                )
            ) {
                yakitNotify("error", "同步数据页面未找到")
                return
            }
            setLoading(true)
            /**处理同步内容 */
            const advancedConfigValue = currentSelectPage.pageParamsInfo?.webFuzzerPageInfo?.advancedConfigValue
            let synValue = advancedConfigValue
            if (value.type.length === 1 && value.type.includes("config")) {
                synValue = getConfigValue(advancedConfigValue)
            }
            if (value.type.length === 1 && value.type.includes("rule")) {
                synValue = getRuleValue(advancedConfigValue)
            }
            /**处理同步范围 */
            let newWFPageList = wfPageList.pageList.map((item) => {
                if (
                    item.pageParamsInfo.webFuzzerPageInfo &&
                    item.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue
                ) {
                    const advancedConfigValue = item.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue
                    if (value.range === "all") {
                        item.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue = {
                            ...advancedConfigValue,
                            ...synValue
                        }
                    }
                    if (value.range === "batch" && value.ids.includes(item.pageId)) {
                        item.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue = {
                            ...advancedConfigValue,
                            ...synValue
                        }
                    }
                }
                return item
            })
            const pageNodeInfo: PageProps = {
                ...wfPageList,
                pageList: newWFPageList
            }
            setPagesData(YakitRoute.HTTPFuzzer, pageNodeInfo)
            setTimeout(() => {
                setLoading(false)
                onClose()
            }, 200)
        })
    })
    const pageListOption = useCreation(() => {
        return pageList.map((ele) => ({
            label: ele.pageName,
            value: ele.pageId
        }))
    }, [pageList])
    return (
        <div className={styles["wf-syn-setting"]}>
            <div className={styles["tip"]}>数据来源页面标签名:{currentSelectPage?.pageName || "-"}</div>
            <div className={styles["wf-syn-setting-content"]}>
                <Form
                    form={form}
                    labelCol={{span: 4}}
                    wrapperCol={{span: 20}}
                    initialValues={{
                        type: ["config", "rule"],
                        range: "all",
                        ids: []
                    }}
                >
                    <Form.Item
                        label='同步内容'
                        name='type'
                        rules={[{required: true, message: `请选中同步的内容`}]}
                        className={styles["setting-type-form-item"]}
                    >
                        <Checkbox.Group>
                            <div style={{display: "flex"}}>
                                {types.map((ele) => (
                                    <YakitCheckbox key={ele.value} value={ele.value}>
                                        {ele.label}
                                    </YakitCheckbox>
                                ))}
                            </div>
                        </Checkbox.Group>
                    </Form.Item>
                    <Form.Item
                        label='同步范围'
                        name='range'
                        extra={
                            range === "batch" && (
                                <Form.Item
                                    name='ids'
                                    style={{marginTop: 8}}
                                    rules={[{required: true, message: `请选择需要同步的页面`}]}
                                >
                                    <YakitSelect
                                        allowClear
                                        mode='multiple'
                                        options={pageListOption}
                                        filterOption={(inputValue, option) => {
                                            if (option?.label && typeof option?.label === "string") {
                                                return (
                                                    option?.label?.toUpperCase().indexOf(inputValue.toUpperCase()) !==
                                                    -1
                                                )
                                            }
                                            return false
                                        }}
                                    />
                                </Form.Item>
                            )
                        }
                    >
                        <YakitRadioButtons buttonStyle='solid' options={rangeList} />
                    </Form.Item>
                </Form>
                <div className={styles["setting-footer"]}>
                    <YakitButton type='outline1' onClick={onCancel}>
                        取消
                    </YakitButton>
                    <YakitButton type='primary' onClick={onSyn} loading={loading}>
                        同步
                    </YakitButton>
                </div>
            </div>
        </div>
    )
})

export default WebFuzzerSynSetting
