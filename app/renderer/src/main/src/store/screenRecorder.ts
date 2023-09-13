/**
 * @description 记录录屏
 */

import { randomString } from "@/utils/randomUtil"
import {create} from "zustand"

interface ScreenRecorderProps {
    screenRecorderInfo: ScreenRecorderInfoProps
    setRecording: (b: boolean) => void
    setScreenRecorderInfo: (v: ScreenRecorderInfoProps) => void
    getScreenRecorderInfo: () => void
}

interface ScreenRecorderInfoProps {
    isRecording: boolean
    token:string
}

export const useScreenRecorder = create<ScreenRecorderProps>((set, get) => ({
    screenRecorderInfo: {
        isRecording: false,
        token:randomString(40)
    },
    setRecording: (b: boolean) => {
        const s: ScreenRecorderInfoProps = get().screenRecorderInfo
        set(
            {
                screenRecorderInfo: {
                    ...s,
                    isRecording: b
                }
            }
        )
    },
    setScreenRecorderInfo: (info) => set({ screenRecorderInfo: info }),
    getScreenRecorderInfo: () => get().screenRecorderInfo,
}))
