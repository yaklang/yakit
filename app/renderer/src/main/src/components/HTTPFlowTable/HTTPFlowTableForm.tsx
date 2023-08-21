import React, {useEffect, useRef, useState} from "react"
import {Form,Modal} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./HTTPFlowTableForm.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {FiltersItemProps} from "../TableVirtualResize/TableVirtualResizeType"
import { getRemoteValue, setRemoteValue } from "@/utils/kv"
import { RemoveIcon } from "@/assets/newIcon"
const {ipcRenderer} = window.require("electron")
export interface HTTPFlowTableFormConfigurationProps {
    visible: boolean
    setVisible: (b: boolean) => void
    responseType: FiltersItemProps[]
    onSave: (v: HTTPFlowTableFromValue) => void
}

export interface HTTPFlowTableFromValue {
    searchContentType: string
}

export enum HTTPFlowTableFormConsts {
    HTTPFlowTableContentType = "YAKIT_HTTPFlowTableContentType"
}

export const HTTPFlowTableFormConfiguration: React.FC<HTTPFlowTableFormConfigurationProps> = (props) => {
    const {visible, setVisible, responseType,onSave} = props
    const [searchContentTypeDef,setSearchContentTypeDef] = useState<string[]>()


    const [form] = Form.useForm()
    // 获取默认值
    useEffect(() => {
        // Host配置
        getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType).then((e) => {
                const contentType:string = e
                const searchContentType:string[] = contentType.length===0?[]:contentType.split(",")
                setSearchContentTypeDef(searchContentType)
                form.setFieldsValue({searchContentType})
        })
    }, [visible])

    /**
     * @description 保存高级配置
     */
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            console.log("onSaveSetting",formValue);
            let searchContentType:string = (formValue.searchContentType||[]).join(",")
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType,searchContentType)
            onSave({
                searchContentType
            })
        })
    })

    const onClose = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        const oldValue:any = {
            searchContentType:searchContentTypeDef
        }
        const newValue = {
            ...formValue,
        }
        console.log("ppoo",JSON.stringify(oldValue),JSON.stringify(newValue));
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
    return (
        <YakitDrawer
            className={styles["http-flow-table-form-configuration"]}
            visible={visible}
            width='40%'
            onClose={() => onClose()}
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>高级配置</div>
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
                <Form.Item label='筛选模式'>
                    <YakitRadioButtons
                        // value={"system"}
                        defaultValue={"shield"}
                        onChange={(e) => {
                            // setType(e.target.value)
                        }}
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
                    />
                </Form.Item>
                <Form.Item label='Hostname'>
                    <YakitSelect
                        mode='tags'
                        // value={params?.includeHostname}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item
                    label='URL路径'
                    help={"可理解为 URI 匹配，例如 /main/index.php?a=123 或者 /*/index 或 /admin* "}
                >
                    <YakitSelect
                        mode='tags'
                        // value={params?.includeUri || undefined}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={"文件后缀"}>
                    <YakitSelect
                        mode='tags'
                        // value={params?.includeSuffix || undefined}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={"响应类型"} name='searchContentType'>
                    <YakitSelect
                        mode='tags'
                        // value={params?.contentType || undefined}
                        options={responseType}
                    ></YakitSelect>
                </Form.Item>
            </Form>
        </YakitDrawer>
    )
}
