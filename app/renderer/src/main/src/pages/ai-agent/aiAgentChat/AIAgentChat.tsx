import React, { memo, useEffect, useRef, useState } from 'react'
import type { AIAgentChatMode, AIAgentChatProps, AIReActTaskChatReviewProps, HandleStartParams } from './type'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useSafeState } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import type { AIAgentTriggerEventInfo } from '../aiAgentType'
import useAIAgentStore from '../useContext/useStore'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { isForcedSetAIModal } from '../aiModelList/utils'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import cloneDeep from 'lodash/cloneDeep'
import { AIReActChatReview } from '@/pages/ai-agent/components/aiReActChatReview/AIReActChatReview'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ChevronDoubleDownOutlined, ChevronDoubleUpOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { failed, yakitNotify } from '@/utils/notification'
import { grpcGetAIForge } from '../grpc'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import type { AIForge } from '../type/forge'
import type { AITool } from '../type/aiTool'
import { AIAgentSettingDefault, ReActChatEventEnum } from '../defaultConstant'
import { grpcGetAIToolById } from '../aiToolList/utils'
import { isEqual } from 'lodash'
import useMultipleHoldGRPCStream from '@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { YakitRoute } from '@/enums/yakitRoute'
import { apiCancelDebugPlugin } from '@/pages/plugins/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import styles from './AIAgentChat.module.scss'
import type { AIChatContentRefProps } from '../aiChatContent/type'
import { usePageInfo, type PageNodeItemProps } from '@/store/pageInfo'
import { Trans } from 'react-i18next'
import { type AIInputWithParamsTemplate, aiInputWithParamsTemplate } from '../components/aiMilkdownInput/utils'
import { useStore } from 'zustand'
import type { AIForgeFormSubmitParamsProps } from '../aiTriageChatTemplate/type'
import { useCurrentMeta, useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { onReStart } from '../utils'
import { AIAgentChatLayout } from './AIAgentChatLayout/AIAgentChatLayout'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { getMainOperatorPageBodyContainer } from '@/utils/getMainOperatorPageBodyContainer'
import { isEventForPage, takePendingOpenForge } from '../historyChat/HistoryChat'

export const AIAgentChat: React.FC<AIAgentChatProps> = memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const { activeChat, pageId } = useAIAgentStore()
  const { setActiveChat, setSetting, onStart, onClose } = useAIAgentDispatcher()

  /** 当前对话唯一ID */
  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)

  const aiReActChatRef = useRef<AIChatContentRefProps>(null)
  const aiChatWelcomeRef = useRef<AIChatContentRefProps>(null)

  // 插件并发构建流 hooks
  const [, api] = useMultipleHoldGRPCStream()

  const [mode, setMode] = useState<AIAgentChatMode>('welcome')

  useEffect(() => {
    if (activeChat?.SessionID) {
      onSetReAct()
      onReStart({ activeChat, onStart })
    }
  }, [activeChat?.SessionID])

  const onSetReAct = useMemoizedFn(() => {
    setMode('re-act')
  })
  /** 等自由对话渲染出来再发送；建联被拒时回到欢迎页，避免空白会话 */
  const handleStart = useMemoizedFn((value: HandleStartParams) => {
    if (!globalSessionEngine.canStartExecutingSession(sessionId, true)) return false
    setMode('re-act')
    setTimeout(() => {
      if (!globalSessionEngine.canStartExecutingSession(sessionId, true)) {
        if (!activeChat?.SessionID) setMode('welcome')
        return
      }
      aiReActChatRef.current?.handleStart(value)
    })
    return true
  })
  const handleStartTriageChat = useMemoizedFn((data: HandleStartParams) => {
    handleStart(data)
  })

  const onStop = useMemoizedFn(() => {
    if (execute && sessionId) {
      onClose([sessionId])
    }
  })

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
  }, [])

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

  useEffect(() => {
    if (!inViewPort) return
    // ai-re-act 页面左侧侧边栏向 chatUI 发送的事件
    emiter.on('onReActChatEvent', onEvents)
    return () => {
      emiter.off('onReActChatEvent', onEvents)
    }
  }, [inViewPort])

  const onEvents = useMemoizedFn((res) => {
    try {
      const data = JSON.parse(res) as AIAgentTriggerEventInfo
      if (!data.type) return
      if (!isEventForPage(data, pageId)) return
      switch (data.type as ReActChatEventEnum) {
        // 新开聊天对话窗
        case ReActChatEventEnum.NEW_CHAT:
          setSetting?.((old) => ({
            ...old,
            SyncPerceptionTrigger: false,
            EnablePlan: false,
            DisableMemoryTriage: AIAgentSettingDefault.DisableMemoryTriage,
            Strategy: {
              EnableMultiAgent: false,
              EnableGoalMode: false,
              GoalMinIterations: AIAgentSettingDefault.Strategy?.GoalMinIterations,
              MaxSubAgents: AIAgentSettingDefault.Strategy?.MaxSubAgents,
            },
          }))
          setActiveChat?.(undefined)
          setMode('welcome')
          break
        // 替换当前使用的 forge 模板
        case ReActChatEventEnum.OPEN_FORGE_FORM:
          {
            const { value: forgeValue } = data.params || {}
            handleClearActiveTool()
            handleTriggerExecForge(forgeValue, data.useForge)
          }
          break
        // 替换当前使用的 ai tool
        case ReActChatEventEnum.USE_AI_TOOL:
          {
            const { value: toolValue } = data.params || {}
            handleClearActiveForge()
            handleAITool(toolValue)
          }
          break

        default:
          break
      }
    } catch (error) {}
  })

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

  useEffect(() => {
    // StrictMode 双 mount：延后 take，cleanup 清掉定时器，避免第一次就吃掉 pending
    const timer = window.setTimeout(() => {
      const pending = takePendingOpenForge()
      if (pending) handleTriggerExecForge(pending.forge, pending.useForge)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

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
            {execute ? (
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
    const description = `${t('AIAgentChat.useForgeTask', { name: request.ForgeName || '' })}${
      formValue ? t('AIAgentChat.params') : ''
    }`

    const params: AIInputWithParamsTemplate = {
      description,
      param: formValue ?? {},
    }
    const qs = aiInputWithParamsTemplate(params)
    if (!handleStart({ qs })) return
    handleClearActiveForge()
  })

  const handleSubmitTool = useMemoizedFn((question: string) => {
    if (!activeTool) {
      yakitNotify('warning', t('AIAgentChat.toolInfoError'))
      return
    }
    const qs = `${t('AIAgentChat.useToolTask', {
      name: `${activeTool.VerboseName || activeTool.Name}`,
    })}${question ? `${t('AIAgentChat.input')}${question}` : ''}`
    if (!handleStart({ qs })) return
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
        const res = await grpcGetAIForge({ ID: forgeID })
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

  const closeThisTab = useMemoizedFn(() => {
    emiter.emit('closePage', JSON.stringify({ route: YakitRoute.AI_Agent, routeKey: pageId || YakitRoute.AI_Agent }))
  })

  const closePage = useMemoizedFn(() => {
    if (api.tokens.length > 0) {
      setVisible(true)
      return
    }
    clearAll()
    closeThisTab()
  })

  const onClosePageRepository = useMemoizedFn((routeKey?: string) => {
    if (routeKey && pageId && routeKey !== pageId) return
    const ownerPageId = pageId || YakitRoute.AI_Agent
    if (globalSessionEngine.hasWorkingSessionOnPage(YakitRoute.AI_Agent, ownerPageId)) {
      const m = YakitModalConfirm({
        width: 420,
        content: t('AIAgentChat.closeStopsRunningSession'),
        showConfirmLoading: true,
        onOk: async () => {
          // 先停会话再关 Tab：等收尾（引擎 end 回执通常 ~1s）；超时关页不影响正确性——
          // 冻结已同步生效、剩余收尾转后台、重开有 whenSessionClosed 兜底
          await Promise.race([
            globalSessionEngine.onPageUnload(YakitRoute.AI_Agent, ownerPageId),
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ])
          m.destroy()
          closePage()
        },
        onCancel: () => {
          m.destroy()
        },
      })
      return
    }
    closePage()
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
      closeThisTab()
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

  useEffect(() => {
    emiter.on('defualtAIMentionCommandParams', konwledgeInputStringFn)
    return () => {
      emiter.off('defualtAIMentionCommandParams', konwledgeInputStringFn)
    }
  }, [])

  const konwledgeInputStringFn = useMemoizedFn((params: string) => {
    const currentRef = mode === 'welcome' ? aiChatWelcomeRef : aiReActChatRef
    try {
      const data: PageNodeItemProps['pageParamsInfo']['AIRepository'] & { pageId?: string } = JSON.parse(params)
      if (!isEventForPage(data, pageId)) return
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
    if (!pageId) return
    const initialAIRepository = usePageInfo.getState().queryPagesDataById(YakitRoute.AI_Agent, pageId)
      ?.pageParamsInfo.AIRepository
    if (!initialAIRepository) return
    // 欢迎页是 lazy 组件，等输入框 ref 挂上再注入；cleanup 清定时器，StrictMode 不会双注入
    let tries = 0
    const timer = window.setInterval(() => {
      const currentRef = mode === 'welcome' ? aiChatWelcomeRef : aiReActChatRef
      if (!currentRef.current && ++tries < 60) return
      window.clearInterval(timer)
      konwledgeInputStringFn(JSON.stringify({ ...initialAIRepository, pageId }))
    }, 50)
    return () => window.clearInterval(timer)
  }, [])

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
        mountContainer: getMainOperatorPageBodyContainer(),
        isOpen: true,
      })
    },
    { leading: true },
  ).run

  return (
    <div ref={wrapperRef} className={styles['ai-agent-chat']}>
      <AIAgentChatLayout
        mode={mode}
        onTriageSubmit={handleStartTriageChat}
        onSetReAct={onSetReAct}
        aiChatWelcomeRef={aiChatWelcomeRef}
        aiReActChatRef={aiReActChatRef}
        onChat={onChat}
        wrapperRef={wrapperRef}
        activeForge={activeForge}
        activeTool={activeTool}
        onClearActiveForge={handleClearActiveForge}
        onSubmitForge={handleSubmitForge}
        onClearActiveTool={handleClearActiveTool}
        onSubmitTool={handleSubmitTool}
      />
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
  const currentReviewDetailRenderNum = useStore(store, (state) => state.currentReviewDetail?.renderNum)
  const currentReviewDetailToken = useStore(store, (state) => state.currentReviewDetail?.token)
  const currentPlanReviewExtraUpdate = useStore(store, (state) => state.currentPlanReviewExtraUpdate)

  const reviewInfo = useCreation(() => {
    return rawData.contents.get(currentReviewDetailToken)
  }, [currentReviewDetailToken, currentReviewDetailRenderNum])

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
          icon={
            expand ? (
              <ChevronDoubleDownOutlined color="currentColor" />
            ) : (
              <ChevronDoubleUpOutlined color="currentColor" />
            )
          }
          onClick={handleExpand}
        >
          {expand ? t('AIReActTaskChatReview.hideReview') : t('AIReActTaskChatReview.expandReview')}
        </YakitButton>
        <div className={styles['review-footer-extra']}>{footerExtra ? footerExtra(node) : node}</div>
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
            chatType={reviewInfo.chatType}
            info={reviewInfo}
            planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
            renderFooterExtra={renderFooter}
            expand={expand}
            className={styles['review-body']}
            renderNum={currentReviewDetailRenderNum}
          />
        </div>
      </div>
    </div>
  )
})
