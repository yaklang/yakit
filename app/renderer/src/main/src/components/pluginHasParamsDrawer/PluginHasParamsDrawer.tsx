import React, { ForwardedRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import emiter from '@/utils/eventBus/eventBus'
import { YakitDrawer } from '../yakitUI/YakitDrawer/YakitDrawer'
import { Form, Space, Tooltip } from 'antd'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import {
  CustomPluginExecuteFormValue,
  YakExtraParamProps,
} from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'
import { YakExecutorParam } from '@/pages/invoker/YakExecutorParams'
import { Resizable } from 're-resizable'
import { YakParamProps } from '@/pages/plugins/pluginsType'
import { getJsonSchemaListResult } from '../JsonFormWrapper/JsonFormWrapper'
import { failed } from '@/utils/notification'
import { ExecuteEnterNodeByPluginParams } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard'
import { ExtraParamsNodeByType } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams'
import { useMemoizedFn } from 'ahooks'
import { YakitDrawerProps } from '../yakitUI/YakitDrawer/YakitDrawerType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './PluginHasParamsDrawer.module.scss'

interface PluginHasParamsDrawerProps {
  visible: boolean
  placementDrawer?: YakitDrawerProps['placement']
  pluginType: string
  scriptName: string
  drawerWidth: number
  initFormValue: CustomPluginExecuteFormValue
  defaultFormValue?: CustomPluginExecuteFormValue
  requiredParams: YakParamProps[]
  groupParams: YakExtraParamProps[]
  onSetDrawerWidth: (width: number) => void
  onCloseParamsDrawer: (visible: boolean) => void
  onOkParamsDrawer: (execParams: YakExecutorParam[]) => void
}
const PluginHasParamsDrawer = React.memo((props: PluginHasParamsDrawerProps) => {
  const {
    visible,
    placementDrawer = 'left',
    pluginType,
    scriptName,
    drawerWidth,
    initFormValue,
    defaultFormValue,
    requiredParams,
    groupParams,
    onSetDrawerWidth,
    onCloseParamsDrawer,
    onOkParamsDrawer,
  } = props
  const { t, i18n } = useI18nNamespaces(['plugin', 'yakitUi'])

  const pluginHasParamsFormRef = useRef<PluginHasParamsFormRefProps>()
  const [initWidth, _] = useState<number>(drawerWidth)

  useEffect(() => {
    return () => {
      emiter.emit('setYakitHeaderDraggable', true)
    }
  }, [])

  const vwToPx = (vw: number) => {
    const viewportWidth = window.innerWidth
    return (vw * viewportWidth) / 100
  }

  const pxToVw = (px: number) => {
    const viewportWidth = window.innerWidth
    return (px / viewportWidth) * 100
  }

  const minWidth = useMemo(() => {
    return Math.min(40, initWidth)
  }, [initWidth])

  const handleStyles = useMemo(() => {
    if (placementDrawer === 'left') {
      return {
        right: {
          width: 15,
          cursor: 'ew-resize',
          right: 0,
        },
      }
    } else if (placementDrawer === 'right') {
      return {
        left: {
          width: 15,
          cursor: 'ew-resize',
          left: 0,
        },
      }
    }
  }, [placementDrawer])

  return (
    <YakitDrawer
      visible={visible}
      closable={false}
      width={drawerWidth + 'vw'}
      placement={placementDrawer}
      destroyOnClose={true}
      title={
        <div className={styles['paramsDrawer-title']}>
          <div
            className="content-ellipsis"
            style={{ maxWidth: `calc(${vwToPx(Math.max(minWidth, drawerWidth))}px - 150px)` }}
          >
            {t('PluginHasParamsDrawer.parameter_Settings')}
            <Tooltip title={scriptName}>{`${scriptName}`}</Tooltip>
          </div>
          <Space>
            {defaultFormValue && (
              <YakitButton type="outline2" onClick={() => pluginHasParamsFormRef.current?.reset()}>
                {t('YakitButton.resetParams')}
              </YakitButton>
            )}
            <YakitButton
              type="outline2"
              onClick={() => {
                onCloseParamsDrawer(false)
              }}
            >
              {t('YakitButton.cancel')}
            </YakitButton>
            <YakitButton
              onClick={() => {
                if (pluginHasParamsFormRef.current) {
                  pluginHasParamsFormRef.current.onSubmit().then((values) => {
                    if (values) {
                      const saveParams: CustomPluginExecuteFormValue = { ...values }
                      const execParams: YakExecutorParam[] = []
                      Object.keys(saveParams).forEach((key) => {
                        if (saveParams[key] !== false) {
                          execParams.push({ Key: key, Value: saveParams[key] })
                        }
                      })
                      onCloseParamsDrawer(false)
                      onOkParamsDrawer(execParams)
                    }
                  })
                }
              }}
            >
              {t('YakitButton.ok')}
            </YakitButton>
          </Space>
        </div>
      }
      bodyStyle={{ paddingLeft: 0, paddingRight: 0, overflowX: 'clip' }}
      style={{ position: 'absolute' }}
    >
      <Resizable
        minWidth={minWidth + 'vw'}
        maxWidth={'95vw'}
        minHeight={'100%'}
        onResizeStart={(e) => e.stopPropagation()}
        onResize={(e, direction, ref, d) => {
          e.stopPropagation()
          const newWidth = Math.min(ref.offsetWidth, window.innerWidth * 0.95)
          onSetDrawerWidth(pxToVw(newWidth))
        }}
        enable={{
          right: placementDrawer === 'left',
          left: placementDrawer === 'right',
        }}
        handleStyles={handleStyles}
        size={{
          width: drawerWidth + 'vw',
          height: 'auto',
        }}
      >
        <div className={styles['params-set']}>
          <PluginHasParamsForm
            ref={pluginHasParamsFormRef}
            pluginType={pluginType}
            initFormValue={initFormValue}
            defaultFormValue={defaultFormValue}
            requiredParams={requiredParams}
            groupParams={groupParams}
          />
        </div>
      </Resizable>
    </YakitDrawer>
  )
})
export default PluginHasParamsDrawer

interface PluginHasParamsFormRefProps {
  onSubmit: () => Promise<CustomPluginExecuteFormValue | undefined>
  reset: () => void
}
interface PluginHasParamsFormProps {
  ref?: ForwardedRef<PluginHasParamsFormRefProps>
  pluginType: string
  initFormValue: CustomPluginExecuteFormValue
  defaultFormValue?: CustomPluginExecuteFormValue
  requiredParams: YakParamProps[]
  groupParams: YakExtraParamProps[]
}
const PluginHasParamsForm = React.forwardRef((props: PluginHasParamsFormProps, ref) => {
  const { pluginType, initFormValue, defaultFormValue, requiredParams, groupParams } = props
  const [form] = Form.useForm()
  const jsonSchemaListRef = useRef<{
    [key: string]: any
  }>({})
  const [resetCounter, setResetCounter] = useState(0)
  const [currentJsonSchemaInitial, setCurrentJsonSchemaInitial] = useState(initFormValue)

  useImperativeHandle(
    ref,
    () => ({
      onSubmit: handleFormSubmit,
      reset: () => {
        if (defaultFormValue) {
          form.setFieldsValue(defaultFormValue)
          setCurrentJsonSchemaInitial(defaultFormValue)
          setResetCounter((prev) => prev + 1)
        }
      },
    }),
    [form, defaultFormValue],
  )

  const handleFormSubmit: () => Promise<CustomPluginExecuteFormValue | undefined> = useMemoizedFn(() => {
    return new Promise((resolve, reject) => {
      if (!form) return resolve(undefined)
      form
        .validateFields()
        .then((values) => {
          // 需要等jsonSchema表格数据保存成功后再提交数据，否则可能拿不到最新的值
          setTimeout(() => {
            const result = getJsonSchemaListResult(jsonSchemaListRef.current)
            if (result.jsonSchemaError.length > 0) {
              failed(`jsonSchema校验失败`)
              return
            }
            result.jsonSchemaSuccess.forEach((item) => {
              values[item.key] = JSON.stringify(item.value)
            })
            resolve(values)
          }, 300)
        })
        .catch(() => {
          resolve(undefined)
        })
    })
  })
  return (
    <Form
      form={form}
      layout={'horizontal'}
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      initialValues={initFormValue}
    >
      <ExecuteEnterNodeByPluginParams
        key={resetCounter}
        paramsList={requiredParams}
        pluginType={pluginType}
        isExecuting={false}
        jsonSchemaListRef={jsonSchemaListRef}
        jsonSchemaInitial={currentJsonSchemaInitial}
      />
      <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={pluginType} />
    </Form>
  )
})
