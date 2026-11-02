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
  isMenuVisibilityLoading: boolean
  initMenuVisibility: () => Promise<void>
  toggleMenuVisibility: DebouncedFunc<() => void>
  menuBodyHeight: MenuBodyHeightProps
  /**更新 menuBodyHeight*/
  updateMenuBodyHeight: (v: MenuBodyHeightProps) => void
}

let menuVisibilityInitialization: Promise<void> | undefined

export const useMenuHeight = createWithEqualityFn<MenuBodyHeightStoreProps>(
  (set, get) => ({
    isMenuVisible: true,
    isMenuVisibilityLoading: true,
    initMenuVisibility: () => {
      if (menuVisibilityInitialization) return menuVisibilityInitialization
      set({ isMenuVisibilityLoading: true })
      menuVisibilityInitialization = getRemoteValue(CodeGV.MenuVisible)
        .then((value) => {
          set({ isMenuVisible: value !== 'false', isMenuVisibilityLoading: false })
        })
        .catch((error) => {
          yakitFailed(String(error))
        })
        .finally(() => {
          menuVisibilityInitialization = undefined
        })
      return menuVisibilityInitialization
    },
    toggleMenuVisibility: debounce(
      () => {
        if (get().isMenuVisibilityLoading) return
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
