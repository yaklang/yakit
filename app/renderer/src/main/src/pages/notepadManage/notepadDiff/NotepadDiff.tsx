import React, {useEffect, useRef, useState} from "react"
import {API} from "@/services/swagger/resposeType"
import moment from "moment"
import {YakitRoute} from "@/enums/yakitRoute"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {defaultModifyNotepadPageInfo} from "@/defaultConstants/ModifyNotepad"
import {usePageInfo, PageNodeItemProps, ModifyNotepadPageInfoProps} from "@/store/pageInfo"
import {cloneDeep} from "lodash"
import {shallow} from "zustand/shallow"
import {apiGetNotepadDetail} from "../notepadManage/utils"
import {MilkdownDiffEditor} from "./MilkdownDiffEditor"
import {MilkdownDiffRefProps} from "./NotepadDiffType"

interface NotepadDiffProps {
    pageId: string
    onClose: () => void
}

export const NotepadDiff: React.FC<NotepadDiffProps> = React.memo((props) => {
    const {pageId, onClose} = props

    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )

    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, pageId)
        if (currentItem && currentItem.pageParamsInfo.modifyNotepadPageInfo) {
            return currentItem.pageParamsInfo.modifyNotepadPageInfo
        }
        return cloneDeep(defaultModifyNotepadPageInfo)
    })

    const [notepadDetail, setNotepadDetail] = useState<API.GetNotepadList>({
        id: 0,
        created_at: moment().unix(),
        updated_at: moment().unix(),
        title: "",
        content: "",
        userName: "",
        headImg: "",
        collaborator: [],
        hash: "",
        notepadUserId: 0
    })

    const [historyList, setHistoryList] = useState<any[]>([])
    const [selectHistory, setSelectHistory] = useState<any>()
    const milkdownEditorRef = useRef<MilkdownDiffRefProps>({onVersionComparison: () => {}})

    useEffect(() => {
        // const doc = new Y.Doc()
        // const versions = doc.getArray("versions")
        // console.log("setSession", versions, versions.toJSON(), versions.toArray())
        // sessionStorage.setItem("versions", JSON.stringify(versions))
        const pageInfo: ModifyNotepadPageInfoProps = initPageInfo()
        if (pageInfo.notepadHash) {
            apiGetNotepadDetail(pageInfo.notepadHash).then((res) => {
                setNotepadDetail(res)
            })
        }
        getHistory()
    }, [])

    const getHistory = useMemoizedFn(() => {
        const value = sessionStorage.getItem("versions")
        try {
            if (value) {
                const versionList = JSON.parse(value)
                // console.log("versionList", versionList)
                setHistoryList(versionList)
            }
        } catch (error) {
            // console.log("error", error)
        }
    })

    const onDiff = useMemoizedFn((prevSnapshot, version) => {
        // console.log("prevSnapshot,version", prevSnapshot, version)
    })
    return (
        <div>
            <YakitButton onClick={onClose}>back</YakitButton>
            <div style={{display: "flex"}}>
                <MilkdownDiffEditor
                    ref={milkdownEditorRef}
                    type='notepad'
                    // readonly={readonly}
                    // defaultValue={selectHistory?.content}
                    // customPlugin={cataloguePlugin(getCatalogue)}
                    // onMarkdownUpdated={onMarkdownUpdated}
                    // setEditor={setEditor}
                    // onSaveContentBeforeDestroy={onSaveNewContent}
                />
                <div style={{width: 300}}>
                    <YakitButton onClick={() => getHistory()}>刷新</YakitButton>
                    {historyList.map((version, index) => (
                        <div
                            key={index}
                            onClick={() => {
                                const prevSnapshot = index > 0 ? historyList[index - 1] : null
                                if (prevSnapshot) {
                                    setSelectHistory(prevSnapshot)
                                }
                                onDiff(prevSnapshot, version)
                                milkdownEditorRef?.current?.onVersionComparison(version, prevSnapshot)
                            }}
                        >
                            {moment(version.date).format("YYYY-MM-DD HH:mm:ss")}-{version.userName}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
})
