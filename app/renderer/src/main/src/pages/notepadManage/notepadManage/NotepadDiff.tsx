import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
import {Milkdown} from "@milkdown/react"
import React, {useEffect, useRef, useState} from "react"
import * as Y from "yjs"
import {apiGetNotepadDetail} from "./utils"
import {API} from "@/services/swagger/resposeType"
import moment from "moment"
import {MilkdownCollabProps, MilkdownRefProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {YakitRoute} from "@/enums/yakitRoute"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {defaultModifyNotepadPageInfo} from "@/defaultConstants/ModifyNotepad"
import {usePageInfo, PageNodeItemProps, ModifyNotepadPageInfoProps} from "@/store/pageInfo"
import {cloneDeep} from "lodash"
import {shallow} from "zustand/shallow"

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
    const milkdownEditorRef = useRef<MilkdownRefProps>()

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
                console.log("versionList", versionList)
                setHistoryList(versionList)
            }
        } catch (error) {
            console.log("error", error)
        }
    })

    const collabProps: MilkdownCollabProps = useCreation(() => {
        const enableCollab = true
        const collabValue: MilkdownCollabProps = {
            title: notepadDetail.title,
            enableCollab,
            milkdownHash: notepadDetail.hash,
            routeInfo: {
                pageId: "",
                route: YakitRoute.Modify_Notepad
            },
            enableSaveHistory: false,
            onChangeWSLinkStatus: () => {},
            onChangeOnlineUser: () => {}, // 过滤了作者本人
            onSetTitle: () => {}
        }
        return collabValue
    }, [notepadDetail.hash, notepadDetail.title])

    const onDiff = useMemoizedFn((prevSnapshot, version) => {
        console.log("prevSnapshot,version", prevSnapshot, version)
    })
    return (
        <div>
            <YakitButton onClick={onClose}>back</YakitButton>
            <div style={{display: "flex"}}>
                <MilkdownEditor
                    ref={milkdownEditorRef}
                    type='notepad'
                    // readonly={readonly}
                    defaultValue={selectHistory?.content}
                    // customPlugin={cataloguePlugin(getCatalogue)}
                    collabProps={collabProps}
                    // onMarkdownUpdated={onMarkdownUpdated}
                    // setEditor={setEditor}
                    // onSaveContentBeforeDestroy={onSaveNewContent}
                />
                <div style={{width: 300}}>
                    {historyList.map((version, index) => (
                        <div
                            key={index}
                            onClick={() => {
                                const prevSnapshot = index > 0 ? historyList[index - 1] : null
                                if (prevSnapshot) {
                                    setSelectHistory(prevSnapshot)
                                }
                                onDiff(prevSnapshot, version)
                                setTimeout(() => {
                                    milkdownEditorRef?.current?.onVersionComparison(version, prevSnapshot)
                                }, 2000)
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
