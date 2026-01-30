import {Ctx} from "@milkdown/kit/ctx"
import {prosePluginsCtx} from "@milkdown/kit/core"
import {Plugin, PluginKey} from "prosemirror-state"
import {TextSelection} from "prosemirror-state"
import {$command} from "@milkdown/kit/utils"

type LockGuardOptions = {
    mentionTypes: string[]
    lockAttr?: string
}

const DEFAULT_LOCK_ATTR = "lock"

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
    const {mentionTypes, lockAttr = DEFAULT_LOCK_ATTR} = options

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
        const {selection} = state
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
        isLockedAtCursor
    }
}

/**
 * 创建一个 ProseMirror Plugin，用于防止删除被锁定的 mention
 * - DOM 层快速拦截，减少 transaction 生成
 * - transaction 层兜底，保证语义安全
 * - 所有判断均基于 mentionType + lock 属性
 */
export function createLockGuardPlugin(options: LockGuardOptions) {
    const {hasLockedNodeInRange, isLockedAtCursor} = createLockGuards(options)

    return new Plugin({
        key: new PluginKey(`lock-guard-${options.mentionTypes.join("-")}`),

        props: {
            handleKeyDown(view, event) {
                if (event.key !== "Backspace" && event.key !== "Delete") return false

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
                    const {selection} = view.state
                    if (
                        selection instanceof TextSelection &&
                        !selection.empty &&
                        hasLockedNodeInRange(view.state, selection.from, selection.to)
                    ) {
                        event.preventDefault()
                        return true
                    }
                    return false
                }
            }
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
                if (!json || json.stepType !== "replace") continue

                if (json.from !== json.to && hasLockedNodeInRange(state, json.from, json.to)) {
                    return false
                }
            }

            return true
        }
    })
}

/** Milkdown 插件：注入 ProseMirror Plugin */
export const preventDeleteLockedMentionPlugin = () => {
    const plugin = createLockGuardPlugin({
        mentionTypes: ["knowledgeBase"]
    })

    return (ctx: Ctx) => {
        ctx.update(prosePluginsCtx, (plugins) => [...plugins, plugin])
        return () => {}
    }
}

/** 移除一个偏移量 */
export const removeAIOffsetCommand = $command(`command-remove-offset`, (ctx) => () => (state, dispatch) => {
    const {selection, tr} = state
    if (!(selection instanceof TextSelection)) return false
    const {from} = selection
    tr.deleteRange(from - 1, from)
    dispatch?.(tr.scrollIntoView())
    return true
})

/** 你的自定义插件集合 */
export const aiCustomPlugin = () => {
    return [removeAIOffsetCommand, preventDeleteLockedMentionPlugin()]
}
