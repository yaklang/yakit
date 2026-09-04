import { YakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import React, { useEffect, useImperativeHandle, useRef } from 'react'
import styles from './PluginExecuteExtraParams.module.scss'
import { useMemoizedFn } from 'ahooks'
import { Form, type FormInstance } from 'antd'
import type {
  PluginExecuteExtraFormValue,
  CustomPluginExecuteFormValue,
  YakExtraParamProps,
} from './LocalPluginExecuteDetailHeardType'
import type { HTTPRequestBuilderParams } from '@/models/HTTPRequestBuilder'
import type { YakitBaseSelectRef } from '@/components/yakitUI/YakitSelect/YakitSelectType'
import type { YakParamProps } from '../../pluginsType'
import { defPluginExecuteFormValue } from './constants'
import { splitPluginParamsData } from '@/pages/pluginEditor/utils/convert'
import type { JsonFormSchemaListWrapper } from '@/components/JsonFormWrapper/JsonFormWrapper'
import { ExtraParamsNodeByType, FixExtraParamsNode } from './PluginExecuteExtraParamsNodes'

type ExtraParamsValue = PluginExecuteExtraFormValue | CustomPluginExecuteFormValue
interface PluginExecuteExtraParamsProps extends JsonFormSchemaListWrapper {
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
  onSave: (value: { customValue: CustomPluginExecuteFormValue; fixedValue: PluginExecuteExtraFormValue }) => void
  refreshValue?: number
  getContainer?: HTMLElement
}

export interface PluginExecuteExtraParamsRefProps {
  form: FormInstance<any>
}
const PluginExecuteExtraParams: React.FC<PluginExecuteExtraParamsProps> = React.memo(
  React.forwardRef((props, ref) => {
    const {
      getContainer,
      pluginType,
      customPluginParams = [],
      hiddenFixedParams,
      extraParamsGroup = [],
      extraParamsValue,
      visible,
      setVisible,
      onSave,
      jsonSchemaListRef,
    } = props

    const [form] = Form.useForm()

    const pathRef: React.MutableRefObject<YakitBaseSelectRef> = useRef<YakitBaseSelectRef>({
      onGetRemoteValues: () => {},
      onSetRemoteValues: (s: string[]) => {},
    })

    useImperativeHandle(ref, () => ({ form }), [form])
    useEffect(() => {
      if (visible) {
        form.setFieldsValue({ ...extraParamsValue })
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
        case 'yak':
        case 'context-menu':
          form.validateFields().then((formValue: CustomPluginExecuteFormValue) => {
            onSave({ customValue: formValue, fixedValue: { ...defPluginExecuteFormValue } })
          })
          break
        case 'codec':
        case 'mitm':
          form.validateFields().then((formValue: HTTPRequestBuilderParams) => {
            if (formValue.Path) {
              pathRef.current.onSetRemoteValues(formValue.Path)
            }
            onSave(splitPluginParamsData(formValue, customPluginParams))
          })
          break
        case 'port-scan':
        case 'nuclei':
          form.validateFields().then((formValue: HTTPRequestBuilderParams) => {
            if (formValue.Path) {
              pathRef.current.onSetRemoteValues(formValue.Path)
            }
            onSave({ customValue: {}, fixedValue: formValue as PluginExecuteExtraFormValue })
          })
          break
        default:
          break
      }
    })

    /**yak/context-menu根据后端返的生成;mitm/port-scan/nuclei/codec前端固定*/
    const pluginParamsNodeByPluginType = (type: string) => {
      switch (type) {
        case 'yak':
        case 'context-menu':
          return (
            <Form size="small" labelWrap={true} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} form={form}>
              <ExtraParamsNodeByType
                extraParamsGroup={extraParamsGroup}
                pluginType={pluginType}
                jsonSchemaListRef={jsonSchemaListRef}
              />
              <div className={styles['to-end']}>已经到底啦～</div>
            </Form>
          )
        case 'codec':
        case 'mitm':
          return (
            <Form size="small" labelWrap={true} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} form={form}>
              {extraParamsGroup.length > 0 && (
                <>
                  <div className={styles['additional-params-divider']}>
                    <div className={styles['text-style']}>自定义参数 (非必填)</div>
                    <div className={styles['divider-style']}></div>
                  </div>
                  <ExtraParamsNodeByType extraParamsGroup={extraParamsGroup} pluginType={pluginType} />
                </>
              )}
              {!hiddenFixedParams && (
                <>
                  <div className={styles['additional-params-divider']}>
                    <div className={styles['text-style']}>固定参数 (非必填)</div>
                    <div className={styles['divider-style']}></div>
                  </div>
                  <FixExtraParamsNode form={form} pathRef={pathRef} onReset={onReset} />
                </>
              )}
              <div className={styles['to-end']}>已经到底啦～</div>
            </Form>
          )
        case 'port-scan':
        case 'nuclei':
          return (
            <Form size="small" labelWrap={true} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} form={form}>
              <FixExtraParamsNode form={form} pathRef={pathRef} onReset={onReset} />
              <div className={styles['to-end']}>已经到底啦～</div>
            </Form>
          )

        default:
          return <></>
      }
    }
    /**重置固定的额外参数中的表单值 */
    const onReset = useMemoizedFn((restValue) => {
      form.setFieldsValue({ ...restValue })
    })
    return (
      <YakitDrawer
        rootClassName={styles['plugin-execute-extra-params-drawer']}
        open={visible}
        onClose={onClose}
        width="max(700px, 40%)"
        title="额外参数"
        getContainer={getContainer}
      >
        {pluginParamsNodeByPluginType(pluginType)}
      </YakitDrawer>
    )
  }),
)
export default PluginExecuteExtraParams

export { ExtraParamsNodeByType, FixExtraParamsNode } from './PluginExecuteExtraParamsNodes'
