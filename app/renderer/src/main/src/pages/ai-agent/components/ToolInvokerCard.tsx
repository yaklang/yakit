import { SolidToolIcon } from '@/assets/icon/solid'
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
  ReActChatBaseInfo,
} from '@/pages/ai-re-act/hooks/aiRender'
import FileList from './FileList'
import ModalInfo, { ModalInfoProps } from './ModelInfo'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../defaultConstant'
import { useClickAway, useCreation, useMemoizedFn } from 'ahooks'
import { AIAgentGrpcApi, AIEventQueryRequest } from '@/pages/ai-re-act/hooks/grpcApi'
import { isToolStdoutStream } from '@/pages/ai-re-act/hooks/utils'
import { OutlineArrownarrowrightIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
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
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { AIReviewParams } from './aiReviewResult/AIReviewResult'

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
  chatType: ReActChatBaseInfo['chatType']
  token: string
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
interface ToolStdoutCardProps extends ToolInvokerCardProps {}
interface ToolResultCardProps extends ToolInvokerCardProps {}

const ToolInvokerCard: FC<ToolInvokerCardProps> = (props) => {
  const { data } = props

  const renderContent = useMemoizedFn(() => {
    switch (data.type) {
      case 'stream':
        return <ToolStdoutCard {...props} />
      case 'result':
        return <ToolResultCard {...props} />
      default:
        return null
    }
  })

  return renderContent()
}

export default memo(ToolInvokerCard)

/**tool_**_stdout */
const ToolStdoutCard: React.FC<ToolStdoutCardProps> = memo((props) => {
  const { titleText, modalInfo, operationInfo, fileList, chatType, data } = props

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
      titleIcon={<SolidToolIcon />}
      titleMore={
        <div className={styles['tool-invoker-card-extra']}>
          {selectors?.selectors && (
            <div className={styles['stdout-card-extra']}>
              {selectors?.selectors?.map((item) => {
                return (
                  <YakitPopconfirm
                    title="跳过会取消工具调用，使用当前输出结果进行后续工作决策，是否确认跳过"
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
      titleExtra={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
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
  const { titleText, modalInfo, operationInfo, fileList, data, chatType, token } = props
  const { activeChat } = useAIAgentStore()
  const { fetchChatDataStore } = useChatIPCDispatcher().chatIPCEvents

  const [loading, setLoading] = useState<boolean>(false)
  const [type, setType] = useState<'outInput' | 'params'>('outInput')

  const httpFlowDataCount = useCreation(() => {
    return data.httpFlowDataCount
  }, [data.httpFlowDataCount])

  const riskFlowDataCount = useCreation(() => {
    return data.riskFlowDataCount
  }, [data.riskFlowDataCount])

  const summary = useCreation(() => {
    return data?.tool?.summary || ''
  }, [data?.tool?.summary])

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
    if (status === 'success') return ['success', '成功']
    if (status === 'failed') return ['danger', '失败']
    return ['white', '已取消']
  }, [status])

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
      titleText={titleText}
      titleIcon={<SolidToolIcon />}
      titleMore={
        <div className={styles['tool-invoker-card-extra']}>
          <div className={styles['tool-invoker-card-extra-time']}>
            {!!startTime && (
              <div>
                开始时间:<span>{startTime}</span>
              </div>
            )}
            {!!duration && (
              <div>
                执行时长:<span>{duration}</span>s
              </div>
            )}
          </div>

          {!!riskFlowDataCount && (
            <>
              <label
                onClick={() => {
                  switchAIActTab(AITabsEnum.Risk)
                }}
              >
                相关漏洞 <span>{riskFlowDataCount}</span>
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
              HTTP 流量 <span>{httpFlowDataCount}</span>
            </label>
          )}
          <Tooltip title="刷新代码块数据">
            <YakitButton size="small" type="text" icon={<OutlineRefreshIcon />} onClick={getListToolList} />
          </Tooltip>
        </div>
      }
      titleExtra={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
      footer={<OperationCardFooter {...operationInfo} />}
    >
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
      {!!fileList?.length && <FileList fileList={fileList} />}
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
