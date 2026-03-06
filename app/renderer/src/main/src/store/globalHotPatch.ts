/**
 * @description 全局热加载模板配置 Store
 */

import { create } from "zustand"
import { yakitFailed } from "@/utils/notification"

const { ipcRenderer } = window.require("electron")

export interface GlobalHotPatchTemplateRef {
    Name: string
    Type: string
    Enabled: boolean
}

export interface GlobalHotPatchConfig {
    Enabled: boolean
    Version: string
    Items: GlobalHotPatchTemplateRef[]
}

interface GlobalHotPatchStore {
    globalHotPatchConfig: GlobalHotPatchConfig | null
    setGlobalHotPatchConfig: (config: GlobalHotPatchConfig) => void
    loadGlobalHotPatchConfig: () => Promise<void>
    enableGlobalHotPatch: (name: string) => Promise<void>
    disableGlobalHotPatch: () => Promise<void>
}

export const DEFAULT_GLOBAL_TEMPLATE_NAME = "全局默认模板"
export const DEFAULT_GLOBAL_TEMPLATE_CONTENT = `// 全局 HotPatch 示例（默认模板）
// - MITM / WebFuzzer 都会优先执行全局模板
// - 执行顺序：全局 HotPatch -> 模块 HotPatch
//
// 你可以通过观察请求头中是否出现 X-Yakit-Global-HotPatch 来确认是否生效

hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    req = poc.AppendHTTPPacketHeader(req, "X-Yakit-Global-HotPatch", "1")
    forward(req)
}

beforeRequest = func(https, originReq, req) {
    req = poc.AppendHTTPPacketHeader(req, "X-Yakit-Global-HotPatch", "1")
    return req
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    flow.AddTag("global-hotpatch")
    modify(flow)
}`

export const useGlobalHotPatch = create<GlobalHotPatchStore>((set, get) => ({
    globalHotPatchConfig: null,

    setGlobalHotPatchConfig: (config) => set({ globalHotPatchConfig: config }),

    loadGlobalHotPatchConfig: async () => {
        try {
            const res: GlobalHotPatchConfig = await ipcRenderer.invoke("GetGlobalHotPatchConfig", {})
            set({ globalHotPatchConfig: res })
        } catch (error) {
            yakitFailed(error + "")
        }
    },

    enableGlobalHotPatch: async (name: string) => {
        const { globalHotPatchConfig, loadGlobalHotPatchConfig } = get()
        const expectedVersion = globalHotPatchConfig?.Version || "0"
        try {
            const res: GlobalHotPatchConfig = await ipcRenderer.invoke("SetGlobalHotPatchConfig", {
                Config: { Enabled: true, Version: expectedVersion, Items: [{ Name: name, Type: "global", Enabled: true }] },
                ExpectedVersion: expectedVersion
            })
            set({ globalHotPatchConfig: res })
        } catch (error) {
            yakitFailed(error + "")
            await loadGlobalHotPatchConfig()
        }
    },

    disableGlobalHotPatch: async () => {
        const { globalHotPatchConfig, loadGlobalHotPatchConfig } = get()
        const expectedVersion = globalHotPatchConfig?.Version || "0"
        try {
            const res: GlobalHotPatchConfig = await ipcRenderer.invoke("SetGlobalHotPatchConfig", {
                Config: {
                    Enabled: false,
                    Version: expectedVersion,
                    Items: []
                },
                ExpectedVersion: expectedVersion
            })
            set({ globalHotPatchConfig: res })
        } catch (error) {
            yakitFailed(error + "")
            await loadGlobalHotPatchConfig()
        }
    }
}))

export const useGlobalHotPatchTag = () => {
    const config = useGlobalHotPatch((s) => s.globalHotPatchConfig)
    const globalEnabledTemplateName = config?.Enabled ? (config?.Items?.[0]?.Name || "") : ""
    const onDisableGlobalHotPatch = () => useGlobalHotPatch.getState().disableGlobalHotPatch()
    return { globalEnabledTemplateName, onDisableGlobalHotPatch }
}
