import React, {useEffect, useRef} from "react"
import {PluginExecuteExtraFormValue} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {Form, FormInstance} from "antd"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginBatchExecuteExtraFormValue} from "./pluginBatchExecutor"
import {FixExtraParamsNode} from "../operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import cloneDeep from "lodash/cloneDeep"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {defPluginExecuteTaskValue} from "@/defaultConstants/PluginBatchExecutor"
import {defPluginExecuteFormValue} from "../operator/localPluginExecuteDetailHeard/constants"
import {RemotePluginGV} from "@/enums/plugin"

const {YakitPanel} = YakitCollapse

interface PluginBatchExecuteExtraParamsDrawerProps {
    /**是否显示请求配置 默认显示 */
    isRawHTTPRequest: boolean
    extraParamsValue: PluginBatchExecuteExtraFormValue
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: PluginBatchExecuteExtraFormValue) => void
}
const PluginBatchExecuteExtraParamsDrawer: React.FC<PluginBatchExecuteExtraParamsDrawerProps> = React.memo((props) => {
    const {isRawHTTPRequest, extraParamsValue, visible, onSave} = props

    const [form] = Form.useForm()

    const pathRef: React.MutableRefObject<YakitBaseSelectRef> = useRef<YakitBaseSelectRef>({
        onGetRemoteValues: () => {},
        onSetRemoteValues: (s: string[]) => {}
    })
    const proxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])
    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            if (formValue.Path) {
                pathRef.current.onSetRemoteValues(formValue.Path)
            }
            if (formValue.Proxy) {
                proxyRef.current.onSetRemoteValues(formValue.Proxy)
            }
            onSave(formValue)
        })
    })
    return (
        <YakitDrawer
            className={styles["plugin-batch-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='40%'
            title='额外参数'
        >
            <Form size='small' labelWrap={true} labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <PluginBatchExecuteExtraParams
                    pathRef={pathRef}
                    proxyRef={proxyRef}
                    isRawHTTPRequest={isRawHTTPRequest}
                    form={form}
                />
                <div className={styles["to-end"]}>已经到底啦～</div>
            </Form>
        </YakitDrawer>
    )
})
export default PluginBatchExecuteExtraParamsDrawer

interface PluginBatchExecuteExtraParamsProps {
    pathRef: React.MutableRefObject<YakitBaseSelectRef>
    proxyRef: React.MutableRefObject<YakitAutoCompleteRefProps>
    isRawHTTPRequest: boolean
    form: FormInstance<PluginExecuteExtraFormValue>
}
const PluginBatchExecuteExtraParams: React.FC<PluginBatchExecuteExtraParamsProps> = React.memo((props) => {
    const {pathRef, proxyRef, isRawHTTPRequest, form} = props
    const handleResetRequest = useMemoizedFn((e) => {
        e.stopPropagation()
        const value = form.getFieldsValue()
        form.setFieldsValue({
            ...value,
            ...cloneDeep(defPluginExecuteFormValue)
        })
    })
    const handleResetTask = useMemoizedFn((e) => {
        e.stopPropagation()
        const value = form.getFieldsValue()
        form.setFieldsValue({
            ...value,
            ...cloneDeep(defPluginExecuteTaskValue)
        })
    })
    /**重置固定的额外参数中的表单值 */
    const onReset = useMemoizedFn((restValue) => {
        form.setFieldsValue({...restValue})
    })
    return (
        <YakitCollapse destroyInactivePanel={false} defaultActiveKey={["请求配置", "任务配置"]}>
            {!isRawHTTPRequest && (
                <YakitPanel
                    header='请求配置'
                    key='请求配置'
                    extra={
                        <YakitButton type='text' colors='danger' onClick={handleResetRequest} size='small'>
                            重置
                        </YakitButton>
                    }
                >
                    <FixExtraParamsNode form={form} pathRef={pathRef} onReset={onReset} />
                </YakitPanel>
            )}
            <YakitPanel
                header='任务配置'
                key='任务配置'
                extra={
                    <YakitButton type='text' colors='danger' onClick={handleResetTask} size='small'>
                        重置
                    </YakitButton>
                }
            >
                <Form.Item label='代理' name='Proxy'>
                    <YakitAutoComplete
                        ref={proxyRef}
                        allowClear
                        placeholder='请输入...'
                        cacheHistoryDataKey={RemotePluginGV.LocalBatchExecuteExtraProxy}
                        size='small'
                        isCacheDefaultValue={false}
                    />
                </Form.Item>
                <Form.Item label='并发进程' name='Concurrent'>
                    <YakitInputNumber type='horizontal' size='small' min={0} precision={0} />
                </Form.Item>
                <Form.Item label='总超时时间' name='TotalTimeoutSecond'>
                    <YakitInputNumber type='horizontal' size='small' min={0} precision={0} />
                </Form.Item>
            </YakitPanel>
        </YakitCollapse>
    )
})
