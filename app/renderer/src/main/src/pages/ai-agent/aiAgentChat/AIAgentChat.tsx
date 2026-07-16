import React, { memo, useEffect, useRef, useState } from 'react'
import { AIAgentChatMode, AIAgentChatProps, AIReActTaskChatReviewProps, HandleStartParams } from './type'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useSafeState, useUpdateEffect } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { AIAgentTriggerEventInfo } from '../aiAgentType'
import useAIAgentStore from '../useContext/useStore'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { isForcedSetAIModal } from '../aiModelList/utils'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import cloneDeep from 'lodash/cloneDeep'
import { AIReActChatReview } from '@/pages/ai-agent/components/aiReActChatReview/AIReActChatReview'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon } from '@/assets/icon/outline'
import { failed, yakitNotify } from '@/utils/notification'
import { AIForgeForm, AIToolForm } from '../aiTriageChatTemplate/AITriageChatTemplate'
import { grpcGetAIForge } from '../grpc'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { AIForge } from '../type/forge'
import { AITool } from '../type/aiTool'
import { AIChatContent } from '../aiChatContent/AIChatContent'
import { AITabsEnum, ReActChatEventEnum } from '../defaultConstant'
import { grpcGetAIToolById } from '../aiToolList/utils'
import { isEqual } from 'lodash'
import useMultipleHoldGRPCStream from '@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { YakitRoute } from '@/enums/yakitRoute'
import { apiCancelDebugPlugin } from '@/pages/plugins/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import styles from './AIAgentChat.module.scss'
import { AIChatContentRefProps } from '../aiChatContent/type'
import { PageNodeItemProps } from '@/store/pageInfo'
import { Trans } from 'react-i18next'
import { AIInputWithParamsTemplate, aiInputWithParamsTemplate } from '../components/aiMilkdownInput/utils'
import { useStore } from 'zustand'
import { AIForgeFormSubmitParamsProps } from '../aiTriageChatTemplate/type'
import { useCurrentMeta, useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'

const AIChatWelcome = React.lazy(() => import('../aiChatWelcome/AIChatWelcome'))

export const AIAgentChat: React.FC<AIAgentChatProps> = memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const { activeChat } = useAIAgentStore()
  const { setActiveChat, setSetting, onSend, onClose } = useAIAgentDispatcher()

  /** 当前对话唯一ID */
  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)

  const aiReActChatRef = useRef<AIChatContentRefProps>(null)
  const aiChatWelcomeRef = useRef<AIChatContentRefProps>(null)

  // 插件并发构建流 hooks
  const [streams, api] = useMultipleHoldGRPCStream()

  const [mode, setMode] = useState<AIAgentChatMode>('welcome')

  const handleStartTriageChat = useMemoizedFn((data: HandleStartParams) => {
    setMode('re-act')
    handleStart(data)
  })

  useEffect(() => {
    if (!!activeChat?.SessionID) {
      onSetReAct()
    }
  }, [activeChat?.SessionID])

  const onSetReAct = useMemoizedFn(() => {
    setMode('re-act')
    setTimeout(() => {
      emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Task_Content }))
    }, 100)
  })

  // review数据中树的数据中需要的解释和关键词工具
  // const [planReviewTreeKeywordsMap, { set: setPlanReviewTreeKeywords, reset: resetPlanReviewTreeKeywords }] = useMap<
  //   string,
  //   AIAgentGrpcApi.PlanReviewRequireExtra
  // >(new Map())

  // const [reviewInfo, setReviewInfo] = useState<AIChatQSData>()

  // @deprecated
  // const handleShowReview = useMemoizedFn((info: AIChatQSData) => {
  //   // setReviewExpand(true)
  //   setReviewInfo(cloneDeep(info))
  // })
  // @deprecated
  // const handleShowReviewExtra = useMemoizedFn((info: AIAgentGrpcApi.PlanReviewRequireExtra) => {
  //   setPlanReviewTreeKeywords(info.index, info)
  // })
  // @deprecated
  // const handleReleaseReview = useMemoizedFn((type: ChatIPCSendType, id: string) => {
  //   if (!reviewInfo) return
  //   if ((reviewInfo.data as AIReviewType).id === id) {
  //     // if (!delayLoading) yakitNotify("warning", "审阅自动执行，弹框将自动关闭")
  //     handleStopAfterChangeState()
  //   }
  // })

  // @deprecated 提问结束后缓存数据
  // const handleChatingEnd = useMemoizedFn(() => {
  //   handleStopAfterChangeState()
  // })

  // @deprecated
  // const setSessionChatName = (session: string, name: string) => {
  //   setActiveChat?.((prev) => {
  //     if (!prev) return prev
  //     if (prev.SessionID !== session) return prev
  //     return { ...prev, Title: name }
  //   })
  //   emiter.emit(
  //     'sessionData',
  //     JSON.stringify({
  //       type: 'updateSession',
  //       sessionId: session,
  //       updates: { Title: name },
  //     }),
  //   )
  // }

  // @deprecated
  // const [syncIdInfoMap, { set: setSyncIdInfoMap, get: getSyncIdInfoMap, remove: removeSyncIdInfoMap }] = useMap<
  //   string,
  //   boolean
  // >(new Map())

  // @deprecated
  // const onSyncIDChange = useMemoizedFn((syncID: string) => {
  //   const item = getSyncIdInfoMap(syncID)
  //   if (!!item) {
  //     removeSyncIdInfoMap(syncID)
  //   }
  // })

  /** 等自由对话渲染出来再发送 */
  const handleStart = useMemoizedFn((value: HandleStartParams) => {
    setTimeout(() => {
      aiReActChatRef.current?.handleStart(value)
    })
  })
  // @deprecated
  // const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
  //   handleSendInteractiveMessage(params, 'casual')
  // })
  // @deprecated
  // const handleSendTask = useMemoizedFn((params: AIChatIPCSendParams) => {
  //   handleSendInteractiveMessage(params, 'task')
  // })
  // @deprecated
  // const handleSend = useMemoizedFn((params: AIChatIPCSendParams) => {
  //   handleSendInteractiveMessage(params, '')
  // })
  // /**发送 @deprecated IsInteractiveMessage 消息 */
  // const handleSendInteractiveMessage = useMemoizedFn((params: AIChatIPCSendParams, type: ChatIPCSendType) => {
  //   const { value, id, optionValue } = params
  //   if (!sessionId) return
  //   if (!id) return

  //   const info: AIInputEvent = {
  //     IsInteractiveMessage: true,
  //     InteractiveId: id,
  //     InteractiveJSONInput: value,
  //   }
  //   onSend({ token: sessionId, type, params: info, optionValue })
  //   handleStopAfterChangeState()
  // })
  // /** @deprecated 发送 IsSyncMessage 消息 */
  // const handleSendSyncMessage = useMemoizedFn((data: AISendSyncMessageParams) => {
  //   if (!sessionId) return
  //   const { syncType, SyncJsonInput, params, syncID } = data
  //   const info: AIInputEvent = {
  //     IsSyncMessage: true,
  //     SyncType: syncType,
  //     SyncJsonInput,
  //     Params: params,
  //     SyncID: syncID || randomString(8),
  //   }
  //   info.SyncID && setSyncIdInfoMap(info.SyncID, true)
  //   onSend({ token: sessionId, type: '', params: info })
  // })

  // /**
  //  * @deprecated 发送 IsConfigHotpatch 消息 */
  // const handleSendConfigHotpatch = useMemoizedFn((data: AISendConfigHotpatchParams) => {
  //   if (!sessionId) return
  //   const { hotpatchType, params, taskId } = data
  //   const info: AIInputEvent = {
  //     IsConfigHotpatch: true,
  //     HotpatchType: hotpatchType,
  //     Params: params,
  //   }
  //   if (!!taskId) {
  //     info.TaskId = taskId
  //   }
  //   onSend({ token: sessionId, type: '', params: info })
  // })

  const onStop = useMemoizedFn(() => {
    if (execute && sessionId) {
      onClose([sessionId])
    }
  })
  /** @deprecated 停止回答后的状态调整||清空Review状态 */
  // const handleStopAfterChangeState = useMemoizedFn(() => {
  //   // 清空review信息
  //   setReviewInfo(undefined)
  //   resetPlanReviewTreeKeywords()
  //   // setReviewExpand(true)
  // })

  useEffect(() => {
    getRemoteValue(RemoteAIAgentGV.AIAgentReplaceForgeNoPrompt)
      .then((res) => {
        const replace = res === 'true'
        replaceForgeNoPromptCache.current = replace
        setReplaceForgeNoPrompt(replace)
      })
      .catch(() => {})
    getRemoteValue(RemoteAIAgentGV.AIAgentReplaceToolNoPrompt)
      .then((res) => {
        const replace = res === 'true'
        replaceToolNoPromptCache.current = replace
        setReplaceToolNoPrompt(replace)
      })
      .catch(() => {})
    // ai-re-act 页面左侧侧边栏向 chatUI 发送的事件
    const onEvents = (res: string) => {
      try {
        const data = JSON.parse(res) as AIAgentTriggerEventInfo
        if (!data.type) return
        switch (data.type as ReActChatEventEnum) {
          // 新开聊天对话窗
          case ReActChatEventEnum.NEW_CHAT:
            setSetting?.((old) => ({
              ...old,
              SyncPerceptionTrigger: false,
              EnablePlan: false,
              Strategy: { EnableMultiAgent: false, EnableGoalMode: false, GoalMinIterations: 0 },
            }))
            setActiveChat?.(undefined)
            setTimeout(() => {
              setMode('welcome')
            }, 100)
            break
          // 替换当前使用的 forge 模板
          case ReActChatEventEnum.OPEN_FORGE_FORM:
            const { value: forgeValue } = data.params || {}
            handleClearActiveTool()
            handleTriggerExecForge(forgeValue, data.useForge)
            break
          // 替换当前使用的 ai tool
          case ReActChatEventEnum.USE_AI_TOOL:
            const { value: toolValue } = data.params || {}
            handleClearActiveForge()
            handleAITool(toolValue)
            break

          default:
            break
        }
      } catch (error) {}
    }
    emiter.on('onReActChatEvent', onEvents)
    return () => {
      emiter.off('onReActChatEvent', onEvents)
    }
  }, [])

  useUpdateEffect(() => {
    onHistoryAfter()
  }, [activeChat?.SessionID])

  /** 切换历史后的处理逻辑
   *  切换历史后，如果选中的会话没有建立链接，需要启动grpc链接
   */
  const onHistoryAfter = useMemoizedFn(() => {
    if (mode === 'welcome') {
      setMode('re-act')
      if (!execute) {
        handleStart({
          qs: '',
        })
      }
    } else {
      if (!execute) {
        aiReActChatRef.current?.handleStart({
          qs: '',
        })
      }
    }
  })

  //#region 使用 AI-Forge 模板/Tool 相关逻辑
  const [activeTool, setActiveTool] = useState<AITool>()
  const [replaceToolShow, setReplaceToolShow] = useState<boolean>(false)
  // 是否直接替换当前使用的tool，而不出现二次确认框
  const [replaceToolNoPrompt, setReplaceToolNoPrompt] = useState(false)

  const [activeForge, setActiveForge] = useState<AIForge>()
  const [replaceShow, setReplaceShow] = useState<boolean>(false)
  // 是否直接替换当前使用的forge模板，而不出现二次确认框
  const [replaceForgeNoPrompt, setReplaceForgeNoPrompt] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(wrapperRef)
  const replaceForge = useRef<AIForge>()
  const replaceTool = useRef<AITool>()
  // 储存 replaceForgeNoPrompt 存放到缓存里值，阻止多次设置重复值
  const replaceForgeNoPromptCache = useRef(false)
  // 储存 replaceToolNoPrompt 存放到缓存里值，阻止多次设置重复值
  const replaceToolNoPromptCache = useRef(false)

  /** 从别的元素上触发使用 forge 模板的功能 */
  const handleTriggerExecForge = useMemoizedFn((forge: AIForge, useForge?: boolean) => {
    if (!forge || !forge.Id) {
      yakitNotify('error', t('AIAgentChat.templateDataError'))
      return
    }
    if (!execute) {
      handleReplaceActiveForge(forge, useForge)
    } else {
      const m = YakitModalConfirm({
        title: (modalT) => modalT('AIAgentChat.switchForgeTemplate'),
        width: 420,
        footer: undefined,
        footerStyle: { padding: '0 24px 24px' },
        content: (modalT) => (
          <div className={styles['forge-modal-content']}>
            <Trans
              i18nKey="AIAgentChat.interruptConfirm"
              ns="aiAgent"
              components={{
                code: <b></b>,
              }}
            />
            <b>
              {forge.ForgeVerboseName}({forge.ForgeName})
            </b>
            {modalT('AIAgentChat.forgeTemplate')}
          </div>
        ),
        onOk: () => {
          m.destroy()
          onStop()
          handleReplaceActiveForge(forge, useForge)
        },
        onCancel: () => {
          m.destroy()
        },
      })
    }
  })

  const handleAITool = useMemoizedFn((toolValue: AITool) => {
    if (!toolValue || !toolValue.ID) {
      yakitNotify('error', t('AIAgentChat.templateDataError'))
      return
    }
    if (!execute) {
      handleReplaceActiveTool(toolValue.ID)
    } else {
      const m = YakitModalConfirm({
        title: (modalT) => modalT('AIAgentChat.executeTool'),
        width: 420,
        footer: undefined,
        footerStyle: { padding: '0 24px 24px' },
        content: (modalT) => (
          <div className={styles['forge-modal-content']}>
            {!!execute ? (
              <>
                <Trans
                  i18nKey="AIAgentChat.interruptConfirm"
                  ns="aiAgent"
                  components={{
                    code: <b></b>,
                  }}
                />
                <b>
                  {toolValue.VerboseName}({toolValue.Name})
                </b>
                {modalT('AIAgentChat.forgeTemplate')}
              </>
            ) : (
              <>
                {modalT('AIAgentChat.confirmExecute')}
                {toolValue.VerboseName}({toolValue.Name}){modalT('AIAgentChat.toolSuffix')}
              </>
            )}
          </div>
        ),
        onOk: () => {
          m.destroy()
          onStop()
          handleReplaceActiveTool(toolValue.ID)
        },
        onCancel: () => {
          m.destroy()
        },
      })
    }
  })

  const handleClearActiveForge = useMemoizedFn(() => {
    setActiveForge(undefined)
  })

  const handleClearActiveTool = useMemoizedFn(() => {
    setActiveTool(undefined)
  })

  const handleSubmitForge = useMemoizedFn((data: AIForgeFormSubmitParamsProps) => {
    const { request, formValue } = data
    setMode('re-act')
    const description = `${t('AIAgentChat.useForgeTask', { name: request.ForgeName || '' })}${!!formValue ? t('AIAgentChat.params') : ''}`

    const params: AIInputWithParamsTemplate = {
      description,
      param: formValue ?? {},
    }
    const qs = aiInputWithParamsTemplate(params)
    handleStart({
      qs,
    })
    handleClearActiveForge()
  })

  const handleSubmitTool = useMemoizedFn((question: string) => {
    if (!activeTool) {
      yakitNotify('warning', t('AIAgentChat.toolInfoError'))
      return
    }
    setMode('re-act')
    const qs = `${t('AIAgentChat.useToolTask', {
      name: `${activeTool.VerboseName || activeTool.Name}`,
    })}${question ? `${t('AIAgentChat.input')}${question}` : ''}`
    handleStart({
      qs,
    })
    handleClearActiveTool()
  })

  const handleReplaceActiveForge = useMemoizedFn(async (forge: AIForge, useForge?: boolean) => {
    try {
      const forgeID = Number(forge.Id) || 0
      if (!forgeID) {
        yakitNotify('error', t('AIAgentChat.templateErrorWithId', { id: forgeID }))
        return
      }
      let forgeInfo = cloneDeep(forge)
      if (!useForge) {
        let res = await grpcGetAIForge({ ID: forgeID })
        forgeInfo = cloneDeep(res)
      }
      if (!activeForge) setActiveForge(forgeInfo)
      else {
        if (forgeInfo.Id === activeForge.Id) {
          // 同一个forge模板, 检查名字和参数是否一至
          let isReplace = false
          isReplace = forgeInfo.ForgeName !== activeForge.ForgeName
          isReplace = !isEqual(forgeInfo.ParamsUIConfig, activeForge.ParamsUIConfig)
          if (isReplace) setActiveForge(forgeInfo)
        } else {
          // 不同forge模板，弹出提示框是否替换
          if (replaceForgeNoPrompt) {
            setActiveForge({ ...forgeInfo })
          } else {
            replaceForge.current = { ...forgeInfo }
            if (!replaceForgeNoPromptCache.current) setReplaceShow(true)
          }
        }
      }
    } catch (error) {}
  })
  const handleReplaceActiveTool = useMemoizedFn((id: number) => {
    const toolId = Number(id) || 0
    if (!toolId) {
      yakitNotify('error', t('AIAgentChat.toolErrorWithId', { id }))
      return
    }

    grpcGetAIToolById(toolId)
      .then((res) => {
        if (!res) return
        const toolInfo = cloneDeep(res)
        if (!activeTool) setActiveTool(toolInfo)
        else if (replaceToolNoPrompt) {
          setActiveTool(toolInfo)
        } else {
          replaceTool.current = { ...toolInfo }
          if (!replaceToolNoPromptCache.current) setReplaceToolShow(true)
        }
      })
      .catch(() => {})
  })
  const handleSetReplaceToolNoPrompt = useMemoizedFn(() => {
    if (replaceToolNoPrompt && !replaceToolNoPromptCache.current) {
      replaceToolNoPromptCache.current = true
      setRemoteValue(RemoteAIAgentGV.AIAgentReplaceToolNoPrompt, 'true')
    }
  })

  const handleSetReplaceForgeNoPrompt = useMemoizedFn(() => {
    if (replaceForgeNoPrompt && !replaceForgeNoPromptCache.current) {
      replaceForgeNoPromptCache.current = true
      setRemoteValue(RemoteAIAgentGV.AIAgentReplaceForgeNoPrompt, 'true')
    }
  })
  const handleReplaceOK = useMemoizedFn(() => {
    setActiveForge(cloneDeep(replaceForge.current))
    handleSetReplaceForgeNoPrompt()
    handleReplaceCancel()
  })
  const handleReplaceToolOK = useMemoizedFn(() => {
    setActiveTool(cloneDeep(replaceTool.current))
    handleSetReplaceToolNoPrompt()
    handleReplaceToolCancel()
  })
  const handleReplaceCancel = useMemoizedFn(() => {
    replaceForge.current = undefined
    setReplaceShow(false)
  })
  const handleReplaceToolCancel = useMemoizedFn(() => {
    replaceTool.current = undefined
    setReplaceToolShow(false)
  })
  // #endregion

  const [visible, setVisible] = useSafeState(false)
  const { clearAll } = useKnowledgeBase()

  const onClosePageRepository = useMemoizedFn(() => {
    if (api.tokens.length > 0) {
      setVisible(true)
      return
    } else {
      clearAll()
      emiter.emit('closePage', JSON.stringify({ route: YakitRoute.AI_Agent }))
    }
  })

  useEffect(() => {
    emiter.on('onClosePageRepository', onClosePageRepository)
    return () => {
      emiter.off('onClosePageRepository', onClosePageRepository)
    }
  }, [])

  const onOK = async () => {
    try {
      await Promise.all(api.tokens.map((token) => apiCancelDebugPlugin(token)))
      api.clearAllStreams()
      clearAll()
      emiter.emit('closePage', JSON.stringify({ route: YakitRoute.AI_Agent }))
    } catch (e) {
      failed(t('AIAgentChat.cancelBuildPluginFailed', { error: e + '' }))
    }
  }

  const onCancel = () => {
    setVisible(false)
  }

  const onChat = useMemoizedFn(() => {
    onSetReAct()
  })
  const onChatFromHistory = useMemoizedFn((session: string) => {})

  useEffect(() => {
    emiter.on('defualtAIMentionCommandParams', konwledgeInputStringFn)
    return () => {
      emiter.off('defualtAIMentionCommandParams', konwledgeInputStringFn)
    }
  }, [])

  const konwledgeInputStringFn = useMemoizedFn((params: string) => {
    const currentRef = mode === 'welcome' ? aiChatWelcomeRef : aiReActChatRef
    try {
      const data: PageNodeItemProps['pageParamsInfo']['AIRepository'] = JSON.parse(params)

      if (data?.defualtAIMentionCommandParams && Array.isArray(data.defualtAIMentionCommandParams)) {
        data.defualtAIMentionCommandParams.forEach((item) => {
          currentRef.current?.setValue('')
          currentRef.current?.setMention?.({
            mentionId: item.mentionId,
            mentionType: item.mentionType,
            mentionName: item.mentionName,
          })
        })
      }
    } catch (error) {}
  })

  useEffect(() => {
    if (inViewPort) {
      getAIModelListOption()
    }
  }, [inViewPort])

  const getAIModelListOption = useDebounceFn(
    () => {
      isForcedSetAIModal({
        t,
        pageKey: 'ai-agent',
        mountContainer: document.getElementById('main-operator-page-body-ai-agent'),
        isOpen: true,
      })
    },
    { leading: true },
  ).run

  return (
    <div ref={wrapperRef} className={styles['ai-agent-chat']}>
      <div className={styles['chat-wrapper']}>
        {mode === 'welcome' ? (
          <React.Suspense fallback={<div>loading...</div>}>
            <AIChatWelcome
              onTriageSubmit={handleStartTriageChat}
              onSetReAct={onSetReAct}
              api={api}
              streams={streams}
              ref={aiChatWelcomeRef}
            />
          </React.Suspense>
        ) : (
          <AIChatContent ref={aiReActChatRef} onChat={onChat} onChatFromHistory={onChatFromHistory} />
        )}
        <div className={styles['footer-forge-form']}>
          {activeForge && (
            <AIForgeForm
              wrapperRef={wrapperRef}
              info={activeForge}
              onBack={handleClearActiveForge}
              onSubmit={handleSubmitForge}
            />
          )}
          {activeTool && (
            <AIToolForm
              wrapperRef={wrapperRef}
              info={activeTool}
              onBack={handleClearActiveTool}
              onSubmit={handleSubmitTool}
            />
          )}
        </div>
      </div>
      <YakitHint
        getContainer={wrapperRef.current || undefined}
        visible={replaceShow}
        title={t('AIAgentChat.warning')}
        content={t('AIAgentChat.replaceSkillTemplateConfirm')}
        footerExtra={
          <YakitCheckbox checked={replaceForgeNoPrompt} onChange={(e) => setReplaceForgeNoPrompt(e.target.checked)}>
            {t('YakitModal.doNotRemindAgain')}
          </YakitCheckbox>
        }
        okButtonText={t('YakitButton.replace')}
        onOk={handleReplaceOK}
        cancelButtonText={t('YakitButton.cancel')}
        onCancel={handleReplaceCancel}
      />
      <YakitHint
        getContainer={wrapperRef.current || undefined}
        visible={replaceToolShow}
        title={t('AIAgentChat.warning')}
        content={t('AIAgentChat.replaceToolConfirm')}
        footerExtra={
          <YakitCheckbox checked={replaceToolNoPrompt} onChange={(e) => setReplaceToolNoPrompt(e.target.checked)}>
            {t('YakitModal.doNotRemindAgain')}
          </YakitCheckbox>
        }
        okButtonText={t('YakitButton.replace')}
        onOk={handleReplaceToolOK}
        cancelButtonText={t('YakitButton.cancel')}
        onCancel={handleReplaceToolCancel}
      />
      <YakitHint
        visible={visible}
        // heardIcon={<OutlineLoadingIcon className={styles["icon-rotate-animation"]} />}
        title={t('AIAgentChat.knowledgeNotBuiltTitle')}
        content={t('AIAgentChat.knowledgeNotBuiltDesc')}
        okButtonText={t('YakitButton.closeNow')}
        onOk={() => onOK?.()}
        cancelButtonText={t('YakitButton.remindMeLater')}
        onCancel={onCancel}
      />
    </div>
  )
})

export const AIReActTaskChatReview: React.FC<AIReActTaskChatReviewProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { footerExtra } = props
  const [expand, setReviewExpand] = useState<boolean>(true)

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const meta = useCurrentMeta()
  const currentPlanReviewToken = useStore(store, (state) => state.currentPlanReviewToken)
  const currentPlanReviewExtraUpdate = useStore(store, (state) => state.currentPlanReviewExtraUpdate)

  const reviewInfo = useCreation(() => {
    return rawData.contents.get(currentPlanReviewToken.token)
  }, [currentPlanReviewToken.renderNum])

  const planReviewTreeKeywordsMap = useCreation(() => {
    return meta.planReviewExtraData
  }, [currentPlanReviewExtraUpdate])

  const handleExpand = useMemoizedFn(() => {
    setReviewExpand((old) => !old)
  })
  const renderFooter = useMemoizedFn((node) => {
    return (
      <div className={styles['review-footer-box']}>
        <YakitButton
          type="text2"
          icon={expand ? <OutlineChevrondoubledownIcon /> : <OutlineChevrondoubleupIcon />}
          onClick={handleExpand}
        >
          {expand ? t('AIReActTaskChatReview.hideReview') : t('AIReActTaskChatReview.expandReview')}
        </YakitButton>
        <div className={styles['review-footer-extra']}>{footerExtra(node)}</div>
      </div>
    )
  })
  if (!reviewInfo) return null
  return (
    <div className={styles['review-box']}>
      <div
        className={classNames(styles['review-border-shadow'], {
          [styles['review-mini']]: !expand,
        })}
      >
        <div className={styles['review-wrapper']}>
          <AIReActChatReview
            chatType="task"
            info={reviewInfo}
            planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
            renderFooterExtra={renderFooter}
            expand={expand}
            className={styles['review-body']}
            renderNum={currentPlanReviewToken.renderNum}
          />
        </div>
      </div>
    </div>
  )
})
