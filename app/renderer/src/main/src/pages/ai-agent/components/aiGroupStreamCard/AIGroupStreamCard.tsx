import { AIChatQSDataTypeEnum, ChatReferenceMaterialPayload, ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { type CSSProperties, useState, type FC, useRef, useEffect, useMemo, memo } from 'react'
import styles from './AIGroupStreamCard.module.scss'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineArrowsexpandIcon } from '@/assets/icon/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { useTypedStream } from '../aiChatListItem/StreamingChatContent/hooks/useTypedStream'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useClickFocus from '../../../ai-re-act/hooks/useClickFocus'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCreation from 'ahooks/lib/useCreation'
import { useStore } from 'zustand'
import { AIGroupStreamCardHeardWrapperProps, AIGroupStreamCardListWrapperProps } from './type'
import { useMemoizedFn } from 'ahooks'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import AIGroupStreamCardHeard from './aiGroupStreamCardHeard/AIGroupStreamCardHeard'
import AIGroupStreamCardList from './aiGroupStreamCardList/AIGroupStreamCardList'

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
}> = memo(({ itemData, renderNum }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { stream } = useTypedStream({ token: itemData.id })
  const [open, setOpen] = useState(false)
  const [openPopover, setOpenPopover] = useState(false)

  const onClose = () => {
    setOpen(false)
  }

  const store = useCurrentStore()
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

  const seqNo = useCreation(() => {
    if (!itemData.parentGroupToken) return ''
    const parentGroupTokens = store.getState().groups[itemData.parentGroupToken].childrenTokens
    const index = parentGroupTokens.findIndex((ele) => ele === itemData.id)
    return index === -1 ? '' : `${index}. `
  }, [renderNum])

  const modelCode = useCreation(() => {
    if (!open) return []
    return stream?.reference || []
  }, [open])
  const popoverCode = useCreation(() => {
    if (!openPopover) return []
    return stream?.reference || []
  }, [openPopover])

  const hidden = useCreation(() => {
    return !!stream?.reference?.length
  }, [stream?.reference?.length])

  if (!stream) return null
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
      {stream.data.content}
      <YakitPopover
        trigger={'click'}
        visible={openPopover}
        onVisibleChange={setOpenPopover}
        content={
          openPopover && (
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
          )
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
  const childrenTokens = useStore(store, (state) => state.groups[token].childrenTokens || [])

  return <AIGroupStreamCardList expand={expand} childrenTokens={childrenTokens} />
})
const AIGroupStreamCardHeardWrapper: React.FC<AIGroupStreamCardHeardWrapperProps> = memo((props) => {
  const { expand, setExpand, token } = props

  const { getLabelByParams } = useAINodeLabel()

  const perHasNext = useRef<boolean>(true)

  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const childrenTokensLength = useStore(store, (state) => state.groups[token].childrenTokens.length)

  const chatLength = useStore(store, (state) => state.casualChat.elements.length)
  const taskChatLength = useStore(store, (state) => state.taskChat.elements.length)

  const getFirstItem = useMemoizedFn(() => {
    const group = store.getState().groups[token]
    if (!group) return
    // 有组数据的时候，childrenTokens肯定会有数据
    const firstItemToken = group.childrenTokens[0]
    const firstItem = rawData.contents.get(firstItemToken)
    return firstItem
  })

  const chatType = useCreation(() => {
    const firstItem = getFirstItem()
    if (!firstItem) return
    return firstItem.chatType
  }, [])

  const hasNext = useCreation(() => {
    if (expand === false) return false
    if (perHasNext.current === false) return false
    if (chatType === 'reAct') {
      perHasNext.current = store.getState().casualChat.elements[chatLength - 1].token === token
      return perHasNext.current
    }
    perHasNext.current = store.getState().taskChat.elements[taskChatLength - 1].token === token
    return perHasNext.current
  }, [chatLength, taskChatLength])

  const nodeLabel = useCreation(() => {
    const firstItem = getFirstItem()
    if (!firstItem) return
    switch (firstItem.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return getLabelByParams(firstItem.data?.NodeIdVerbose)

      default:
        return ''
    }
  }, [])

  useEffect(() => {
    if (hasNext) {
      setExpand(false)
    }
  }, [hasNext])

  const getLastItem = useMemoizedFn(() => {
    const group = store.getState().groups[token]
    if (!group) return
    const length = group.childrenTokens.length
    // 有组数据的时候，childrenTokens肯定会有数据
    const lastItemToken = group.childrenTokens[length - 1]
    if (!lastItemToken) return
    const lastItem = rawData.contents.get(lastItemToken)
    return lastItem
  })

  const lastToken = useCreation(() => {
    const lastItem = getLastItem()
    if (!lastItem) return ''
    return lastItem.id
  }, [])

  const shouldShowMask = useMemo(() => {
    const lastItem = getLastItem()
    if (!lastItem) return false
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM:
        const contentLength = lastItem.data?.content?.length || 0
        return contentLength > STREAM_MASK_THRESHOLD

      default:
        return false
    }
  }, [childrenTokensLength])

  return (
    <AIGroupStreamCardHeard
      itemData={undefined} // TODO - 需要补充该数据
      expand={expand}
      setExpand={setExpand}
      lastToken={lastToken}
      nodeLabel={nodeLabel}
      shouldShowMask={shouldShowMask}
    />
  )
})
