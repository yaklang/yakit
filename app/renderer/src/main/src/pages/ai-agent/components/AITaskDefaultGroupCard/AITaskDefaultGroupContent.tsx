import {
  AIChatQSDataTypeEnum,
  type ReActChatElement,
  type ReActChatTaskElementSub,
} from '@/pages/ai-re-act/hooks/aiRender'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import { type FC, useEffect, useMemo, useRef } from 'react'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useTypedStream } from '../aiChatListItem/StreamingChatContent/hooks/useTypedStream'
import { openAIReferenceModal } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from './AITaskDefaultGroupCard.module.scss'

const BOTTOM_THRESHOLD = 10

const SystemStreamRow: FC<{
  chatType: ReActChatElement['chatType']
  token: string
  session: string
}> = ({ chatType, token, session }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { stream } = useTypedStream({ chatType, token, session })
  const { nodeLabel } = useAINodeLabel(stream?.data.NodeIdVerbose)

  if (!stream) return null
  if (!stream?.data.content && !stream.reference?.length) return null

  const hasReference = !!stream.reference?.length
  const modalTitle = nodeLabel || stream.data.content || t('AIStreamNode.viewReference')

  return (
    <div className={styles['stream-row']}>
      {nodeLabel ? <span className={styles['stream-label']}>{nodeLabel}</span> : null}
      {stream.data.content ? <span className={styles['stream-content']}>{stream.data.content}</span> : null}
      {hasReference ? (
        <YakitButton
          className={styles['reference-btn']}
          type="text"
          colors="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            openAIReferenceModal(stream.reference || [], modalTitle)
          }}
        >
          {t('AIStreamNode.viewReference')}
        </YakitButton>
      ) : null}
    </div>
  )
}

export const flattenStreamElements = (elements: ReActChatTaskElementSub[]): ReActChatElement[] => {
  const result: ReActChatElement[] = []
  for (const el of elements) {
    if (el.kind === 'item' && el.type === AIChatQSDataTypeEnum.STREAM) {
      result.push(el)
    } else if (el.kind === 'group' && el.type === AIChatQSDataTypeEnum.STREAM_GROUP) {
      result.push(...el.children)
    }
  }
  return result
}

const AITaskDefaultGroupContent: FC<{
  elements: ReActChatTaskElementSub[]
  session: string
  chatType: ReActChatElement['chatType']
  hasNext?: boolean
  isChildWindow?: boolean
  onContentFocusChange?: (focused: boolean) => void
}> = ({ elements, session, chatType, hasNext, isChildWindow, onContentFocusChange }) => {
  const { ref: contentRef, isFocus } = useClickFocus<HTMLDivElement>()
  const allowAutoScrollRef = useRef(true)
  const streamElements = useMemo(() => flattenStreamElements(elements), [elements])

  useEffect(() => {
    onContentFocusChange?.(isFocus)
  }, [isFocus, onContentFocusChange])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const onScroll = () => {
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      allowAutoScrollRef.current = distanceToBottom <= BOTTOM_THRESHOLD
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [contentRef])

  useEffect(() => {
    allowAutoScrollRef.current = true
  }, [])

  useEffect(() => {
    const el = contentRef.current
    if (!el || hasNext) return
    if (!allowAutoScrollRef.current) return

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })

    let rafId = 0
    const observer = new ResizeObserver(() => {
      if (!allowAutoScrollRef.current) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    })
    observer.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [contentRef, elements.length, hasNext, streamElements.length])

  if (streamElements.length === 0) return null

  return (
    <div
      ref={contentRef}
      className={classNames(styles['ai-task-default-group-card-content'], {
        [styles['focused']]: isFocus,
        [styles['child-window']]: isChildWindow,
      })}
    >
      <div className={styles['content-inner']}>
        {streamElements.map((el) => (
          <SystemStreamRow key={el.token} chatType={chatType} token={el.token} session={session} />
        ))}
      </div>
    </div>
  )
}

export default AITaskDefaultGroupContent
