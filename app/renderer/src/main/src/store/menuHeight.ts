import {createWithEqualityFn} from "zustand/traditional"

interface MenuBodyHeightProps {
    firstTabMenuBodyHeight: number
}
interface MenuBodyHeightStoreProps {
    menuBodyHeight: MenuBodyHeightProps
    /**更新 menuBodyHeight*/
    updateMenuBodyHeight: (v: MenuBodyHeightProps) => void
}

export const useMenuHeight = createWithEqualityFn<MenuBodyHeightStoreProps>(
    (set, get) => ({
        menuBodyHeight: {
            firstTabMenuBodyHeight: 0
        },
        updateMenuBodyHeight: (value) => {
            const newVal = get().menuBodyHeight
            set({
                menuBodyHeight: {
                    ...newVal,
                    ...value
                }
            })
        }
    }),
    Object.is
)
