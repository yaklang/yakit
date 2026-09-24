import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Ctx } from '@milkdown/kit/ctx'
import { slashFactory, SlashProvider } from '@milkdown/kit/plugin/slash'
import { useInstance } from '@milkdown/react'
import { useNodeViewContext, usePluginViewContext } from '@prosemirror-adapter/react'
import { useClickAway, useCreation, useDebounceEffect, useKeyPress, useMemoizedFn } from 'ahooks'
import styles from './AIMilkdownMention.module.scss'
import { PANEL_GAP, PANEL_OFFSET_UP, PANEL_WIDTH_EXTRA_EACH } from '../constants'
import { iconMap } from '@/pages/ai-agent/defaultConstant'
import { AIChatMention } from '../../aiChatMention/AIChatMention'
import type { AIChatMentionProps, AIChatMentionSelectItem, AIMentionTypeItem } from '../../aiChatMention/type'
import { callCommand } from '@milkdown/kit/utils'
import { aiMentionCommand, type AIMentionCommandParams } from './aiMentionPlugin'
import { extractMentionFilterKeyword } from './mentionQuery'
import { tryClaimMilkdownPopup, releaseMilkdownPopup } from '../panelMutex'
import classNames from 'classnames'
import { removeAIOffsetCommand } from '../customPlugin'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import type { YakitTagColor } from '@/components/yakitUI/YakitTag/YakitTagType'

export const aiMentionFactory = slashFactory('ai-mention-commands')

interface AIMilkdownMentionProps {
  onMemfitExtra?: (v: AIMentionCommandParams) => void
  filterMode?: AIChatMentionProps['filterMode']
}

const mentionTarget = '@'
export const AIMilkdownMention: React.FC<AIMilkdownMentionProps> = (props) => {
  const { onMemfitExtra, filterMode } = props
  const ref = useRef<HTMLDivElement>(null)
  const slashProvider = useRef<SlashProvider>()
  const [filterKeyword, setFilterKeyword] = useState('')
  const [visible, setVisible] = useState(false)

  const { view, prevState } = usePluginViewContext()
  const [loading, get] = useInstance()
  const action = useCallback(
    (fn: (ctx: Ctx) => void) => {
      if (loading) return
      get().action(fn)
    },
    [loading],
  )
  useKeyPress(
    'esc',
    (e) => {
      if (!visible) return
      e.stopPropagation()
      e.preventDefault()
      onHide()
    },
    {
      target: () => view.dom,
      exactMatch: true,
      useCapture: true,
    },
  )
  // 点击弹层或编辑器本身不关闭；点其它区域才关
  useClickAway(() => {
    if (visible) onHide()
  }, [ref, () => view.dom])

  useEffect(() => {
    const div = ref.current
    if (loading || !div) {
      return
    }
    slashProvider.current = new SlashProvider({
      content: div,
      trigger: mentionTarget,
    })
  }, [loading])

  useEffect(() => {
    return () => {
      // 单独的Effect中卸载，避免报错
      slashProvider.current?.destroy()
    }
  }, [])

  const getInputAnchor = useMemoizedFn((): HTMLElement | null => {
    // CSS Modules 会把 ai-chat-textarea 哈希掉，不能写死 class 名；用 data 锚到整张输入卡片（含标签行）
    return (
      (view.dom.closest('[data-ai-input-card]') as HTMLElement | null) ||
      (view.dom.closest('[class*="ai-chat-textarea"]') as HTMLElement | null) ||
      (view.dom.closest('[class*="ai-milkdown-input"]') as HTMLElement | null) ||
      (view.dom.parentElement as HTMLElement | null)
    )
  })

  /** 宽度略宽于输入框，底部贴在输入框上方再上移一点（挂到 body，避免父级 transform 导致 fixed 偏移） */
  const syncMentionPosition = useMemoizedFn(() => {
    const el = ref.current
    const anchor = getInputAnchor()
    if (!el || !anchor) return

    const box = anchor.getBoundingClientRect()
    const gap = PANEL_GAP + PANEL_OFFSET_UP
    const widthExtra = PANEL_WIDTH_EXTRA_EACH * 2
    el.style.width = `${box.width + widthExtra}px`
    el.style.maxHeight = `${Math.max(180, box.top - gap * 2)}px`
    el.style.left = `${box.left - PANEL_WIDTH_EXTRA_EACH}px`
    el.style.right = 'auto'
    el.style.position = 'fixed'
    el.style.top = 'auto'
    el.style.transform = 'none'
    // fixed + bottom：弹层底边固定在输入框上方，内容只往上伸展
    el.style.bottom = `${window.innerHeight - box.top + gap}px`
  })

  // 标签行出现/消失会抬高输入卡片，弹层打开时跟着重算，避免挡住
  useEffect(() => {
    if (!visible) return
    const el = ref.current
    const anchor = getInputAnchor()
    if (!el || !anchor) return

    const reassert = () => {
      // Milkdown SlashProvider 用 floating-ui 按光标写 top，会盖掉贴卡片顶的定位；这里持续压回去
      requestAnimationFrame(() => syncMentionPosition())
    }

    const ro = new ResizeObserver(reassert)
    ro.observe(anchor)

    const mo = new MutationObserver(() => {
      if (el.style.top && el.style.top !== 'auto') reassert()
    })
    mo.observe(el, { attributes: true, attributeFilter: ['style'] })

    window.addEventListener('resize', syncMentionPosition)
    // 立刻一次，并在 floating-ui 默认 debounce(200) 之后再压一次
    syncMentionPosition()
    const t1 = window.setTimeout(reassert, 0)
    const t2 = window.setTimeout(reassert, 220)

    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', syncMentionPosition)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [visible])

  useDebounceEffect(
    () => {
      if (loading || !slashProvider.current || !ref.current) return

      const content = slashProvider.current.getContent(view)
      const keyword = extractMentionFilterKeyword(content)
      if (keyword == null) {
        setFilterKeyword('')
        setVisible(false)
        slashProvider.current.hide()
        releaseMilkdownPopup('mention')
        return
      }

      // 若 / ModeSlash 已占有，@ 只作为 ModeSlash 筛选，不抢开 mention
      if (!tryClaimMilkdownPopup('mention')) {
        setFilterKeyword('')
        setVisible(false)
        slashProvider.current.hide()
        return
      }
      setFilterKeyword(keyword)
      slashProvider.current.show()
      setVisible(true)
      // show 后 display 从 none 恢复，下一帧再量高定位；焦点保持在输入框
      requestAnimationFrame(() => {
        syncMentionPosition()
      })
    },
    [loading, view, prevState],
    { wait: 200, leading: true },
  )

  const onSure = useMemoizedFn((type: AIMentionTypeItem, value?: AIChatMentionSelectItem) => {
    const params: AIMentionCommandParams = {
      mentionType: type,
      mentionId: value?.id || '0',
      mentionName: value?.name || '',
    }
    switch (type) {
      case 'focusMode':
        action(callCommand(removeAIOffsetCommand.key))
        onMemfitExtra?.(params)
        break

      default:
        action(callCommand<AIMentionCommandParams>(aiMentionCommand.key, params))
        break
    }

    onHide()
  })

  const onHide = useMemoizedFn(() => {
    if (!visible && slashProvider.current?.element?.dataset?.show === 'false') return
    setFilterKeyword('')
    setVisible(false)
    view.focus()
    // 关闭窗口
    slashProvider.current?.hide()
    releaseMilkdownPopup('mention')
  })

  return createPortal(
    <div aria-expanded="false" data-show="false" className={styles['ai-mention']} ref={ref}>
      <AIChatMention
        onSelect={onSure}
        filterMode={filterMode}
        keepEditorFocus
        filterKeyword={filterKeyword}
        keyboardTarget={() => view.dom}
        visible={visible}
      />
    </div>,
    document.body,
  )
}

interface AICustomMentionProps {
  sessionId?: string
}
export const AICustomMention: React.FC<AICustomMentionProps> = (props) => {
  const { node, selected, view, contentRef } = useNodeViewContext()
  const locked = useCreation(() => {
    return node?.attrs?.lock ?? false
  }, [node?.attrs?.lock])
  const mentionType: AIMentionTypeItem = useCreation(() => {
    return node?.attrs?.mentionType
  }, [node?.attrs?.mentionType])
  const readonly = useCreation(() => {
    return !view.editable
  }, [view.editable])
  const onRemove = useMemoizedFn(() => {
    if (locked) return
    const { state, dispatch } = view
    const { from, to } = state.selection
    if (from !== to) {
      // 创建一个事务来删除选中的范围
      const tr = state.tr.delete(from, to)

      // 提交事务
      if (dispatch) {
        dispatch(tr)
      }
    }
  })
  const color = useCreation(() => {
    let c: YakitTagColor | undefined = undefined
    switch (mentionType) {
      case 'file':
      case 'folder':
        c = 'blue'
        break
      case 'forge':
        c = 'purple'
        break
      case 'knowledgeBase':
        c = 'yellow'
        break
      case 'tool':
        c = 'lakeBlue'
        break
      case 'browser':
        c = 'blue'
        break
      default:
        break
    }
    return c
  }, [mentionType])
  const closable = useCreation(() => {
    return !readonly && !locked
  }, [readonly, locked])
  return (
    // padding 计入 getBoundingClientRect，光标才会落在 chip 右侧空隙里（margin 无效）
    <span
      className={classNames('ai-mention-custom-host', styles['mention-custom-host'], {
        [styles['mention-custom-host-readonly']]: readonly,
      })}
      contentEditable={false}
    >
      <YakitTag
        border={false}
        closable={closable}
        icon={<div className={styles['mention-icon-wrapper']}>{iconMap[mentionType] || null}</div>}
        onClose={onRemove}
        className={classNames(styles['mention-custom'], {
          [styles['mention-custom-selected']]: selected && !readonly,
          [styles['mention-custom-no-effect']]: !closable,
        })}
        color={color}
        onClick={(e) => {
          if (closable) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        contentEditable={false}
      >
        <div
          className={styles['mention-text']}
          contentEditable={false}
          ref={contentRef}
          title={node?.attrs?.mentionName}
          onClick={(e) => {
            if (closable) {
              e.stopPropagation()
              e.preventDefault()
            }
          }}
        ></div>
      </YakitTag>
    </span>
  )
}
