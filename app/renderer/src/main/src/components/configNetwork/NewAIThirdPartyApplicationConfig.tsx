/**
 * AI 专用第三方应用配置表单组件。
 */
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Collapse, Form, Space } from 'antd'
import { KVPair } from '@/models/kv'
import { YakitAutoComGroupSearchWithAll } from '../yakitUI/YakitAutoComplete/YakitAutoComGroupSearchWithAll'
import { YakitSelect } from '../yakitUI/YakitSelect/YakitSelect'
import { SelectOptionsProps } from '@/demoComponents/itemSelect/ItemSelectType'
import { useCreation, useDebounceEffect, useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { YakitInput } from '../yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '../yakitUI/YakitSwitch/YakitSwitch'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { yakitNotify } from '@/utils/notification'
import { YakitSpin } from '../yakitUI/YakitSpin/YakitSpin'
import styles from './ConfigNetworkPage.module.scss'
import { isMemfit } from '@/utils/envfile'
import { FormInstance, FormLayout } from 'antd/lib/form/Form'
import { AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import { JSONParseLog } from '@/utils/tool'
import { YakitSelectProps } from '../yakitUI/YakitSelect/YakitSelectType'
import { AIConfigAPIKeyFormItem } from '@/pages/ai-agent/aiModelList/aiModelForm/AIModelForm'
import {
  AI_API_TYPE_OPTIONS,
  DEFAULT_AI_API_TYPE,
  normalizeAIAPIType,
} from '@/pages/ai-agent/aiModelList/aiApiTypeOptions'
import { grpcGetAIThirdPartyAppConfigTemplate } from '@/pages/ai-agent/aiModelList/utils'
import { cloneDeep } from 'lodash'
import { InputHTTPHeaderForm } from '@/pages/mitm/MITMRule/MITMRuleFromModal'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import { HTTPHeader } from '@/pages/mitm/MITMContentReplacerHeaderOperator'
import YakitCollapse from '../yakitUI/YakitCollapse/YakitCollapse'
import classNames from 'classnames'
import { TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { OutlineClipboardcopyIcon } from '@/assets/icon/outline'
import { setClipboardText } from '@/utils/clipboard'
import { YakitInputNumber } from '../yakitUI/YakitInputNumber/YakitInputNumber'
import { EnableThinkingOptions } from '@/pages/ai-agent/aiModelList/aiModelSelect/AIModelSelect'
import {
  GetThirdPartyAppConfigTemplateResponse,
  ThirdPartyAppConfigItemTemplate,
} from './NewThirdPartyApplicationConfig'

const { ipcRenderer } = window.require('electron')

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
const aiAPITypeOptions: SelectOptionsProps[] = AI_API_TYPE_OPTIONS.map((item) => ({
  label: item.label,
  value: item.value,
}))
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
        options: aiAPITypeOptions,
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
  let Required = !['aibalance', 'comate'].includes(typeVal)
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

const optionalAIFormItemsOfAI: ThirdPartyAppConfigItemTemplate[] = [
  {
    DefaultValue: '',
    Desc: '开启后使用完整 Endpoint 地址发送请求，替代 BaseURL 自动拼接路径的方式',
    Extra: '',
    Name: 'enable_endpoint',
    Required: false,
    Type: 'bool',
    Verbose: '启用Endpoint',
  },
  {
    DefaultValue: '',
    Desc: 'API 地址前缀，系统会自动拼接接口路径（如 /v1/chat/completions）',
    Extra: '',
    Name: 'base_url',
    Required: false,
    Type: 'string',
    Verbose: 'BaseURL',
    Placeholder: '如 api.openai.com 或 https://api.openai.com/v1',
  },
  {
    DefaultValue: '',
    Desc: '完整的请求地址，启用后将跳过路径拼接，直接使用该地址发送请求',
    Extra: '',
    Name: 'endpoint',
    Required: false,
    Type: 'string',
    Verbose: 'Endpoint',
    Placeholder: '如 https://api.openai.com/v1/chat/completions',
  },
  {
    DefaultValue: '',
    Desc: 'HTTP/SOCKS5 代理地址',
    Extra: '',
    Name: 'proxy',
    Required: false,
    Type: 'string',
    Verbose: '代理地址',
  },
]

const buildOptionalAIFormItemsForType = (typeVal: string, enableEndpoint: boolean) => {
  let newData = cloneDeep(optionalAIFormItemsOfAI)
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
    () => buildOptionalAIFormItemsForType(typeVal, enableEndpoint),
    [typeVal, enableEndpoint],
  )

  const renderCopyRow = useMemoizedFn((key: string, label: string, display: string, clip: string) => (
    <div className={styles['readonly-ai-field-row']} key={key}>
      <div className={styles['readonly-ai-label']}>{label}:</div>
      <div className={styles['readonly-ai-control']}>
        <Space.Compact>
          <YakitInput readOnly className={styles['ai-readonly-copy-input']} value={display} />
          <YakitButton
            type="text2"
            size="small"
            icon={<OutlineClipboardcopyIcon />}
            onClick={() => setClipboardText(clip)}
          />
        </Space.Compact>
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
      const label = pickOptionLabel(aiAPITypeOptions, raw)
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
      {renderCopyRow('Type', isMemfit() ? '厂商' : '类型', merged.Type, String(merged.Type ?? ''))}
      {defaultItems.map((item) => renderFieldByTemplate(item))}
      <YakitCollapse
        defaultActiveKey={['1']}
        bordered={false}
        className={styles['ai-third-party-application-config-collapse']}
      >
        <Collapse.Panel
          header={
            <div className={styles['panel-heard']}>
              <span className={styles['title']}>高级配置</span>
              <span className={styles['tip']}>可配置自定义 Endpoint / BaseURL 等</span>
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

    const { t, i18n } = useI18nNamespaces(['configNetwork'])
    const [form] = Form.useForm()
    const typeVal = Form.useWatch('Type', form)
    const [options, setOptions] = useState<SelectOptionsProps[]>([])
    const [modelOptionLoading, setModelOptionLoading] = useState<boolean>(false)
    const [modelNameAllOptions, setModelNameAllOptions] = useState<SelectOptionsProps[]>([])
    const apiKeyWatch = Form.useWatch('api_key', form)
    const execModelNameOption = useRef<boolean>(false)
    const enableEndpointWatch = Form.useWatch('enable_endpoint', form)
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
            yakitNotify('success', '获取成功')
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
    }, [typeVal, i18n.language])

    const newOptionalAIFormItemsOfAI = useCreation(() => {
      return buildOptionalAIFormItemsForType(typeVal, enableEndpointWatch)
    }, [enableEndpointWatch, typeVal])

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
        rules: [{ required: item.Required, message: `请填写${item.Verbose}` }],
        label: item.Verbose,
        name: item.Name,
        tooltip: item.Desc
          ? {
              icon: <OutlineInformationcircleIcon />,
              title: item.Desc,
            }
          : null,
        help:
          item.Name === 'api_type' &&
          '决定请求的接口路径：chat/completions 是主流兼容格式（/v1/chat/completions）， responses 是 OpenAI新一代格式（/v1/responses）',
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
        case 'list':
          if (item.Name === 'model') {
            // 模型名称
            return (
              <Form.Item
                {...formProps}
                help={
                  <div style={{ height: 30 }}>
                    如无法自动获取，请
                    <YakitButton
                      type="text"
                      disabled={IsOnline}
                      onClick={() => {
                        execModelNameOption.current = true
                        getModelNameOption()
                      }}
                      style={{ padding: 0, fontSize: 14 }}
                    >
                      点击刷新
                    </YakitButton>
                    重新获取
                  </div>
                }
              >
                <YakitAutoComGroupSearchWithAll
                  options={modelNameAllOptions}
                  groupSearchWithAll={true}
                  disabled={IsOnline}
                  onFocus={() => {
                    execModelNameOption.current = true
                    getModelNameOption()
                  }}
                  popupRender={(menu) => {
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
          let selectProps: YakitSelectProps = {}
          try {
            selectProps.options = item.Extra ? JSONParseLog(item.Extra)?.options : []
          } catch (error) {}
          return (
            <Form.Item {...formProps}>
              <YakitSelect {...selectProps} disabled={IsOnline} />
            </Form.Item>
          )
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
            label={isMemfit() ? '厂商' : '类型'}
            rules={[{ required: true, message: `请${canAddType ? '填写' : '选择'}类型` }]}
            name={'Type'}
          >
            {canAddType ? (
              <YakitAutoComGroupSearchWithAll
                options={options}
                groupSearchWithAll={true}
                disabled={disabledType || IsOnline}
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
                  <span className={styles['title']}>高级配置</span>
                  <span className={styles['tip']}>可配置自定义 Endpoint / BaseURL 等</span>
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
                  添加
                </YakitButton>
              </Form.Item>
            </YakitCollapse.YakitPanel>
            <YakitCollapse.YakitPanel
              header={
                <div className={styles['panel-heard']}>
                  <span className={styles['title']}>模型配置</span>
                  <span className={styles['tip']}>以下值可以为空，为空代表不设置</span>
                </div>
              }
              key="2"
            >
              <Form.Item label="Enable Thinking" name="EnableThinkingOpt">
                <YakitSelect options={EnableThinkingOptions} />
              </Form.Item>
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
              <Form.Item label="Reasoning Effort" name="ReasoningEffort">
                <YakitSelect
                  options={[
                    { label: '不设置', value: 'no-set' },
                    { label: 'none', value: 'none' },
                    { label: 'low', value: 'low' },
                    { label: 'middle', value: 'middle' },
                    { label: 'high', value: 'high' },
                    { label: 'xhigh', value: 'xhigh' },
                  ]}
                />
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
