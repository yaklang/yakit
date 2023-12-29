import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import styles from "./PluginExecuteExtraParams.module.scss"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Form, FormInstance} from "antd"
import {
    PluginExecuteExtraFormValue,
    CustomPluginExecuteFormValue,
    YakExtraParamProps
} from "./LocalPluginExecuteDetailHeardType"
import {yakitFailed} from "@/utils/notification"
import {FormContentItemByType, defPluginExecuteFormValue} from "./LocalPluginExecuteDetailHeard"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {OutlineTrashIcon} from "@/assets/icon/outline"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {SolidPlusIcon} from "@/assets/icon/solid"
import {KVPair} from "@/models/kv"
import {PluginGV} from "../../builtInData"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"

const {ipcRenderer} = window.require("electron")

const {YakitPanel} = YakitCollapse

interface PluginExecuteExtraParamsProps {
    ref?: any
    pluginType: string
    extraParamsValue: PluginExecuteExtraFormValue | CustomPluginExecuteFormValue
    extraParamsGroup: YakExtraParamProps[]
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: PluginExecuteExtraFormValue | CustomPluginExecuteFormValue) => void
}

export interface PluginExecuteExtraParamsRefProps {
    form: FormInstance<any>
}
const PluginExecuteExtraParams: React.FC<PluginExecuteExtraParamsProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {extraParamsGroup = [], pluginType, extraParamsValue, visible, setVisible, onSave} = props

        const [form] = Form.useForm()

        const pathRef: React.MutableRefObject<YakitBaseSelectRef> = useRef<YakitBaseSelectRef>({
            onGetRemoteValues: () => {},
            onSetRemoteValues: (s: string[]) => {}
        })

        useImperativeHandle(ref, () => ({form}), [form])
        useEffect(() => {
            if (visible) {
                form.setFieldsValue({...extraParamsValue})
            }
        }, [visible, extraParamsValue])
        const onClose = useMemoizedFn(() => {
            onSaveSetting()
        })
        /**
         * @description 保存高级配置
         */
        const onSaveSetting = useMemoizedFn(() => {
            switch (pluginType) {
                case "yak":
                case "lua":
                    form.validateFields().then((formValue: CustomPluginExecuteFormValue) => {
                        onSave(formValue)
                    })
                    break
                case "mitm":
                case "port-scan":
                case "nuclei":
                    form.validateFields().then((formValue: HTTPRequestBuilderParams) => {
                        if (formValue.Path) {
                            pathRef.current.onSetRemoteValues(formValue.Path)
                        }
                        onSave(formValue)
                    })
                    break
                default:
                    break
            }
        })

        /**yak/lua根据后端返的生成;mitm/port-scan/nuclei前端固定;codec没有额外参数*/
        const pluginParamsNodeByPluginType = (type: string) => {
            switch (type) {
                case "yak":
                case "lua":
                    return (
                        <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                            <ExtraParamsNodeByType extraParamsGroup={extraParamsGroup} pluginType={pluginType} />
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </Form>
                    )

                case "mitm":
                case "port-scan":
                case "nuclei":
                    return (
                        <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                            <FixExtraParamsNode form={form} pathRef={pathRef} onReset={onReset} />
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </Form>
                    )

                default:
                    return <></>
            }
        }
        /**重置固定的额外参数中的表单值 */
        const onReset = useMemoizedFn((restValue) => {
            form.setFieldsValue({...restValue})
        })
        return (
            <YakitDrawer
                className={styles["plugin-execute-extra-params-drawer"]}
                visible={visible}
                onClose={onClose}
                width='40%'
                title='额外参数'
            >
                {pluginParamsNodeByPluginType(pluginType)}
            </YakitDrawer>
        )
    })
)
export default PluginExecuteExtraParams

interface ExtraParamsNodeByTypeProps {
    extraParamsGroup: YakExtraParamProps[]
    pluginType: string
}
const ExtraParamsNodeByType: React.FC<ExtraParamsNodeByTypeProps> = React.memo((props) => {
    const {extraParamsGroup, pluginType} = props
    const defaultActiveKey = useMemo(() => {
        return extraParamsGroup.map((ele) => ele.group)
    }, [extraParamsGroup])
    return (
        <YakitCollapse defaultActiveKey={defaultActiveKey} className={styles["extra-params-node-type"]}>
            {extraParamsGroup.map((item, index) => (
                <YakitPanel key={`${item.group}`} header={`参数组：${item.group}`}>
                    {item.data?.map((formItem) => (
                        <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
                            <FormContentItemByType item={formItem} pluginType={pluginType} />
                        </React.Fragment>
                    ))}
                </YakitPanel>
            ))}
        </YakitCollapse>
    )
})

interface FixExtraParamsNodeProps {
    pathRef: React.MutableRefObject<YakitBaseSelectRef>
    form: FormInstance<HTTPRequestBuilderParams>
    onReset: (fields) => void
}
type Fields = keyof HTTPRequestBuilderParams
const FixExtraParamsNode: React.FC<FixExtraParamsNodeProps> = React.memo((props) => {
    const {onReset, pathRef, form} = props
    const [activeKey, setActiveKey] = useState<string[]>(["GET 参数"])

    const getParamsRef = useRef<any>()
    const postParamsRef = useRef<any>()
    const headersRef = useRef<any>()
    const cookieRef = useRef<any>()

    // 重置
    const handleReset = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: Fields,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        onReset({
            [field]: [{Key: "", Value: ""}]
        })
        ref.current.setVariableActiveKey(["0"])
    }
    // 添加
    const handleAdd = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: Fields,
        actKey: string,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = (v[field] || []) as KVPair[]
        const index = variables.findIndex((ele: KVPair) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            onReset({
                [field]: [...variables, {Key: "", Value: ""}]
            })
            ref.current.setVariableActiveKey([...(ref.current.variableActiveKey || []), `${variables?.length || 0}`])
        } else {
            yakitFailed(`请将已添加【变量${index}】设置完成后再进行添加`)
        }
        if (activeKey?.findIndex((ele) => ele === actKey) === -1) {
            setActiveKey([...activeKey, actKey])
        }
    }
    // 删除
    const handleRemove = (e: React.MouseEvent<Element, MouseEvent>, i: number, field: Fields) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = (v[field] || []) as KVPair[]
        variables.splice(i, 1)
        onReset({
            [field]: [...variables]
        })
    }
    return (
        <div className={styles["plugin-extra-params"]}>
            <Form.Item label='HTTP方法' name='Method' initialValue='GET'>
                <YakitSelect
                    options={["GET", "POST", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT"].map((item) => ({
                        value: item,
                        label: item
                    }))}
                />
            </Form.Item>
            <Form.Item label='请求路径' name='Path'>
                <YakitSelect
                    ref={pathRef}
                    allowClear
                    defaultOptions={["/", "/admin"].map((item) => ({value: item, label: item}))}
                    mode='tags'
                    placeholder='请输入...'
                    cacheHistoryDataKey={PluginGV.LocalExecuteExtraPath}
                    isCacheDefaultValue={false}
                />
            </Form.Item>
            <YakitCollapse
                destroyInactivePanel={false}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                bordered={false}
            >
                <YakitPanel
                    header='GET 参数'
                    key='GET 参数'
                    extra={
                        <>
                            <YakitButton
                                type='text'
                                colors='danger'
                                onClick={(e) => handleReset(e, "GetParams", getParamsRef)}
                                size='small'
                            >
                                重置
                            </YakitButton>
                            <Divider type='vertical' style={{margin: 0}} />
                            <YakitButton
                                type='text'
                                onClick={(e) => handleAdd(e, "GetParams", "GET 参数", getParamsRef)}
                                style={{paddingRight: 0}}
                                size='small'
                            >
                                添加
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                        </>
                    }
                >
                    <VariableList
                        ref={getParamsRef}
                        field='GetParams'
                        yakitPanelClassName={styles["form-list-panel"]}
                        extra={(i: number) => {
                            return (
                                <YakitButton
                                    type='text2'
                                    danger
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemove(e, i, "GetParams")
                                    }}
                                    icon={<OutlineTrashIcon />}
                                    className={styles["panel-list-extra-remove"]}
                                />
                            )
                        }}
                    ></VariableList>
                </YakitPanel>
                <YakitPanel
                    header='POST 参数'
                    key='POST 参数'
                    extra={
                        <>
                            <YakitButton
                                type='text'
                                colors='danger'
                                onClick={(e) => handleReset(e, "PostParams", postParamsRef)}
                                size='small'
                            >
                                重置
                            </YakitButton>
                            <Divider type='vertical' style={{margin: 0}} />
                            <YakitButton
                                type='text'
                                onClick={(e) => handleAdd(e, "PostParams", "POST 参数", postParamsRef)}
                                style={{paddingRight: 0}}
                                size='small'
                            >
                                添加
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                        </>
                    }
                >
                    <VariableList
                        ref={postParamsRef}
                        field='PostParams'
                        yakitPanelClassName={styles["form-list-panel"]}
                        extra={(i: number) => {
                            return (
                                <YakitButton
                                    type='text2'
                                    danger
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemove(e, i, "GetParams")
                                    }}
                                    icon={<OutlineTrashIcon />}
                                    className={styles["panel-list-extra-remove"]}
                                />
                            )
                        }}
                    ></VariableList>
                </YakitPanel>
                <YakitPanel
                    header='Header'
                    key='Header'
                    extra={
                        <>
                            <YakitButton
                                type='text'
                                colors='danger'
                                onClick={(e) => handleReset(e, "Headers", headersRef)}
                                size='small'
                            >
                                重置
                            </YakitButton>
                            <Divider type='vertical' style={{margin: 0}} />
                            <YakitButton
                                type='text'
                                onClick={(e) => handleAdd(e, "Headers", "Header", headersRef)}
                                style={{paddingRight: 0}}
                                size='small'
                            >
                                添加
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                        </>
                    }
                >
                    <VariableList
                        ref={headersRef}
                        field='Headers'
                        yakitPanelClassName={styles["form-list-panel"]}
                        extra={(i: number) => {
                            return (
                                <YakitButton
                                    type='text2'
                                    danger
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemove(e, i, "GetParams")
                                    }}
                                    icon={<OutlineTrashIcon />}
                                    className={styles["panel-list-extra-remove"]}
                                />
                            )
                        }}
                    ></VariableList>
                </YakitPanel>
                <YakitPanel
                    header='Cookie'
                    key='Cookie'
                    extra={
                        <>
                            <YakitButton
                                type='text'
                                colors='danger'
                                onClick={(e) => handleReset(e, "Cookie", cookieRef)}
                                size='small'
                            >
                                重置
                            </YakitButton>
                            <Divider type='vertical' style={{margin: 0}} />
                            <YakitButton
                                type='text'
                                onClick={(e) => handleAdd(e, "Cookie", "Cookie", cookieRef)}
                                style={{paddingRight: 0}}
                                size='small'
                            >
                                添加
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                        </>
                    }
                >
                    <VariableList
                        ref={cookieRef}
                        field='Cookie'
                        yakitPanelClassName={styles["form-list-panel"]}
                        extra={(i: number) => {
                            return (
                                <YakitButton
                                    type='text2'
                                    danger
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemove(e, i, "GetParams")
                                    }}
                                    icon={<OutlineTrashIcon />}
                                    className={styles["panel-list-extra-remove"]}
                                />
                            )
                        }}
                    ></VariableList>
                </YakitPanel>
            </YakitCollapse>
        </div>
    )
})
