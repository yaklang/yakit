import React, {useEffect, useRef, useState} from "react"
import {Form, Modal} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import styles from "./HTTPFlowTableForm.module.scss"
import classNames from "classnames"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {FiltersItemProps} from "../TableVirtualResize/TableVirtualResizeType"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoveIcon} from "@/assets/newIcon"
export interface HTTPFlowTableFormConfigurationProps {
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
    const [filterModeVal, setFilterModeVal] = useState<"shield" | "show">("shield")
    const [filterModeDef, setFilterModeDef] = useState<"shield" | "show">("shield")
    const [hostNameDef, setHostNameDef] = useState<string[]>([])
    const [urlPathDef, setUrlPathDef] = useState<string[]>([])
    const [fileSuffixDef, setFileSuffixDef] = useState<string[]>([])
    const [searchContentTypeDef, setSearchContentTypeDef] = useState<string[]>()
    const [excludeKeywordsDef, setExcludeKeywordsDef] = useState<string[]>()
    const [form] = Form.useForm()
    // 获取默认值
    useEffect(() => {
        if (!visible) return
        // 筛选模式
        setFilterModeDef(filterMode)
        setFilterModeVal(filterMode)
        // HostName
        setHostNameDef(hostName)
        // URL路径
        setUrlPathDef(urlPath)
        // 文件后缀
        setFileSuffixDef(fileSuffix)
        // 响应类型
        const contentType: string = searchContentType
        const searchType: string[] = contentType.length === 0 ? [] : contentType.split(",")
        setSearchContentTypeDef(searchType)
        // 关键字
        setExcludeKeywordsDef(excludeKeywords)

        form.setFieldsValue({filterMode, hostName, urlPath, fileSuffix, searchContentType: searchType, excludeKeywords})
    }, [visible])

    /**
     * @description 保存高级配置
     */
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            const {filterMode, urlPath = [], hostName = [], fileSuffix = [], excludeKeywords = []} = formValue
            let searchContentType: string = (formValue.searchContentType || []).join(",")
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFilterMode, filterMode)
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableHostName, JSON.stringify(hostName))
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableUrlPath, JSON.stringify(urlPath))
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFileSuffix, JSON.stringify(fileSuffix))
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType, searchContentType)
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableExcludeKeywords, JSON.stringify(excludeKeywords))
            onSave({
                filterMode: filterMode,
                hostName,
                urlPath,
                fileSuffix,
                searchContentType,
                excludeKeywords
            })
        })
    })

    const onClose = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        const oldValue: any = {
            filterMode: filterModeDef,
            hostName: hostNameDef,
            urlPath: urlPathDef,
            fileSuffix: fileSuffixDef,
            searchContentType: searchContentTypeDef,
            excludeKeywords: excludeKeywordsDef
        }
        const newValue = {
            ...formValue
        }
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存高级配置并关闭弹框？",
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
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    onSaveSetting()
                },
                onCancel: () => {
                    setVisible(false)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            setVisible(false)
        }
    })

    const reset = () => {
        form.resetFields()
        setFilterModeVal("shield")
    }
    return (
        <YakitDrawer
            className={styles["http-flow-table-form-configuration"]}
            visible={visible}
            width='40%'
            onClose={() => onClose()}
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>高级筛选</div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setVisible(false)
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={() => onSaveSetting()}>
                            保存
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
        >
            <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 16}} className={styles["mitm-filters-form"]}>
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
                <Form.Item label={" "} colon={false}>
                    <YakitButton type='text' onClick={reset}>
                        重置
                    </YakitButton>
                </Form.Item>
            </Form>
        </YakitDrawer>
    )
}
