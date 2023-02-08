import create from "zustand"

interface StoreProps {
    /**@name console缓存信息 */
    consoleLog: string,
    isFirst:boolean,
    setConsoleInfo: (info: string) => void
    setIsFirst: (info: boolean) => void
}

export const useStore = create<StoreProps>((set, get) => ({
    consoleLog: "",
    isFirst:true,
    setConsoleInfo: (consoleLog) => set({consoleLog}),
    setIsFirst: (isFirst) => set({isFirst}),
}))
