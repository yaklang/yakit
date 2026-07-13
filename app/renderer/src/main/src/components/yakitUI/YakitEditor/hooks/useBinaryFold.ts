import { useMemo, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { monaco } from 'react-monaco-editor'
import {
  BinaryFuzztagEntry,
  collapseBinaryFuzztag,
  expandBinaryFuzztag,
} from '../binaryFuzztag'
import { MAX_BINARY_FOLD_ENTRIES } from '../constants'

export interface UseBinaryFoldParams {
  value?: string
  setValue?: (content: string) => any
  onChange?: (content: string) => any
  foldBinaryFuzztag?: boolean
  type?: string
}

export interface UseBinaryFoldResult {
  foldBinaryEnabled: boolean
  binaryFoldEntriesRef: React.MutableRefObject<Map<string, BinaryFuzztagEntry>>
  binaryFoldRangesRef: React.MutableRefObject<{ id: string; range: monaco.Range; ordinal: number }[]>
  binaryModifiedOrdinalsRef: React.MutableRefObject<Set<number>>
  displayValue: string | undefined
  handleBinaryChange: (content: string) => void
}

/**
 * 二进制 Fuzztag 折叠：翻译边界
 *
 * 仅在 foldBinaryFuzztag 且 http 类型下启用；模型存短占位，向上抛真实值，下游消费者无感知
 */
export const useBinaryFold = (params: UseBinaryFoldParams): UseBinaryFoldResult => {
  const { value, setValue, onChange, foldBinaryFuzztag, type } = params

  // 仅在 foldBinaryFuzztag 且 http 类型下启用；模型存短占位，向上抛真实值，下游消费者无感知
  const foldBinaryEnabled = !!foldBinaryFuzztag && type === 'http'
  // 侧表：占位 id -> 原始标签信息；handleBinaryChange 据此 expand 还原真实文本
  const binaryFoldEntriesRef = useRef<Map<string, BinaryFuzztagEntry>>(new Map())
  // 占位范围（仿 privacyMaskRangesRef），用于点击命中打开 HEX 编辑弹窗
  const binaryFoldRangesRef = useRef<{ id: string; range: monaco.Range; ordinal: number }[]>([])
  // "被修改"记录：按编辑器中第 N 个二进制标签(文档顺序的序号)记录，只记是否改过(布尔)。
  // 与内容/占位 id 解耦，保证复制粘贴出去的永远是纯内容、不含任何改动元数据。
  const binaryModifiedOrdinalsRef = useRef<Set<number>>(new Set())

  // 计算传给 MonacoEditor 的展示文本（真实值 -> 占位）
  const displayValue = useMemo(() => {
    if (!foldBinaryEnabled) {
      // 原地清空而非替换对象，保持注册表里登记的 map 引用一直有效
      binaryFoldEntriesRef.current.clear()
      binaryModifiedOrdinalsRef.current.clear()
      return value
    }
    const { text, entries } = collapseBinaryFuzztag(value ?? '')
    // 累积合并而非整表替换：保留历史占位映射。
    // 原因：用户在占位上 backspace 会把占位破坏成非法 fuzztag（如缺一个 }），
    // 此时 expand 无法匹配 -> 真实二进制会被破坏文本顶替丢失；若再整表替换映射，
    // 即使补回 }} 也找不到 id 对应的原始标签，Binary 小块与内容永久无法恢复。
    // 保留映射后，补回完整占位即可由 expand 还原真实内容并重新折叠出小块。
    const map = binaryFoldEntriesRef.current
    entries.forEach((v, k) => {
      // 重新插入以将当前文本中的项标记为最新，避免被下方内存淘汰
      map.delete(k)
      map.set(k, v)
    })
    // 限制内存上限，淘汰最旧项；当前文本中的项已在上面置为最新，不会被淘汰
    while (map.size > MAX_BINARY_FOLD_ENTRIES) {
      const oldest = map.keys().next().value
      if (oldest === undefined) {
        break
      }
      map.delete(oldest)
    }
    return text
  }, [value, foldBinaryEnabled])

  // 向上回调：占位 -> 真实值
  const handleBinaryChange = useMemoizedFn((content: string) => {
    const emit = setValue || onChange
    if (!emit) {
      return
    }
    if (!foldBinaryEnabled) {
      emit(content)
      return
    }
    emit(expandBinaryFuzztag(content, binaryFoldEntriesRef.current))
  })

  return {
    foldBinaryEnabled,
    binaryFoldEntriesRef,
    binaryFoldRangesRef,
    binaryModifiedOrdinalsRef,
    displayValue,
    handleBinaryChange,
  }
}