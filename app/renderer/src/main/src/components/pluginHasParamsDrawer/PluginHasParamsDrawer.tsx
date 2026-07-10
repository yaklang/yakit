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
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { OutlineChevronupIcon } from '@/assets/icon/outline'
import classNames from 'classnames'
import { SolidCheckIcon } from '@/assets/icon/solid'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
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

interface PluginHasParamsModalProps {
  visible: boolean
  pluginType: string
  scriptName: string
  initFormValue: CustomPluginExecuteFormValue
  requiredParams: YakParamProps[]
  groupParams: YakExtraParamProps[]
  onCloseParamsModal: (visible: boolean) => void
  onOkParamsModal: (save: boolean, exec: boolean, execParams: YakExecutorParam[]) => void
}
const PluginHasParamsModalExecCheck = 'PluginHasParamsModalExecCheck'
export const PluginHasParamsModal = React.memo((props: PluginHasParamsModalProps) => {
  const {
    visible,
    pluginType,
    scriptName,
    initFormValue,
    requiredParams,
    groupParams,
    onCloseParamsModal,
    onOkParamsModal,
  } = props
  const { t, i18n } = useI18nNamespaces(['plugin', 'yakitUi'])

  const pluginHasParamsFormRef = useRef<PluginHasParamsFormRefProps>()

  const [execCheck, setExecCheck] = useState<string>('execute_and_save')
  const [showExecDropdown, setShowExecDropdown] = useState<boolean>(false)
  const execdropdownRef = useRef<HTMLDivElement>(null)

  const handleStartExecBefore = useMemoizedFn(() => {
    setRemoteValue(PluginHasParamsModalExecCheck, execCheck)
    if (execCheck === 'execute_and_save') {
      execOrSave(true, true)
    } else if (execCheck === 'executeWithoutSaving') {
      execOrSave(false, true)
    }
  })

  useEffect(() => {
    if (visible) {
      getRemoteValue(PluginHasParamsModalExecCheck).then((e) => {
        if (!!e) {
          setExecCheck(e)
        } else {
          setExecCheck('execute_and_save')
        }
      })
      // dropdown 点击外部关闭
      const handleClickOutside = (event) => {
        if (execdropdownRef.current && !execdropdownRef.current.contains(event.target)) {
          setShowExecDropdown(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [visible])

  const execOrSave = useMemoizedFn((save: boolean, exec: boolean) => {
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
          onOkParamsModal(save, exec, execParams)
        }
      })
    }
  })

  return (
    <YakitModal
      visible={visible}
      width={'max(700px, 50%)'}
      destroyOnClose={true}
      onCancel={() => onCloseParamsModal(false)}
      title={scriptName}
      footerStyle={{ overflow: 'visible' }}
      footer={
        <div className={styles['pluginHasParamsModal-footer']}>
          <YakitButton
            type="outline2"
            onClick={() => {
              execOrSave(true, false)
            }}
          >
            {t('YakitButton.save')}
          </YakitButton>
          <div className={styles['exec-operation-btn-wrapper']} ref={execdropdownRef}>
            <div className={styles['operation-btn-left']} onClick={handleStartExecBefore}>
              {execCheck === 'execute_and_save'
                ? t('PluginHasParamsModal.execute_and_save')
                : t('PluginHasParamsModal.executeWithoutSaving')}
            </div>
            <div className={styles['operation-btn-right']} onClick={() => setShowExecDropdown(!showExecDropdown)}>
              <OutlineChevronupIcon
                className={classNames(styles['title-icon'], {
                  [styles['rotate-180']]: showExecDropdown,
                })}
              />
            </div>
            <div
              className={styles['operation-dropdown-wrapper']}
              style={{ display: showExecDropdown ? 'block' : 'none' }}
            >
              {[
                { label: t('PluginHasParamsModal.execute_and_save'), key: 'execute_and_save' },
                { label: t('PluginHasParamsModal.executeWithoutSaving'), key: 'executeWithoutSaving' },
              ].map((item) => (
                <div
                  className={classNames(styles['operation-dropdown-list-item'], {
                    [styles['active']]: execCheck === item.key,
                  })}
                  onClick={() => {
                    setExecCheck(item.key)
                    setShowExecDropdown(!showExecDropdown)
                  }}
                  key={item.key}
                >
                  <span>{item.label}</span>
                  {execCheck === item.key && <SolidCheckIcon className={styles['check-icon']} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <div className={styles['pluginHasParamsModal-cont']}>
        <PluginHasParamsForm
          ref={pluginHasParamsFormRef}
          pluginType={pluginType}
          initFormValue={initFormValue}
          requiredParams={requiredParams}
          groupParams={groupParams}
        />
      </div>
    </YakitModal>
  )
})

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
  const { t, i18n } = useI18nNamespaces(['plugin'])
  const [form] = Form.useForm()
  const jsonSchemaListRef = useRef<{
    [key: string]: any
  }>({})
  const [currentJsonSchemaInitial, setCurrentJsonSchemaInitial] = useState(initFormValue)
  const [refreshValue, setRefreshValue] = useState<number>(0)

  useImperativeHandle(
    ref,
    () => ({
      onSubmit: handleFormSubmit,
      reset: () => {
        if (defaultFormValue) {
          form.setFieldsValue(defaultFormValue)
          setCurrentJsonSchemaInitial(defaultFormValue)
          setRefreshValue((prev) => prev + 1)
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
              const errorMessages = result.jsonSchemaError
                .filter((item) => item.error && Array.isArray(item.error))
                .flatMap((item) =>
                  // @ts-ignore
                  item.error.map((err) => ({
                    label: item.label || '未命名配置',
                    message: err.message || '未知错误',
                  })),
                )
              const userPrompt = errorMessages.map(({ label, message }) => `${label}：${message}`).join('\n')
              if (userPrompt.length) {
                failed(userPrompt)
              } else {
                failed(t('PluginHasParamsDrawer.jsonSchemaValidateFailed'))
              }
              return
            }
            result.jsonSchemaSuccess.forEach((item) => {
              values[item.key] = JSON.stringify(item.value)
            })
            resolve(values)
          }, 500)
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
        paramsList={requiredParams}
        pluginType={pluginType}
        isExecuting={false}
        jsonSchemaListRef={jsonSchemaListRef}
        jsonSchemaInitial={currentJsonSchemaInitial}
        refreshValue={refreshValue}
      />
      <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={pluginType} />
    </Form>
  )
})
