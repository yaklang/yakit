import { FC, memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import ChatCard from './ChatCard'
import styles from './ToolInvokerCard.module.scss'
import classNames from 'classnames'
import { CopyComponents, YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import type { YakitTagColor } from '@/components/yakitUI/YakitTag/YakitTagType'
import { grpcQueryAIToolDetails } from '../grpc'
import {
  AIChatQSData,
  AIChatQSDataTypeEnum,
  AIToolResult,
  AIYakExecFileRecord,
  ChatToolResult,
} from '@/pages/ai-re-act/hooks/aiRender'
import FileList from './FileList'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../defaultConstant'
import { useClickAway, useCreation, useMemoizedFn } from 'ahooks'
import { AIAgentGrpcApi, AIEventQueryRequest, AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { isToolStdoutStream } from '@/pages/ai-re-act/hooks/utils'
import {
  OutlineArrownarrowrightIcon,
  OutlineChevronsDownUpIcon,
  OutlineChevronsUpDownIcon,
  OutlineClockIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Divider, Tooltip } from 'antd'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { formatTimestamp } from '@/utils/timeUtil'
import { OperationCardFooter } from './OperationCardFooter/OperationCardFooter'
import useAIAgentStore from '../useContext/useStore'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AIReferenceNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { useStreamingChatContent } from './aiChatListItem/StreamingChatContent/hooks/useStreamingChatContent'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { AIReviewParams } from './aiReviewResult/AIReviewResult'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { isAuxOrChildWindow } from '@/utils/isAuxOrChildWindow'
import { useStore } from 'zustand'

/** @name AI工具按钮对应图标 */
const AIToolToIconMap: Record<string, ReactNode> = {
  'enough-cancel': <OutlineArrownarrowrightIcon />,
}

interface ToolInvokerCardProps {
  itemData: ChatToolResult
  renderNum: number
}
interface PreWrapperProps {
  code: string
  autoScrollBottom?: boolean
  className?: string
  style?: React.CSSProperties
}
interface ToolStatusCardProps {
  status: AIToolResult['tool']['status'] | 'purple'
  title: ReactNode
  children?: ReactNode
}
interface ToolStdoutCardProps extends ToolInvokerCardProps {
  fileList: AIYakExecFileRecord[]
}
interface ToolResultCardProps extends ToolInvokerCardProps {
  fileList: AIYakExecFileRecord[]
}

const ToolInvokerCard: FC<ToolInvokerCardProps> = (props) => {
  const { itemData, renderNum } = props
  const store = useCurrentStore()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)
  const fileList = useCreation(() => {
    if (!itemData?.data?.callToolId) return []
    return execFileRecord.get(itemData?.data?.callToolId) || []
  }, [renderNum, itemData?.data?.callToolId])

  switch (itemData?.data?.type) {
    case 'stream':
      return <ToolStdoutCard {...props} fileList={fileList} />
    case 'result':
      return <ToolResultCard {...props} fileList={fileList} />
    case 'create':
      return <ToolLoadingCard {...props} />
    default:
      return null
  }
}

export default memo(ToolInvokerCard)

/** tool loading - processing params */
const ToolLoadingCard: React.FC<Omit<ToolInvokerCardProps, 'fileList'>> = memo((props) => {
  const { itemData, renderNum } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const data = useCreation(() => {
    return itemData.data
  }, [renderNum])

  const reason = useCreation(() => {
    return data?.tool?.reason || ''
  }, [renderNum])

  return (
    <ChatCard
      titleText={`${t('ToolInvokerCard.tool')}-${data.toolName}`}
      titleExtra={
        !!reason ? (
          <span className={styles['tool-invoker-card-reason']} title={reason}>
            {reason}
          </span>
        ) : null
      }
    >
      <ToolStatusCard
        status={'purple'}
        title={
          <div className={styles['tool-title']}>
            <div className={styles['tool-title-left']}>
              <div className={styles['tool-name']}>{data.toolName}</div>
              <YakitTag size="small" fullRadius color={'purple' as YakitTagColor}>
                生成参数中
              </YakitTag>
            </div>
          </div>
        }
      >
        <div className={styles['tool-loading-content']}>
          <YakitSpin spinning>
            <div className={styles['tool-loading-block']} />
          </YakitSpin>
        </div>
      </ToolStatusCard>
    </ChatCard>
  )
})

/**tool_**_stdout */
const ToolStdoutCard: React.FC<ToolStdoutCardProps> = memo((props) => {
  const { fileList, itemData, renderNum } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  // 判断路由，子窗口有些功能不展示
  const isChildWindow = useRef(isAuxOrChildWindow())
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()

  const data = useCreation(() => {
    return itemData.data
  }, [renderNum])
  const operationInfo = useCreation(() => {
    return {
      callToolId: data.callToolId,
      aiFilePath: isChildWindow.current ? '' : data.tool.dirPath,
    }
  }, [renderNum])

  // 获取流数据
  const { stream } = useStreamingChatContent({
    token: data.stream.EventUUID,
  })

  const selectors = useCreation(() => {
    return stream?.data?.selectors
  }, [stream?.data?.selectors])

  const reason = useCreation(() => {
    return data?.tool?.reason || ''
  }, [renderNum])

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
    const info: AIInputEvent = {
      IsInteractiveMessage: true,
      InteractiveId: selectors.InteractiveId,
      InteractiveJSONInput: JSON.stringify(jsonInput),
    }
    onSend({ token: sessionId, type: '', params: info })
  })
  const referenceNode = useCreation(() => {
    return !!stream?.reference ? <AIReferenceNode referenceList={stream?.reference} /> : <></>
  }, [stream?.reference])
  return (
    <ChatCard
      titleText={`${t('ToolInvokerCard.tool')}-${data.toolName}`}
      // titleIcon={<SolidToolIcon />}
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
      <ToolStatusCard status={'purple'} title={<div className={styles['tool-name']}>{data.toolName}</div>}>
        <div className={styles['file-system-content']}>
          {stream?.data?.content && (
            <PreWrapper code={stream?.data?.content || ''} autoScrollBottom className={styles['pre-max-height']} />
          )}
        </div>
        {referenceNode}
      </ToolStatusCard>
      {!!fileList?.length && <FileList fileList={fileList} />}
    </ChatCard>
  )
})

/**tool result status:error/success/cancel */
const ToolResultCard: React.FC<ToolResultCardProps> = memo((props) => {
  const { renderNum, fileList, itemData } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent'])
  const { activeChat } = useAIAgentStore()

  const [loading, setLoading] = useState<boolean>(false)
  const [type, setType] = useState<'outInput' | 'params'>('outInput')

  const [expand, setExpand] = useState<boolean>(false)

  // 判断路由，子窗口有些功能不展示
  const isChildWindow = useRef(isAuxOrChildWindow())

  const data = useCreation(() => {
    return itemData.data
  }, [renderNum])

  const modalInfo = useCreation(() => {
    return {
      time: itemData.Timestamp,
      title: itemData.AIModelName,
      icon: itemData.AIService,
    }
  }, [])

  const operationInfo = useCreation(() => {
    return {
      callToolId: data.callToolId,
      aiFilePath: isChildWindow.current ? '' : data.tool.dirPath,
    }
  }, [renderNum])

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

  const [statusColor, statusText] = useMemo(() => {
    if (status === 'success') return ['success', t('ToolInvokerCard.success')]
    if (status === 'failed') return ['danger', t('ToolInvokerCard.failed')]
    return ['white', t('ToolInvokerCard.cancelled')]
  }, [status, i18n.language])

  const params = useCreation(() => {
    return data?.callToolId
  }, [data?.callToolId])
  const duration = useCreation(() => {
    return Math.round(data.durationSeconds * 10) / 10
  }, [data.durationSeconds])

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const getListToolList = useMemoizedFn(() => {
    if (!data?.callToolId || !activeChat) return
    setLoading(true)
    const params: AIEventQueryRequest = {
      ProcessID: data.callToolId,
    }
    grpcQueryAIToolDetails(params)
      .then((res) => {
        /** TODO - 工具卡片刷新后,需要更新这个item里面的数据以及其刷新逻辑 */
        const chatItem = rawData.contents.get(itemData.id)
        if (!!chatItem && chatItem.type === AIChatQSDataTypeEnum.TOOL_RESULT) {
          chatItem.data.tool.resultDetails = getResultDetails(res)
        }
        store.getState().incrementNodeVersion(itemData.id, 'item')
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

  const renderContent = useMemoizedFn(() => {
    switch (type) {
      case 'params':
        return <AIReviewParams params={data?.tool?.reviewParams} isPreStyle={true} />
      default:
        return (
          <>
            <div className={styles['summary']} title={summary}>
              {summary}
            </div>
            {!!resultDetails ? (
              <>
                <PreWrapper code={resultDetails} autoScrollBottom className={styles['pre-max-height']} />
              </>
            ) : (
              <>{content && <PreWrapper code={content} autoScrollBottom className={styles['pre-max-height']} />}</>
            )}
          </>
        )
    }
  })
  return (
    <ChatCard
      titleText={`${t('ToolInvokerCard.tool')}-${data.toolName}`}
      // titleIcon={<SolidToolIcon />}
      titleMore={
        <div className={styles['tool-invoker-card-extra']}>
          <div className={styles['tool-invoker-card-extra-time']}>
            {/* {!!startTime && (
              <div>
                {t('ToolInvokerCard.startTime')}:<span>{startTime}</span>
              </div>
            )} */}
          </div>

          <div style={{ marginRight: 12 }}>
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
          </div>
          {isChildWindow.current || (
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
        <ToolStatusCard
          status={status}
          title={
            <div className={styles['tool-title']}>
              <div className={styles['tool-title-left']}>
                <div className={styles['tool-name']}>{data.toolName}</div>
                <YakitTag size="small" fullRadius color={statusColor as YakitTagColor}>
                  {statusText}
                </YakitTag>
              </div>
              <YakitRadioButtons
                size="small"
                buttonStyle="solid"
                options={[
                  {
                    label: '输出',
                    value: 'outInput',
                  },
                  {
                    label: '参数',
                    value: 'params',
                  },
                ]}
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                }}
              />
            </div>
          }
        >
          <YakitSpin spinning={loading}>
            <div className={styles['file-system-content']}>{renderContent()}</div>
          </YakitSpin>
        </ToolStatusCard>
      )}
      {expand && !!fileList?.length && <FileList fileList={fileList} />}
    </ChatCard>
  )
})

const ToolStatusCard: React.FC<ToolStatusCardProps> = memo((props) => {
  const { status, title, children } = props
  return (
    <div className={classNames(styles['file-system'], styles[`file-system-${status}`])}>
      <div className={styles['file-system-title']}>{title}</div>
      {children}
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
