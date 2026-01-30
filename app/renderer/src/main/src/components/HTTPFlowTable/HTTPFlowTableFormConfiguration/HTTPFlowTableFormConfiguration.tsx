import React, {Dispatch, SetStateAction, useEffect, useMemo, useRef} from "react"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {Form, Modal, Tooltip} from "antd"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {contentType} from "../HTTPFlowTable"
import {isEqual, toArray} from "lodash"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {OutlineInformationcircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {yakitNotify} from "@/utils/notification"
import styles from "./HTTPFlowTableFormConfiguration.module.scss"

// 旧的缓存 后续移除
export enum HTTPFlowTableFormConsts {
    HTTPFlowTableFilterMode = "YAKIT_HTTPFlowTableFilterMode",
    HTTPFlowTableHostName = "YAKIT_HTTPFlowTableHostName",
    HTTPFlowTableUrlPath = "YAKIT_HTTPFlowTableUrlPath",
    HTTPFlowTableFileSuffix = "YAKIT_HTTPFlowTableFileSuffix",
    HTTPFlowTableContentType = "YAKIT_HTTPFlowTableContentType",
    HTTPFlowTableExcludeKeywords = "YAKIT_HTTPFlowTableExcludeKeywords",
    HTTPFlowTableStatusCode = "YAKIT_HTTPFlowTableStatusCode"
}

export const defFilterConfig: FilterConfig = {
    filterMode: "shield",
    shield: {
        hostName: [],
        urlPath: [],
        fileSuffix: [],
        searchContentType: [],
        excludeKeywords: [],
        statusCode: ""
    },
    show: {
        hostName: [],
        urlPath: [],
        fileSuffix: [],
        searchContentType: []
    }
}

export interface FilterConfig {
    filterMode: "shield" | "show"
    shield: {
        hostName: string[]
        urlPath: string[]
        fileSuffix: string[]
        searchContentType: string[]
        excludeKeywords: string[]
        statusCode: string
    }
    show: {
        hostName: string[]
        urlPath: string[]
        fileSuffix: string[]
        searchContentType: string[]
    }
}

interface HTTPFlowTableFormConfigurationProps {
    visible: boolean
    setVisible: Dispatch<SetStateAction<boolean>>
    filterConfig: FilterConfig
    saveOk: (config: FilterConfig) => void
}
export const HTTPFlowTableFormConfiguration: React.FC<HTTPFlowTableFormConfigurationProps> = (props) => {
    const {visible, setVisible, filterConfig, saveOk} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history"])
    const [form] = Form.useForm()
    const filterModeWatch = Form.useWatch("filterMode", form)
    const originConfigRef = useRef<FilterConfig | null>(null)
    const fieldLabelMap = useMemo(() => {
        return {
            hostName: "Hostname",
            urlPath: t("HTTPFlowTableFormConfiguration.uRLPath"),
            fileSuffix: t("HTTPFlowTableFormConfiguration.fileExtension"),
            searchContentType: t("HTTPFlowTableFormConfiguration.responseType"),
            excludeKeywords: t("HTTPFlowTableFormConfiguration.keyword"),
            statusCode: t("HTTPFlowTableFormConfiguration.statusCode")
        }
    }, [i18n.language])

    useEffect(() => {
        if (!visible) return
        form.setFieldsValue(filterConfig)
        originConfigRef.current = filterConfig
    }, [visible])

    // 屏蔽 和 只显示 相同字段情况下判断是否存在有值一样
    const hasIntersection = (a: string | string[], b: string | string[]) => {
        const arrA = toArray(a)
        const arrB = toArray(b)

        if (!arrA.length || !arrB.length) return false

        const setA = new Set(arrA)
        return arrB.some((item) => setA.has(item))
    }
    const getConflictKeys = () => {
        const shieldKeys = Object.keys(form.getFieldValue("shield"))
        const showKeys = Object.keys(form.getFieldValue("show"))

        return shieldKeys.filter((key) => showKeys.includes(key))
    }
    const getConflictFields = (values: FilterConfig) => {
        const conflicts: string[] = []
        getConflictKeys().forEach((key) => {
            const shieldVal = values.shield[key]
            const showVal = values.show[key]
            if (hasIntersection(shieldVal, showVal)) {
                conflicts.push(key)
            }
        })
        return conflicts
    }

    const hasUnsavedChange = () => {
        const current = form.getFieldsValue(true)
        return !isEqual(current, originConfigRef.current)
    }
    const onClose = useMemoizedFn(() => {
        if (hasUnsavedChange()) {
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
            return
        }

        handleCancel()
    })

    const handleCancel = useMemoizedFn(() => {
        setVisible(false)
    })

    const handleSave = useMemoizedFn(() => {
        const values = form.getFieldsValue(true)
        const conflictFields = getConflictFields(values)
        if (conflictFields.length > 0) {
            const fieldNames = conflictFields.map((key) => fieldLabelMap[key] ?? key).join("、")
            yakitNotify("warning", t("HTTPFlowTableFormConfiguration.conflictFieldsWarning", {v: fieldNames}))
            return
        }
        saveOk(values)
        handleCancel()
    })

    const handleReset = useMemoizedFn(() => {
        form.resetFields()
        form.setFieldsValue(defFilterConfig)
    })

    return (
        <YakitDrawer
            className={styles["http-flow-table-form-configuration"]}
            visible={visible}
            width='40%'
            onClose={onClose}
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>
                        {t("HTTPFlowTableFormConfiguration.advancedFilter")}
                    </div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton type='outline2' onClick={onClose}>
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
                <div className={styles["config-item-wrapper"]}>
                    <div className={styles["item-header"]}>
                        <div className={styles["header-title"]}>
                            {t("HTTPFlowTableFormConfiguration.advancedFilter")}
                        </div>
                        <YakitButton type='text' onClick={handleReset}>
                            {t("YakitButton.reset")}
                        </YakitButton>
                    </div>

                    <Form
                        form={form}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 16}}
                        className={styles["filters-form"]}
                    >
                        <Form.Item
                            name='filterMode'
                            label={
                                <span className={styles["form-label"]}>
                                    {t("HTTPFlowTableFormConfiguration.filterMode")}
                                    <Tooltip
                                        title={t("HTTPFlowTableFormConfiguration.advancedFilterHelp")}
                                    >
                                        <OutlineInformationcircleIcon className={styles["info-icon"]} />
                                    </Tooltip>
                                </span>
                            }
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
                            />
                        </Form.Item>
                        <div style={{display: filterModeWatch === "shield" ? "block" : "none"}}>
                            <Form.Item label='Hostname' name={["shield", "hostName"]}>
                                <YakitSelect mode='tags' />
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.uRLPath")}
                                name={["shield", "urlPath"]}
                                help={t("HTTPFlowTableFormConfiguration.uRIMatchExplanation")}
                            >
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.fileExtension")}
                                name={["shield", "fileSuffix"]}
                            >
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.responseType")}
                                name={["shield", "searchContentType"]}
                            >
                                <YakitSelect mode='tags' options={contentType}></YakitSelect>
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.keyword")}
                                name={["shield", "excludeKeywords"]}
                                help={t("HTTPFlowTableFormConfiguration.matchingLogicSameAsSearch")}
                            >
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.statusCode")}
                                name={["shield", "statusCode"]}
                                help={t("YakitInput.supportInputFormat")}
                            >
                                <YakitInput />
                            </Form.Item>
                        </div>
                        <div style={{display: filterModeWatch === "show" ? "block" : "none"}}>
                            <Form.Item label='Hostname' name={["show", "hostName"]}>
                                <YakitSelect mode='tags' />
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.uRLPath")}
                                name={["show", "urlPath"]}
                                help={t("HTTPFlowTableFormConfiguration.uRIMatchExplanation")}
                            >
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.fileExtension")}
                                name={["show", "fileSuffix"]}
                            >
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>

                            <Form.Item
                                label={t("HTTPFlowTableFormConfiguration.responseType")}
                                name={["show", "searchContentType"]}
                            >
                                <YakitSelect mode='tags' options={contentType}></YakitSelect>
                            </Form.Item>
                        </div>
                    </Form>
                </div>
            </div>
        </YakitDrawer>
    )
}
