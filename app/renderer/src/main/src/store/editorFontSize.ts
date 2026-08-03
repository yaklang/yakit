import { create } from 'zustand'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { HTTP_PACKET_EDITOR_FONT_SIZE } from '@/utils/editors'
import { yakitFailed } from '@/utils/notification'
import { JSONParseLog } from '@/utils/tool'

interface EditorFontSizeStore {
  /**@name 编辑器全局字体大小 */
  fontSize: number
  /**@name 设置字体大小 */
  setFontSize: (size: number) => void
  /**@name 初始化字体大小(从缓存读取) */
  initFontSize: () => Promise<void>
}

export const fontSizeOptions = [12, 13, 14, 15, 16, 17, 18, 19, 20]

let fontSizeInitPromise: Promise<void> | null = null

export const useEditorFontSize = create<EditorFontSizeStore>((set, get) => ({
  fontSize: 12,
  setFontSize: (fontSize) => {
    if (get().fontSize === fontSize) return
    set({ fontSize })
    setRemoteValue(HTTP_PACKET_EDITOR_FONT_SIZE, JSON.stringify({ fontSize }))
  },
  initFontSize: async () => {
    // 全局只初始化一次，避免多个编辑器同时 init 互相触发重渲染
    if (fontSizeInitPromise) return fontSizeInitPromise
    fontSizeInitPromise = (async () => {
      try {
        const data = await getRemoteValue(HTTP_PACKET_EDITOR_FONT_SIZE)
        if (data) {
          const obj = JSONParseLog(data, { page: 'editorFontSize', fun: 'initFontSize' })
          if (obj?.fontSize && obj.fontSize >= 12 && obj.fontSize <= 20 && get().fontSize !== obj.fontSize) {
            set({ fontSize: obj.fontSize })
          }
        }
      } catch (error) {
        yakitFailed(error + '')
      }
    })()
    return fontSizeInitPromise
  },
}))
