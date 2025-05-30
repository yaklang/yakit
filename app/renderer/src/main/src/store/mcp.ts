/**
 * @description mcp
 */

import {StartMcpServerResponse} from "@/utils/ConfigSystemMcp"
import {create} from "zustand"

interface StoreProps {
    mcpToken: string
    setMcpToken: (mcpToken: string) => void
    mcpCurrent: StartMcpServerResponse | undefined
    setMcpCurrent: (mcpCurrent: StartMcpServerResponse | undefined) => void
    mcpServerUrl: string
    setMcpServerUrl: (mcpServerUrl: string) => void
}

export const useMcpStore = create<StoreProps>((set, get) => ({
    mcpToken: "",
    setMcpToken: (mcpToken) => set({mcpToken}),
    mcpCurrent: undefined,
    setMcpCurrent: (mcpCurrent) => set({mcpCurrent}),
    mcpServerUrl: "",
    setMcpServerUrl: (mcpServerUrl) => set({mcpServerUrl})
}))
