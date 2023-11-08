import {YakitModalConfirmProps} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {create} from "zustand"
export interface YakitSecondaryConfirmProps extends Omit<YakitModalConfirmProps, "onOk"> {
    onOk: (m) => void
}

/**
 * @name 存放一级菜单各种操作时===二次确认提示的配置信息
 * @description Map结构存放的是各种情况的二次确认提示的配置信息(比如close，reset等等)
 */

interface SubscribeCloseProps {
    events: Map<string, Record<string, YakitSecondaryConfirmProps>>

    getSubscribeClose: (key: string) => Record<string, YakitSecondaryConfirmProps> | undefined
    setSubscribeClose: (key: string, p: Record<string, YakitSecondaryConfirmProps>) => void
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
