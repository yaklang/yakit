import {create} from "zustand"

interface MenuBodyHeightProps {
    firstTabMenuBodyHeight: number
}
interface MenuBodyHeightStoreProps {
    menuBodyHeight: MenuBodyHeightProps
    /**更新 menuBodyHeight*/
    updateMenuBodyHeight: (v: MenuBodyHeightProps) => void
}

export const useMenuHeight = create<MenuBodyHeightStoreProps>((set, get) => ({
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
}))
