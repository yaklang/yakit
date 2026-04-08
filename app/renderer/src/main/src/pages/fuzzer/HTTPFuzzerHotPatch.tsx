import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown, Form, Space, Tooltip } from 'antd'
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
import { yakitFailed, yakitNotify } from '@/utils/notification'
import {
  OutlineChevrondownIcon,
  OutlineClouddownloadIcon,
  OutlineClouduploadIcon,
  OutlineFileUpIcon,
  OutlineStorageIcon,
  OutlineTerminalIcon,
  OutlineTrashIcon,
  OutlineXIcon,
  OutlineArrowsexpandIcon,
  OutlineArrowscollapseIcon,
} from '@/assets/icon/outline'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import {
  defaultWebFuzzerPageInfo,
  HotPatchDefaultContent,
  HotPatchTempDefault,
} from '@/defaultConstants/HTTPFuzzerPage'
import { setClipboardText } from '@/utils/clipboard'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { shallow } from 'zustand/shallow'
import { PageNodeItemProps, usePageInfo } from '@/store/pageInfo'
import { cloneDeep } from 'lodash'
import { YakitRoute } from '@/enums/yakitRoute'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import classNames from 'classnames'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { Paging } from '@/utils/yakQueryHTTPFlow'
import { DbOperateMessage } from '../layout/mainOperatorContent/utils'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { useStore } from '@/store'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import { PluginListPageMeta } from '../plugins/baseTemplateType'
import { isEnpriTrace } from '@/utils/envfile'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { openConsoleNewWindow } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getHotPatchCache, setHotPatchCache } from './hotPatchCache'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
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
    HotPatchCodeWithParamGetter: !!props.initialHotPatchCodeWithParamGetter
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
      if (!!e) {
        setParams({ ...params, Template: e })
      }
    })

    getRemoteValue(FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode).then((e) => {
      if (!!e) {
        try {
          const obj = JSON.parse(e) || {}
          if (obj.hotPatchCodeOpen && initWebFuzzerPageInfo().hotPatchCode === obj.hotPatchCode) {
            setHotPatchCodeOpen(obj.hotPatchCodeOpen)
            initHotPatchCodeOpen.current = obj.hotPatchCodeOpen
          }
        } catch (error) {}
      }
    })

    return () => {
      setRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO, getParams().Template).then(() => {})
    }
  }, [])

  const saveCode = useMemoizedFn((hotPatchCode: string) => {
    props.onSaveCode(hotPatchCode)
    setRemoteValue(
      FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode,
      JSON.stringify({ hotPatchCodeOpen: hotPatchCodeOpen, hotPatchCode: getParams().HotPatchCode }),
    )
    initHotPatchCodeOpen.current = hotPatchCodeOpen
  })

  const onClose = useMemoizedFn(async () => {
    if (
      initWebFuzzerPageInfo().hotPatchCode !== params.HotPatchCode ||
      initHotPatchCodeOpen.current !== hotPatchCodeOpen
    ) {
      let m = YakitModalConfirm({
        width: 420,
        type: 'white',
        onCancelText: t('YakitButton.cancel'),
        onOkText: t('YakitButton.confirm'),
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
        content: t('HTTPFuzzerHotPatch.enableModifiedHotReload'),
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
              const data: string[] = (response.Results || []).map((buf) => new Buffer(buf).toString('utf8'))
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

export const getHotPatchCodeInfo = async () => {
  let hotPatchCode = HotPatchDefaultContent
  let hotPatchOpen = false
  try {
    const { sharedHotReloadCode, hotPatchCode: cacheHotPatchCode, hotPatchCodeOpen } = await getHotPatchCache()
    if (sharedHotReloadCode) {
      // shared 开启时：优先取上一个 WebFuzzer 页面状态；没有再用缓存
      let hasLastWebFuzzer = false
      try {
        const pageInfoStore = usePageInfo.getState()
        const lastPageId = pageInfoStore.getCurrentSelectPageId(YakitRoute.HTTPFuzzer)
        if (lastPageId) {
          const lastPage = pageInfoStore.queryPagesDataById(YakitRoute.HTTPFuzzer, lastPageId)
          const lastPageInfo = lastPage?.pageParamsInfo?.webFuzzerPageInfo
          if (lastPageInfo) {
            hasLastWebFuzzer = true
            hotPatchCode = lastPageInfo.hotPatchCode || cacheHotPatchCode || HotPatchDefaultContent
            hotPatchOpen =
              typeof lastPageInfo.advancedConfigValue?.disableHotPatch === 'boolean'
                ? !lastPageInfo.advancedConfigValue?.disableHotPatch
                : !!hotPatchCodeOpen
          }
        }
      } catch (error) {}

      if (!hasLastWebFuzzer) {
        hotPatchCode = cacheHotPatchCode || HotPatchDefaultContent
        hotPatchOpen = !!hotPatchCodeOpen
      }
    }
  } catch (error) {}
  return { hotPatchCode, hotPatchOpen }
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
        if (!!e) {
          setTemplate(`${e}`)
        }
      })
    }
  }, [visible, hotPatchCode, setCode, setTemplate])

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

  const persistHotPatchState = useMemoizedFn((enabled: boolean, currentCode: string) => {
    setRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO, getTemplate())
    setHotPatchCache({ hotPatchCodeOpen: enabled, hotPatchCode: currentCode })
  })

  const saveCode = useMemoizedFn((c: string, notify?: boolean) => {
    props.onSaveCode(c)
    persistHotPatchState(hotPatchEnabled, c)
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
        const data: string[] = (response.Results || []).map((buf) => new Buffer(buf).toString('utf8'))
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
    persistHotPatchState(checked, getCode())
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

interface QueryHotPatchTemplateListResponse {
  Pagination: Paging
  Name: string[]
  Total: number
}

interface HotPatchTemplateRequest {
  Name: string[]
  Type: HotCodeType
}

interface QueryHotPatchTemplateResponse {
  Message: DbOperateMessage
  Data: HotPatchTemplate[]
}

export interface HotPatchTempItem {
  name: string
  nameUi?: string
  temp: string
  isDefault: boolean
}

interface DeleteHotPatchTemplateRequest {
  Condition: HotPatchTemplateRequest
}

interface GetOnlineHotPatchTemplateRequest extends API.HotPatchTemplateRequest, PluginListPageMeta {}

export type HotCodeType = 'fuzzer' | 'mitm' | 'httpflow-analyze' | 'global'
interface HotCodeTemplateProps {
  type: HotCodeType
  hotPatchTempLocal: HotPatchTempItem[]
  onSetHotPatchTempLocal: (hotPatchTempLocal: HotPatchTempItem[]) => void
  onClickHotCode: (temp: string, tempName?: string) => void
  dropdown?: boolean
  triggerNode?: React.ReactNode
  refreshList?: boolean
  onDeleteLocalTempOk?: () => void
}
export const HotCodeTemplate: React.FC<HotCodeTemplateProps> = React.memo((props) => {
  const {
    type,
    hotPatchTempLocal,
    onSetHotPatchTempLocal,
    onClickHotCode,
    dropdown = true,
    triggerNode,
    refreshList,
    onDeleteLocalTempOk,
  } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'webFuzzer'])
  const [hotCodeTempVisible, setHotCodeTempVisible] = useState<boolean>(false)
  const [tab, setTab] = useState<'local' | 'online'>('local')
  const [viewCurHotCode, setViewCurrHotCode] = useState<string>('')
  const userInfo = useStore((s) => s.userInfo)
  const hotPatchTempLocalRef = useRef<HotPatchTempItem[]>(hotPatchTempLocal)
  const [hotPatchTempOnline, setHotPatchTempOnline] = useState<HotPatchTempItem[]>([])
  const [sameNameHint, setSameNameHint] = useState<boolean>(false)
  const sameNameHintInfoRef = useRef({ title: '', content: '', onOk: () => {}, onCancel: () => {} })

  useEffect(() => {
    hotPatchTempLocalRef.current = hotPatchTempLocal
  }, [hotPatchTempLocal])

  useEffect(() => {
    if (hotCodeTempVisible || dropdown === false) {
      if (tab === 'local') {
        ipcRenderer
          .invoke('QueryHotPatchTemplateList', {
            Type: type,
          })
          .then((res: QueryHotPatchTemplateListResponse) => {
            const nameArr = res.Name
            const newHotPatchTempLocal = hotPatchTempLocalRef.current.slice().filter(({ isDefault }) => isDefault)
            nameArr.forEach((name) => {
              const index = newHotPatchTempLocal.findIndex((item) => item.name === name)
              if (index === -1) {
                newHotPatchTempLocal.push({
                  name,
                  temp: '',
                  isDefault: false,
                })
              }
            })
            onSetHotPatchTempLocal(newHotPatchTempLocal)
          })
          .catch((error) => {
            yakitNotify('error', error + '')
          })
      } else {
        NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
          method: 'get',
          url: 'hot/patch/template',
          data: {
            page: 1,
            limit: 1000,
            type: type,
          },
        })
          .then((res) => {
            const d = res.data || []
            // 线上模板 isDefault都默认为true
            const list = d.map((item) => ({ name: item.name, temp: item.content, isDefault: true }))
            setHotPatchTempOnline(list)
          })
          .catch((err) => {
            yakitNotify('error', t('HotCodeTemplate.fetch_online_template_list_failed') + err)
          })
      }
    }
  }, [hotCodeTempVisible, tab, dropdown, refreshList])

  const onClickHotCodeName = (item: HotPatchTempItem, click?: boolean) => {
    if (item.isDefault) {
      if (click) {
        onClickHotCode(item.temp, item.name)
        setHotCodeTempVisible(false)
      }
      setViewCurrHotCode(item.temp)
    } else {
      if (tab === 'local') {
        const params: HotPatchTemplateRequest = {
          Type: type,
          Name: [item.name],
        }
        ipcRenderer
          .invoke('QueryHotPatchTemplate', params)
          .then((res: QueryHotPatchTemplateResponse) => {
            if (click) {
              onClickHotCode(res.Data[0].Content, item.name)
              setHotCodeTempVisible(false)
            }
            setViewCurrHotCode(res.Data[0].Content)
          })
          .catch((error) => {
            setViewCurrHotCode('')
            yakitNotify('error', error + '')
          })
      }
    }
  }

  const deleteHotPatchTemplate = (item: HotPatchTempItem) => {
    if (tab === 'local') {
      const params: DeleteHotPatchTemplateRequest = {
        Condition: {
          Type: type,
          Name: [item.name],
        },
      }
      ipcRenderer
        .invoke('DeleteHotPatchTemplate', params)
        .then((res: { Message: DbOperateMessage }) => {
          onSetHotPatchTempLocal(hotPatchTempLocal.filter((i) => i.name !== item.name))
          yakitNotify('success', t('YakitNotification.deleted'))
          onDeleteLocalTempOk && onDeleteLocalTempOk()
        })
        .catch((error) => {
          yakitNotify('error', error + '')
        })
    } else {
      NetWorkApi<API.HotPatchTemplateRequest, API.ActionSucceeded>({
        method: 'delete',
        url: 'hot/patch/template',
        data: {
          type: type,
          name: item.name,
        },
      })
        .then((res) => {
          if (res.ok) {
            setHotPatchTempOnline(hotPatchTempOnline.filter((i) => i.name !== item.name))
            yakitNotify('success', t('HotCodeTemplate.online_delete_success'))
          }
        })
        .catch((err) => {
          yakitNotify('error', t('HotCodeTemplate.online_delete_failed') + err)
        })
    }
  }

  const findHotPatchTemplate = (item: HotPatchTempItem, upload: boolean) => {
    return new Promise((resolve, reject) => {
      if (upload) {
        NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
          method: 'get',
          url: 'hot/patch/template',
          data: {
            page: 1,
            limit: 1000,
            type: type,
            name: item.name,
          },
        })
          .then((res) => {
            const d = res.data || []
            if (d.length) {
              setHotCodeTempVisible(false)
              sameNameHintInfoRef.current = {
                title: t('HotCodeTemplate.overwrite_same_name_prompt'),
                content: t('HotCodeTemplate.online_same_name_template_prompt'),
                onOk: () => {
                  resolve(true)
                },
                onCancel: () => {
                  reject(t('HotCodeTemplate.online_template_exists_same_name'))
                },
              }
              setSameNameHint(true)
            } else {
              resolve(false)
            }
          })
          .catch((err) => {
            yakitNotify('error', t('HotCodeTemplate.check_hot_reload_template_online_failed') + err)
          })
      } else {
        const index = hotPatchTempLocal.findIndex((i) => i.name === item.name)
        if (index !== -1) {
          setHotCodeTempVisible(false)
          sameNameHintInfoRef.current = {
            title: t('HotCodeTemplate.overwrite_same_name_prompt'),
            content: t('HotCodeTemplate.local_same_name_template_prompt'),
            onOk: () => {
              resolve(true)
            },
            onCancel: () => {
              reject(t('HotCodeTemplate.local_template_exists_same_name'))
            },
          }
          setSameNameHint(true)
        } else {
          resolve(false)
        }
      }
    })
  }

  const uploadHotPatchTemplateToOnline = (item: HotPatchTempItem) => {
    findHotPatchTemplate(item, true)
      .then(() => {
        ipcRenderer
          .invoke('UploadHotPatchTemplateToOnline', {
            Type: type,
            Token: userInfo.token,
            Name: item.name,
          })
          .then((res) => {
            yakitNotify('success', t('YakitNotification.uploaded'))
          })
          .catch((error) => {
            yakitNotify('error', t('YakitNotification.uploadFailed', { error: error + "" }))
          })
      })
      .catch(() => {})
  }

  const downloadHotPatchTemplate = (item: HotPatchTempItem) => {
    findHotPatchTemplate(item, false)
      .then((r) => {
        ipcRenderer
          .invoke('DownloadHotPatchTemplate', {
            Type: type,
            Name: item.name,
          })
          .then((res) => {
            if (r) {
              // 手动删除本地数据，这里不需要删掉数据库里面的
              onSetHotPatchTempLocal(hotPatchTempLocal.filter((i) => i.name !== item.name))
            }
            yakitNotify('success', t('YakitNotification.downloaded'))
          })
          .catch((error) => {
            yakitNotify('error', t('YakitNotification.downloadFailed', { error: error + "" }))
          })
      })
      .catch(() => {})
  }

  // admin、审核员 支持（本地上传，线上删除）
  const hasPermissions = useMemo(() => {
    const flag = ['admin', 'auditor'].includes(userInfo.role || '')
    return flag
  }, [userInfo])

  const renderHotPatchTemp = useMemo(() => {
    if (tab === 'local') return hotPatchTempLocal
    if (tab === 'online') return hotPatchTempOnline
    return []
  }, [tab, hotPatchTempLocal, hotPatchTempOnline])

  const overlayCont = useMemo(() => {
    return (
      <div
        className={styles['hotCode-list']}
        style={{
          maxHeight: dropdown ? 380 : undefined,
          padding: dropdown ? '4px 6px' : undefined,
          height: dropdown ? undefined : '100%',
        }}
      >
        {isEnpriTrace() && (
          <YakitRadioButtons
            wrapClassName={styles['hotCode-tab-btns']}
            value={tab}
            buttonStyle="solid"
            options={[
              {
                value: 'local',
                label: t('HotCodeTemplate.local_template'),
              },
              {
                value: 'online',
                label: t('HotCodeTemplate.online_template'),
              },
            ]}
            onChange={(e) => {
              setTab(e.target.value)
            }}
          />
        )}
        {renderHotPatchTemp.length ? (
          <>
            {renderHotPatchTemp.map((item) => (
              <div className={styles['hotCode-item']} key={item.name}>
                <YakitPopover
                  trigger="hover"
                  placement="right"
                  overlayClassName={styles['hotCode-popover']}
                  content={dropdown && <YakitEditor type={'yak'} value={viewCurHotCode} readOnly={true} />}
                  onVisibleChange={(v) => {
                    if (v) {
                      onClickHotCodeName(item)
                    }
                  }}
                  zIndex={9999}
                >
                  <YakitPopconfirm
                    title={t('HotCodeTemplate.confirm_overwrite_hot_reload_code')}
                    onConfirm={(e) => {
                      onClickHotCodeName(item, true)
                    }}
                    placement="right"
                    disabled={dropdown}
                  >
                    <div
                      className={classNames(styles['hotCode-item-cont'])}
                      onClick={() => {
                        if (dropdown) {
                          onClickHotCodeName(item, true)
                        }
                      }}
                    >
                      <div
                        className={classNames(styles['hotCode-item-name'], 'content-ellipsis')}
                        title={t(item.nameUi || item.name)}
                      >
                        {t(item.nameUi || item.name)}
                      </div>
                      <div className={styles['extra-opt-btns']}>
                        {/* 本地上传 */}
                        {tab === 'local' && !item.isDefault && hasPermissions && (
                          <YakitButton
                            icon={<OutlineClouduploadIcon />}
                            type="text2"
                            onClick={(e) => {
                              e.stopPropagation()
                              uploadHotPatchTemplateToOnline(item)
                            }}
                          ></YakitButton>
                        )}
                        {/* 线上下载 */}
                        {tab === 'online' && (
                          <YakitButton
                            icon={<OutlineClouddownloadIcon />}
                            type="text2"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadHotPatchTemplate(item)
                            }}
                          ></YakitButton>
                        )}
                        {/* 删除 */}
                        {(tab === 'local' && !item.isDefault) || (tab === 'online' && hasPermissions) ? (
                          <YakitButton
                            icon={<OutlineTrashIcon />}
                            type="text"
                            colors="danger"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteHotPatchTemplate(item)
                            }}
                          ></YakitButton>
                        ) : null}
                      </div>
                      {item.isDefault && (
                        <YakitTag color="info" size="small">
                          {t('YakitButton.builtIn')}
                        </YakitTag>
                      )}
                    </div>
                  </YakitPopconfirm>
                </YakitPopover>
              </div>
            ))}
          </>
        ) : (
          <YakitEmpty></YakitEmpty>
        )}
      </div>
    )
  }, [tab, renderHotPatchTemp, viewCurHotCode, hasPermissions, dropdown])

  return (
    <>
      {dropdown ? (
        <Dropdown
          overlayStyle={{ borderRadius: 4, width: 250, minWidth: 250 }}
          visible={hotCodeTempVisible}
          onVisibleChange={(v) => {
            setHotCodeTempVisible(v)
          }}
          trigger={['click']}
          overlay={overlayCont}
        >
          {triggerNode || <YakitButton type="text">{t('HotCodeTemplate.code_template')}</YakitButton>}
        </Dropdown>
      ) : (
        <div style={{ width: 250 }}>{overlayCont}</div>
      )}
      <YakitHint
        visible={sameNameHint}
        title={sameNameHintInfoRef.current.title}
        content={sameNameHintInfoRef.current.content}
        onOk={() => {
          setSameNameHint(false)
          sameNameHintInfoRef.current.onOk()
        }}
        onCancel={() => {
          setSameNameHint(false)
          sameNameHintInfoRef.current.onCancel()
        }}
      />
    </>
  )
})

interface HotPatchTemplate {
  Name: string
  Content: string
  Type: string
}
interface AddHotCodeTemplateProps {
  title?: string
  type: HotCodeType
  hotPatchTempLocal: HotPatchTempItem[]
  hotPatchCode: string
  visible: boolean
  onSetAddHotCodeTemplateVisible: (visible: boolean) => void
  onSaveHotCodeOk?: (tempName?: string) => void
}
export const AddHotCodeTemplate: React.FC<AddHotCodeTemplateProps> = React.memo((props) => {
  const { title, type, hotPatchTempLocal, hotPatchCode, visible, onSetAddHotCodeTemplateVisible, onSaveHotCodeOk } =
    props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'webFuzzer'])
  const addHotPatchTempNameRef = useRef<string>('')

  const onCancel = useMemoizedFn(() => {
    addHotPatchTempNameRef.current = ''
    onSetAddHotCodeTemplateVisible(false)
  })

  const onOk = useMemoizedFn(() => {
    if (!addHotPatchTempNameRef.current) {
      yakitNotify('info', t('AddHotCodeTemplate.hot_reload_template_name_empty'))
      return
    }

    const index = hotPatchTempLocal.findIndex((item) => item.name === addHotPatchTempNameRef.current)
    if (index !== -1) {
      yakitNotify('info', t('AddHotCodeTemplate.hot_reload_template_name_exists'))
      return
    }

    const params: HotPatchTemplate = {
      Type: type,
      Content: hotPatchCode,
      Name: addHotPatchTempNameRef.current,
    }
    ipcRenderer
      .invoke('CreateHotPatchTemplate', params)
      .then((res) => {
        yakitNotify('success', t('YakitNotification.saved'))
        onSaveHotCodeOk && onSaveHotCodeOk(addHotPatchTempNameRef.current)
        onSetAddHotCodeTemplateVisible(false)
        addHotPatchTempNameRef.current = ''
      })
      .catch((error) => {
        yakitNotify('error', error + '')
      })
  })

  return (
    <YakitModal
      visible={visible}
      title={title || t('AddHotCodeTemplate.save_hot_reload_template')}
      width={400}
      onCancel={onCancel}
      okText={t('YakitButton.save')}
      onOk={onOk}
      destroyOnClose
      footer={null}
    >
      <div className={styles['hotCodeTemp-save']}>
        <YakitInput.TextArea
          placeholder={t('AddHotCodeTemplate.enter_hot_reload_template_name')}
          showCount
          maxLength={50}
          onChange={(e) => {
            addHotPatchTempNameRef.current = e.target.value
          }}
        />
        <div className={styles['btn-box']}>
          <YakitButton type="outline2" onClick={onCancel}>
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton type="primary" onClick={onOk}>
            {t('YakitButton.save')}
          </YakitButton>
        </div>
      </div>
    </YakitModal>
  )
})
