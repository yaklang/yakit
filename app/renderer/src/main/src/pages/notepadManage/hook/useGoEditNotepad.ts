import {defaultModifyNotepadPageInfo} from "@/defaultConstants/ModifyNotepad"
import {YakitRoute} from "@/enums/yakitRoute"
import {usePageInfo, ModifyNotepadPageInfoProps, PageNodeItemProps} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"

export interface GoEditNotepadProps {}

export interface ToEditNotepadProps {
    pageInfo: ModifyNotepadPageInfoProps
    notepadPageList?: PageNodeItemProps[]
}

/**
 * @description 去笔记本编辑页面，存在就切换页面，不存在就新打开页面
 * @param notepadHash
 * @param notepadPageList
 */
const toEditNotepad = (params: ToEditNotepadProps) => {
    const modifyNotepadPageInfo = params?.pageInfo || defaultModifyNotepadPageInfo
    const {notepadHash = "", title = ""} = modifyNotepadPageInfo
    const {notepadPageList = []} = params || {}
    const current =
        notepadHash &&
        notepadPageList.find((ele) => ele.pageParamsInfo.modifyNotepadPageInfo?.notepadHash === notepadHash)
    if (current) {
        emiter.emit("switchSubMenuItem", JSON.stringify({pageId: current.pageId, forceRefresh: true}))
        emiter.emit("switchMenuItem", JSON.stringify({route: YakitRoute.Modify_Notepad}))
    } else if (notepadHash) {
        const info = {
            route: YakitRoute.Modify_Notepad,
            params: {
                ...modifyNotepadPageInfo,
                notepadHash,
                title
            }
        }
        emiter.emit("openPage", JSON.stringify(info))
    }
}

/**
 * @description 新建笔记本
 */
const toAddNotepad = () => {
    const info = {
        route: YakitRoute.Modify_Notepad,
        params: {
            notepadHash: ""
        }
    }
    emiter.emit("openPage", JSON.stringify(info))
}
export const useGoEditNotepad = (props?: GoEditNotepadProps) => {
    const {notepadPageList, updatePagesDataCacheById, queryPagesDataById} = usePageInfo(
        (s) => ({
            notepadPageList: s.pages.get(YakitRoute.Modify_Notepad)?.pageList || [],
            updatePagesDataCacheById: s.updatePagesDataCacheById,
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )

    /**更新该页面最新的数据 */
    const onUpdatePageInfo = useMemoizedFn((value: ModifyNotepadPageInfoProps) => {
        const current =
            value.notepadHash &&
            notepadPageList.find((ele) => ele.pageParamsInfo.modifyNotepadPageInfo?.notepadHash === value.notepadHash)
        if (!current) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, current.pageId)
        if (!currentItem) return
        const newCurrentItem: PageNodeItemProps = {
            ...currentItem,
            pageParamsInfo: {
                modifyNotepadPageInfo: {
                    ...(currentItem.pageParamsInfo.modifyNotepadPageInfo || defaultModifyNotepadPageInfo),
                    ...value
                }
            }
        }
        updatePagesDataCacheById(YakitRoute.Modify_Notepad, {...newCurrentItem})
    })

    const goEditNotepad = useMemoizedFn((params: ModifyNotepadPageInfoProps) => {
        const modifyNotepadPageInfo = params || defaultModifyNotepadPageInfo
        const {notepadHash = ""} = modifyNotepadPageInfo
        if (!notepadHash) return
        const current = notepadPageList.find(
            (ele) => ele.pageParamsInfo.modifyNotepadPageInfo?.notepadHash === notepadHash
        )
        if (current) {
            onUpdatePageInfo(params)
        }
        toEditNotepad({
            pageInfo: {...modifyNotepadPageInfo},
            notepadPageList
        })
    })
    const goAddNotepad = useMemoizedFn(() => {
        toAddNotepad()
    })
    return {goEditNotepad, goAddNotepad} as const
}
