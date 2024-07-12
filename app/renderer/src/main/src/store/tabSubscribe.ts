import {YakitModalConfirmProps} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {create} from "zustand"
export interface YakitSecondaryConfirmProps extends Omit<YakitModalConfirmProps, "onOk"> {
    onOk: (m) => void
}

/**
 * @description 出现这个定义的原因，某些页面在关闭时，需要控制关闭确认是否提示，所以需要一个方法进行输出判断
 */
export type SubscribeCloseType = YakitSecondaryConfirmProps | (() => Promise<YakitSecondaryConfirmProps | undefined>)

/**
 * @name 存放一级菜单各种操作时===二次确认提示的配置信息
 * @description Map结构存放的是各种情况的二次确认提示的配置信息(比如close，reset等等)
 */

interface SubscribeCloseProps {
    events: Map<string, Record<string, SubscribeCloseType>>

    getSubscribeClose: (key: string) => Record<string, SubscribeCloseType> | undefined
    setSubscribeClose: (key: string, p: Record<string, SubscribeCloseType>) => void
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
