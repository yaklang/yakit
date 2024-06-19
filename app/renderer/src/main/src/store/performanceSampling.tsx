/**
 * @description 记录录屏
 */

import {randomString} from "@/utils/randomUtil"
import {create} from "zustand"

interface PerformanceSamplingProps {
    performanceSamplingInfo: PerformanceSamplingInfoProps
    setSampling: (b: boolean) => void
    setPerformanceSamplingLog: (log: PerformanceSamplingLog[]) => void
}

export interface PerformanceSamplingLog {
    title: string
    path: string
    dir: string
}

interface PerformanceSamplingInfoProps {
    isPerformanceSampling: boolean
    token: string
    log: PerformanceSamplingLog[]
}

export const usePerformanceSampling = create<PerformanceSamplingProps>((set, get) => ({
    performanceSamplingInfo: {
        isPerformanceSampling: false,
        token: randomString(40),
        log: []
    },
    setSampling: (b: boolean) => {
        const s: PerformanceSamplingInfoProps = get().performanceSamplingInfo
        set({
            performanceSamplingInfo: {
                ...s,
                isPerformanceSampling: b
            }
        })
    },
    setPerformanceSamplingLog: (log: PerformanceSamplingLog[]) => {
        const s: PerformanceSamplingInfoProps = get().performanceSamplingInfo
        set({
            performanceSamplingInfo: {
                ...s,
                log
            }
        })
    }
}))
