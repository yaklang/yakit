import { CodecTypeProps, contextMenuProps } from "@/components/yakitUI/YakitEditor/YakitEditor"
import {create} from "zustand"


interface StoreProps {
    /**@name Editor缓存信息 */
    customHTTPMutatePlugin: CodecTypeProps[]
    setCustomHTTPMutatePlugin: (info: CodecTypeProps[]) => void
    contextMenuPlugin: contextMenuProps[]
    setContextMenuPlugin: (info: contextMenuProps[]) => void
}

export const useStore = create<StoreProps>((set, get) => ({
    // 自定义HTTP数据包变形处理
    customHTTPMutatePlugin:[],
    setCustomHTTPMutatePlugin: (customHTTPMutatePlugin) => set({customHTTPMutatePlugin}),
    // 插件扩展
    contextMenuPlugin: [],
    setContextMenuPlugin: (contextMenuPlugin) => set({contextMenuPlugin})
}))