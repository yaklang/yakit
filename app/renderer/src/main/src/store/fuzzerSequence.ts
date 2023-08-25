/**
 * @description 记录录屏
 */

import create from "zustand"
import { subscribeWithSelector } from 'zustand/middleware'

interface FuzzerSequenceProps {
    fuzzerSequenceList: FuzzerSequenceListProps[]
    selectGroupId: string

    setSelectGroupId: (s: string) => void
    addFuzzerSequenceList: (f: FuzzerSequenceListProps) => void
    removeFuzzerSequenceList: (f: FuzzerSequenceListProps) => void
}

export interface FuzzerSequenceListProps {
    groupId: string
}

export const useFuzzerSequence = create<FuzzerSequenceProps>()(subscribeWithSelector((set, get) => ({
    fuzzerSequenceList: [],
    selectGroupId: '',
    setSelectGroupId: (val) => {
        const s = get()
        if (!s) return
        set(
            {
                ...s,
                selectGroupId:val
            }
        )
    },
    addFuzzerSequenceList: (val) => {
        const s = get()
        if (!s) return
        const isHave=s.fuzzerSequenceList.filter(ele => ele.groupId === val.groupId).length > 0
        if(isHave)return
        set(
            {
                ...s,
                fuzzerSequenceList: [
                    ...s.fuzzerSequenceList,
                    val
                ]
            }
        )
    },
    removeFuzzerSequenceList: (val) => {
        const s = get()
        if (!s) return
        set(
            {
                ...s,
                fuzzerSequenceList: s.fuzzerSequenceList.filter(ele => ele.groupId !== val.groupId)
            }
        )
    },
})))
