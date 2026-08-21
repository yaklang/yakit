import { useMemoizedFn } from 'ahooks'
import { useStore, type StoreApi } from 'zustand'
import type { ChatStoreState } from './aiRender'
import { useCurrentStore } from './useCurrentDataBySession'
import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { isAuxOrChildWindow } from '@/utils/isAuxOrChildWindow'

type UiExpandTuple = [boolean, Dispatch<SetStateAction<boolean>>, () => void]

/**
 * 从指定 chatStore 读写卡片展开态。
 * 订阅粒度仅为 uiExpandMap[token]，其它 token 变更不会触发本组件重渲染。
 */
export function useUiExpandFromStore(
  store: StoreApi<ChatStoreState>,
  token: string,
  defaultExpand: boolean,
): UiExpandTuple {
  // 细粒度选择：只取当前 token 的布尔值 / undefined，Object.is 比较避免无关重渲染
  const stored = useStore(store, (state) => (token ? state.uiExpandMap[token] : undefined))
  const expand = stored === undefined ? defaultExpand : stored

  const setExpand = useMemoizedFn<Dispatch<SetStateAction<boolean>>>((next) => {
    if (!token) return
    const prev = store.getState().uiExpandMap[token]
    const prevResolved = prev === undefined ? defaultExpand : prev
    const value = typeof next === 'function' ? next(prevResolved) : next
    store.getState().setUiExpand(token, value)
  })

  const toggleExpand = useMemoizedFn(() => {
    if (!token) return
    store.getState().toggleUiExpand(token, defaultExpand)
  })

  return [expand, setExpand, toggleExpand]
}

/**
 * 主窗口：展开态写入当前会话 chatStore.uiExpandMap（抗 Virtuoso remount）。
 * 子窗口 / 无 token：仅为快照，走本地 useState，不碰主会话 store。
 */
export function useUiExpand(token: string, defaultExpand: boolean): UiExpandTuple {
  const isChildWindow = useRef(isAuxOrChildWindow()).current
  const useLocal = isChildWindow || !token
  const store = useCurrentStore()
  // 子窗口/无 token 仍调用 useCurrentStore（hooks 规则），但用空 token 跳过 map 读写
  const storeTuple = useUiExpandFromStore(store, useLocal ? '' : token, defaultExpand)

  const [localExpand, setLocalExpand] = useState(defaultExpand)
  const setLocal = useMemoizedFn<Dispatch<SetStateAction<boolean>>>((next) => {
    setLocalExpand((prev) => (typeof next === 'function' ? next(prev) : next))
  })
  const toggleLocal = useMemoizedFn(() => {
    setLocalExpand((prev) => !prev)
  })

  if (useLocal) {
    return [localExpand, setLocal, toggleLocal]
  }
  return storeTuple
}
