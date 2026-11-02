import { createWithEqualityFn } from 'zustand/traditional'
import debounce from 'lodash/debounce'
import type { DebouncedFunc } from 'lodash'
import { CodeGV } from '@/yakitGV'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { yakitFailed } from '@/utils/notification'

interface MenuBodyHeightProps {
  firstTabMenuBodyHeight: number
}
interface MenuBodyHeightStoreProps {
  isMenuVisible: boolean
  initMenuVisibility: () => Promise<void>
  toggleMenuVisibility: DebouncedFunc<() => void>
  menuBodyHeight: MenuBodyHeightProps
  /**更新 menuBodyHeight*/
  updateMenuBodyHeight: (v: MenuBodyHeightProps) => void
}

export const useMenuHeight = createWithEqualityFn<MenuBodyHeightStoreProps>(
  (set, get) => ({
    isMenuVisible: true,
    initMenuVisibility: async () => {
      try {
        const value = await getRemoteValue(CodeGV.MenuVisible)
        set({ isMenuVisible: value !== 'false' })
      } catch (error) {
        yakitFailed(String(error))
      }
    },
    toggleMenuVisibility: debounce(
      () => {
        const isMenuVisible = !get().isMenuVisible
        set({ isMenuVisible })
        setRemoteValue(CodeGV.MenuVisible, String(isMenuVisible)).catch((error) => {
          yakitFailed(String(error))
        })
      },
      500,
      { leading: true },
    ),
    menuBodyHeight: {
      firstTabMenuBodyHeight: 0,
    },
    updateMenuBodyHeight: (value) => {
      const newVal = get().menuBodyHeight
      set({
        menuBodyHeight: {
          ...newVal,
          ...value,
        },
      })
    },
  }),
  Object.is,
)
