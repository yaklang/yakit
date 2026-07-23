import { AIChatQSDataTypeEnum, ChatReferenceMaterialPayload, ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { type CSSProperties, useState, type FC, useRef, useEffect, useMemo, memo } from 'react'
import styles from './AIGroupStreamCard.module.scss'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineArrowsexpandIcon } from '@/assets/icon/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useClickFocus from '../../../ai-re-act/hooks/useClickFocus'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCreation from 'ahooks/lib/useCreation'
import { useStore } from 'zustand'
import { AIGroupStreamCardHeardWrapperProps, AIGroupStreamCardListWrapperProps } from './type'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import AIGroupStreamCardHeard from './aiGroupStreamCardHeard/AIGroupStreamCardHeard'
import AIGroupStreamCardList from './aiGroupStreamCardList/AIGroupStreamCardList'
import { useTypedStream } from '../aiChatListItem/StreamingChatContent/hooks/useTypedStream'

export const Code: FC<{ code: ChatReferenceMaterialPayload; style: CSSProperties }> = ({ code, style }) => {
  return (
    <pre className={styles['code-wrapper']} style={style}>
      {code.map((item, index) => (
        <code key={`${item.event_uuid}-${index}`}>{item.payload}</code>
      ))}
    </pre>
  )
}

export const AIGroupStreamNode: FC<{
  itemData: ChatStream
  renderNum: number
  seqNo: string
}> = memo(({ itemData, renderNum, seqNo }) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const [open, setOpen] = useState(false)
  const [openPopover, setOpenPopover] = useState(false)
  // popover 关闭过渡期间保留上一次的 reference 内容，避免关闭动画途中内容先清空
  const prevPopoverCodeRef = useRef<ChatReferenceMaterialPayload>([])

  // 仅获取用于显示的 content（已应用打字效果）
  const { content } = useTypedStream({
    getContent: () => itemData.data.content,
    getStatus: () => itemData.data.status,
  })

  const onClose = () => {
    setOpen(false)
  }

  const { getLabelByParams } = useAINodeLabel()

  const nodeLabel = useCreation(() => {
    if (!itemData) return
    switch (itemData.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return getLabelByParams(itemData.data?.NodeIdVerbose)

      default:
        return ''
    }
  }, [])

  const modelCode = useCreation(() => {
    // TODO - reference 现为 token[]；按 token 查 IDB 展示完整交互后置，弹框内容暂空
    if (!open) return []
    return [] as ChatReferenceMaterialPayload
  }, [open])
  const popoverCode = useCreation(() => {
    if (!openPopover) return prevPopoverCodeRef.current
    const code = itemData?.reference || []
    prevPopoverCodeRef.current = code
    return code
  }, [openPopover, renderNum])

  const hidden = useCreation(() => {
    return !itemData?.reference?.length
  }, [renderNum, itemData?.reference?.length])

  return (
    <div className={styles['single-stream-text']}>
      {open && (
        <YakitModal
          visible={open}
          title={`${seqNo}${nodeLabel}`}
          cancelButtonProps={{ style: { display: 'none' } }}
          onOk={onClose}
          onCloseX={onClose}
        >
          <Code code={modelCode} style={{ maxHeight: '500px' }} />
        </YakitModal>
      )}
      {seqNo}
      {content}
      <YakitPopover
        trigger={'click'}
        visible={openPopover}
        onVisibleChange={setOpenPopover}
        content={
          <div className={styles['popover-reference-wrapper']}>
            <div className={styles['popover-reference-title']}>
              {seqNo}
              {nodeLabel}
              <YakitButton
                onClick={() => {
                  setOpenPopover(false)
                  setOpen(true)
                }}
                type="text2"
                icon={<OutlineArrowsexpandIcon />}
                size="small"
              />
            </div>
            {!!popoverCode.length && <Code code={popoverCode} style={{ maxHeight: '200px' }} />}
          </div>
        }
        destroyTooltipOnHide={true}
      >
        <YakitButton hidden={hidden} className={styles['button']} type="text" colors="primary" size="small">
          {t('AIStreamNode.viewReference')}
        </YakitButton>
      </YakitPopover>
    </div>
  )
})

const STREAM_MASK_THRESHOLD = 170

const AIGroupStreamCard: FC<{
  token: string
}> = memo(({ token }) => {
  const { ref: containerRef, isFocus } = useClickFocus<HTMLDivElement>()
  const [expand, setExpand] = useState(true)

  return (
    <div
      className={classNames(styles.container, {
        [styles['container-focus']]: isFocus,
      })}
      ref={containerRef}
    >
      <AIGroupStreamCardHeardWrapper expand={expand} setExpand={setExpand} token={token} />
      <AIGroupStreamCardListWrapper expand={expand} token={token} />
    </div>
  )
})
export default AIGroupStreamCard

const AIGroupStreamCardListWrapper: React.FC<AIGroupStreamCardListWrapperProps> = memo((props) => {
  const { expand, token } = props
  const store = useCurrentStore()
  const childrenTokens = useStore(store, (state) => state.groups[token]?.childrenTokens || [])
  return <AIGroupStreamCardList expand={expand} childrenTokens={childrenTokens} />
})
const AIGroupStreamCardHeardWrapper: React.FC<AIGroupStreamCardHeardWrapperProps> = memo((props) => {
  const { expand, setExpand, token } = props

  const { getLabelByParams } = useAINodeLabel()

  const perHasNext = useRef<boolean>(true)

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const chatLength = useStore(store, (state) => state.casualChat.elements.length)
  const taskChatLength = useStore(store, (state) => state.taskChat.elements.length)
  const renderNum = useStore(store, (state) => state.groups[token]?.renderNum)
  const childrenTokensLength = useStore(store, (state) => state.groups[token]?.childrenTokens.length || 0)

  /** 可能存在第一次拿到的数据为undefined  */
  const groupData = useCreation(() => {
    return rawData.contents.get(token)
  }, [renderNum])

  const lastToken = useCreation(() => {
    if (!groupData) return ''
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return groupData.data.lastToken

      default:
        return ''
    }
  }, [renderNum])

  const lastItemRenderNum = useStore(store, (state) => state.items[lastToken]?.renderNum)

  const isLastActiveGroup = useCreation(() => {
    if (expand === false) return false
    if (perHasNext.current === false) return false
    if (groupData?.chatType === 'reAct') {
      perHasNext.current = store.getState().casualChat.elements[chatLength - 1]?.token === token
      return perHasNext.current
    }
    perHasNext.current = store.getState().taskChat.elements[taskChatLength - 1]?.token === token
    return perHasNext.current
  }, [chatLength, taskChatLength, groupData?.chatType])

  const nodeLabel = useCreation(() => {
    if (!groupData) return ''
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return getLabelByParams(groupData.data?.NodeIdVerbose)

      default:
        return ''
    }
  }, [renderNum])

  useEffect(() => {
    if (isLastActiveGroup) {
      setExpand(false)
    }
  }, [isLastActiveGroup])

  const shouldShowMask = useMemo(() => {
    const lastItem = rawData.contents.get(lastToken)
    if (!lastItem) return false
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM:
        const contentLength = lastItem.data?.content?.length || 0
        return contentLength > STREAM_MASK_THRESHOLD

      default:
        return false
    }
  }, [lastToken, lastItemRenderNum])

  const lastItem = useCreation(() => {
    const lastItem = rawData.contents.get(lastToken)
    if (!lastItem) return undefined
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return lastItem

      default:
        return undefined
    }
  }, [lastItemRenderNum])

  return (
    <AIGroupStreamCardHeard
      expand={expand}
      setExpand={setExpand}
      lastItem={lastItem}
      nodeLabel={nodeLabel}
      shouldShowMask={shouldShowMask}
      childrenTokensLength={childrenTokensLength}
    />
  )
})
