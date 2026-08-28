/**
 * AI 专用第三方应用配置表单组件。
 */
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Collapse, Form } from 'antd'
import type { KVPair } from '@/models/kv'
import { YakitAutoComGroupSearchWithAll } from '../yakitUI/YakitAutoComplete/YakitAutoComGroupSearchWithAll'
import { YakitSelect } from '../yakitUI/YakitSelect/YakitSelect'
import type { SelectOptionsProps } from '@/demoComponents/itemSelect/ItemSelectType'
import { useCreation, useDebounceEffect, useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { YakitInput } from '../yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '../yakitUI/YakitSwitch/YakitSwitch'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { yakitNotify } from '@/utils/notification'
import { YakitSpin } from '../yakitUI/YakitSpin/YakitSpin'
import styles from './ConfigNetworkPage.module.scss'
import { isMemfit } from '@/utils/envfile'
import type { FormInstance, FormLayout } from 'antd/lib/form/Form'
import { AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import { JSONParseLog } from '@/utils/tool'
import type { YakitSelectProps } from '../yakitUI/YakitSelect/YakitSelectType'
import {
  AIConfigAPIKeyFormItem,
  buildAIConfigHealthCheckConfig,
} from '@/pages/ai-agent/aiModelList/aiModelForm/AIModelForm'
import {
  buildReasoningEffortOptions,
  probedExtendedEffortsFromResponse,
} from '@/pages/ai-agent/aiModelList/aiModelForm/reasoningEffort'
import {
  AI_API_TYPE_OPTIONS,
  DEFAULT_AI_API_TYPE,
  normalizeAIAPIType,
} from '@/pages/ai-agent/aiModelList/aiApiTypeOptions'
import { grpcGetAIThirdPartyAppConfigTemplate, grpcProbeReasoningEffort } from '@/pages/ai-agent/aiModelList/utils'
import { cloneDeep } from 'lodash'
import { InputHTTPHeaderForm } from '@/pages/mitm/MITMRule/MITMRuleFromModal'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import type { HTTPHeader } from '@/pages/mitm/MITMContentReplacerHeaderOperator'
import YakitCollapse from '../yakitUI/YakitCollapse/YakitCollapse'
import classNames from 'classnames'
import { type TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { OutlineClipboardcopyIcon } from '@/assets/icon/outline'
import { setClipboardText } from '@/utils/clipboard'
import { YakitInputNumber } from '../yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSolidLoading } from '../yakitUI/YakitSolidLoading/YakitSolidLoading'
import type {
  GetThirdPartyAppConfigTemplateResponse,
  ThirdPartyAppConfigItemTemplate,
} from './NewThirdPartyApplicationConfig'

const { ipcRenderer } = window.require('electron')

/**隐藏字段载体：仅用于注册 Form.Item 字段（如探测缓存），不渲染任何 UI */
const HiddenFormField: React.FC<{ value?: unknown }> = () => null

/**思考强度选择器：下拉列表底部展示探测进度（不阻断选项点击）；下拉收起且仍在探测时，控件右侧同行展示 loading */
const ReasoningEffortSelect: React.FC<{
  value?: string
  onChange?: (v: string) => void
  options: SelectOptionsProps[]
  loading?: boolean
  onDropdownVisibleChange?: (open: boolean) => void
}> = ({ value, onChange, options, loading, onDropdownVisibleChange }) => {
  const { t } = useI18nNamespaces(['configNetwork'])
  const [open, setOpen] = useState<boolean>(false)
  return (
    <div className={styles['reasoning-effort-wrapper']}>
      <YakitSelect
        wrapperClassName={styles['reasoning-effort-select']}
        value={value}
        onChange={onChange}
        options={options}
        onDropdownVisibleChange={(nextOpen) => {
          setOpen(nextOpen)
          onDropdownVisibleChange?.(nextOpen)
        }}
        dropdownRender={(menu) => (
          <div>
            {menu}
            {loading && (
              <div className={styles['reasoning-effort-dropdown-loading']}>
                <YakitSolidLoading size={14} inline />
                {t('ConfigNetworkPage.reasoningEffortProbing')}
              </div>
            )}
          </div>
        )}
      />
      {loading && !open && <YakitSolidLoading size={14} inline className={styles['reasoning-effort-loading-icon']} />}
    </div>
  )
}

const defaultAIFormValues = {
  Type: '',
  api_key: '',
  user_identifier: '',
  ExtraParams: [] as KVPair[],
}

const aiModelTypeOptions: (t: TFunction) => SelectOptionsProps[] = (t) => {
  return [
    {
      label: t('ConfigNetworkPage.highQualityModel'),
      value: AIModelTypeEnum.TierIntelligent,
    },
    {
      label: t('ConfigNetworkPage.lightweightModel'),
      value: AIModelTypeEnum.TierLightweight,
    },
    {
      label: t('ConfigNetworkPage.visionModel'),
      value: AIModelTypeEnum.TierVision,
    },
  ]
}
const aiAPITypeOptions: (t: TFunction) => SelectOptionsProps[] = (t) => {
  return AI_API_TYPE_OPTIONS(t).map((item) => ({
    label: item.label,
    value: item.value,
  }))
}
const aiModelTypeItem: (t: TFunction) => ThirdPartyAppConfigItemTemplate = (t) => {
  return {
    Name: 'model_type',
    Required: true,
    Type: 'list',
    DefaultValue: AIModelTypeEnum.TierIntelligent,
    Desc: '',
    Extra: `${JSON.stringify({
      options: aiModelTypeOptions(t),
    })}`,
    Verbose: t('ConfigNetworkPage.modelType'),
  }
}

const defaultAIFormItemsOfAI: (t: TFunction) => ThirdPartyAppConfigItemTemplate[] = (t) => {
  return [
    cloneDeep(aiModelTypeItem(t)),
    {
      Name: 'api_type',
      Required: true,
      Type: 'list',
      DefaultValue: DEFAULT_AI_API_TYPE,
      Desc: '',
      Extra: `${JSON.stringify({
        options: aiAPITypeOptions(t),
      })}`,
      Verbose: t('ConfigNetworkPage.APItype'),
    },
    {
      DefaultValue: '',
      Desc: '',
      Extra: '',
      Name: 'model',
      Required: true,
      Type: 'list',
      Verbose: t('ConfigNetworkPage.modelName'),
    },
  ]
}

const isShowRequiredApiKey = (typeVal: string) => {
  const Required = !['aibalance', 'comate'].includes(typeVal)
  return {
    isRequired: Required,
    data: {
      DefaultValue: 'free-user',
      Desc: 'APIKey / Token',
      Extra: '',
      Name: 'api_key',
      Required,
      Type: 'list',
      Verbose: 'ApiKey',
    },
  }
}

const pickOptionLabel = (opts: SelectOptionsProps[], value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const hit = opts.find((o) => o.value === value)
  return (hit?.label as string) || String(value)
}

const formatReadonlyEmptyAsDash = (v: unknown) => {
  if (v === undefined || v === null || v === '') {
    return '-'
  }
  if (typeof v === 'boolean') {
    return v ? 'true' : 'false'
  }
  return String(v)
}

const headersToDisplayAndCopy = (headers: KVPair[] | undefined) => {
  if (!headers?.length) {
    return { display: '-', copy: '' }
  }
  const lines = headers.map((h) => `${h.Key}: ${h.Value}`)
  return { display: lines.join('\n'), copy: lines.join('\n') }
}

const buildDefaultAIFormItemsForType = (typeVal: string, t: TFunction) => {
  const items = cloneDeep(defaultAIFormItemsOfAI(t))
  const { isRequired, data } = isShowRequiredApiKey(typeVal)
  if (isRequired) {
    const modelIndex = items.findIndex((item) => item.Name === 'model')
    if (modelIndex !== -1) {
      items.splice(modelIndex, 0, data)
    } else {
      items.push(data)
    }
  }
  return items
}

const optionalAIFormItemsOfAI: (t: TFunction) => ThirdPartyAppConfigItemTemplate[] = (t) => [
  {
    DefaultValue: '',
    Desc: t('ConfigNetworkPage.enableEndpointDesc'),
    Extra: '',
    Name: 'enable_endpoint',
    Required: false,
    Type: 'bool',
    Verbose: t('ConfigNetworkPage.enableEndpointLabel'),
  },
  {
    DefaultValue: '',
    Desc: t('ConfigNetworkPage.baseUrlDesc'),
    Extra: '',
    Name: 'base_url',
    Required: false,
    Type: 'string',
    Verbose: 'BaseURL',
    Placeholder: t('ConfigNetworkPage.baseUrlPlaceholder'),
  },
  {
    DefaultValue: '',
    Desc: t('ConfigNetworkPage.endpointDesc'),
    Extra: '',
    Name: 'endpoint',
    Required: false,
    Type: 'string',
    Verbose: 'Endpoint',
    Placeholder: t('ConfigNetworkPage.endpointPlaceholder'),
  },
  {
    DefaultValue: '',
    Desc: t('ConfigNetworkPage.proxyDesc'),
    Extra: '',
    Name: 'proxy',
    Required: false,
    Type: 'string',
    Verbose: t('ConfigNetworkPage.proxyLabel'),
  },
]

const buildOptionalAIFormItemsForType = (typeVal: string, enableEndpoint: boolean, t: TFunction) => {
  const newData = cloneDeep(optionalAIFormItemsOfAI(t))
  const { isRequired, data } = isShowRequiredApiKey(typeVal)
  if (!isRequired) {
    newData.unshift(data)
  }
  if (enableEndpoint) {
    return newData.filter((item) => item.Name !== 'base_url')
  }
  return newData.filter((item) => item.Name !== 'endpoint')
}

type AIThirdPartyConfigReadonlyPanelProps = {
  merged: Record<string, any>
}

const AIThirdPartyConfigReadonlyPanel: React.FC<AIThirdPartyConfigReadonlyPanelProps> = React.memo((props) => {
  const { merged } = props
  const typeVal = String(merged.Type ?? '')
  const enableEndpoint = !!merged.enable_endpoint
  const { t } = useI18nNamespaces(['configNetwork'])
  const defaultItems = useMemo(() => buildDefaultAIFormItemsForType(typeVal, t), [typeVal])
  const optionalItems = useMemo(
    () => buildOptionalAIFormItemsForType(typeVal, enableEndpoint, t),
    [typeVal, enableEndpoint],
  )

  const renderCopyRow = useMemoizedFn((key: string, label: string, display: string, clip: string) => (
    <div className={styles['readonly-ai-field-row']} key={key}>
      <div className={styles['readonly-ai-label']}>{label}:</div>
      <div className={styles['readonly-ai-control']}>
        <YakitInput
          readOnly
          className={styles['ai-readonly-copy-input']}
          value={display}
          addonAfter={
            <YakitButton
              type="text2"
              size="small"
              icon={<OutlineClipboardcopyIcon />}
              onClick={() => setClipboardText(clip)}
            />
          }
        />
      </div>
    </div>
  ))

  const renderFieldByTemplate = useMemoizedFn((item: ThirdPartyAppConfigItemTemplate) => {
    const raw = merged[item.Name]
    if (item.Name === 'model_type' && item.Type === 'list') {
      const label = pickOptionLabel(aiModelTypeOptions(t), raw)
      const display = label || formatReadonlyEmptyAsDash(raw)
      return renderCopyRow(item.Name, item.Verbose, display, String(raw ?? ''))
    }
    if (item.Name === 'api_type' && item.Type === 'list') {
      const label = pickOptionLabel(aiAPITypeOptions(t), raw)
      const display = label || formatReadonlyEmptyAsDash(raw)
      return renderCopyRow(item.Name, item.Verbose, display, String(raw ?? ''))
    }
    if (item.Name === 'api_key') {
      const display = formatReadonlyEmptyAsDash(raw)
      return renderCopyRow(item.Name, item.Verbose, display, String(raw ?? ''))
    }
    if (item.Type === 'bool') {
      const display = formatReadonlyEmptyAsDash(raw)
      const clip =
        raw === true || raw === 'true' ? 'true' : raw === false || raw === 'false' ? 'false' : String(raw ?? '')
      return renderCopyRow(item.Name, item.Verbose, display, clip)
    }
    const display = formatReadonlyEmptyAsDash(raw)
    return renderCopyRow(item.Name, item.Verbose, display, String(raw ?? ''))
  })
  const headersPack = headersToDisplayAndCopy((merged.Headers as KVPair[]) || [])

  return (
    <div className={classNames(styles['config-form'], styles['config-form-ai'], styles['ai-third-party-readonly'])}>
      {renderCopyRow(
        'Type',
        isMemfit() ? t('ConfigNetworkPage.typeLabelVendor') : t('ConfigNetworkPage.typeLabel'),
        merged.Type,
        String(merged.Type ?? ''),
      )}
      {defaultItems.map((item) => renderFieldByTemplate(item))}
      <YakitCollapse
        defaultActiveKey={['1']}
        bordered={false}
        className={styles['ai-third-party-application-config-collapse']}
      >
        <Collapse.Panel
          header={
            <div className={styles['panel-heard']}>
              <span className={styles['title']}>{t('ConfigNetworkPage.advancedConfigTitle')}</span>
              <span className={styles['tip']}>{t('ConfigNetworkPage.advancedConfigTip')}</span>
            </div>
          }
          key="1"
          forceRender={true}
        >
          {optionalItems.map((item) => renderFieldByTemplate(item))}
          {renderCopyRow('Headers', 'Header', headersPack.display, headersPack.copy)}
        </Collapse.Panel>
      </YakitCollapse>
    </div>
  )
})

export interface AIThirdPartyApplicationConfig {
  Type: string
  api_key?: string
  user_identifier?: string
  model_type?: string
  api_type?: string
  model?: string
  enable_endpoint?: boolean
  base_url?: string
  endpoint?: string
  proxy?: string
  Headers?: KVPair[]
  ExtraParams?: KVPair[]
  /** 探测到的扩展思考强度（表单内部字段，由 NewAIThirdPartyApplicationConfigBase 自动写入） */
  _ProbedExtendedEfforts?: string[]
  /** 是否已对 xhigh/max 做过探测（表单内部字段） */
  _EffortProbed?: boolean
}

interface NewAIThirdPartyApplicationConfigBaseProps {
  formValues?: AIThirdPartyApplicationConfig
  // 禁止类型改变
  disabledType?: boolean
  IsOnline?: boolean
  // 是否可新增类型
  canAddType?: boolean
  FormProps?: {
    layout: FormLayout
    labelCol: number
    wrapperCol: number
  }
  footer?: React.ReactNode
  readOnly?: boolean
  ref?: React.ForwardedRef<{ form: FormInstance }>
}

export const NewAIThirdPartyApplicationConfigBase: React.FC<NewAIThirdPartyApplicationConfigBaseProps> = React.memo(
  forwardRef((props, ref) => {
    const {
      formValues = defaultAIFormValues as AIThirdPartyApplicationConfig,
      disabledType = false,
      IsOnline = false,
      canAddType = true,
      FormProps,
      footer,
      readOnly,
    } = props

    const { t, i18nRefresh } = useI18nNamespaces(['configNetwork'])
    const [form] = Form.useForm()
    const typeVal = Form.useWatch('Type', form)
    const [options, setOptions] = useState<SelectOptionsProps[]>([])
    const [modelOptionLoading, setModelOptionLoading] = useState<boolean>(false)
    const [modelNameAllOptions, setModelNameAllOptions] = useState<SelectOptionsProps[]>([])
    const apiKeyWatch = Form.useWatch('api_key', form)
    const modelNameWatch = Form.useWatch('model', form)
    const execModelNameOption = useRef<boolean>(false)
    const enableEndpointWatch = Form.useWatch('enable_endpoint', form)
    const reasoningEffortWatch = Form.useWatch('ReasoningEffort', form)
    const [effortProbing, setEffortProbing] = useState<boolean>(false)
    // 扩展思考强度探测结果：undefined=未探测；[]=探测过但不支持；非空=探测到支持的档位
    const [probedExtendedEfforts, setProbedExtendedEfforts] = useState<string[] | undefined>(undefined)
    // model/Type 变化后置 true：已有探测数据保留（不清空），但下拉列表回退为基础档位，下次打开下拉框重新探测
    const [effortProbeDirty, setEffortProbeDirty] = useState<boolean>(false)
    const headers = Form.useWatch('Headers', form) || []
    const [visibleHTTPHeader, setVisibleHTTPHeader] = useState<boolean>(false)
    const headerItemRef = useRef<HTTPHeader>()
    const headerItemIndexRef = useRef<number>()
    const [activeKey, setActiveKey] = useState<string | string[]>()
    const onChangeCollapse = (key: string | string[]) => {
      setActiveKey(key)
    }
    useImperativeHandle(
      ref,
      () => ({
        form,
      }),
      [form],
    )

    const reasoningEffortOptions = useCreation(() => {
      // 待重探时扩展档位对新模型未确认，下拉只展示基础档位（当前已选的扩展档仍随 currentValue 保留）
      return buildReasoningEffortOptions(t, effortProbeDirty ? undefined : probedExtendedEfforts, reasoningEffortWatch)
    }, [effortProbeDirty, probedExtendedEfforts, reasoningEffortWatch, i18nRefresh])

    /**懒探测：首次打开强度下拉框时探测模型是否支持 xhigh/max，model/Type 变化后再次打开会重新探测；失败不置已探测，下次打开可重试 */
    const ensureEffortProbed = useDebounceFn(
      () => {
        if (readOnly || IsOnline) return
        if (probedExtendedEfforts !== undefined && !effortProbeDirty) return
        if (effortProbing) return
        const values = form.getFieldsValue()
        if (!values?.Type || !values?.model) return
        setEffortProbing(true)
        grpcProbeReasoningEffort({
          Config: buildAIConfigHealthCheckConfig(values),
          Model: values.model,
        })
          .then((resp) => {
            // 探测期间 model/Type 已变化，丢弃过期结果，下次打开按新模型重探
            const current = form.getFieldsValue()
            if (current?.Type !== values.Type || current?.model !== values.model) return
            const efforts = probedExtendedEffortsFromResponse(resp)
            setEffortProbeDirty(false)
            setProbedExtendedEfforts(efforts)
            // 探测结果写入 form，父组件提交时可直接读取
            form.setFieldsValue({
              _ProbedExtendedEfforts: efforts,
              _EffortProbed: true,
            })
          })
          .catch(() => {})
          .finally(() => {
            setEffortProbing(false)
          })
      },
      { wait: 300, leading: true },
    ).run

    /**model / Type 是探测键：用户改动任一项后仅标记待重新探测，探测数据保留、下拉回退基础档位，重探成功后以新结果覆盖 */
    const invalidateEffortProbe = useMemoizedFn(() => {
      setEffortProbeDirty(true)
    })

    /**模型名称变化后，模型配置面板整体恢复默认：Reasoning Effort 回到 no-set，采样参数清空，并丢弃旧模型的探测缓存 */
    const resetModelConfigSettings = useMemoizedFn(() => {
      form.setFieldsValue({
        ReasoningEffort: 'no-set',
        MaxTokens: undefined,
        Temperature: undefined,
        TopP: undefined,
        TopK: undefined,
        FrequencyPenalty: undefined,
        _ProbedExtendedEfforts: undefined,
        _EffortProbed: undefined,
      })
    })

    // 获取类型
    useEffect(() => {
      grpcGetAIThirdPartyAppConfigTemplate().then((res: GetThirdPartyAppConfigTemplateResponse) => {
        const templates = res.Templates
        let newOptions: SelectOptionsProps[] = []
        newOptions = templates.map((item) => ({ label: item.Verbose, value: item.Name }))
        setOptions(newOptions)
      })
    }, [])

    useUpdateEffect(() => {
      if (readOnly || IsOnline) return
      if (apiKeyWatch) {
        execModelNameOption.current = true
        getModelNameOption()
      } else {
        handleDefaultModalNameOption()
      }
    }, [apiKeyWatch, IsOnline, readOnly])

    const { run: getModelNameOption, cancel: cancelModelNameOption } = useDebounceFn(
      useMemoizedFn(() => {
        if (!execModelNameOption.current) return
        setModelOptionLoading(true)
        const v = form.getFieldsValue()
        ipcRenderer
          .invoke('ListAiModel', { Config: JSON.stringify(v) })
          .then((res) => {
            if (!execModelNameOption.current) return
            const modalNamelist: SelectOptionsProps[] = res.ModelName.map((modelName: string) => ({
              label: modelName,
              value: modelName,
            }))
            const name = getModelNameDefaultName()
            // 确保默认值在选项里
            const hasDefault = modalNamelist.some((item) => item.value === name)
            const newOptions = hasDefault
              ? modalNamelist
              : name
                ? [{ label: name, value: name }, ...modalNamelist]
                : modalNamelist
            setModelNameAllOptions(newOptions)
            yakitNotify('success', t('ConfigNetworkPage.fetchModelListSuccess'))
          })
          .catch((error) => {
            if (!execModelNameOption.current) return
            yakitNotify('error', error + '')
            handleDefaultModalNameOption()
          })
          .finally(() => {
            setModelOptionLoading(false)
          })
      }),
      { wait: 500 },
    )

    const newDefaultAIFormItemsOfAI = useCreation(() => {
      return buildDefaultAIFormItemsForType(typeVal, t)
    }, [typeVal, i18nRefresh])

    const newOptionalAIFormItemsOfAI = useCreation(() => {
      return buildOptionalAIFormItemsForType(typeVal, enableEndpointWatch, t)
    }, [enableEndpointWatch, typeVal, i18nRefresh])

    const allAIFormItemsOfAI = useCreation(() => {
      return [...newDefaultAIFormItemsOfAI, ...newOptionalAIFormItemsOfAI]
    }, [newDefaultAIFormItemsOfAI, newOptionalAIFormItemsOfAI])

    const getModelNameDefaultName = () => {
      const obj = allAIFormItemsOfAI.find((item) => item.Type === 'list' && item.Name === 'model')
      return obj?.DefaultValue
    }
    const handleDefaultModalNameOption = () => {
      const name = getModelNameDefaultName()
      if (name) {
        setModelNameAllOptions([{ label: name, value: name }])
      } else {
        setModelNameAllOptions([])
      }
    }
    useDebounceEffect(
      () => {
        if (readOnly) return
        handleDefaultModalNameOption()
      },
      [typeVal, readOnly],
      { wait: 300 },
    )
    useEffect(() => {
      if (readOnly) return
      execModelNameOption.current = false
      cancelModelNameOption()
      if (typeVal === 'custom') {
        setActiveKey('1')
      } else {
        setActiveKey(undefined)
      }
    }, [typeVal, readOnly])

    // 切换类型，渲染不同表单项（目前只有输入框、开关、下拉）
    const renderAllFormItems = useMemoizedFn(() => {
      return newDefaultAIFormItemsOfAI.map((item, index) => (
        <React.Fragment key={index}>{renderSingleFormItem(item)}</React.Fragment>
      ))
    })
    const renderOptionalFormItems = useMemoizedFn(() => {
      return newOptionalAIFormItemsOfAI.map((item, index) => (
        <React.Fragment key={index}>{renderSingleFormItem(item)}</React.Fragment>
      ))
    })
    const renderSingleFormItem = (item: ThirdPartyAppConfigItemTemplate) => {
      const formProps = {
        rules: [{ required: item.Required, message: t('ConfigNetworkPage.fillFieldRequired', { name: item.Verbose }) }],
        label: item.Verbose,
        name: item.Name,
        tooltip: item.Desc
          ? {
              icon: <OutlineInformationcircleIcon />,
              title: item.Desc,
            }
          : null,
        help: item.Name === 'api_type' ? t('ConfigNetworkPage.apiTypePathHelp') : undefined,
      }
      switch (item.Type) {
        case 'string':
          return (
            <Form.Item {...formProps}>
              <YakitInput placeholder={item.Placeholder} disabled={IsOnline} />
            </Form.Item>
          )
        case 'bool':
          return (
            <Form.Item {...formProps} valuePropName="checked">
              <YakitSwitch disabled={IsOnline} />
            </Form.Item>
          )
        case 'list': {
          if (item.Name === 'model') {
            // 模型名称
            return (
              <Form.Item
                {...formProps}
                help={
                  <div style={{ height: 30 }}>
                    {t('ConfigNetworkPage.modelNameHelpPrefix')}
                    <YakitButton
                      type="text"
                      disabled={IsOnline}
                      onClick={() => {
                        execModelNameOption.current = true
                        getModelNameOption()
                      }}
                      style={{ padding: 0, fontSize: 14 }}
                    >
                      {t('ConfigNetworkPage.modelNameRefreshBtn')}
                    </YakitButton>
                    {t('ConfigNetworkPage.modelNameHelpSuffix')}
                  </div>
                }
              >
                <YakitAutoComGroupSearchWithAll
                  options={modelNameAllOptions}
                  groupSearchWithAll={true}
                  disabled={IsOnline}
                  onChange={(value) => {
                    invalidateEffortProbe()
                    // store 先于本回调更新，modelNameWatch 仍是变更前的值：仅名称实际变化时才重置模型配置
                    if (value !== modelNameWatch) resetModelConfigSettings()
                  }}
                  onFocus={() => {
                    execModelNameOption.current = true
                    getModelNameOption()
                  }}
                  dropdownRender={(menu) => {
                    return (
                      <>
                        <YakitSpin spinning={modelOptionLoading}>{menu}</YakitSpin>
                      </>
                    )
                  }}
                />
              </Form.Item>
            )
          }
          if (item.Name === 'api_key') {
            if (IsOnline) {
              return (
                <Form.Item {...formProps} hidden preserve>
                  <YakitInput disabled />
                </Form.Item>
              )
            }
            return <AIConfigAPIKeyFormItem aiType={typeVal} formProps={formProps} />
          }
          const selectProps: YakitSelectProps = {}
          try {
            selectProps.options = item.Extra ? JSONParseLog(item.Extra)?.options : []
          } catch (error) {}
          return (
            <Form.Item {...formProps}>
              <YakitSelect {...selectProps} disabled={IsOnline} />
            </Form.Item>
          )
        }
        default:
          return <></>
      }
    }

    const initialValues = useMemo(() => {
      const copyFormValues = { ...formValues }
      const aiFormValues = copyFormValues as typeof copyFormValues & { api_type?: string }
      aiFormValues.api_type = normalizeAIAPIType(aiFormValues.api_type)

      Object.keys(copyFormValues).forEach((key) => {
        if (copyFormValues[key] === 'true') {
          copyFormValues[key] = true
        } else if (copyFormValues[key] === 'false') {
          copyFormValues[key] = false
        }
      })
      return copyFormValues
    }, [formValues])

    useEffect(() => {
      // 编辑时若外部已有探测缓存，同步到组件内部 state
      if (formValues?._EffortProbed) {
        setProbedExtendedEfforts(formValues?._ProbedExtendedEfforts ?? [])
      }
    }, [formValues._EffortProbed, formValues._ProbedExtendedEfforts])

    const onSaveHeaders = useMemoizedFn((val, updateIndex) => {
      const obj = {
        Key: val.Header,
        Value: val.Value,
      }
      let headersList: KVPair[] = []
      if (updateIndex === undefined) {
        headersList = [...headers, obj]
      } else {
        headers[updateIndex] = obj
        headersList = [...headers]
      }
      form.setFieldsValue({
        Headers: headersList,
      })
    })

    const onRemoveHeaders = useMemoizedFn((index: number) => {
      form.setFieldsValue({
        Headers: headers.filter((_, i) => i !== index),
      })
    })

    if (readOnly) {
      return (
        <div className={styles['config-form-wrapper']}>
          <AIThirdPartyConfigReadonlyPanel merged={formValues} />
          {footer ? <div className={styles['config-footer']}>{footer}</div> : null}
        </div>
      )
    }

    return (
      <div className={styles['config-form-wrapper']}>
        <Form
          form={form}
          layout={FormProps?.layout ?? 'horizontal'}
          labelCol={{ span: FormProps?.labelCol ?? 6 }}
          wrapperCol={{ span: FormProps?.wrapperCol ?? 18 }}
          initialValues={initialValues}
          onValuesChange={(changedValues, allValues) => {
            // 当类型改变时，表单项的值采用默认值
            if (changedValues.Type !== undefined) {
              allAIFormItemsOfAI.forEach((item) => {
                form.setFieldsValue({
                  [item.Name]: ['string', 'list'].includes(item.Type)
                    ? item.DefaultValue
                    : item.DefaultValue === 'true',
                })
              })
            }
          }}
          onSubmitCapture={(e) => {
            e.preventDefault()
          }}
          className={classNames(styles['config-form'], styles['config-form-ai'])}
        >
          <Form.Item
            label={isMemfit() ? t('ConfigNetworkPage.typeLabelVendor') : t('ConfigNetworkPage.typeLabel')}
            rules={[
              {
                required: true,
                message: t(canAddType ? 'ConfigNetworkPage.typeRequiredFill' : 'ConfigNetworkPage.typeRequiredSelect'),
              },
            ]}
            name={'Type'}
          >
            {canAddType ? (
              <YakitAutoComGroupSearchWithAll
                options={options}
                groupSearchWithAll={true}
                disabled={disabledType || IsOnline}
                onChange={() => {
                  invalidateEffortProbe()
                }}
                filterOption={(inputValue, option) => {
                  if (option?.label && typeof option?.label === 'string') {
                    return option?.label?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                  return false
                }}
              />
            ) : (
              <YakitSelect
                disabled={disabledType || IsOnline}
                options={options}
                onChange={() => {
                  invalidateEffortProbe()
                }}
                filterOption={(inputValue, option) => {
                  if (option?.label && typeof option?.label === 'string') {
                    return option?.label?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                  return false
                }}
              ></YakitSelect>
            )}
          </Form.Item>
          {renderAllFormItems()}
          <YakitCollapse
            activeKey={activeKey}
            onChange={onChangeCollapse}
            bordered={false}
            className={styles['ai-third-party-application-config-collapse']}
          >
            <YakitCollapse.YakitPanel
              header={
                <div className={styles['panel-heard']}>
                  <span className={styles['title']}>{t('ConfigNetworkPage.advancedConfigTitle')}</span>
                  <span className={styles['tip']}>{t('ConfigNetworkPage.advancedConfigTip')}</span>
                </div>
              }
              key="1"
              forceRender={true}
            >
              {/* 可选的表单项 */}
              {renderOptionalFormItems()}
              <Form.Item label={'Header'} name="Headers">
                {(headers || []).map((i, index) => {
                  return (
                    <YakitTag
                      key={index}
                      onClick={() => {
                        if (IsOnline) return
                        headerItemRef.current = {
                          Header: i.Key,
                          Value: i.Value,
                        }
                        headerItemIndexRef.current = index
                        setVisibleHTTPHeader(true)
                      }}
                      closable={!IsOnline}
                      onClose={() => {
                        onRemoveHeaders(index)
                      }}
                    >
                      {i.Key}
                    </YakitTag>
                  )
                })}
                <YakitButton
                  type={'outline1'}
                  disabled={IsOnline}
                  onClick={() => {
                    headerItemRef.current = undefined
                    headerItemIndexRef.current = undefined
                    setVisibleHTTPHeader(true)
                  }}
                >
                  {t('ConfigNetworkPage.addHeaderBtn')}
                </YakitButton>
              </Form.Item>
            </YakitCollapse.YakitPanel>
            <YakitCollapse.YakitPanel
              header={
                <div className={styles['panel-heard']}>
                  <span className={styles['title']}>{t('ConfigNetworkPage.modelConfigTitle')}</span>
                  <span className={styles['tip']}>{t('ConfigNetworkPage.modelConfigTip')}</span>
                </div>
              }
              key="2"
            >
              {/* #region 思考 */}
              <Form.Item
                label="Reasoning Effort"
                name="ReasoningEffort"
                help={t('ConfigNetworkPage.reasoningEffortHelp')}
              >
                <ReasoningEffortSelect
                  options={reasoningEffortOptions}
                  loading={effortProbing}
                  onDropdownVisibleChange={(open) => {
                    if (open) ensureEffortProbed()
                  }}
                />
              </Form.Item>
              {/* 隐藏字段：注册探测缓存，使 validateFields 能取到这两个值 */}
              <Form.Item name="_ProbedExtendedEfforts" noStyle>
                <HiddenFormField />
              </Form.Item>
              <Form.Item name="_EffortProbed" noStyle>
                <HiddenFormField />
              </Form.Item>
              {/* #endregion */}
              <Form.Item label="Max Tokens" name="MaxTokens">
                <YakitInputNumber min={1} max={163840} />
              </Form.Item>
              <Form.Item label="Temperature" name="Temperature">
                <YakitInputNumber min={0} max={2} step={0.1} />
              </Form.Item>
              <Form.Item label="Top-P" name="TopP">
                <YakitInputNumber min={0} max={1} step={0.1} />
              </Form.Item>
              <Form.Item label="Top-K" name="TopK">
                <YakitInputNumber min={0} max={100} />
              </Form.Item>
              <Form.Item label="Frequency Penalty" name="FrequencyPenalty">
                <YakitInputNumber min={0} max={2} step={0.1} />
              </Form.Item>
            </YakitCollapse.YakitPanel>
          </YakitCollapse>
        </Form>
        <div className={styles['config-footer']}>{footer}</div>
        <InputHTTPHeaderForm
          initFormVal={headerItemRef.current}
          updateIndex={headerItemIndexRef.current}
          visible={visibleHTTPHeader}
          setVisible={setVisibleHTTPHeader}
          onSave={onSaveHeaders}
        />
      </div>
    )
  }),
)
