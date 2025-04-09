import React, {useEffect, useRef, useState} from "react"
import {Form, Modal} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {useMemoizedFn} from "ahooks"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {FiltersItemProps} from "../TableVirtualResize/TableVirtualResizeType"
import {setRemoteValue} from "@/utils/kv"
import {OutlineXIcon} from "@/assets/icon/outline"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import styles from "./HTTPFlowTableForm.module.scss"
import {HTTPHistorySourcePageType} from "../HTTPHistory"
import {RemoteHistoryGV} from "@/enums/history"

export interface HTTPFlowTableFormConfigurationProps {
    pageType?: HTTPHistorySourcePageType
    visible: boolean
    setVisible: (b: boolean) => void
    responseType: FiltersItemProps[]
    onSave: (v: HTTPFlowTableFromValue) => void
    filterMode: "shield" | "show"
    hostName: string[]
    urlPath: string[]
    fileSuffix: string[]
    searchContentType: string
    excludeKeywords: string[]
}

export interface HTTPFlowTableFromValue {
    filterMode: "shield" | "show"
    urlPath: string[]
    hostName: string[]
    fileSuffix: string[]
    searchContentType: string
    excludeKeywords: string[]
}

export enum HTTPFlowTableFormConsts {
    HTTPFlowTableFilterMode = "YAKIT_HTTPFlowTableFilterMode",
    HTTPFlowTableHostName = "YAKIT_HTTPFlowTableHostName",
    HTTPFlowTableUrlPath = "YAKIT_HTTPFlowTableUrlPath",
    HTTPFlowTableFileSuffix = "YAKIT_HTTPFlowTableFileSuffix",
    HTTPFlowTableContentType = "YAKIT_HTTPFlowTableContentType",
    HTTPFlowTableExcludeKeywords = "YAKIT_HTTPFlowTableExcludeKeywords"
}

export const HTTPFlowTableFormConfiguration: React.FC<HTTPFlowTableFormConfigurationProps> = (props) => {
    const {
        pageType,
        visible,
        setVisible,
        responseType,
        onSave,
        filterMode,
        hostName,
        urlPath,
        fileSuffix,
        searchContentType,
        excludeKeywords
    } = props

    /** ---------- 高级筛选 Start ---------- */
    // 筛选模式
    const [filterModeVal, setFilterModeVal] = useState<"shield" | "show">("shield")

    // 原始数据-筛选模式
    const oldFilterMode = useRef<"shield" | "show">("shield")
    // 原始数据-Hostname
    const oldHostName = useRef<string[]>([])
    // 原始数据-URL路径
    const oldUrlPath = useRef<string[]>([])
    // 原始数据-文件后缀
    const oldFileSuffix = useRef<string[]>([])
    // 原始数据-响应类型
    const oldSearchContentType = useRef<string[]>([])
    // 原始数据-关键字
    const oldExcludeKeywords = useRef<string[]>([])

    const [form] = Form.useForm()

    /** 高级筛选-保存 */
    const handleAdvancedFiltersSave = useMemoizedFn(() => {
        return new Promise<HTTPFlowTableFromValue>((resolve, reject) => {
            form.validateFields()
                .then((formValue) => {
                    const {filterMode, urlPath = [], hostName = [], fileSuffix = [], excludeKeywords = []} = formValue
                    let searchContentType: string = (formValue.searchContentType || []).join(",")
                    if (pageType === "HTTPHistoryFilter") {
                        setRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisFilterMode, filterMode)
                        setRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisHostName, JSON.stringify(hostName))
                        setRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisUrlPath, JSON.stringify(urlPath))
                        setRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisFileSuffix, JSON.stringify(fileSuffix))
                        setRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisContentType, searchContentType)
                        setRemoteValue(
                            RemoteHistoryGV.HTTPFlowTableAnalysisExcludeKeywords,
                            JSON.stringify(excludeKeywords)
                        )
                    } else {
                        setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFilterMode, filterMode)
                        setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableHostName, JSON.stringify(hostName))
                        setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableUrlPath, JSON.stringify(urlPath))
                        setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFileSuffix, JSON.stringify(fileSuffix))
                        setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType, searchContentType)
                        setRemoteValue(
                            HTTPFlowTableFormConsts.HTTPFlowTableExcludeKeywords,
                            JSON.stringify(excludeKeywords)
                        )
                    }
                    const info: HTTPFlowTableFromValue = {
                        filterMode: filterMode,
                        hostName,
                        urlPath,
                        fileSuffix,
                        searchContentType,
                        excludeKeywords
                    }
                    resolve(info)
                })
                .catch((err) => {
                    reject(`${reject}`)
                })
        })
    })

    /** 高级筛选-重置 */
    const handleAdvancedFiltersReset = () => {
        form.resetFields()
        setFilterModeVal("shield")
    }
    /** ---------- 高级筛选 End ---------- */

    // 获取默认值
    useEffect(() => {
        if (!visible) return

        // 筛选模式
        oldFilterMode.current = filterMode
        setFilterModeVal(filterMode)
        // HostName
        oldHostName.current = hostName
        // URL路径
        oldUrlPath.current = urlPath
        // 文件后缀
        oldFileSuffix.current = fileSuffix
        // 响应类型
        const contentType: string = searchContentType
        const searchType: string[] = !contentType ? [] : contentType.split(",")
        oldSearchContentType.current = searchType
        // 关键字
        oldExcludeKeywords.current = excludeKeywords
        form.setFieldsValue({filterMode, hostName, urlPath, fileSuffix, searchContentType: searchType, excludeKeywords})
    }, [visible])

    // 保存
    const handleSave = useMemoizedFn(async () => {
        try {
            const advancedFilters = await handleAdvancedFiltersSave()
            onSave(cloneDeep(advancedFilters))
        } catch (error) {
            yakitNotify("error", `${error}`)
        }
    })
    // 取消
    const handleCancel = useMemoizedFn(() => {
        setVisible(false)
    })

    // 判断是否有修改
    const handleJudgeModify = useMemoizedFn(async () => {
        try {
            // 是否有修改
            let isModify: boolean = false

            const newValue = await form.getFieldsValue()
            const oldValue: any = {
                filterMode: oldFilterMode.current,
                hostName: oldHostName.current,
                urlPath: oldUrlPath.current,
                fileSuffix: oldFileSuffix.current,
                searchContentType: oldSearchContentType.current,
                excludeKeywords: oldExcludeKeywords.current
            }
            isModify = JSON.stringify(oldValue) !== JSON.stringify(newValue)

            return isModify
        } catch (error) {
            yakitNotify("error", `${error}`)
            return null
        }
    })

    const handleClose = useMemoizedFn(async () => {
        const result = await handleJudgeModify()
        if (result == null) return

        if (result) {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存高级筛选并关闭弹框？",
                okText: "保存",
                cancelText: "不保存",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <OutlineXIcon />
                    </div>
                ),
                onOk: handleSave,
                onCancel: handleCancel,
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            setVisible(false)
        }
    })

    return (
        <YakitDrawer
            className={styles["http-flow-table-form-configuration"]}
            visible={visible}
            width='40%'
            onClose={handleClose}
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>高级筛选</div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton type='outline2' onClick={handleCancel}>
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={handleSave}>
                            保存
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
        >
            <div className={styles["advanced-config-wrapper"]}>
                {/* 筛选项 */}
                <div className={styles["config-item-wrapper"]}>
                    <div className={styles["item-header"]}>
                        <div className={styles["header-title"]}>高级筛选</div>
                        <YakitButton type='text' onClick={handleAdvancedFiltersReset}>
                            重置
                        </YakitButton>
                    </div>

                    <Form
                        form={form}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 16}}
                        className={styles["mitm-filters-form"]}
                    >
                        <Form.Item label='筛选模式' name='filterMode' initialValue={"shield"}>
                            <YakitRadioButtons
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "shield",
                                        label: "屏蔽内容"
                                    },
                                    {
                                        value: "show",
                                        label: "只展示"
                                    }
                                ]}
                                value={filterModeVal}
                                onChange={(e) => {
                                    setFilterModeVal(e.target.value)
                                }}
                            />
                        </Form.Item>
                        <Form.Item label='Hostname' name='hostName'>
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item
                            label='URL路径'
                            name='urlPath'
                            help={"可理解为 URI 匹配，例如 /main/index.php?a=123 或者 /*/index 或 /admin* "}
                        >
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item label={"文件后缀"} name='fileSuffix'>
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item label={"响应类型"} name='searchContentType'>
                            <YakitSelect mode='tags' options={responseType}></YakitSelect>
                        </Form.Item>
                        {filterModeVal === "shield" && (
                            <Form.Item label='关键字' name='excludeKeywords' help={"匹配逻辑与外面搜索关键字逻辑一样"}>
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>
                        )}
                    </Form>
                </div>
            </div>
        </YakitDrawer>
    )
}
