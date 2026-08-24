import React, { useMemo, useRef, useState } from 'react'
import { Divider, Form, type FormInstance } from 'antd'
import classNames from 'classnames'
import { SolidPlusIcon } from '@/assets/icon/solid'
import type { JsonFormSchemaListWrapper } from '@/components/JsonFormWrapper/JsonFormWrapper'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import type { YakitBaseSelectRef } from '@/components/yakitUI/YakitSelect/YakitSelectType'
import type { HTTPRequestBuilderParams } from '@/models/HTTPRequestBuilder'
import type { KVPair } from '@/models/kv'
import { VariableList } from '@/pages/httpRequestBuilder/HTTPRequestBuilder'
import { RemotePluginGV } from '@/enums/plugin'
import { yakitFailed } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { YakExtraParamProps } from './LocalPluginExecuteDetailHeardType'
import { FormContentItemByType } from './LocalPluginExecuteDetailHeard'
import styles from './PluginExecuteExtraParams.module.scss'

const { YakitPanel } = YakitCollapse

interface ExtraParamsNodeByTypeProps extends JsonFormSchemaListWrapper {
  extraParamsGroup: YakExtraParamProps[]
  pluginType: string
  isDefaultActiveKey?: boolean
  wrapperClassName?: string
  refreshValue?: number
}

export const ExtraParamsNodeByType: React.FC<ExtraParamsNodeByTypeProps> = React.memo((props) => {
  const {
    extraParamsGroup,
    pluginType,
    jsonSchemaListRef,
    isDefaultActiveKey = true,
    wrapperClassName,
    jsonSchemaInitial,
    refreshValue,
  } = props
  const defaultActiveKey = useMemo(() => {
    if (!isDefaultActiveKey) return undefined
    return extraParamsGroup.map((ele) => ele.group)
  }, [extraParamsGroup, isDefaultActiveKey])
  return (
    <YakitCollapse
      defaultActiveKey={defaultActiveKey}
      className={classNames(styles['extra-params-node-type'], wrapperClassName || '')}
    >
      {extraParamsGroup.map((item) => (
        <YakitPanel key={`${item.group}`} header={`参数组：${item.group}`}>
          {item.data?.map((formItem) => (
            <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
              <FormContentItemByType
                item={formItem}
                pluginType={pluginType}
                jsonSchemaListRef={jsonSchemaListRef}
                jsonSchemaInitial={jsonSchemaInitial}
                refreshValue={refreshValue}
              />
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
  bordered?: boolean
  httpPathWrapper?: string
}

type Fields = keyof HTTPRequestBuilderParams

export const FixExtraParamsNode: React.FC<FixExtraParamsNodeProps> = React.memo((props) => {
  const { onReset, pathRef, form, bordered, httpPathWrapper } = props
  const { t } = useI18nNamespaces(['plugin', 'yakitUi'])
  const [activeKey, setActiveKey] = useState<string[]>(['GET 参数'])

  const getParamsRef = useRef<any>()
  const postParamsRef = useRef<any>()
  const headersRef = useRef<any>()
  const cookieRef = useRef<any>()

  const getParams = Form.useWatch('GetParams', form)
  const postParams = Form.useWatch('PostParams', form)
  const headers = Form.useWatch('Headers', form)
  const cookie = Form.useWatch('Cookie', form)

  const handleReset = (
    e: React.MouseEvent<HTMLElement, MouseEvent>,
    field: Fields,
    ref: React.MutableRefObject<any>,
  ) => {
    e.stopPropagation()
    onReset({
      [field]: [{ Key: '', Value: '' }],
    })
    ref.current.setVariableActiveKey(['0'])
  }

  const handleAdd = (
    e: React.MouseEvent<HTMLElement, MouseEvent>,
    field: Fields,
    actKey: string,
    ref: React.MutableRefObject<any>,
  ) => {
    e.stopPropagation()
    const v = form.getFieldsValue()
    const variables = (v[field] || []) as KVPair[]
    const index = variables.findIndex((ele: KVPair) => !ele || (!ele.Key && !ele.Value))
    if (index === -1) {
      onReset({
        [field]: [...variables, { Key: '', Value: '' }],
      })
      ref.current.setVariableActiveKey([...(ref.current.variableActiveKey || []), `${variables?.length || 0}`])
    } else {
      yakitFailed(t('YakitNotification.complete_variable_before_add', { index }))
    }
    if (activeKey?.findIndex((ele) => ele === actKey) === -1) {
      setActiveKey([...activeKey, actKey])
    }
  }

  const handleRemove = (i: number, field: Fields) => {
    const v = form.getFieldsValue()
    const variables = (v[field] || []) as KVPair[]
    variables.splice(i, 1)
    onReset({
      [field]: [...variables],
    })
  }

  return (
    <div className={styles['plugin-extra-params']}>
      <div className={httpPathWrapper}>
        <Form.Item label={t('FixExtraParamsNode.http_method')} name="Method" initialValue="GET">
          <YakitSelect
            options={['GET', 'POST', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT'].map((item) => ({
              value: item,
              label: item,
            }))}
            size="small"
          />
        </Form.Item>
        <Form.Item label={t('FixExtraParamsNode.request_path')} name="Path">
          <YakitSelect
            ref={pathRef}
            allowClear
            defaultOptions={['/', '/admin'].map((item) => ({ value: item, label: item }))}
            mode="tags"
            placeholder={t('YakitInput.please_enter')}
            cacheHistoryDataKey={RemotePluginGV.LocalExecuteExtraPath}
            isCacheDefaultValue={false}
            size="small"
          />
        </Form.Item>
      </div>
      <YakitCollapse
        destroyInactivePanel={false}
        activeKey={activeKey}
        onChange={(key) => setActiveKey(key as string[])}
        bordered={!!bordered}
        className={styles['kv-params-wrapper']}
      >
        <YakitPanel
          header={
            <div className={styles['yakit-panel-heard']}>
              {t('FixExtraParamsNode.get_parameters')}
              {getParams?.length ? <span className={styles['yakit-panel-heard-number']}>{getParams?.length}</span> : ''}
            </div>
          }
          key="GET 参数"
          extra={
            <>
              <YakitButton
                type="text"
                colors="danger"
                onClick={(e) => handleReset(e, 'GetParams', getParamsRef)}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
              <Divider type="vertical" style={{ margin: 0 }} />
              <YakitButton
                type="text"
                onClick={(e) => handleAdd(e, 'GetParams', 'GET 参数', getParamsRef)}
                style={{ paddingRight: 0 }}
                size="small"
              >
                {t('YakitButton.add')}
                <SolidPlusIcon className={styles['plus-icon']} />
              </YakitButton>
            </>
          }
        >
          <VariableList
            ref={getParamsRef}
            field="GetParams"
            onDel={(i) => {
              handleRemove(i, 'GetParams')
            }}
            collapseWrapperClassName={styles['variable-list-wrapper']}
          />
        </YakitPanel>
        <YakitPanel
          header={
            <div className={styles['yakit-panel-heard']}>
              {t('FixExtraParamsNode.post_parameters')}
              {postParams?.length ? (
                <span className={styles['yakit-panel-heard-number']}>{postParams?.length}</span>
              ) : (
                ''
              )}
            </div>
          }
          key="POST 参数"
          extra={
            <>
              <YakitButton
                type="text"
                colors="danger"
                onClick={(e) => handleReset(e, 'PostParams', postParamsRef)}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
              <Divider type="vertical" style={{ margin: 0 }} />
              <YakitButton
                type="text"
                onClick={(e) => handleAdd(e, 'PostParams', 'POST 参数', postParamsRef)}
                style={{ paddingRight: 0 }}
                size="small"
              >
                {t('YakitButton.add')}
                <SolidPlusIcon className={styles['plus-icon']} />
              </YakitButton>
            </>
          }
          forceRender={true}
        >
          <VariableList
            ref={postParamsRef}
            field="PostParams"
            onDel={(i) => {
              handleRemove(i, 'PostParams')
            }}
            collapseWrapperClassName={styles['variable-list-wrapper']}
          />
        </YakitPanel>
        <YakitPanel
          header={
            <div className={styles['yakit-panel-heard']}>
              Header
              {headers?.length ? <span className={styles['yakit-panel-heard-number']}>{headers?.length}</span> : ''}
            </div>
          }
          key="Header"
          extra={
            <>
              <YakitButton
                type="text"
                colors="danger"
                onClick={(e) => handleReset(e, 'Headers', headersRef)}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
              <Divider type="vertical" style={{ margin: 0 }} />
              <YakitButton
                type="text"
                onClick={(e) => handleAdd(e, 'Headers', 'Header', headersRef)}
                style={{ paddingRight: 0 }}
                size="small"
              >
                {t('YakitButton.add')}
                <SolidPlusIcon className={styles['plus-icon']} />
              </YakitButton>
            </>
          }
          forceRender={true}
        >
          <VariableList
            ref={headersRef}
            field="Headers"
            onDel={(i) => {
              handleRemove(i, 'Headers')
            }}
            collapseWrapperClassName={styles['variable-list-wrapper']}
          />
        </YakitPanel>
        <YakitPanel
          header={
            <div className={styles['yakit-panel-heard']}>
              Cookie
              {cookie?.length ? <span className={styles['yakit-panel-heard-number']}>{cookie?.length}</span> : ''}
            </div>
          }
          key="Cookie"
          extra={
            <>
              <YakitButton
                type="text"
                colors="danger"
                onClick={(e) => handleReset(e, 'Cookie', cookieRef)}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
              <Divider type="vertical" style={{ margin: 0 }} />
              <YakitButton
                type="text"
                onClick={(e) => handleAdd(e, 'Cookie', 'Cookie', cookieRef)}
                style={{ paddingRight: 0 }}
                size="small"
              >
                {t('YakitButton.add')}
                <SolidPlusIcon className={styles['plus-icon']} />
              </YakitButton>
            </>
          }
          forceRender={true}
        >
          <VariableList
            ref={cookieRef}
            field="Cookie"
            onDel={(i) => {
              handleRemove(i, 'Cookie')
            }}
            collapseWrapperClassName={styles['variable-list-wrapper']}
          />
        </YakitPanel>
      </YakitCollapse>
    </div>
  )
})
