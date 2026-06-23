import { FC, memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import ChatCard from './ChatCard'
import styles from './ToolInvokerCard.module.scss'
import classNames from 'classnames'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { grpcQueryAIToolDetails } from '../grpc'
import {
  AIChatQSData,
  AIChatQSDataTypeEnum,
  AIToolResult,
  AIYakExecFileRecord,
  ChatListRenderType,
  ReActChatBaseInfo,
} from '@/pages/ai-re-act/hooks/aiRender'
import FileList from './FileList'
import type { ModalInfoProps } from './ModelInfo'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../defaultConstant'
import { useClickAway, useCreation, useMemoizedFn } from 'ahooks'
import { AIAgentGrpcApi, AIEventQueryRequest } from '@/pages/ai-re-act/hooks/grpcApi'
import { isToolStdoutStream } from '@/pages/ai-re-act/hooks/utils'
import {
  OutlineArrownarrowrightIcon,
  OutlineChevronsDownUpIcon,
  OutlineChevronsUpDownIcon,
  OutlineClockIcon,
  OutlineDocumentduplicateIcon,
  OutlineRefreshIcon,
  OutlineWrenchIcon1,
} from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Divider, Tooltip } from 'antd'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { formatTimestamp } from '@/utils/timeUtil'
import { OperationCardFooter, OperationCardFooterProps } from './OperationCardFooter/OperationCardFooter'
import useChatIPCDispatcher from '../useContext/ChatIPCContent/useDispatcher'
import useAIAgentStore from '../useContext/useStore'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AIChatIPCSendParams } from '../useContext/ChatIPCContent/ChatIPCContent'
import { AIReferenceNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { useStreamingChatContent } from './aiChatListItem/StreamingChatContent/hooks/useStreamingChatContent'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { isAuxOrChildWindow } from '@/utils/isAuxOrChildWindow'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { setClipboardText } from '@/utils/clipboard'
import { success } from '@/utils/notification'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'

/** @name AI工具按钮对应图标 */
const AIToolToIconMap: Record<string, ReactNode> = {
  'enough-cancel': <OutlineArrownarrowrightIcon />,
}

interface ToolInvokerCardProps {
  titleText?: string
  fileList?: AIYakExecFileRecord[]
  modalInfo?: ModalInfoProps
  operationInfo: OperationCardFooterProps
  data: AIToolResult
  chatType: ChatListRenderType
  token: string
}
interface PreWrapperProps {
  code: string
  autoScrollBottom?: boolean
  className?: string
  style?: React.CSSProperties
}
interface ToolStatusCardProps {
  status: AIToolResult['tool']['status'] | 'purple' | 'neutral'
  children?: ReactNode
}
interface ToolStdoutCardProps extends ToolInvokerCardProps {
  isChildWindow: boolean
}
interface ToolResultCardProps extends ToolInvokerCardProps {
  isChildWindow: boolean
}

const ToolInvokerCard: FC<ToolInvokerCardProps> = (props) => {
  const { data } = props

  // 判断路由，子窗口有些功能不展示
  const isChildWindow = useRef(isAuxOrChildWindow())
  const { nodeLabel } = useAINodeLabel(data.verboseName)
  const titleText = nodeLabel || data.toolName
  const renderContent = useMemoizedFn(() => {
    // 过滤掉打开文件
    const operationInfo = {
      ...props.operationInfo,
      aiFilePath: isChildWindow.current ? undefined : props.operationInfo.aiFilePath,
    }
    switch (data.type) {
      case 'stream':
        return (
          <ToolStdoutCard
            isChildWindow={isChildWindow.current}
            {...props}
            operationInfo={operationInfo}
            titleText={titleText}
          />
        )
      case 'result':
        return (
          <ToolResultCard
            isChildWindow={isChildWindow.current}
            {...props}
            operationInfo={operationInfo}
            titleText={titleText}
          />
        )
      case 'create':
        return <ToolLoadingCard {...props} titleText={titleText} />
      default:
        return null
    }
  })

  return renderContent()
}

export default memo(ToolInvokerCard)

/** tool loading - processing params */
const ToolLoadingCard: React.FC<ToolInvokerCardProps> = memo((props) => {
  const { data, titleText } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const reason = useCreation(() => {
    return data?.tool?.reason || ''
  }, [data?.tool?.reason])

  return (
    <ChatCard
      titleIcon={<OutlineWrenchIcon1 />}
      titleText={titleText}
      titleExtra={
        !!reason ? (
          <span className={styles['tool-invoker-card-reason']} title={reason}>
            {reason}
          </span>
        ) : null
      }
      titleMore={
        <div className={styles['tool-loading-status']}>
          <span className={styles['tool-loading-status-icon']}>
            <OutlineRefreshIcon />
          </span>
          <span>{t('ToolInvokerCard.paramsGenerating')}</span>
        </div>
      }
    />
  )
})

/**tool_**_stdout */
const ToolStdoutCard: React.FC<ToolStdoutCardProps> = memo((props) => {
  const { operationInfo, fileList, chatType, data, titleText } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const { activeChat } = useAIAgentStore()
  const { handleSend } = useChatIPCDispatcher()

  // 获取流数据
  const { stream } = useStreamingChatContent({
    chatType,
    token: data.stream.EventUUID,
    session: activeChat?.SessionID || '',
  })

  const selectors = useCreation(() => {
    return stream?.data?.selectors
  }, [stream?.data?.selectors])

  const reason = useCreation(() => {
    return data?.tool?.reason || ''
  }, [data?.tool?.reason])

  const onToolExtra = useMemoizedFn((item: AIAgentGrpcApi.ReviewSelector) => {
    switch (item.value) {
      case 'enough-cancel':
        onSkip(item)
        break
      default:
        break
    }
  })
  const onSkip = useMemoizedFn((item: AIAgentGrpcApi.ReviewSelector) => {
    if (!selectors?.InteractiveId) return
    const jsonInput = {
      suggestion: item.value,
    }
    const params: AIChatIPCSendParams = {
      value: JSON.stringify(jsonInput),
      id: selectors.InteractiveId,
    }
    handleSend(params)
  })
  const referenceNode = useCreation(() => {
    return !!stream?.reference ? <AIReferenceNode referenceList={stream?.reference} /> : <></>
  }, [stream?.reference])
  return (
    <ChatCard
      titleText={titleText}
      titleIcon={<OutlineWrenchIcon1 />}
      titleMore={
        <div className={styles['tool-invoker-card-extra']}>
          {selectors?.selectors && (
            <div className={styles['stdout-card-extra']}>
              {selectors?.selectors?.map((item) => {
                return (
                  <YakitPopconfirm
                    title={t('ToolInvokerCard.skipConfirm')}
                    key={item.value}
                    onConfirm={() => onToolExtra(item)}
                  >
                    <div key={item.value} className={styles['extra-btn']}>
                      <span>{item.prompt}</span>
                      {AIToolToIconMap[item.value]}
                    </div>
                  </YakitPopconfirm>
                )
              })}
            </div>
          )}
        </div>
      }
      titleExtra={
        !!reason ? (
          <span className={styles['tool-invoker-card-reason']} title={reason}>
            {reason}
          </span>
        ) : null
      }
      footer={<OperationCardFooter {...operationInfo} />}
    >
      <ToolStatusCard status={'purple'}>
        <ToolParamsLine params={data?.tool?.reviewParams} />
        <ToolTerminalOutput content={stream?.data?.content || ''} autoScrollBottom />
        {referenceNode}
      </ToolStatusCard>
      {!!fileList?.length && <FileList fileList={fileList} />}
    </ChatCard>
  )
})

/**tool result status:error/success/cancel */
const ToolResultCard: React.FC<ToolResultCardProps> = memo((props) => {
  const { modalInfo, operationInfo, fileList, data, chatType, token, isChildWindow, titleText } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const { activeChat } = useAIAgentStore()
  const { fetchChatDataStore } = useChatIPCDispatcher().chatIPCEvents

  const [loading, setLoading] = useState<boolean>(false)

  const [expand, setExpand] = useState<boolean>(false)
  const expandToggle = useMemoizedFn(() => {
    setExpand((v) => !v)
  })

  const httpFlowDataCount = useCreation(() => {
    return data.httpFlowDataCount
  }, [data.httpFlowDataCount])

  const riskFlowDataCount = useCreation(() => {
    return data.riskFlowDataCount
  }, [data.riskFlowDataCount])

  const summary = useCreation(() => {
    return data?.tool?.summary || ''
  }, [data?.tool?.summary])

  const reason = useCreation(() => {
    return data?.tool?.reason || ''
  }, [data?.tool?.reason])

  const content = useCreation(() => {
    return data?.tool?.toolStdoutContent?.content || ''
  }, [data?.tool?.toolStdoutContent?.content])

  const resultDetails = useCreation(() => {
    return data?.tool?.resultDetails || ''
  }, [data?.tool?.resultDetails])

  const status = useCreation(() => {
    return data?.tool?.status
  }, [data?.tool?.status])

  const params = useCreation(() => {
    return data?.callToolId
  }, [data?.callToolId])
  const duration = useCreation(() => {
    return Math.round(data.durationSeconds * 10) / 10
  }, [data.durationSeconds])
  const startTime = useCreation(() => {
    return formatTimestamp(data.startTime)
  }, [data.startTime])

  const getListToolList = useMemoizedFn(() => {
    if (!data?.callToolId || !activeChat) return
    setLoading(true)
    const params: AIEventQueryRequest = {
      ProcessID: data.callToolId,
    }
    grpcQueryAIToolDetails(params)
      .then((res) => {
        const chatItem = fetchChatDataStore()?.getContentMap({
          session: activeChat?.SessionID,
          chatType,
          mapKey: token,
        })
        if (!!chatItem && chatItem.type === AIChatQSDataTypeEnum.TOOL_RESULT) {
          chatItem.data.tool.resultDetails = getResultDetails(res)
        }
      })
      .finally(() =>
        setTimeout(() => {
          setLoading(false)
        }, 100),
      )
  })

  const switchAIActTab = (key: AITabsEnum) => {
    emiter.emit(
      'switchAIActTab',
      JSON.stringify({
        key,
        value: params,
      }),
    )
  }

  const getResultDetails = useMemoizedFn((list: AIChatQSData[]) => {
    let desc: string[] = []
    list.forEach((ele) => {
      const { type, data } = ele
      switch (type) {
        case AIChatQSDataTypeEnum.STREAM:
          if (isToolStdoutStream(data.NodeId)) {
            // 50KB大概字符数25600
            desc.push(data.content.slice(-25600))
          } else {
            desc.push(data.content)
          }
          break
        case AIChatQSDataTypeEnum.TOOL_CALL_RESULT:
          desc.push(data.content)
          break
        default:
          break
      }
    })
    return desc.join('\n')
  })

  const outputText = useCreation(() => {
    return resultDetails || content || ''
  }, [resultDetails, content])

  return (
    <ChatCard
      titleText={titleText}
      titleIcon={<OutlineWrenchIcon1 />}
      titleMore={
        <div className={styles['tool-invoker-card-extra']}>
          {!!riskFlowDataCount && (
            <>
              <label
                onClick={() => {
                  switchAIActTab(AITabsEnum.Risk)
                }}
              >
                {t('ToolInvokerCard.relatedRisks')} <span>{riskFlowDataCount}</span>
              </label>
              <Divider type="vertical" />
            </>
          )}
          {!!httpFlowDataCount && (
            <label
              onClick={() => {
                switchAIActTab(AITabsEnum.HTTP)
              }}
            >
              {t('ToolInvokerCard.httpTraffic')} <span>{httpFlowDataCount}</span>
            </label>
          )}
          {isChildWindow || (
            <Tooltip title={t('ToolInvokerCard.refreshCodeBlockData')}>
              <YakitButton size="small" type="text" icon={<OutlineRefreshIcon />} onClick={getListToolList} />
            </Tooltip>
          )}

          <Tooltip title={expand ? '收起' : '展开'}>
            <YakitButton
              size="small"
              type="text"
              icon={expand ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
              onClick={expandToggle}
              className={styles['expand-btn']}
            />
          </Tooltip>
        </div>
      }
      titleExtra={
        !!reason ? (
          <span className={styles['tool-invoker-card-reason']} title={reason}>
            {reason}
          </span>
        ) : null
      }
      footer={
        expand && (
          <div className={styles['tool-invoker-card-footer']}>
            {modalInfo?.time && (
              <div className={styles['tool-invoker-card-footer-time']}>
                <OutlineClockIcon />
                {formatTimestamp(modalInfo.time)}
                {!!duration && (
                  <div>
                    {t('ToolInvokerCard.duration')}:<span>{duration}</span>s
                  </div>
                )}
              </div>
            )}
            <OperationCardFooter {...operationInfo} />
          </div>
        )
      }
    >
      {expand && (
        <ToolStatusCard status={'neutral'}>
          <YakitSpin spinning={loading}>
            <ToolParamsLine params={data?.tool?.reviewParams} />
            <ToolTerminalOutput content={summary ? `${summary}\n${outputText}` : outputText} autoScrollBottom />
          </YakitSpin>
        </ToolStatusCard>
      )}
      {expand && !!fileList?.length && <FileList fileList={fileList} />}
    </ChatCard>
  )
})

const ToolStatusCard: React.FC<ToolStatusCardProps> = memo((props) => {
  const { status, children } = props
  return (
    <div className={classNames(styles['file-system'], styles[`file-system-${status}`])}>
      <div className={styles['file-system-content']}>{children}</div>
    </div>
  )
})

/** @name 伪终端参数行：单行 JSON 预览，点击弹框展示完整 JSON */
const ToolParamsLine: FC<{ params?: Record<string, any> }> = memo(({ params }) => {
  const [open, setOpen] = useState(false)
  const { t } = useI18nNamespaces(['yakitUi'])

  if (!params || Object.keys(params).length === 0) return null

  const jsonStr = JSON.stringify(params)
  const jsonPretty = JSON.stringify(params, null, 2)

  const onCopyAll = () => {
    setClipboardText(jsonPretty, {
      hiddenHint: true,
      finalCallback: () => setTimeout(() => success(t('YakitNotification.copySuccess')), 200),
    })
  }
  const onCopyField = (value: any) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    setClipboardText(text, {
      hiddenHint: true,
      finalCallback: () => setTimeout(() => success(t('YakitNotification.copySuccess')), 200),
    })
  }

  return (
    <>
      <div className={styles['terminal-params-line']}>
        <span className={styles['params-label']}>Params:</span>
        <span className={styles['params-json']} onClick={() => setOpen(true)} title={jsonStr}>
          {jsonStr}
        </span>
      </div>
      <YakitModal
        visible={open}
        title="Params"
        onCancel={() => setOpen(false)}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => setOpen(false)}
        width={560}
      >
        <div className={styles['params-modal-body']}>
          <div className={styles['params-modal-json']}>
            {jsonPretty}
            <div className={styles['params-modal-copy']} onClick={onCopyAll}>
              <OutlineDocumentduplicateIcon />
            </div>
          </div>
          {Object.entries(params).map(([key, value]) => (
            <div className={styles['params-field-item']} key={key}>
              <span className={styles['field-key']}>{key}:</span>
              <span className={styles['field-value']}>
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              </span>
              <Tooltip title={t('YakitButton.copy')}>
                <span className={styles['field-copy']} onClick={() => onCopyField(value)}>
                  <OutlineDocumentduplicateIcon style={{ width: 12, height: 12 }} />
                </span>
              </Tooltip>
            </div>
          ))}
        </div>
      </YakitModal>
    </>
  )
})

/** @name 伪终端输出区域 */
const ToolTerminalOutput: FC<{
  content: string
  autoScrollBottom?: boolean
}> = memo(({ content, autoScrollBottom = false }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isScroll, setIsScroll] = useState(false)

  useClickAway(() => {
    setIsScroll(false)
  }, containerRef)

  useEffect(() => {
    if (!autoScrollBottom) return
    const el = containerRef.current
    if (!el) return
    const handleScroll = () => {
      const threshold = 20
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      const atTop = el.scrollTop < threshold
      setIsAtBottom(atBottom)
      setIsAtTop(atTop)
    }
    handleScroll()
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [autoScrollBottom])

  useEffect(() => {
    if (!autoScrollBottom) return
    const el = containerRef.current
    if (!el) return
    if (isAtBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [content, isAtBottom, autoScrollBottom])

  if (!content) return null

  return (
    <div className={styles['terminal-output-section']}>
      <div
        ref={containerRef}
        className={classNames(styles['output-content'], {
          [styles['output-scrollable']]: isScroll,
          [styles['output-fade-top']]: !isAtTop,
          [styles['output-fade-bottom']]: !isAtBottom,
        })}
        onClick={() => setIsScroll(true)}
      >
        {content}
        <div className={styles['terminal-copy-btn']}>
          <CopyComponents copyText={content} className={styles['terminal-copy-icon']} />
        </div>
      </div>
    </div>
  )
})

export const PreWrapper: React.FC<PreWrapperProps> = memo((props) => {
  const { code, autoScrollBottom = false, className, style } = props

  const containerRef = useRef<HTMLPreElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isScroll, setIsScroll] = useState(false)

  useClickAway(() => {
    setIsScroll(false)
  }, containerRef)

  // 只有开启 autoScrollBottom 才监听滚动
  useEffect(() => {
    if (!autoScrollBottom) return

    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      const threshold = 20
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      setIsAtBottom(atBottom)
    }

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [autoScrollBottom])

  // code 更新时：只有在底部 & 开启时才置底
  useEffect(() => {
    if (!autoScrollBottom) return

    const el = containerRef.current
    if (!el) return

    if (isAtBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [code, isAtBottom, autoScrollBottom])

  return (
    <div className={styles['pre-wrapper']}>
      <pre
        ref={containerRef}
        className={classNames(styles['file-system-wrapper'], className)}
        style={{
          ...style,
          overflow: isScroll ? 'auto' : 'hidden',
        }}
        onClick={() => setIsScroll(true)}
      >
        <code>{code}</code>
        <div className={styles['copy-btn']}>
          <CopyComponents copyText={code} className={styles['copy-icon']} />
        </div>
      </pre>
    </div>
  )
})
