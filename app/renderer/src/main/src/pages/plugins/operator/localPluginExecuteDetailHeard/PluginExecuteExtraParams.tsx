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
import {FormContentItemByType} from "./LocalPluginExecuteDetailHeard"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {SolidPlusIcon} from "@/assets/icon/solid"
import {KVPair} from "@/models/kv"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakParamProps} from "../../pluginsType"
import {defPluginExecuteFormValue} from "./constants"
import {splitPluginParamsData} from "@/pages/pluginEditor/utils/convert"
import {RemotePluginGV} from "@/enums/plugin"
import { JsonFormSchemaListWrapper } from "@/components/JsonFormWrapper/JsonFormWrapper"
import classNames from "classnames"

const {YakitPanel} = YakitCollapse

type ExtraParamsValue = PluginExecuteExtraFormValue | CustomPluginExecuteFormValue
interface PluginExecuteExtraParamsProps extends JsonFormSchemaListWrapper{
    ref?: any
    pluginType: string
    /** 选填参数数据 */
    customPluginParams?: YakParamProps[]
    /** 是否隐藏固定参数UI */
    hiddenFixedParams?: boolean
    extraParamsValue: ExtraParamsValue
    extraParamsGroup: YakExtraParamProps[]
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (value: {customValue: CustomPluginExecuteFormValue; fixedValue: PluginExecuteExtraFormValue}) => void
}

export interface PluginExecuteExtraParamsRefProps {
    form: FormInstance<any>
}
const PluginExecuteExtraParams: React.FC<PluginExecuteExtraParamsProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            pluginType,
            customPluginParams = [],
            hiddenFixedParams,
            extraParamsGroup = [],
            extraParamsValue,
            visible,
            setVisible,
            onSave,
            jsonSchemaListRef
        } = props

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
                        onSave({customValue: formValue, fixedValue: {...defPluginExecuteFormValue}})
                    })
                    break
                case "codec":
                case "mitm":
                    form.validateFields().then((formValue: HTTPRequestBuilderParams) => {
                        if (formValue.Path) {
                            pathRef.current.onSetRemoteValues(formValue.Path)
                        }
                        onSave(splitPluginParamsData(formValue, customPluginParams))
                    })
                    break
                case "port-scan":
                case "nuclei":
                    form.validateFields().then((formValue: HTTPRequestBuilderParams) => {
                        if (formValue.Path) {
                            pathRef.current.onSetRemoteValues(formValue.Path)
                        }
                        onSave({customValue: {}, fixedValue: formValue as PluginExecuteExtraFormValue})
                    })
                    break
                default:
                    break
            }
        })

        /**yak/lua根据后端返的生成;mitm/port-scan/nuclei/codec前端固定;*/
        const pluginParamsNodeByPluginType = (type: string) => {
            switch (type) {
                case "yak":
                case "lua":
                    return (
                        <Form size='small' labelWrap={true} labelCol={{span: 8}} wrapperCol={{span: 16}} form={form}>
                            <ExtraParamsNodeByType extraParamsGroup={extraParamsGroup} pluginType={pluginType} jsonSchemaListRef={jsonSchemaListRef}/>
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </Form>
                    )
                case "codec":
                case "mitm":
                    return (
                        <Form size='small' labelWrap={true} labelCol={{span: 8}} wrapperCol={{span: 16}} form={form}>
                            {extraParamsGroup.length > 0 && (
                                <>
                                    <div className={styles["additional-params-divider"]}>
                                        <div className={styles["text-style"]}>自定义参数 (非必填)</div>
                                        <div className={styles["divider-style"]}></div>
                                    </div>
                                    <ExtraParamsNodeByType
                                        extraParamsGroup={extraParamsGroup}
                                        pluginType={pluginType}
                                    />
                                </>
                            )}
                            {!hiddenFixedParams && (
                                <>
                                    <div className={styles["additional-params-divider"]}>
                                        <div className={styles["text-style"]}>固定参数 (非必填)</div>
                                        <div className={styles["divider-style"]}></div>
                                    </div>
                                    <FixExtraParamsNode form={form} pathRef={pathRef} onReset={onReset} />
                                </>
                            )}
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </Form>
                    )
                case "port-scan":
                case "nuclei":
                    return (
                        <Form size='small' labelWrap={true} labelCol={{span: 8}} wrapperCol={{span: 16}} form={form}>
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

interface ExtraParamsNodeByTypeProps extends JsonFormSchemaListWrapper{
    extraParamsGroup: YakExtraParamProps[]
    pluginType: string
    // 是否应用默认值
    isDefaultActiveKey?: boolean
    wrapperClassName?: string
}
export const ExtraParamsNodeByType: React.FC<ExtraParamsNodeByTypeProps> = React.memo((props) => {
    const {extraParamsGroup, pluginType,jsonSchemaListRef,isDefaultActiveKey= true,wrapperClassName} = props
    const defaultActiveKey = useMemo(() => {
        if(!isDefaultActiveKey) return undefined
        return extraParamsGroup.map((ele) => ele.group)
    }, [extraParamsGroup,isDefaultActiveKey])
    return (
        <YakitCollapse defaultActiveKey={defaultActiveKey} className={classNames(styles["extra-params-node-type"], wrapperClassName || "")}>
            {extraParamsGroup.map((item, index) => (
                <YakitPanel key={`${item.group}`} header={`参数组：${item.group}`}>
                    {item.data?.map((formItem) => (
                        <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
                            <FormContentItemByType item={formItem} pluginType={pluginType} jsonSchemaListRef={jsonSchemaListRef}/>
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

    /** YakitCollapse的bordered 插件调试页面的样式需要该属性 */
    bordered?: boolean
    /** HTTP方法和请求路径的wrapper样式 插件调试页面的样式需要该属性 */
    httpPathWrapper?: string
}
type Fields = keyof HTTPRequestBuilderParams
export const FixExtraParamsNode: React.FC<FixExtraParamsNodeProps> = React.memo((props) => {
    const {onReset, pathRef, form, bordered, httpPathWrapper} = props
    const [activeKey, setActiveKey] = useState<string[]>(["GET 参数"])

    const getParamsRef = useRef<any>()
    const postParamsRef = useRef<any>()
    const headersRef = useRef<any>()
    const cookieRef = useRef<any>()

    const getParams = Form.useWatch("GetParams", form)
    const postParams = Form.useWatch("PostParams", form)
    const headers = Form.useWatch("Headers", form)
    const cookie = Form.useWatch("Cookie", form)

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
    const handleRemove = (i: number, field: Fields) => {
        const v = form.getFieldsValue()
        const variables = (v[field] || []) as KVPair[]
        variables.splice(i, 1)
        onReset({
            [field]: [...variables]
        })
    }
    return (
        <div className={styles["plugin-extra-params"]}>
            <div className={httpPathWrapper}>
                <Form.Item label='HTTP方法' name='Method' initialValue='GET'>
                    <YakitSelect
                        options={["GET", "POST", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT"].map((item) => ({
                            value: item,
                            label: item
                        }))}
                        size='small'
                    />
                </Form.Item>
                <Form.Item label='请求路径' name='Path'>
                    <YakitSelect
                        ref={pathRef}
                        allowClear
                        defaultOptions={["/", "/admin"].map((item) => ({value: item, label: item}))}
                        mode='tags'
                        placeholder='请输入...'
                        cacheHistoryDataKey={RemotePluginGV.LocalExecuteExtraPath}
                        isCacheDefaultValue={false}
                        size='small'
                    />
                </Form.Item>
            </div>
            <YakitCollapse
                destroyInactivePanel={false}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                bordered={!!bordered}
                className={styles["kv-params-wrapper"]}
            >
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            GET 参数
                            {getParams?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{getParams?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
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
                        onDel={(i) => {
                            handleRemove(i, "GetParams")
                        }}
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            POST 参数
                            {postParams?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{postParams?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
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
                    forceRender={true}
                >
                    <VariableList
                        ref={postParamsRef}
                        field='PostParams'
                        onDel={(i) => {
                            handleRemove(i, "PostParams")
                        }}
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            Header
                            {headers?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{headers?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
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
                    forceRender={true}
                >
                    <VariableList
                        ref={headersRef}
                        field='Headers'
                        onDel={(i) => {
                            handleRemove(i, "Headers")
                        }}
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            Cookie
                            {cookie?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{cookie?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
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
                    forceRender={true}
                >
                    <VariableList
                        ref={cookieRef}
                        field='Cookie'
                        onDel={(i) => {
                            handleRemove(i, "Cookie")
                        }}
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
            </YakitCollapse>
        </div>
    )
})
