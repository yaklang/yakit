import React, { Dispatch, SetStateAction, forwardRef, useImperativeHandle, memo, useEffect, useRef } from 'react'

import { KnowledgeBaseSidebar } from './KnowledgeBaseSidebar'

import styles from '../knowledgeBase.module.scss'
import KnowledgeBaseContainer from './KnowledgeBaseContainer'
import { KnowledgeBaseItem } from '../hooks/useKnowledgeBase'
import {
  useAsyncEffect,
  useCreation,
  useDebounceEffect,
  useDeepCompareEffect,
  useInViewport,
  useMemoizedFn,
  useSafeState,
  useUpdateEffect,
} from 'ahooks'
import {
  BuildingKnowledgeBase,
  BuildingKnowledgeBaseEntry,
  checkAIModelAvailability,
  compareKnowledgeBaseChange,
  extractAddedHistory,
  extractStreamTokenChangedItem,
  findChangedObjects,
  joyrideSteps,
  stopList,
} from '../utils'
import useMultipleHoldGRPCStream from '../hooks/useMultipleHoldGRPCStream'
import { failed, success } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { apiCancelDebugPlugin } from '@/pages/plugins/utils'
import { KnowledgeBaseTableHeaderProps } from './KnowledgeBaseTableHeader'
import { CreateKnowledgeBaseData } from '../TKnowledgeBase'

import { knowledgeBaseDataStore } from '@/pages/ai-agent/store/ChatDataStore'
import { HistoryAIReActChatProvider, useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import { AIHandleStartParams } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import Joyride, { ACTIONS, CallBackProps, STATUS } from 'react-joyride'
import { CustomJoyrideTooltip } from './CustomJoyrideTooltip/CustomJoyrideTooltip'
import { KnowledgeBaseGV } from '@/yakitGV'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { GuideFooter } from './GuideFooter'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { OutlineMessageCirclePlusIcon, OutlineXIcon } from '@/assets/icon/outline'
import { OutlinePlusIcon } from '@/assets/newIcon'
import { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import { InstallPluginModal } from './InstallPluginModal/InstallPluginModal'
import { reseultKnowledgePlugin, useCheckKnowledgePlugin } from '../hooks/useCheckKnowledgePlugin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { KnowledgeBaseFormModal } from './KnowledgeBaseFormModal'
import { Form, Progress, Tooltip } from 'antd'
import { ImportModal } from './ImportModal'
import { grpcFetchLocalPluginDetail } from '@/pages/pluginHub/utils/grpc'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { PluginExecuteResult } from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult'

interface KnowledgeBaseContentProps {
  knowledgeBaseID: string
  setKnowledgeBaseID: Dispatch<SetStateAction<string>>
  knowledgeBases: KnowledgeBaseItem[]
  previousKnowledgeBases: KnowledgeBaseItem[] | null
  editKnowledgeBase: (id: string, data: Partial<KnowledgeBaseItem>) => void
  clearAll: () => void
  apiRef: React.MutableRefObject<KnowledgeBaseTableHeaderProps['api'] | undefined>
  refreshAsync: () => Promise<CreateKnowledgeBaseData[] | undefined>
  inViewport: boolean
  streamsRef: React.MutableRefObject<KnowledgeBaseTableHeaderProps['streams'] | undefined>
  loading: boolean
}

const hasStatusError = (state: HoldGRPCStreamInfo): boolean => {
  return (
    state?.cardState
      ?.find((item) => item.tag === 'status')
      ?.info?.some((it) => typeof it.Data === 'string' && it.Data.includes('ERR:')) ?? false
  )
}

const KnowledgeBaseContentInner = forwardRef<unknown, KnowledgeBaseContentProps>(
  function KnowledgeBaseContentInner(props, ref) {
    const {
      knowledgeBaseID,
      setKnowledgeBaseID,
      knowledgeBases,
      previousKnowledgeBases,
      editKnowledgeBase,
      clearAll,
      apiRef,
      refreshAsync,
      inViewport,
      loading,
    } = props
    const { t } = useI18nNamespaces(['plugin'])
    const { renderHistoryAIReActChat, setShowFreeChat, showFreeChat, historyAIReActChatBridge } =
      useHistoryAIReActChat()
    const [streams, api] = useMultipleHoldGRPCStream()
    const { refresh: refreshPluginStatus, ThirdPartyBinaryRunAsync } = useCheckKnowledgePlugin()

    const [addMode, setAddMode] = useSafeState<string[]>(['manual'])
    const [isAIModelAvailable, setIsAIModelAvailable] = useSafeState(false)
    const [aIModelAvailableTokens, setAIModelAvailableTokens] = useSafeState('')
    const [progress, setProgress] = useSafeState(0)

    const onOK = async () => {
      try {
        await Promise.all(api.tokens.map((token) => apiCancelDebugPlugin(token)))
        api.clearAllStreams()
        clearAll()
        emiter.emit('closePage', JSON.stringify({ route: YakitRoute.AI_REPOSITORY }))
      } catch (e) {
        failed(`关闭知识库页面失败: ${e + ''}`)
      }
    }

    // 知识库可用诊断 callback
    const handleValidateAIModelUsable = useMemoizedFn(async () => {
      try {
        const streamToken = randomString(50)
        setAIModelAvailableTokens(streamToken)
        const plugin = await grpcFetchLocalPluginDetail({ Name: '知识库可用性诊断' }, true)
        await checkAIModelAvailability(plugin, streamToken)

        api?.createStream(streamToken, {
          taskName: 'debug-plugin',
          apiKey: 'DebugPlugin',
          autoClear: false,
          token: streamToken,
          onEnd: async () => {
            setProgress(100)
            success('知识库可用诊断完成')
          },
          onError: (e) => {
            setProgress(100)
          },
        })
      } catch (error) {
        failed(error + '')
      }
    })

    useDebounceEffect(() => {
      if (streams[aIModelAvailableTokens]?.progressState?.[0]?.progress) {
        setProgress(Math.round(streams[aIModelAvailableTokens]?.progressState?.[0]?.progress * 100))
      }
    }, [streams[aIModelAvailableTokens]?.progressState?.[0]?.progress])

    useDebounceEffect(() => {
      if (hasStatusError(streams[aIModelAvailableTokens])) {
        setProgress(100)
      }
    }, [streams[aIModelAvailableTokens]?.cardState])

    useUpdateEffect(() => {
      if (progress === 100 && !isAIModelAvailable) {
        api.removeStream && api.removeStream(aIModelAvailableTokens)
      }
    }, [progress, isAIModelAvailable])

    useEffect(() => {
      handleValidateAIModelUsable()
    }, [])

    // 每次变化时更新 ref
    useDeepCompareEffect(() => {
      apiRef.current = api
    }, [api])

    //  构建任务防重复
    const buildingSetRef = useRef<Set<string>>(new Set())

    // 知识库构建
    const buildKnowledgeBase = useMemoizedFn(async (kb: KnowledgeBaseItem) => {
      const key = `kb:${kb.ID}`
      if (buildingSetRef.current.has(key)) return
      buildingSetRef.current.add(key)

      try {
        await BuildingKnowledgeBase(kb)

        if (!api?.createStream || !kb.streamToken) return

        api.createStream(kb.streamToken, {
          taskName: 'debug-plugin',
          apiKey: 'DebugPlugin',
          token: kb.streamToken,
          onEnd: (info) => {
            api.removeStream?.(kb.streamToken)
            buildingSetRef.current.delete(key)

            const target = knowledgeBases.find((it) => it.streamToken === info?.requestToken)
            if (!target) return
            if (target.disableERM === 'true') {
              editKnowledgeBase(target.ID, { ...target, streamstep: 'success' })
            } else {
              editKnowledgeBase(target.ID, {
                ...target,
                streamstep: 2,
                streamToken: randomString(50),
              })
            }
          },
          onError: (e) => {
            buildingSetRef.current.delete(key)
            api.removeStream?.(kb.streamToken)
            editKnowledgeBase(kb.ID, { ...kb, streamstep: 'success' })
          },
        })
      } catch (e) {
        buildingSetRef.current.delete(key)
        failed(`启动知识库构建失败: ${e}`)
      }
    })

    // 知识库条目构建
    const buildKnowledgeEntry = useMemoizedFn(async (kb: KnowledgeBaseItem, history: any) => {
      const key = `entry:${history.token}`
      if (buildingSetRef.current.has(key)) return
      buildingSetRef.current.add(key)

      try {
        await BuildingKnowledgeBaseEntry({
          ...kb,
          ...history,
          streamToken: history.token,
        })
        if (!api?.createStream) return

        api.createStream(history.token, {
          taskName: 'debug-plugin',
          apiKey: 'DebugPlugin',
          token: history.token,
          onEnd: () => {
            api.removeStream?.(history.token)
            buildingSetRef.current.delete(key)
            success(history.name + '构建完成')

            editKnowledgeBase(kb.ID, {
              ...kb,
              streamstep: 'success',
              historyGenerateKnowledgeList: kb.historyGenerateKnowledgeList?.filter((it) => it.token !== history.token),
            })
          },
          onError: (e) => {
            buildingSetRef.current.delete(key)
            api.removeStream?.(history.token)
          },
        })
      } catch (e) {
        buildingSetRef.current.delete(key)
        failed(`启动知识库条目构建失败: ${e + ''}`)
      }
    })

    useAsyncEffect(async () => {
      if (!previousKnowledgeBases) return

      try {
        for (const kb of knowledgeBases) {
          const prev = previousKnowledgeBases.find((it) => it.ID === kb.ID)
          if (!prev) continue

          const added = extractAddedHistory(kb, prev)
          if (added) {
            await buildKnowledgeEntry(kb, added)
          }

          if (prev.streamToken !== undefined && kb.streamToken !== prev.streamToken) {
            const extractStreamItem = extractStreamTokenChangedItem(knowledgeBases, previousKnowledgeBases)
            await buildKnowledgeEntry(kb, {
              ...extractStreamItem,
              token: extractStreamItem.streamToken,
              name: extractStreamItem.KnowledgeBaseName,
            })
          }
        }
      } catch (error) {}
    }, [knowledgeBases, previousKnowledgeBases])

    //  新增 / 手动新增知识库
    useAsyncEffect(async () => {
      try {
        if (!previousKnowledgeBases) return

        const diff = compareKnowledgeBaseChange(previousKnowledgeBases, knowledgeBases)
        const manualAdd = findChangedObjects(previousKnowledgeBases, knowledgeBases)

        const kb = diff && typeof diff === 'object' && 'increase' in diff && diff.increase ? diff.increase : manualAdd
        if (!kb) return

        if (!kb.streamToken || !kb.KnowledgeBaseFile?.length) {
          editKnowledgeBase(kb.ID, { ...kb, streamstep: 'success' })
          return
        }

        await buildKnowledgeBase(kb)
      } catch (error) {
        failed(error + '')
      }
    }, [knowledgeBases, previousKnowledgeBases])

    useAsyncEffect(async () => {
      try {
        for (const kb of knowledgeBases) {
          if (kb.streamstep === 2 && kb.streamToken && !kb.disableERM) {
            await starKnowledgeeBaseEntry(kb)
          }
        }
      } catch (error) {
        failed(error + '')
      }
    }, [knowledgeBases])

    const starKnowledgeeBaseEntry = useMemoizedFn(async (updateItems: KnowledgeBaseItem) => {
      try {
        await BuildingKnowledgeBaseEntry(updateItems)
        if (api && typeof api.createStream === 'function') {
          api.createStream(updateItems.streamToken, {
            taskName: 'debug-plugin',
            apiKey: 'DebugPlugin',
            token: updateItems.streamToken,
            onEnd: () => {
              api.removeStream && api.removeStream(updateItems.streamToken)
              editKnowledgeBase(updateItems.ID, {
                ...updateItems,
                streamstep: 'success',
              })
            },
            onError: () => {
              try {
                editKnowledgeBase(updateItems.ID, {
                  ...updateItems,
                  streamstep: 'success',
                })
                api.removeStream && api.removeStream(updateItems.streamToken)
              } catch {}
            },
          })
        }
      } catch (e) {}
    })

    useImperativeHandle(ref, () => ({
      onOK,
    }))

    const [createVisible, setCreateVisible] = useSafeState(false)
    const [importVisible, setImportVisible] = useSafeState(false)
    const [form] = Form.useForm()

    const handleCreateKnowledgeBase = useMemoizedFn(() => {
      form.resetFields()
      setCreateVisible((preValue) => !preValue)
    })

    const generatreMention = useMemoizedFn(() => {
      const targetKnowledgeBase = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
      if (!targetKnowledgeBase) return

      requestAnimationFrame(() => {
        historyAIReActChatBridge.setMention({
          mentionId: targetKnowledgeBase.ID,
          mentionType: 'knowledgeBase',
          mentionName: targetKnowledgeBase.KnowledgeBaseName,
          lock: true,
        })
      })
    })

    const createNewEvents = useMemoizedFn((id: string) => {
      setKnowledgeBaseID(id)
      historyAIReActChatBridge.onNewChat()
    })

    useEffect(() => {
      if (!showFreeChat || !knowledgeBaseID) return
      generatreMention()
    }, [showFreeChat, knowledgeBaseID, historyAIReActChatBridge.activeID])

    useEffect(() => {
      if (inViewport) {
        queueMicrotask(() => {
          historyAIReActChatBridge.setValue('')
          generatreMention()
        })
      }
    }, [inViewport])

    const [refreshOlineRag, setRefreshOlineRag] = useSafeState(false)

    const refRef = useRef<HTMLDivElement>(null)
    const [run, setRun] = useSafeState(false)
    const [stepIndex, setStepIndex] = useSafeState(0)
    const [knowledgeBaseContentViewport = false] = useInViewport(refRef)
    const [joyrideStep, setJoyrideStep] = useSafeState({
      step: 1,
      visible: false,
    })

    const [spinning, setSpinning] = useSafeState(true)

    useEffect(() => {
      const timer = setTimeout(() => {
        setSpinning(false)
      }, 2000)

      return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
      getLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideVisible).then((res) => {
        if (knowledgeBaseContentViewport && inViewport && !res) {
          setJoyrideStep({ step: 1, visible: true })
        }
      })
    }, [knowledgeBaseContentViewport, inViewport])

    // Joyride 回调
    const handleJoyrideCallback = (data: CallBackProps) => {
      const { status, action, index, type } = data
      if (type === 'step:after') {
        setStepIndex(index + 1)
      }
      if (action === ACTIONS.CLOSE) {
        setRun(false)
        setStepIndex(0)
        setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideStep, true)
        return
      }

      if (status === STATUS.SKIPPED) {
        setRun(true)
        setStepIndex(0)
      }
      if (status === STATUS.READY || status === STATUS.FINISHED) {
        setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideStep, true)
        setRun(false)
        setStepIndex(0)
      }
    }

    useAsyncEffect(async () => {
      try {
        const visible = await getLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideVisible)
        const step = await getLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideStep)
        if (knowledgeBaseContentViewport && inViewport) {
          if (!visible && !step) {
            return setRun(false)
          } else if (visible && !step) {
            return setRun(true)
          } else {
            return setRun(false)
          }
        }
      } catch (error) {}
    }, [knowledgeBaseContentViewport, joyrideStep.visible, inViewport])

    const ResizeBoxProps = useCreation(() => {
      let p = {
        firstRatio: 'calc(100% - 462px)',
        secondRatio: '462px',
      }
      if (!showFreeChat) {
        p.secondRatio = '0%'
        p.firstRatio = '100%'
      }
      return p
    }, [showFreeChat])
    return (
      <div className={styles['knowledge-base-body']} ref={refRef}>
        <Joyride
          steps={joyrideSteps}
          run={run}
          continuous={true}
          disableCloseOnEsc={true}
          disableOverlayClose
          showSkipButton={false}
          showProgress={false}
          disableScrolling
          callback={handleJoyrideCallback}
          disableScrollParentFix={true}
          tooltipComponent={CustomJoyrideTooltip}
          stepIndex={stepIndex}
        />
        <KnowledgeBaseSidebar
          knowledgeBases={knowledgeBases}
          knowledgeBaseID={knowledgeBaseID}
          setKnowledgeBaseID={(id) => createNewEvents(id)}
          api={api}
          streams={streams}
          setOpenQA={setShowFreeChat}
          refreshAsync={refreshAsync}
          setAddMode={setAddMode}
          addMode={addMode}
          handleValidateAIModelUsable={handleValidateAIModelUsable}
          isAIModelAvailable={isAIModelAvailable}
          setIsAIModelAvailable={setIsAIModelAvailable}
          aIModelAvailableTokens={aIModelAvailableTokens}
          progress={progress}
          loading={loading}
          refreshOlineRag={refreshOlineRag}
          setRefreshOlineRag={setRefreshOlineRag}
          setJoyrideRun={setJoyrideStep}
        />

        <YakitResizeBox
          lineStyle={{
            backgroundColor: !!showFreeChat ? 'var(--Colors-Use-Neutral-Bg)' : 'none',
            display: !!showFreeChat ? '' : 'none',
          }}
          secondMinSize={!!showFreeChat ? 300 : 0}
          style={{ display: 'flex' }}
          lineDirection="left"
          secondNodeStyle={{
            width: showFreeChat ? '462px' : '0%',
            padding: '0',
          }}
          firstNode={
            knowledgeBaseID ? (
              <div className={styles['knowledge-base-table-container']}>
                <KnowledgeBaseContainer
                  knowledgeBases={knowledgeBases}
                  knowledgeBaseID={knowledgeBaseID}
                  setKnowledgeBaseID={(id) => createNewEvents(id)}
                  streams={streams}
                  api={api}
                  setOpenQA={setShowFreeChat}
                  addMode={addMode}
                  setRefreshOlineRag={setRefreshOlineRag}
                />
              </div>
            ) : (
              <div className={styles['knowledge-base-container-empty']}>
                <YakitEmpty />
                <div className={styles['empty-button']}>
                  <YakitButton
                    onClick={async () => {
                      try {
                        const result = await ThirdPartyBinaryRunAsync()
                        const targetInstallPlugins = reseultKnowledgePlugin(result)
                        targetInstallPlugins
                          ? InstallPluginModal({
                              getContainer: '#main-operator-page-body-ai-repository',
                              callback: () => {
                                refreshPluginStatus()
                              },
                            })
                          : handleCreateKnowledgeBase()
                      } catch (error) {}
                    }}
                  >
                    创建知识库
                  </YakitButton>
                  <YakitButton
                    type="outline2"
                    onClick={() => {
                      setImportVisible((prevalue) => !prevalue)
                    }}
                  >
                    导入知识库
                  </YakitButton>
                </div>
              </div>
            )
          }
          secondNode={
            showFreeChat
              ? renderHistoryAIReActChat({
                  className: styles['knowledge-base-ai-chat'],
                  title: 'AI 召回',
                  externalParameters: {
                    isOpen: false,
                    rightIcon: {
                      history: true,
                      dataDetails: { type: 'text2' },
                      add: (
                        <Tooltip title="新建会话">
                          <YakitButton
                            type="text2"
                            icon={<OutlineMessageCirclePlusIcon />}
                            onClick={() => historyAIReActChatBridge.onNewChat()}
                          />
                        </Tooltip>
                      ),
                      close: (
                        <YakitButton type="text2" icon={<OutlineXIcon />} onClick={() => setShowFreeChat(false)} />
                      ),
                      taskDetails: true,
                    },
                    filterMentionType: ['knowledgeBase'],
                    onAfterSubmit: generatreMention,
                  },
                })
              : null
          }
          {...ResizeBoxProps}
        />

        <KnowledgeBaseFormModal
          visible={createVisible}
          title="新增知识库"
          handOpenKnowledgeBasesModal={handleCreateKnowledgeBase}
          setKnowledgeBaseID={setKnowledgeBaseID}
          form={form}
          setAddMode={setAddMode}
        />
        <ImportModal visible={importVisible} onVisible={setImportVisible} setAddMode={setAddMode} />
        {streams[aIModelAvailableTokens] ? (
          <YakitModal
            getContainer={document.getElementById('repository-manage') || document.body}
            maskClosable={false}
            open={isAIModelAvailable}
            title="知识库可用诊断"
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <YakitButton
                  type="outline2"
                  colors="danger"
                  onClick={() => {
                    setIsAIModelAvailable(false)
                    api.removeStream && api.removeStream(aIModelAvailableTokens)
                    setProgress(100)
                  }}
                >
                  停止
                </YakitButton>
              </div>
            }
            width={'50%'}
            onCloseX={() => {
              if (progress === 100) {
                api.removeStream && api.removeStream(aIModelAvailableTokens)
              }
              setIsAIModelAvailable(false)
            }}
          >
            <Progress style={{ display: 'flex', gap: 8, alignItems: 'center' }} percent={progress} />
            <div className={styles['validate-ai-model-container']}>
              <PluginExecuteResult
                streamInfo={streams[aIModelAvailableTokens]}
                runtimeId={streams[aIModelAvailableTokens]?.runtimeId ?? ''}
                loading={streams[aIModelAvailableTokens]?.loading ?? false}
                defaultActiveKey={t('PluginExecResultDefaultTabs.log')}
              />
            </div>
          </YakitModal>
        ) : null}
        <YakitModal hiddenHeader footer={null} open={joyrideStep.visible} centered>
          <YakitSpin spinning={spinning}>
            <GuideFooter
              step={joyrideStep.step}
              onPrev={() => setJoyrideStep((s) => ({ ...s, step: s.step - 1 }))}
              onNext={() => setJoyrideStep((s) => ({ ...s, step: s.step + 1 }))}
              onFinish={() =>
                setJoyrideStep((s) => {
                  setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideVisible, true)
                  return { ...s, visible: false }
                })
              }
              stopList={stopList}
            />
          </YakitSpin>
        </YakitModal>
      </div>
    )
  },
)

const KnowledgeBaseContent = forwardRef<unknown, KnowledgeBaseContentProps>(function KnowledgeBaseContent(props, ref) {
  const resolveStartExtraParams = useMemoizedFn((_data: AIHandleStartParams) => ({
    chatId: props.knowledgeBaseID,
  }))

  const mergeRemoteAIAgentSetting = useMemoizedFn((cache: AIAgentSetting, prev: AIAgentSetting) => ({
    ...cache,
    TimelineSessionID: prev.TimelineSessionID,
  }))

  return (
    <HistoryAIReActChatProvider
      cacheDataStore={knowledgeBaseDataStore}
      focusModeLoop=""
      resolveStartExtraParams={resolveStartExtraParams}
      mergeRemoteAIAgentSetting={mergeRemoteAIAgentSetting}
    >
      <KnowledgeBaseContentInner ref={ref} {...props} />
    </HistoryAIReActChatProvider>
  )
})

export default memo(KnowledgeBaseContent)
