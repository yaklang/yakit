import { create } from 'zustand'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { HTTP_PACKET_EDITOR_Line_Breaks } from '@/utils/editors'
import { yakitFailed } from '@/utils/notification'

interface EditorShowLineBreaksStore {
  /**@name 编辑器全局是否显示换行符 */
  showLineBreaks: boolean
  /**@name 设置是否显示换行符 */
  setShowLineBreaks: (show: boolean) => void
  /**@name 初始化换行符显示(从缓存读取) */
  initShowLineBreaks: () => Promise<void>
}

let showLineBreaksInitPromise: Promise<void> | null = null

export const useEditorShowLineBreaks = create<EditorShowLineBreaksStore>((set, get) => ({
  showLineBreaks: true,
  setShowLineBreaks: (showLineBreaks) => {
    if (get().showLineBreaks === showLineBreaks) return
    set({ showLineBreaks })
    setRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks, showLineBreaks ? 'true' : 'false')
  },
  initShowLineBreaks: async () => {
    // 全局只初始化一次，避免多个编辑器同时 init 互相触发重渲染
    if (showLineBreaksInitPromise) return showLineBreaksInitPromise
    showLineBreaksInitPromise = (async () => {
      try {
        const data = await getRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks)
        // 仅当缓存明确为 true/false 且与当前值不同时更新，避免无意义重渲染
        if (data === 'true' || data === 'false') {
          const showLineBreaks = data === 'true'
          if (get().showLineBreaks !== showLineBreaks) {
            set({ showLineBreaks })
          }
        }
      } catch (error) {
        yakitFailed(error + '')
      }
    })()
    return showLineBreaksInitPromise
  },
}))
