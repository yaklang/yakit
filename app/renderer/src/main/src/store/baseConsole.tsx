/**
 * @description 引擎Console
 */

import {create} from "zustand"

interface StoreProps {
    /**@name console缓存信息 */
    consoleLog: string
    setConsoleInfo: (info: string) => void
}

export const useEngineConsoleStore = create<StoreProps>((set, get) => ({
    consoleLog: "",
    setConsoleInfo: (consoleLog) => set({consoleLog}),
}))
