import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import type { RunContextMenuActionOptions } from '@/pages/manageRightClickPlugins/types'

/**
 * 右键插件执行宿主（ContextMenuExecutionHost）比较重，首屏先不挂载，
 * 第一次收到 runContextMenuAction 事件再唤醒。
 *
 * 在宿主 Suspense 加载、尚未 emiter.on 的窗口内，后续事件一律入队；
 * 宿主在「注册完监听之后」经 onReady 回调一次性 flush，保证不丢、不重复。
 * 监听就绪后 wake 不再处理，事件直达宿主监听。
 */
export function useContextMenuBoot() {
  const queueRef = useRef<RunContextMenuActionOptions[]>([])
  const hostOnRef = useRef(false)
  /** 宿主已挂上 runContextMenuAction 监听（onReady / replay 之后） */
  const listenerReadyRef = useRef(false)
  const [hostOn, setHostOn] = useState(false)
  hostOnRef.current = hostOn

  const replay = useMemoizedFn(() => {
    listenerReadyRef.current = true
    const queued = queueRef.current
    if (queued.length === 0) return
    queueRef.current = []
    for (const options of queued) {
      emiter.emit('runContextMenuAction', options)
    }
  })

  useEffect(() => {
    const wake = (options: RunContextMenuActionOptions) => {
      // 宿主已在听：本轮 emit 由宿主处理，wake 不再入队，避免重复
      if (listenerReadyRef.current) return
      queueRef.current.push(options)
      if (!hostOnRef.current) {
        hostOnRef.current = true
        setHostOn(true)
      }
    }
    emiter.on('runContextMenuAction', wake)
    return () => {
      emiter.off('runContextMenuAction', wake)
    }
  }, [])
  return { hostOn, replay }
}
