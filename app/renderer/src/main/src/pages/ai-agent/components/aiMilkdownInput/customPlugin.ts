import type { Ctx } from '@milkdown/kit/ctx'
import { prosePluginsCtx } from '@milkdown/kit/core'
import { insertImageCommand } from '@milkdown/kit/preset/commonmark'
import { Plugin, PluginKey, Selection, TextSelection } from '@milkdown/kit/prose/state'
import { $command, $prose, callCommand } from '@milkdown/kit/utils'
import type { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { imgTypes } from '@/components/MilkdownEditor/utils/utils'
import type { MaterialShortcut } from '../../template/aiAddMaterialsPopover/type'
import { aiMentionCommand } from './aiMilkdownMention/aiMentionPlugin'
import type { AIMentionCommandParams } from './aiMilkdownMention/aiMentionPlugin'
import { IMAGE_ATTACHMENT_TITLE } from './utils'

type LockGuardOptions = {
  mentionTypes: string[]
  lockAttr?: string
}

const DEFAULT_LOCK_ATTR = 'lock'

/**
 * 根据配置生成一个「是否为锁定 mention 节点」的判断函数
 * - 精确判断一个 ProseMirror Node 是否是「需要防删除的 mention」
 * - 同时校验：
 *   1. 是否存在 attrs
 *   2. 是否带有 lock 标记
 *   3. mentionType 是否在允许列表中
 *
 *
 */
function createIsLockedMention(options: LockGuardOptions) {
  const { mentionTypes, lockAttr = DEFAULT_LOCK_ATTR } = options

  // 将 mentionTypes 转为 Set，提高查询性能
  const typeSet = new Set(mentionTypes)

  return function isLockedMention(node: any) {
    if (!node?.attrs) return false
    if (node.attrs[lockAttr] !== true) return false
    if (!typeSet.has(node.attrs.mentionType)) return false
    return true
  }
}

/**
 * - 封装所有与“锁定 mention 检测”相关的逻辑
 * - 对外只暴露两个高层语义方法：
 *   - hasLockedNodeInRange：范围判断
 *   - isLockedAtCursor：光标态判断
 */
function createLockGuards(options: LockGuardOptions) {
  const isLockedMention = createIsLockedMention(options)

  /**
   * 判断某个文档区间内是否包含被锁定的 mention 节点
   * - 使用 nodesBetween
   * - 一旦命中立即中断遍历（return false）
   */
  function hasLockedNodeInRange(state, from, to) {
    let locked = false
    state.doc.nodesBetween(from, to, (node) => {
      if (isLockedMention(node)) {
        locked = true
        return false
      }
    })
    return locked
  }

  /**
   * 判断当前光标位置是否「处于锁定 mention 的影响范围内」
   * - 不扫描整棵树
   * - 只检查常数个节点
   */
  function isLockedAtCursor(state) {
    const { selection } = state
    if (!(selection instanceof TextSelection)) return false

    // 多选：直接走范围扫描
    if (!selection.empty) {
      return hasLockedNodeInRange(state, selection.from, selection.to)
    }

    // 单点光标
    const $pos = state.doc.resolve(selection.from)

    if (isLockedMention($pos.parent)) return true
    if (isLockedMention($pos.nodeBefore)) return true
    if (isLockedMention($pos.nodeAfter)) return true

    return false
  }
  return {
    hasLockedNodeInRange,
    isLockedAtCursor,
  }
}

/**
 * 创建一个 ProseMirror Plugin，用于防止删除被锁定的 mention
 * - DOM 层快速拦截，减少 transaction 生成
 * - transaction 层兜底，保证语义安全
 * - 所有判断均基于 mentionType + lock 属性
 */
export function createLockGuardPlugin(options: LockGuardOptions) {
  const { hasLockedNodeInRange, isLockedAtCursor } = createLockGuards(options)

  return new Plugin({
    key: new PluginKey(`lock-guard-${options.mentionTypes.join('-')}`),

    props: {
      handleKeyDown(view, event) {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return false

        if (isLockedAtCursor(view.state)) {
          event.preventDefault()
          return true
        }
        return false
      },

      /**
       * DOM 层：拦截剪切行为
       */
      handleDOMEvents: {
        cut(view, event) {
          const { selection } = view.state
          if (
            selection instanceof TextSelection &&
            !selection.empty &&
            hasLockedNodeInRange(view.state, selection.from, selection.to)
          ) {
            event.preventDefault()
            return true
          }
          return false
        },
      },
    },

    /**
     * transaction 层兜底：
     * - 防止程序性删除
     * - 防止第三方插件绕过 DOM 事件
     */
    filterTransaction(tr, state) {
      if (!tr.docChanged) return true

      // 单点光标且不在锁定区域，直接放行（性能优化）
      const sel = state.selection
      if (sel instanceof TextSelection && sel.empty && !isLockedAtCursor(state)) {
        return true
      }

      // 检查 replace / delete step 是否影响锁定节点
      for (const step of tr.steps) {
        const json = step.toJSON?.()
        if (!json || json.stepType !== 'replace') continue

        if (json.from !== json.to && hasLockedNodeInRange(state, json.from, json.to)) {
          return false
        }
      }

      return true
    },
  })
}

/** Milkdown 插件：注入 ProseMirror Plugin */
export const preventDeleteLockedMentionPlugin = () => {
  const plugin = createLockGuardPlugin({
    mentionTypes: ['knowledgeBase'],
  })

  return (ctx: Ctx) => {
    ctx.update(prosePluginsCtx, (plugins) => [...plugins, plugin])
    return () => {}
  }
}

export const insertAIMention = (editor: EditorMilkdownProps, params: AIMentionCommandParams) => {
  const path = params.mentionId
  if (
    params.mentionType === 'file' &&
    params.mentionSource === 'attachment' &&
    !params.lock &&
    imgTypes.some((suffix) => path.toLowerCase().endsWith(suffix))
  ) {
    editor.action(callCommand(insertImageCommand.key, { src: path, alt: path, title: IMAGE_ATTACHMENT_TITLE }))
    return
  }
  editor.action(callCommand(aiMentionCommand.key, params))
}

export const insertAIShortcutCommand = $command<MaterialShortcut, string>(
  'InsertAIShortcut',
  () => (shortcut) => (state, dispatch, view) => {
    if (!shortcut || !view || view.isDestroyed || !view.editable) return false
    if (!dispatch) return true

    const { doc, schema, selection, tr } = state
    const paragraph = schema.nodes.paragraph
    let cursor = selection.$to
    if (!(selection instanceof TextSelection) || cursor.parent.type !== paragraph) {
      const end = Selection.atEnd(doc)
      if (end instanceof TextSelection && end.$to.parent.type === paragraph) {
        cursor = end.$to
      } else {
        tr.insert(doc.content.size, paragraph.create())
        cursor = tr.doc.resolve(tr.doc.content.size - 1)
      }
    }

    const { parent, parentOffset, pos } = cursor
    const previous = parent.textBetween(Math.max(0, parentOffset - 1), parentOffset, '\n', '\uFFFC')
    // 现有 @ 和 / 菜单只识别行首或空白后的触发符。
    const text = previous && !/\s/.test(previous) ? ` ${shortcut}` : shortcut
    tr.insertText(text, pos, pos)
    tr.setSelection(TextSelection.create(tr.doc, pos + text.length))
    view.focus()
    dispatch(tr)
    return true
  },
)

/** 移除一个偏移量 */
export const removeAIOffsetCommand = $command(`command-remove-offset`, (ctx) => () => (state, dispatch) => {
  const { selection, tr } = state
  if (!(selection instanceof TextSelection)) return false
  const { from } = selection
  tr.deleteRange(from - 1, from)
  dispatch?.(tr.scrollIntoView())
  return true
})

/** 在当前位置插入纯文本 */
export const insertAtCurrentPosition = $command<string, string>('command-insertAtCurrentPosition', (ctx) => (props) => {
  return (state, dispatch) => {
    if (!props) return false

    const textNode = state.schema.text(props || '')

    // 插入节点
    const transaction = state.tr.replaceSelectionWith(textNode)
    if (dispatch) {
      dispatch(transaction)
    }

    return true // 表示命令成功执行
  }
})
/**
 * @description md编辑器内联组件，末尾输入空格没法跳出当前内联组件，
 * 目前只处理a标签
 */
const stepOutLinkPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('step-out-link'),
    props: {
      handleTextInput(view, from, to, text) {
        // 当用户刚好输入了一个空格字符
        if (text === ' ') {
          const { state } = view
          const linkMark = state.schema.marks.link

          if (!linkMark) return false

          const currentMarks = state.storedMarks || state.selection.$from.marks()
          // 检查当前所处的光标位置是否被标记为了链接
          if (linkMark.isInSet(currentMarks)) {
            // 接管输入，先移除接下来的链接样式，再向编辑器插入纯净的空格
            const tr = state.tr.removeStoredMark(linkMark).insertText(' ', from, to)
            view.dispatch(tr)
            return true
          }
        }
        return false
      },
    },
  })
})
/** 你的自定义插件集合 */
export const aiCustomPlugin = () => {
  return [
    insertAIShortcutCommand,
    removeAIOffsetCommand,
    preventDeleteLockedMentionPlugin(),
    insertAtCurrentPosition,
    stepOutLinkPlugin,
  ]
}
