/**
 * @description 处理一级菜单二次关闭提示
 */

import {YakitModalConfirmProps} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {create} from "zustand"
export interface YakitSecondaryConfirmProps extends Omit<YakitModalConfirmProps, "onOk"> {
    onOk: (m) => void
}
interface SubscribeCloseProps {
    events: Map<string, YakitSecondaryConfirmProps>

    getSubscribeClose: (key: string) => YakitSecondaryConfirmProps | undefined
    setSubscribeClose: (key: string, p: YakitSecondaryConfirmProps) => void
    removeSubscribeClose: (key: string) => void

    clearSubscribeClose: () => void
}
export const useSubscribeClose = create<SubscribeCloseProps>((set, get) => ({
    events: new Map(),
    getSubscribeClose: (key) => get().events.get(key),
    setSubscribeClose: (key, ev) => {
        const newVal = get().events
        newVal.set(key, ev)
        set({
            events: newVal
        })
    },
    removeSubscribeClose: (key) => {
        const newVal = get().events
        newVal.delete(key)
        set({
            events: newVal
        })
    },
    clearSubscribeClose: () => {
        const newVal = get().events
        newVal.clear()
        set({
            events: newVal
        })
    }
}))
