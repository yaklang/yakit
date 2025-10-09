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
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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
    statusCode: string
}

export interface HTTPFlowTableFromValue {
    filterMode: "shield" | "show"
    urlPath: string[]
    hostName: string[]
    fileSuffix: string[]
    searchContentType: string
    excludeKeywords: string[]
    statusCode: string
}

export enum HTTPFlowTableFormConsts {
    HTTPFlowTableFilterMode = "YAKIT_HTTPFlowTableFilterMode",
    HTTPFlowTableHostName = "YAKIT_HTTPFlowTableHostName",
    HTTPFlowTableUrlPath = "YAKIT_HTTPFlowTableUrlPath",
    HTTPFlowTableFileSuffix = "YAKIT_HTTPFlowTableFileSuffix",
    HTTPFlowTableContentType = "YAKIT_HTTPFlowTableContentType",
    HTTPFlowTableExcludeKeywords = "YAKIT_HTTPFlowTableExcludeKeywords",
    HTTPFlowTableStatusCode = "YAKIT_HTTPFlowTableStatusCode"
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
        excludeKeywords,
        statusCode
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history"])
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
    // 原始数据-状态码
    const oldStatusCode = useRef<string>("")

    const [form] = Form.useForm()

    /** 高级筛选-保存 */
    const handleAdvancedFiltersSave = useMemoizedFn(() => {
        return new Promise<HTTPFlowTableFromValue>((resolve, reject) => {
            form.validateFields()
                .then((formValue) => {
                    const {
                        filterMode,
                        urlPath = [],
                        hostName = [],
                        fileSuffix = [],
                        excludeKeywords = [],
                        statusCode = ""
                    } = formValue
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
                        setRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisStatusCode, statusCode)
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
                        setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableStatusCode, statusCode)
                    }
                    const info: HTTPFlowTableFromValue = {
                        filterMode: filterMode,
                        hostName,
                        urlPath,
                        fileSuffix,
                        searchContentType,
                        excludeKeywords,
                        statusCode
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
        // 状态码
        oldStatusCode.current = statusCode
        form.setFieldsValue({
            filterMode,
            hostName,
            urlPath,
            fileSuffix,
            searchContentType: searchType,
            excludeKeywords,
            statusCode
        })
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
                excludeKeywords: oldExcludeKeywords.current,
                statusCode: oldStatusCode.current
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
                title: t("YakitModal.friendlyReminder"),
                icon: <ExclamationCircleOutlined />,
                content: t("HTTPFlowTableFormConfiguration.saveAdvancedConfigAndClose"),
                okText: t("YakitButton.save"),
                cancelText: t("YakitButton.doNotSave"),
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
                    <div className={styles["advanced-configuration-drawer-title-text"]}>
                        {t("HTTPFlowTableFormConfiguration.advancedFilter")}
                    </div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton type='outline2' onClick={handleCancel}>
                            {t("YakitButton.cancel")}
                        </YakitButton>
                        <YakitButton type='primary' onClick={handleSave}>
                            {t("YakitButton.save")}
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
                        <div className={styles["header-title"]}>
                            {t("HTTPFlowTableFormConfiguration.advancedFilter")}
                        </div>
                        <YakitButton type='text' onClick={handleAdvancedFiltersReset}>
                            {t("YakitButton.reset")}
                        </YakitButton>
                    </div>

                    <Form
                        form={form}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 16}}
                        className={styles["mitm-filters-form"]}
                    >
                        <Form.Item
                            label={t("HTTPFlowTableFormConfiguration.filterMode")}
                            name='filterMode'
                            initialValue={"shield"}
                        >
                            <YakitRadioButtons
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "shield",
                                        label: t("HTTPFlowTableFormConfiguration.blockedContent")
                                    },
                                    {
                                        value: "show",
                                        label: t("HTTPFlowTableFormConfiguration.displayOnly")
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
                            label={t("HTTPFlowTableFormConfiguration.uRLPath")}
                            name='urlPath'
                            help={t("HTTPFlowTableFormConfiguration.uRIMatchExplanation")}
                        >
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item label={t("HTTPFlowTableFormConfiguration.fileExtension")} name='fileSuffix'>
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item label={t("HTTPFlowTableFormConfiguration.responseType")} name='searchContentType'>
                            <YakitSelect mode='tags' options={responseType}></YakitSelect>
                        </Form.Item>
                        {filterModeVal === "shield" && (
                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.keyword")}
                                name='excludeKeywords'
                                help={t("HTTPFlowTableFormConfiguration.matchingLogicSameAsSearch")}
                            >
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>
                        )}
                        {filterModeVal === "shield" && (
                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.statusCode")}
                                name='statusCode'
                                help={t("YakitInput.supportInputFormat")}
                            >
                                <YakitInput />
                            </Form.Item>
                        )}
                    </Form>
                </div>
            </div>
        </YakitDrawer>
    )
}
