import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Form, Space, Tooltip } from 'antd'
import { AutoCard } from '../../components/AutoCard'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { useGetState, useMemoizedFn, useSize } from 'ahooks'
import { InformationCircleIcon, RefreshIcon } from '@/assets/newIcon'
import { ExclamationCircleOutlined, FullscreenOutlined } from '@ant-design/icons/lib'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import styles from './HTTPFuzzerHotPatch.module.scss'
import { showYakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import { yakitNotify } from '@/utils/notification'
import {
  OutlineChevrondownIcon,
  OutlineFileUpIcon,
  OutlineStorageIcon,
  OutlineTerminalIcon,
  OutlineXIcon,
  OutlineArrowsexpandIcon,
  OutlineArrowscollapseIcon,
  OutlineLightningboltIcon,
} from '@/assets/icon/outline'
import { SolidLightningboltIcon } from '@/assets/icon/solid'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import {
  defaultWebFuzzerPageInfo,
  HotPatchDefaultContent,
  HotPatchTempDefault,
} from '@/defaultConstants/HTTPFuzzerPage'
import { setClipboardText } from '@/utils/clipboard'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { shallow } from 'zustand/shallow'
import { type PageNodeItemProps, usePageInfo } from '@/store/pageInfo'
import { cloneDeep } from 'lodash'
import { YakitRoute } from '@/enums/yakitRoute'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import classNames from 'classnames'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { openConsoleNewWindow } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import { getWebFuzzerPageList, setSharedHotReloadEnabled } from './fuzzerHotPatchUtils'
import {
  AddHotCodeTemplate,
  HotCodeTemplate,
  type HotPatchTempItem,
  type QueryHotPatchTemplateResponse,
} from './hotPatchShared'

export { getHotPatchCodeInfo } from './fuzzerHotPatchUtils'
export { HotCodeTemplate, AddHotCodeTemplate, type HotPatchTempItem, type HotCodeType } from './hotPatchShared'
interface HTTPFuzzerHotPatchProp {
  pageId: string
  onInsert: (s: string) => any
  onChangeCode?: (code: string) => any
  onChangeHotPatchCodeWithParamGetterCode?: (code: string) => any
  onSaveCode: (code: string) => any
  onSaveHotPatchCodeWithParamGetterCode: (code: string) => any
  hotPatchEnabled?: boolean
  onHotPatchEnabledChange?: (enabled: boolean) => void
  onCancel: () => void
  initialHotPatchCode: string
  initialHotPatchCodeWithParamGetter?: string
}

const HotPatchParamsGetterDefault = `__getParams__ = func() {
    /*
        __getParams__ 是一个用户可控生成复杂数据初始数据的参数：
        可以在这个函数中同时处理所有数据：

        1. CSRF Bypass
        2. 获取额外信息，进行强关联的信息变形
    */
    return {
        // "array-params": [1, 2, 3, 512312],  # 可用 {{params(array-params)}}
        // "foo-params": "asdfasdfassss",      # 可用 {{params(foo-params)}}
    }
}`

const { ipcRenderer } = window.require('electron')

const syncSharedHotReloadOwner = (ownerPageId?: string) => {
  const pageInfoStore = usePageInfo.getState()
  const fuzzerPages = getWebFuzzerPageList()

  fuzzerPages.forEach((item) => {
    const webFuzzerPageInfo = item.pageParamsInfo?.webFuzzerPageInfo
    if (!webFuzzerPageInfo) return

    const nextShared = !!ownerPageId && item.pageId === ownerPageId
    if (!!webFuzzerPageInfo.sharedHotReloadCode === nextShared) return

    pageInfoStore.updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {
      ...item,
      pageParamsInfo: {
        ...item.pageParamsInfo,
        webFuzzerPageInfo: {
          ...webFuzzerPageInfo,
          sharedHotReloadCode: nextShared,
        },
      },
    })
  })
}

export const HTTPFuzzerHotPatch: React.FC<HTTPFuzzerHotPatchProp> = (props) => {
  const { t, i18n } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const { queryPagesDataById } = usePageInfo(
    (s) => ({
      queryPagesDataById: s.queryPagesDataById,
    }),
    shallow,
  )
  const initWebFuzzerPageInfo = useMemoizedFn(() => {
    const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.pageId)
    if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
      return currentItem.pageParamsInfo.webFuzzerPageInfo
    } else {
      return cloneDeep(defaultWebFuzzerPageInfo)
    }
  })
  const [params, setParams, getParams] = useGetState({
    Template: `{{yak(handle|{{params(test)}})}}`,
    HotPatchCode: props.initialHotPatchCode,
    HotPatchCodeWithParamGetter: props.initialHotPatchCodeWithParamGetter
      ? props.initialHotPatchCodeWithParamGetter
      : HotPatchParamsGetterDefault,
    TimeoutSeconds: 20,
    Limit: 300,
  })
  const [loading, setLoading] = useState(false)
  const [hotPatchEditorHeight, setHotPatchEditorHeight] = useState(400)
  const [hotPatchTempLocal, setHotPatchTempLocal] = useState<HotPatchTempItem[]>(cloneDeep(HotPatchTempDefault))
  const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState<boolean>(false)
  const [hotPatchCodeOpen, setHotPatchCodeOpen] = useState<boolean>(false)
  const initHotPatchCodeOpen = useRef<boolean>(false)
  const [refreshHotCodeList, setRefreshHotCodeList] = useState<boolean>(true)
  const tempNameRef = useRef<string>('')
  const tokenRef = useRef<string>('')

  useEffect(() => {
    getRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO).then((e) => {
      if (e) {
        setParams({ ...params, Template: e })
      }
    })

    return () => {
      setRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO, getParams().Template).then(() => {})
    }
  }, [])

  const saveCode = useMemoizedFn((hotPatchCode: string) => {
    props.onSaveCode(hotPatchCode)
    initHotPatchCodeOpen.current = hotPatchCodeOpen
  })

  const onClose = useMemoizedFn(async () => {
    if (
      initWebFuzzerPageInfo().hotPatchCode !== params.HotPatchCode ||
      initHotPatchCodeOpen.current !== hotPatchCodeOpen
    ) {
      const m = YakitModalConfirm({
        width: 420,
        type: 'white',
        onCancelText: (modalT) => modalT('YakitButton.cancel'),
        onOkText: (modalT) => modalT('YakitButton.confirm'),
        icon: <ExclamationCircleOutlined />,
        style: { top: '20%' },
        onOk: () => {
          saveCode(params.HotPatchCode)
          props.onCancel()
          m.destroy()
        },
        onCloseX: () => {
          m.destroy()
        },
        onCancel: () => {
          props.onCancel()
          m.destroy()
        },
        content: (modalT) => modalT('HTTPFuzzerHotPatch.enableModifiedHotReload'),
      })
    } else {
      props.onCancel()
    }
  })

  const onUpdateTemplate = useMemoizedFn(() => {
    ipcRenderer
      .invoke('UpdateHotPatchTemplate', {
        Condition: {
          Type: 'fuzzer',
          Name: [tempNameRef.current],
        },
        Data: {
          Type: 'fuzzer',
          Content: params.HotPatchCode,
          Name: tempNameRef.current,
        },
      })
      .then((res) => {
        yakitNotify('success', t('HTTPFuzzerHotPatch.updateTemplateSuccess', { tempName: tempNameRef.current }))
      })
      .catch((error) => {
        yakitNotify('error', t('HTTPFuzzerHotPatch.updateTemplateFailed', { tempName: tempNameRef.current }) + error)
      })
  })

  const onCancel = useMemoizedFn(() => {
    if (tokenRef.current) {
      ipcRenderer.invoke('cancel-StringFuzzer', tokenRef.current).catch(() => {})
      setLoading(false)
      tokenRef.current = ''
      yakitNotify('info', t('HTTPFuzzerHotPatch.debugCancelled'))
    }
  })

  return (
    <div className={styles['http-fuzzer-hotPatch']}>
      <div className={styles['http-fuzzer-hotPatch-heard']}>
        <span>{t('HTTPFuzzerHotPatch.debugInsertHotReload')}</span>
        <OutlineXIcon onClick={onClose} />
      </div>
      <Form
        onSubmitCapture={(e) => {
          e.preventDefault()

          // if (loading) {
          //     // 如果正在执行，则取消
          //     if (tokenRef.current) {
          //         ipcRenderer.invoke("cancel-StringFuzzer", tokenRef.current).catch(() => {})
          //         setLoading(false)
          //         tokenRef.current = ""
          //         yakitNotify("info", t("HTTPFuzzerHotPatch.debugCancelled"))
          //     }
          //     return
          // }

          saveCode(params.HotPatchCode)
          props.onSaveHotPatchCodeWithParamGetterCode(params.HotPatchCodeWithParamGetter)

          setLoading(true)
          // 生成唯一token
          tokenRef.current = `string-fuzzer-${Date.now()}-${Math.random()}`

          ipcRenderer
            .invoke('StringFuzzer', { ...params }, tokenRef.current)
            .then((response: { Results: Uint8Array[] }) => {
              const data: string[] = (response.Results || []).map((buf) => Buffer.from(buf).toString('utf8'))
              showYakitDrawer({
                title: 'HotPatch Tag Result',
                width: '45%',
                content: (
                  <AutoCard
                    size={'small'}
                    bordered={false}
                    title={
                      <span style={{ color: 'var(--Colors-Use-Neutral-Text-1-Title)' }}>
                        {t('HTTPFuzzerHotPatch.resultDisplay')}
                      </span>
                    }
                    extra={
                      <Space>
                        <YakitButton
                          type="text"
                          onClick={() => {
                            setClipboardText(data.join('\n'))
                          }}
                        >
                          {t('HTTPFuzzerHotPatch.copyFuzzResult')}
                        </YakitButton>
                        <YakitButton
                          type="text"
                          onClick={() => {
                            setClipboardText(params.Template)
                          }}
                        >
                          {' '}
                          {t('HTTPFuzzerHotPatch.copyFuzzTag')}
                        </YakitButton>
                      </Space>
                    }
                  >
                    <YakitEditor value={data.join('\r\n')} readOnly={true} />
                  </AutoCard>
                ),
              })
            })
            .catch((err) => {
              // 只有非取消的错误才提示
              if (tokenRef.current) {
                yakitNotify('error', `${t('HTTPFuzzerHotPatch.debugFailed')}: ${err}`)
              }
            })
            .finally(() => {
              setTimeout(() => {
                setLoading(false)
                tokenRef.current = ''
              }, 300)
            })
        }}
        layout={'vertical'}
        className={styles['http-fuzzer-hotPatch-form']}
      >
        <div className={styles['http-fuzzer-hotPatch-label']}>
          <Space>
            {t('HTTPFuzzerHotPatch.templateContent')}
            <YakitButton
              type="text"
              onClick={(e) => {
                e.stopPropagation() // 阻止事件冒泡
                setClipboardText(params.Template)
              }}
            >
              {t('HTTPFuzzerHotPatch.clickToCopy')}
            </YakitButton>
            {props.onInsert && (
              <YakitButton
                type={'primary'}
                onClick={() => {
                  props.onInsert(params.Template)
                }}
              >
                {t('HTTPFuzzerHotPatch.insertAtEditorPosition')}
              </YakitButton>
            )}
          </Space>
        </div>
        <Form.Item>
          <div style={{ height: 60 }}>
            <YakitEditor
              type="http"
              value={params.Template}
              setValue={(Template) => setParams({ ...getParams(), Template })}
            ></YakitEditor>
          </div>
        </Form.Item>
        <div className={styles['http-fuzzer-hotPatch-label']}>
          <Space style={{ lineHeight: '16px' }}>
            {t('HTTPFuzzerHotPatch.hotReloadCode')}
            <YakitPopconfirm
              title={t('HTTPFuzzerHotPatch.resetHotReloadWarning')}
              onConfirm={(e) => {
                tempNameRef.current = ''
                setParams({ ...params, HotPatchCode: HotPatchDefaultContent })
              }}
            >
              <YakitButton icon={<RefreshIcon />} type="text" />
            </YakitPopconfirm>
            <YakitPopover
              title={t('HTTPFuzzerHotPatch.expandEditor')}
              content={
                <>
                  <YakitRadioButtons
                    value={hotPatchEditorHeight}
                    onChange={(e) => {
                      setHotPatchEditorHeight(e.target.value)
                    }}
                    buttonStyle="solid"
                    options={[
                      {
                        value: 250,
                        label: t('YakitEditor.small'),
                      },
                      {
                        value: 400,
                        label: t('YakitEditor.medium'),
                      },
                      {
                        value: 600,
                        label: t('YakitEditor.large'),
                      },
                    ]}
                  />
                </>
              }
            >
              <YakitButton icon={<FullscreenOutlined />} type="text" />
            </YakitPopover>
            <div className={styles['hotPatchCodeOpen']}>
              <span style={{ fontSize: 12 }}>{t('HTTPFuzzerHotPatch.sharedHotReloadCode')}</span>
              <Tooltip title={t('HTTPFuzzerHotPatch.webFuzzerHotReloadNotice')}>
                <InformationCircleIcon className={styles['info-icon']} />
              </Tooltip>
              ：<YakitSwitch checked={hotPatchCodeOpen} onChange={setHotPatchCodeOpen}></YakitSwitch>
            </div>
          </Space>
          <Space style={{ lineHeight: '16px' }}>
            <YakitButton
              disabled={!params.HotPatchCode}
              type="outline1"
              onClick={() => setAddHotCodeTemplateVisible(true)}
            >
              {t('YakitButton.save_as')}
            </YakitButton>
            <Tooltip title={t('HTTPFuzzerHotPatch.updateAndSaveTemplate')}>
              <YakitButton
                disabled={!params.HotPatchCode || !tempNameRef.current}
                type="outline1"
                onClick={onUpdateTemplate}
              >
                {t('HTTPFuzzerHotPatch.saveTemplate')}
              </YakitButton>
            </Tooltip>
            <AddHotCodeTemplate
              type="fuzzer"
              title={t('YakitButton.save_as')}
              hotPatchTempLocal={hotPatchTempLocal}
              hotPatchCode={params.HotPatchCode}
              visible={addHotCodeTemplateVisible}
              onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
              onSaveHotCodeOk={(tempName) => {
                tempNameRef.current = tempName || ''
                setRefreshHotCodeList((prev) => !prev)
              }}
            ></AddHotCodeTemplate>
            <YakitButton
              type={'primary'}
              onClick={() => {
                saveCode(params.HotPatchCode)
                setTimeout(() => {
                  yakitNotify('success', t('HTTPFuzzerHotPatch.enableSuccess'))
                  props.onCancel()
                }, 100)
              }}
            >
              {t('YakitButton.confirm')}
            </YakitButton>
          </Space>
        </div>
        <Form.Item>
          <div className={styles['hotCode-editor-wrapper']} style={{ height: hotPatchEditorHeight }}>
            <HotCodeTemplate
              type="fuzzer"
              hotPatchTempLocal={hotPatchTempLocal}
              onSetHotPatchTempLocal={setHotPatchTempLocal}
              onClickHotCode={(temp, tempName) => {
                tempNameRef.current = tempName || ''
                setParams({ ...getParams(), HotPatchCode: temp })
              }}
              dropdown={false}
              refreshList={refreshHotCodeList}
              onDeleteLocalTempOk={() => {
                tempNameRef.current = ''
              }}
            ></HotCodeTemplate>
            <div className={styles['hotCode-editor']}>
              <YakitEditor
                type="yak"
                value={params.HotPatchCode}
                setValue={(HotPatchCode) => setParams({ ...getParams(), HotPatchCode })}
              ></YakitEditor>
            </div>
          </div>
        </Form.Item>
        <Form.Item help={t('HTTPFuzzerHotPatch.debugNotice')}>
          <div className={styles['http-fuzzer-hotPatch-debugNotice']}>
            <YakitButton type="primary" htmlType="submit" loading={loading}>
              {t('YakitButton.debugExecution')}
            </YakitButton>
            {loading && (
              <YakitButton danger onClick={onCancel} className={styles['btn-box']}>
                {t('YakitButton.cancel')}
              </YakitButton>
            )}
            <Tooltip placement="bottom" title={t('HTTPFuzzerHotPatch.engineConsole')}>
              <YakitButton
                type="text"
                onClick={openConsoleNewWindow}
                icon={<OutlineTerminalIcon className={styles['engineConsole-icon-style']} />}
                className={styles['btn-box']}
              ></YakitButton>
            </Tooltip>
          </div>
        </Form.Item>
      </Form>
    </div>
  )
}

interface HTTPFuzzerHotPatchSidebarProp {
  pageId: string
  visible: boolean
  inViewport?: boolean
  hotPatchCode: string
  hotPatchCodeWithParamGetter: string
  selectedTemplateName?: string
  onChangeCode?: (code: string) => void
  onChangeHotPatchCodeWithParamGetterCode?: (code: string) => void
  onSaveCode: (code: string) => void
  onSaveHotPatchCodeWithParamGetterCode: (code: string) => void
  hotPatchEnabled: boolean
  onHotPatchEnabledChange: (enabled: boolean) => void
  onSelectedTemplateNameChange?: (name: string) => void
  onInsert?: (s: string) => void
}

export const HTTPFuzzerHotPatchSidebar: React.FC<HTTPFuzzerHotPatchSidebarProp> = React.memo((props) => {
  const {
    visible,
    hotPatchCode,
    hotPatchCodeWithParamGetter,
    onChangeCode,
    hotPatchEnabled,
    selectedTemplateName: selectedTemplateNameProp,
  } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const [code, setCode, getCode] = useGetState(hotPatchCode)
  const [template, setTemplate, getTemplate] = useGetState(`{{yak(handle|{{params(test)}})}}`)
  const [loading, setLoading] = useState(false)
  const [hotPatchEditorHeight, setHotPatchEditorHeight] = useState(420)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [hotPatchTempLocal, setHotPatchTempLocal] = useState<HotPatchTempItem[]>(cloneDeep(HotPatchTempDefault))
  const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState<boolean>(false)
  const [refreshHotCodeList, setRefreshHotCodeList] = useState<boolean>(true)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>(selectedTemplateNameProp || '')
  const [sharedHotReloadCode, setSharedHotReloadCodeState] = useState<boolean>(false)
  const tempNameRef = useRef<string>('')
  const tokenRef = useRef<string>('')
  const resizeBodyRef = useRef<HTMLDivElement>(null)
  const resizeBodySize = useSize(resizeBodyRef)

  const resizeBoxFirstMinSize = 120
  const resizeBoxSecondMinSize = 120
  const resizeLineSize = 8

  const resizeBoxFirstRatio = useMemo(() => {
    const bodyHeight = resizeBodySize?.height || 0
    if (!bodyHeight) return `${hotPatchEditorHeight}px`

    const minRequiredHeight = resizeBoxFirstMinSize + resizeBoxSecondMinSize + resizeLineSize
    if (bodyHeight <= minRequiredHeight) {
      return '50%'
    }

    const maxFirstHeight = bodyHeight - resizeBoxSecondMinSize - resizeLineSize
    const nextFirstHeight = Math.max(resizeBoxFirstMinSize, Math.min(hotPatchEditorHeight, maxFirstHeight))
    return `${Math.round(nextFirstHeight)}px`
  }, [hotPatchEditorHeight, resizeBodySize?.height])

  useEffect(() => {
    if (visible) {
      setCode(hotPatchCode)
      getRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO).then((e) => {
        if (e) {
          setTemplate(`${e}`)
        }
      })
    }
  }, [visible, hotPatchCode, setCode, setTemplate])

  useEffect(() => {
    if (!visible || !props.inViewport) {
      return
    }

    const currentPageInfo = usePageInfo.getState().queryPagesDataById(YakitRoute.HTTPFuzzer, props.pageId)
      ?.pageParamsInfo?.webFuzzerPageInfo
    setSharedHotReloadCodeState(!!currentPageInfo?.sharedHotReloadCode)
  }, [visible, props.inViewport, props.pageId])

  useEffect(() => {
    tempNameRef.current = selectedTemplateNameProp || ''
    setSelectedTemplateName(selectedTemplateNameProp || '')
    if (!visible || !selectedTemplateNameProp) {
      return
    }

    const matchedTemplate = hotPatchTempLocal.find((item) => item.name === selectedTemplateNameProp)
    if (matchedTemplate?.isDefault) {
      setCode(matchedTemplate.temp)
      onChangeCode?.(matchedTemplate.temp)
      return
    }

    ipcRenderer
      .invoke('QueryHotPatchTemplate', {
        Type: 'fuzzer',
        Name: [selectedTemplateNameProp],
      })
      .then((res: QueryHotPatchTemplateResponse) => {
        const nextCode = res.Data?.[0]?.Content
        if (nextCode) {
          setCode(nextCode)
          onChangeCode?.(nextCode)
        }
      })
      .catch(() => {})
  }, [visible, selectedTemplateNameProp, hotPatchTempLocal, setCode, onChangeCode])

  useEffect(() => {
    if (!visible) {
      setIsFullScreen(false)
    }
  }, [visible])

  const canSaveSelectedTemplate = useMemo(() => {
    const currentTemplateName = selectedTemplateName || selectedTemplateNameProp || tempNameRef.current
    if (!currentTemplateName) return false

    const selectedTemplate = hotPatchTempLocal.find((item) => item.name === currentTemplateName)
    if (selectedTemplate) {
      return !selectedTemplate.isDefault
    }

    return !HotPatchTempDefault.some((item) => item.name === currentTemplateName)
  }, [hotPatchTempLocal, selectedTemplateName, selectedTemplateNameProp])

  const updateCode = useMemoizedFn((nextCode: string) => {
    setCode(nextCode)
    onChangeCode?.(nextCode)
  })

  const persistHotPatchState = useMemoizedFn(() => {
    setRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO, getTemplate())
  })

  const saveCode = useMemoizedFn((c: string, notify?: boolean) => {
    props.onSaveCode(c)
    persistHotPatchState()
    if (notify) {
      yakitNotify('success', t('YakitNotification.saved'))
    }
  })

  const onUpdateTemplate = useMemoizedFn(() => {
    saveCode(code)
    ipcRenderer
      .invoke('UpdateHotPatchTemplate', {
        Condition: { Type: 'fuzzer', Name: [tempNameRef.current] },
        Data: { Type: 'fuzzer', Content: code, Name: tempNameRef.current },
      })
      .then(() => {
        yakitNotify('success', t('HTTPFuzzerHotPatch.updateTemplateSuccess', { tempName: tempNameRef.current }))
      })
      .catch((error) => {
        yakitNotify('error', t('HTTPFuzzerHotPatch.updateTemplateFailed', { tempName: tempNameRef.current }) + error)
      })
  })

  const onCancelDebug = useMemoizedFn(() => {
    if (tokenRef.current) {
      ipcRenderer.invoke('cancel-StringFuzzer', tokenRef.current).catch(() => {})
      setLoading(false)
      tokenRef.current = ''
      yakitNotify('info', t('HTTPFuzzerHotPatch.debugCancelled'))
    }
  })

  const onDebugSubmit = useMemoizedFn(() => {
    saveCode(code)
    setLoading(true)
    tokenRef.current = `string-fuzzer-${Date.now()}-${Math.random()}`
    ipcRenderer
      .invoke(
        'StringFuzzer',
        {
          Template: template,
          HotPatchCode: code,
          HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetter,
          TimeoutSeconds: 20,
          Limit: 300,
        },
        tokenRef.current,
      )
      .then((response: { Results: Uint8Array[] }) => {
        const data: string[] = (response.Results || []).map((buf) => Buffer.from(buf).toString('utf8'))
        showYakitDrawer({
          title: 'HotPatch Tag Result',
          width: '45%',
          className: styles['hotPatch-result-drawer'],
          content: (
            <AutoCard
              size={'small'}
              bordered={false}
              title={
                <span style={{ color: 'var(--Colors-Use-Neutral-Text-1-Title)' }}>
                  {t('HTTPFuzzerHotPatch.resultDisplay')}
                </span>
              }
              extra={
                <Space>
                  <YakitButton type="text" onClick={() => setClipboardText(data.join('\n'))}>
                    {t('HTTPFuzzerHotPatch.copyFuzzResult')}
                  </YakitButton>
                </Space>
              }
            >
              <YakitEditor value={data.join('\r\n')} readOnly={true} />
            </AutoCard>
          ),
        })
      })
      .catch((err) => {
        if (tokenRef.current) {
          yakitNotify('error', `${t('HTTPFuzzerHotPatch.debugFailed')}: ${err}`)
        }
      })
      .finally(() => {
        setTimeout(() => {
          setLoading(false)
          tokenRef.current = ''
        }, 300)
      })
  })

  const onEnabledChange = useMemoizedFn((checked: boolean) => {
    if (checked) {
      props.onSaveCode(code)
    }
    props.onHotPatchEnabledChange(checked)
    persistHotPatchState()
  })

  const setSharedHotReloadCode = useMemoizedFn((checked: boolean) => {
    setSharedHotReloadCodeState(checked)

    // 仅允许一个页面开启：打开时抢占当前页，关闭时清空全部
    syncSharedHotReloadOwner(checked ? props.pageId : undefined)
    setSharedHotReloadEnabled(checked)
  })

  useShortcutKeyTrigger(
    'saveHotPatch*httpFuzzer',
    useMemoizedFn(() => {
      if (!props.inViewport || !visible) return
      if (!canSaveSelectedTemplate) {
        setAddHotCodeTemplateVisible(true)
      } else {
        onUpdateTemplate()
      }
    }),
  )

  return (
    <div
      className={classNames(styles['hotPatch-sidebar'], { [styles['hotPatch-sidebar-full-screen']]: isFullScreen })}
      style={{ display: visible ? '' : 'none' }}
    >
      <div className={styles['hotPatch-sidebar-header']}>
        <div className={styles['hotPatch-sidebar-toolbar']}>
          <div className={styles['hotPatch-sidebar-toolbar-row']}>
            <div className={styles['hotPatch-sidebar-template-select']}>
              <HotCodeTemplate
                type="fuzzer"
                hotPatchTempLocal={hotPatchTempLocal}
                onSetHotPatchTempLocal={setHotPatchTempLocal}
                onClickHotCode={(temp, tempName) => {
                  const nextName = tempName || ''
                  tempNameRef.current = nextName
                  setSelectedTemplateName(nextName)
                  props.onSelectedTemplateNameChange?.(nextName)
                  updateCode(temp)
                }}
                refreshList={refreshHotCodeList}
                onDeleteLocalTempOk={() => {
                  tempNameRef.current = ''
                  setSelectedTemplateName('')
                  props.onSelectedTemplateNameChange?.('')
                }}
                triggerNode={
                  <YakitButton type="text" size="small" className={styles['hotPatch-sidebar-template-trigger']}>
                    <span className={classNames(styles['hotPatch-sidebar-template-text'], 'content-ellipsis')}>
                      {selectedTemplateName ? t(selectedTemplateName) : t('HotCodeTemplate.code_template')}
                    </span>
                    <OutlineChevrondownIcon className={styles['hotPatch-sidebar-template-icon']} />
                  </YakitButton>
                }
              />
            </div>
            <div className={styles['hotPatch-sidebar-toolbar-actions']}>
              <YakitPopconfirm
                title={t('HTTPFuzzerHotPatch.resetHotReloadWarning')}
                onConfirm={() => {
                  tempNameRef.current = ''
                  setSelectedTemplateName('')
                  props.onSelectedTemplateNameChange?.('')
                  updateCode(HotPatchDefaultContent)
                }}
              >
                <Tooltip title={t('YakitButton.reset')}>
                  <YakitButton
                    icon={<RefreshIcon />}
                    type="text"
                    size="small"
                    className={styles['hotPatch-sidebar-icon-button']}
                  />
                </Tooltip>
              </YakitPopconfirm>
              <Tooltip title={t('HTTPFuzzerHotPatch.sharedHotReloadCode')}>
                <YakitPopover
                  trigger="click"
                  placement="bottom"
                  content={
                    <div className={styles['hotPatchCodeOpen']}>
                      <span>{t('HTTPFuzzerHotPatch.sharedHotReloadCode')}</span>
                      <Tooltip title={t('HTTPFuzzerHotPatch.webFuzzerHotReloadNotice')}>
                        <InformationCircleIcon className={styles['info-icon']} />
                      </Tooltip>
                      <YakitSwitch checked={sharedHotReloadCode} onChange={setSharedHotReloadCode}></YakitSwitch>
                    </div>
                  }
                >
                  <YakitButton
                    type="text"
                    size="small"
                    className={styles['hotPatch-sidebar-icon-button']}
                    icon={sharedHotReloadCode ? <SolidLightningboltIcon /> : <OutlineLightningboltIcon />}
                  />
                </YakitPopover>
              </Tooltip>
              <Tooltip title={t('HTTPFuzzerHotPatch.updateAndSaveTemplate')}>
                <YakitButton
                  disabled={!canSaveSelectedTemplate}
                  type="text"
                  size="small"
                  icon={<OutlineFileUpIcon />}
                  className={styles['hotPatch-sidebar-icon-button']}
                  onClick={onUpdateTemplate}
                />
              </Tooltip>
              <Tooltip title={t('YakitButton.save_as')}>
                <YakitButton
                  disabled={!code}
                  type="text"
                  size="small"
                  icon={<OutlineStorageIcon />}
                  className={styles['hotPatch-sidebar-icon-button']}
                  onClick={() => setAddHotCodeTemplateVisible(true)}
                />
              </Tooltip>
            </div>
            <div className={styles['hotPatch-sidebar-header-right']}>
              <div className={styles['hotPatch-sidebar-switch-wrap']}>
                {t('YakitButton.enable')}
                <Tooltip title={t('HTTPFuzzerHotPatch.webFuzzerHotReloadOpenTips')}>
                  <InformationCircleIcon className={styles['info-icon']} />
                </Tooltip>
                <YakitSwitch checked={hotPatchEnabled} onChange={onEnabledChange} />
              </div>
              {isFullScreen ? (
                <OutlineArrowscollapseIcon className={styles['expand-icon']} onClick={() => setIsFullScreen(false)} />
              ) : (
                <OutlineArrowsexpandIcon
                  className={classNames(styles['expand-icon'], styles['expand-icon-active'])}
                  onClick={() => {
                    setIsFullScreen(true)
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles['hotPatch-sidebar-body']} ref={resizeBodyRef}>
        <YakitResizeBox
          isVer={true}
          firstRatio={resizeBoxFirstRatio}
          firstMinSize={resizeBoxFirstMinSize}
          secondMinSize={resizeBoxSecondMinSize}
          isShowDefaultLineStyle={true}
          lineStyle={{ backgroundColor: 'var(--Colors-Use-Neutral-Bg)' }}
          style={{ height: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}
          firstNodeStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: 0 }}
          secondNodeStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: 0 }}
          onMouseUp={({ firstSizeNum }) => {
            const bodyHeight = resizeBodySize?.height || 0
            if (!bodyHeight) {
              setHotPatchEditorHeight(Math.round(firstSizeNum))
              return
            }

            const maxFirstHeight = Math.max(resizeBoxFirstMinSize, bodyHeight - resizeBoxSecondMinSize - resizeLineSize)
            setHotPatchEditorHeight(Math.round(Math.min(firstSizeNum, maxFirstHeight)))
          }}
          firstNode={
            <div className={styles['hotPatch-sidebar-editor-section']} style={{ height: '100%' }}>
              <div className={styles['hotPatch-sidebar-editor']}>
                <YakitEditor type="yak" value={code} setValue={updateCode} noMiniMap={true} />
              </div>
            </div>
          }
          secondNode={
            <div className={styles['hotPatch-sidebar-template-content']} style={{ height: '100%' }}>
              <div className={styles['hotPatch-sidebar-section-header']}>
                <div>
                  <span className={styles['hotPatch-sidebar-section-label']}>
                    {t('HTTPFuzzerHotPatch.templateContent')}
                  </span>
                  {props.onInsert && (
                    <YakitButton
                      type="primary"
                      size="small"
                      onClick={() => {
                        props.onInsert?.(template)
                      }}
                    >
                      {t('HTTPFuzzerHotPatch.insertAtEditorPosition')}
                    </YakitButton>
                  )}
                </div>
                <div className={styles['hotPatch-section-header-right']}>
                  <Tooltip placement="bottom" title={t('HTTPFuzzerHotPatch.engineConsole')}>
                    <YakitButton
                      type="text"
                      size="small"
                      className={styles['hotPatch-sidebar-icon-button']}
                      onClick={openConsoleNewWindow}
                      icon={<OutlineTerminalIcon className={styles['engineConsole-icon-style']} />}
                    />
                  </Tooltip>
                  <YakitButton
                    type="primary"
                    size="small"
                    className={styles['hotPatch-sidebar-debug-button']}
                    loading={loading}
                    onClick={onDebugSubmit}
                  >
                    {t('YakitButton.debugExecution')}
                  </YakitButton>
                  {loading && (
                    <YakitButton danger size="small" onClick={onCancelDebug}>
                      {t('YakitButton.cancel')}
                    </YakitButton>
                  )}
                </div>
              </div>
              <div className={styles['hotPatch-sidebar-template-editor']}>
                <YakitEditor type="http" value={template} setValue={setTemplate} noMiniMap={true} />
              </div>
            </div>
          }
        />
      </div>
      <AddHotCodeTemplate
        type="fuzzer"
        title={t('YakitButton.save_as')}
        hotPatchTempLocal={hotPatchTempLocal}
        hotPatchCode={code}
        visible={addHotCodeTemplateVisible}
        onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
        onSaveHotCodeOk={(tempName) => {
          tempNameRef.current = tempName || ''
          setSelectedTemplateName(tempName || '')
          props.onSelectedTemplateNameChange?.(tempName || '')
          setRefreshHotCodeList((prev) => !prev)
        }}
      />
    </div>
  )
})
