/**
 * @description 记录录屏
 */

import {SequenceProps} from "@/pages/fuzzer/FuzzerSequence/FuzzerSequenceType"
import {setRemoteProjectValue} from "@/utils/kv"
import {create} from "zustand"
import {subscribeWithSelector, persist, createJSONStorage} from "zustand/middleware"
import debounce from "lodash/debounce"
import {RemoteGV} from "@/yakitGV"
import {yakitNotify} from "@/utils/notification"
import { createWithEqualityFn } from "zustand/traditional"

interface FuzzerSequenceProps {
    fuzzerSequenceList: FuzzerSequenceListProps[]
    fuzzerSequenceCacheData: FuzzerSequenceCacheDataProps[]
    hotPatchCode: string

    addFuzzerSequenceList: (f: FuzzerSequenceListProps) => void
    /**删除 fuzzerSequenceList 的同时也会删除 fuzzerSequenceCacheData中的 groupId相同的数据*/
    removeFuzzerSequenceList: (f: FuzzerSequenceListProps) => void

    setFuzzerSequenceCacheData: (v: FuzzerSequenceCacheDataProps[]) => void
    queryFuzzerSequenceCacheDataByGroupId: (groupId: string) => SequenceProps[]
    addFuzzerSequenceCacheData: (groupId: string, v: SequenceProps[]) => void
    updateFuzzerSequenceCacheData: (groupId: string, v: SequenceProps[]) => void
    removeFuzzerSequenceCacheData: (groupId: string) => void
    clearFuzzerSequence: () => void
    /**只保留传入的groupId的数据 */
    onlySaveFuzzerSequenceCacheDataIncomingGroupId: (groupId: string) => void
    /**删除组内的其他数据，只保留组内的传入id的数据 */
    removeGroupOther: (groupId: string, id: string) => void
    /**通过传入id的数据，删除组内的数据 */
    removeWithinGroupDataById: (groupId: string, id: string) => void
    setHotPatchCodeVal: (hotPatchCode: string) => void
}

export interface FuzzerListProps {}
export interface FuzzerSequenceListProps {
    groupId: string
}

export interface FuzzerSequenceCacheDataProps {
    groupId: string
    cacheData: SequenceProps[]
}

export const useFuzzerSequence = createWithEqualityFn<FuzzerSequenceProps>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                fuzzerSequenceList: [],
                fuzzerSequenceCacheData: [],
                hotPatchCode: "",
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
                setFuzzerSequenceCacheData: (values) => {
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
                removeFuzzerSequenceCacheData: (groupId) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const newPageList = newVal.filter((ele) => ele.groupId !== groupId)
                    set({
                        ...get(),
                        fuzzerSequenceCacheData: newPageList
                    })
                },
                clearFuzzerSequence: () => {
                    set({
                        fuzzerSequenceCacheData: [],
                        fuzzerSequenceList: []
                    })
                },
                onlySaveFuzzerSequenceCacheDataIncomingGroupId: (groupId) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const newPageList = newVal.filter((ele) => ele.groupId === groupId)
                    set({
                        ...get(),
                        fuzzerSequenceCacheData: newPageList
                    })
                },
                removeGroupOther: (groupId, id) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const index = newVal.findIndex((ele) => ele.groupId === groupId)
                    if (index !== -1) {
                        const list = newVal[index].cacheData.filter((ele) => ele.pageId === id)
                        newVal[index] = {
                            groupId,
                            cacheData: list
                        }
                        set({
                            ...get(),
                            fuzzerSequenceCacheData: [...newVal]
                        })
                    }
                },
                removeWithinGroupDataById: (groupId, id) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const index = newVal.findIndex((ele) => ele.groupId === groupId)
                    if (index !== -1) {
                        const list = newVal[index].cacheData.filter((ele) => ele.pageId !== id)
                        newVal[index] = {
                            groupId,
                            cacheData: list
                        }
                        set({
                            ...get(),
                            fuzzerSequenceCacheData: [...newVal]
                        })
                    }
                },
                setHotPatchCodeVal: (values: string) => {
                    const s = get()
                    if (!s) return
                    set({
                        ...s,
                        hotPatchCode: values
                    })
                },
            }),
            {
                name: "fuzzer-sequence",
                storage: createJSONStorage(() => sessionStorage)
            }
        )
    ),
    Object.is
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

    const saveFuzzerSequenceCache = debounce(
        (selectedState) => {
            const sequenceCache = selectedState.filter((ele) => ele.cacheData.length > 0)
            // console.log("saveFuzzerSequenceCache", sequenceCache)
            setRemoteProjectValue(RemoteGV.FuzzerSequenceCache, JSON.stringify(sequenceCache))
        },
        500,
        {leading: true}
    )
} catch (error) {
    yakitNotify("error", "webFuzzer序列化数据缓存数据失败:" + error)
}
