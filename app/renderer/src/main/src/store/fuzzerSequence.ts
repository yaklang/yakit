/**
 * @description 记录录屏
 */

import {SequenceProps} from "@/pages/fuzzer/FuzzerSequence/FuzzerSequenceType"
import {setRemoteProjectValue} from "@/utils/kv"
import create from "zustand"
import {subscribeWithSelector} from "zustand/middleware"
import debounce from "lodash/debounce"
import {RemoteGV} from "@/yakitGV"

interface FuzzerSequenceProps {
    fuzzerList: FuzzerListProps[]
    fuzzerSequenceList: FuzzerSequenceListProps[]
    fuzzerSequenceCacheData: FuzzerSequenceCacheDataProps[]

    addFuzzerSequenceList: (f: FuzzerSequenceListProps) => void
    /**删除 fuzzerSequenceList 的同时也会删除 fuzzerSequenceCacheData中的 groupId相同的数据*/
    removeFuzzerSequenceList: (f: FuzzerSequenceListProps) => void

    initFuzzerSequenceCacheData: (v: FuzzerSequenceCacheDataProps[]) => void
    queryFuzzerSequenceCacheDataByGroupId: (groupId: string) => SequenceProps[]
    addFuzzerSequenceCacheData: (groupId: string, v: SequenceProps[]) => void
    updateFuzzerSequenceCacheData: (groupId: string, v: SequenceProps[]) => void
    removeFuzzerSequenceCacheData: (groupId: string) => void
}

export interface FuzzerListProps {}
export interface FuzzerSequenceListProps {
    groupId: string
}

export interface FuzzerSequenceCacheDataProps {
    groupId: string
    cacheData: SequenceProps[]
}

export const useFuzzerSequence = create<FuzzerSequenceProps>()(
    subscribeWithSelector((set, get) => ({
        fuzzerList: [],
        fuzzerSequenceList: [],
        fuzzerSequenceCacheData: [],
        addFuzzerSequenceList: (val) => {
            const s = get()
            if (!s) return
            const isHave = s.fuzzerSequenceList.filter((ele) => ele.groupId === val.groupId).length > 0
            if (isHave) return
            set({
                ...s,
                fuzzerSequenceList: [...s.fuzzerSequenceList, val]
            })
        },
        removeFuzzerSequenceList: (val) => {
            const s = get()
            if (!s) return
            set({
                ...s,
                fuzzerSequenceList: s.fuzzerSequenceList.filter((ele) => ele.groupId !== val.groupId),
                fuzzerSequenceCacheData: s.fuzzerSequenceCacheData.filter((ele) => ele.groupId !== val.groupId)
            })
        },
        initFuzzerSequenceCacheData: (values) => {
            const s = get()
            if (!s) return
            set({
                ...s,
                fuzzerSequenceCacheData: values
            })
        },
        queryFuzzerSequenceCacheDataByGroupId: (groupId) => {
            const cacheDataList = get().fuzzerSequenceCacheData
            const queryCacheData = cacheDataList.find((ele) => ele.groupId === groupId)
            return queryCacheData ? queryCacheData.cacheData : []
        },
        addFuzzerSequenceCacheData: (groupId, values) => {
            let allCacheList = get().fuzzerSequenceCacheData
            let index = allCacheList.findIndex((ele) => ele.groupId === groupId)
            if (index === -1) {
                allCacheList = [
                    ...allCacheList,
                    {
                        groupId,
                        cacheData: values
                    }
                ]
                set({
                    ...get(),
                    fuzzerSequenceCacheData: [...allCacheList]
                })
            }
        },
        updateFuzzerSequenceCacheData: (groupId, cacheList) => {
            const allCacheList = get().fuzzerSequenceCacheData
            let index = allCacheList.findIndex((ele) => ele.groupId === groupId)
            if (index !== -1) {
                allCacheList[index].cacheData = [...cacheList]
                set({
                    ...get(),
                    fuzzerSequenceCacheData: [...allCacheList]
                })
            }
        },
        removeFuzzerSequenceCacheData: (groupId) => {}
    }))
)
try {
    /**
     *  @description 打开软化后这个订阅会一直存在，直到关闭软件;后续再看看优化方法
     */
    const unFuzzerSequenceCacheData = useFuzzerSequence.subscribe(
        (state) => state.fuzzerSequenceCacheData,
        (selectedState, previousSelectedState) => {
            saveFuzzerSequenceCache(selectedState)
        }
    )

    const saveFuzzerSequenceCache = debounce((selectedState) => {
        // console.log("saveFuzzerSequenceCache", selectedState)
        setRemoteProjectValue(RemoteGV.FuzzerSequenceCache, JSON.stringify(selectedState))
    }, 500)
} catch (error) {}
