import { useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { convertKeyEventToKeyCombination, sortKeysCombination } from '@/utils/globalShortcutKey/utils'
import emiter from '@/utils/eventBus/eventBus'
import { queryContextMenuActions } from './api'
import { ContextMenuResultMode, type ContextMenuAction, type ContextMenuScene } from './types'

const normalizeShortcut = (shortcut: string) =>
  sortKeysCombination(
    shortcut
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean),
  ).join('|')

const shouldIgnoreShortcut = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName)
}

export const useContextMenuActions = ({
  scene,
  enabled = true,
  onShortcut,
}: {
  scene: ContextMenuScene
  enabled?: boolean
  onShortcut?: (action: ContextMenuAction) => void
}) => {
  const [actions, setActions] = useState<ContextMenuAction[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useMemoizedFn(async () => {
    if (!enabled) {
      setActions([])
      return
    }
    setLoading(true)
    try {
      const response = await queryContextMenuActions({ Scene: scene })
      setActions(
        (response.Actions || [])
          .filter((action) => action.Enabled)
          .map((action) => ({
            ...action,
            Params: action.Params || [],
            Shortcut: action.Shortcut || '',
            ResultMode: action.ResultMode || ContextMenuResultMode.Auto,
            Sort: Number(action.Sort || 0),
          }))
          .sort((left, right) => left.Sort - right.Sort || left.PluginName.localeCompare(right.PluginName)),
      )
    } catch {
      setActions([])
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    refresh()
  }, [scene, enabled])

  useEffect(() => {
    emiter.on('refreshContextMenuActions', refresh)
    return () => emiter.off('refreshContextMenuActions', refresh)
  }, [])

  useEffect(() => {
    if (!enabled || !onShortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || shouldIgnoreShortcut(event.target)) return
      const keys = convertKeyEventToKeyCombination(event)
      if (!keys?.length) return
      const shortcut = sortKeysCombination(keys).join('|')
      const action = actions.find(
        (item) => item.Scene === scene && item.Shortcut && normalizeShortcut(item.Shortcut) === shortcut,
      )
      if (!action) return
      event.preventDefault()
      event.stopPropagation()
      onShortcut(action)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [enabled, actions, onShortcut, scene])

  return { actions: actions.filter((action) => action.Scene === scene), loading, refresh }
}
