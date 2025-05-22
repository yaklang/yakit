import React, {useEffect, useRef, useState} from "react"
import {ModifyNotepadLocalProps} from "./ModifyNotepadLocalType"
import moment from "moment"
import {
    CreateNoteRequest,
    DeleteNoteRequest,
    Note,
    NoteFilter,
    UpdateNoteRequest,
    grpcCreateNote,
    grpcDeleteNote,
    grpcQueryNoteById,
    grpcUpdateNote
} from "../../notepadManage/utils"
import {ModifyNotepadPageInfoProps, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {OutlineDotshorizontalIcon, OutlineTrashIcon, OutlineStoreIcon, OutlineExportIcon} from "@/assets/icon/outline"
import {cataloguePlugin} from "@/components/MilkdownEditor/utils/cataloguePlugin"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {defaultModifyNotepadPageInfo, defaultNoteFilter} from "@/defaultConstants/ModifyNotepad"
import {YakitRoute} from "@/enums/yakitRoute"
import {FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {cloneDeep} from "lodash"
import {ModifyNotepadContent} from "../ModifyNotepad"
import {ModifyNotepadContentRefProps} from "../ModifyNotepadType"
import styles from "./ModifyNotepadLocal.module.scss"
import emiter from "@/utils/eventBus/eventBus"
import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {getMarkdown} from "@milkdown/kit/utils"
import {yakitNotify} from "@/utils/notification"
import {NotepadExport} from "../../notepadManage/notepadManageLocal/NotepadImportAndExport"
import {formatTimestamp} from "@/utils/timeUtil"
import {MilkdownEditorLocal} from "@/components/milkdownEditorLocal/MilkdownEditorLocal"
import {APIFunc} from "@/apiUtils/type"
import {DbOperateMessage} from "@/pages/layout/mainOperatorContent/utils"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {toAddNotepad, toEditNotepad} from "../../notepadManage/NotepadManage"
import {defaultNote} from "@/defaultConstants/Note"

const ModifyNotepadLocal: React.FC<ModifyNotepadLocalProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const initTabName = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return "未命名文档"
    })
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, pageId)
        if (currentItem && currentItem.pageParamsInfo.modifyNotepadPageInfo) {
            return currentItem.pageParamsInfo.modifyNotepadPageInfo
        }
        return cloneDeep(defaultModifyNotepadPageInfo)
    })

    const [editor, setEditor] = useState<EditorMilkdownProps>()

    const [keyWord, setKeyWord] = useState<string>("") // 搜索关键词
    const [tabName, setTabName] = useState<string>(initTabName())

    const [note, setNote] = useState<Note>(cloneDeep(defaultNote))
    const [notepadLoading, setNotepadLoading] = useState<boolean>(true)

    const [exportVisible, setExportVisible] = useState<boolean>(false)

    const modifyNotepadContentRef = useRef<ModifyNotepadContentRefProps>({
        getCatalogue: () => {}
    })
    const notepadContentRef = useRef<string>("")
    const notepadRef = useRef<HTMLDivElement>(null)
    const perTabName = useRef<string>(initTabName())
    const filterRef = useRef<NoteFilter>(cloneDeep(defaultNoteFilter))

    const [inViewport = true] = useInViewport(notepadRef)

    useEffect(() => {
        if (!inViewport) return
        const pageInfo: ModifyNotepadPageInfoProps = initPageInfo()
        if (pageInfo.notepadHash) {
            // 查询该笔记本详情
            setNotepadLoading(true)
            grpcQueryNoteById(+pageInfo.notepadHash)
                .then((res) => {
                    perTabName.current = res.Title
                    notepadContentRef.current = res.Content
                    filterRef.current = {
                        ...filterRef.current,
                        Id: [res.Id]
                    }
                    setNote(res)
                })
                .finally(() =>
                    setTimeout(() => {
                        setNotepadLoading(false)
                    }, 200)
                )
        } else {
            // 新建笔记本并保存
            const params: CreateNoteRequest = {
                Title: initTabName(),
                Content: ""
            }
            perTabName.current = params.Title
            setNotepadLoading(true)
            grpcCreateNote(params)
                .then((res) => {
                    filterRef.current = {
                        ...filterRef.current,
                        Id: [res.NoteId]
                    }
                    setNote((v) => ({
                        ...v,
                        Id: res.NoteId
                    }))
                    onUpdatePageInfo({
                        notepadHash: res.NoteId
                    })
                })
                .finally(() =>
                    setTimeout(() => {
                        setNotepadLoading(false)
                    }, 200)
                )
        }
        setKeyWord(pageInfo.keyWord || "")
    }, [inViewport])

    useEffect(() => {
        emiter.on("localDataError", onLocalDataError)
        return () => {
            emiter.off("localDataError", onLocalDataError)
        }
    }, [])

    const onLocalDataError = useMemoizedFn((value: string) => {
        try {
            const data: {message: string; noteId: number} = JSON.parse(value)
            if (+data.noteId === +note.Id) {
                onShowErrorModal(data.message)
            }
        } catch (error) {}
    })

    const onShowErrorModal = useMemoizedFn((message) => {
        setNote((v) => ({...v, Id: 0}))
        // 关闭/保存按钮
        const s = showYakitModal({
            title: "数据异常/文档不存在/已经被删除",
            content: <span>错误原因:{message}</span>,
            maskClosable: false,
            closable: false,
            showConfirmLoading: true,
            onOkText: "保存当前文档",
            onCancelText: "不保存",
            onOk: () => {
                const markdownContent = editor?.action(getMarkdown()) || ""
                // 有内容才保存，没有内容新建
                if (markdownContent) {
                    const params: CreateNoteRequest = {
                        Title: tabName,
                        Content: markdownContent
                    }
                    grpcCreateNote(params).then((res) => {
                        onCloseCurrentPage()
                        toEditNotepad({pageInfo: {notepadHash: res.NoteId, title: tabName}})
                        s.destroy()
                    })
                } else {
                    onCloseCurrentPage()
                    toAddNotepad()
                    s.destroy()
                }
            },
            onCancel: () => {
                onCloseCurrentPage()
                s.destroy()
            },
            bodyStyle: {padding: 24}
        })
    })
    const onCloseCurrentPage = useMemoizedFn(() => {
        emiter.emit("onCloseCurrentPage", pageId)
    })

    /**更新该页面最新的数据 */
    const onUpdatePageInfo = useMemoizedFn((value: ModifyNotepadPageInfoProps) => {
        if (!pageId) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, pageId)
        if (!currentItem) return
        const newCurrentItem: PageNodeItemProps = {
            ...currentItem,
            pageParamsInfo: {
                modifyNotepadPageInfo: {
                    ...defaultModifyNotepadPageInfo,
                    ...value
                }
            }
        }
        updatePagesDataCacheById(YakitRoute.Modify_Notepad, {...newCurrentItem})
    })

    //#region 保存最新的文档内容
    useEffect(() => {
        if (!inViewport) {
            notepadContentRef.current = editor?.action(getMarkdown()) || ""
            onSaveNewContent(notepadContentRef.current)
        }
    }, [inViewport])
    /**保存最新的文档内容 */
    const onSaveNewContent: APIFunc<string, DbOperateMessage> = useMemoizedFn((markdownContent) => {
        return new Promise(async (resolve, reject) => {
            if (!note.Id) {
                reject("NoteId不存在")
                return
            }
            const params: UpdateNoteRequest = {
                Filter: filterRef.current,
                UpdateTitle: true,
                Title: perTabName.current,
                UpdateContent: true,
                Content: markdownContent || ""
            }
            grpcUpdateNote(params).then(resolve).catch(reject)
        })
    })
    /** 编辑器内容的变化，更新数据 */
    const onMarkdownUpdated = useDebounceFn(
        (value) => {
            notepadContentRef.current = value
            const time = moment().unix()
            setNote((v) => ({...v, UpdateAt: time}))
        },
        {wait: 200, leading: true}
    ).run
    const onSave = useMemoizedFn(() => {
        onSaveNewContent(notepadContentRef.current).then(() => {
            yakitNotify("success", "保存成功")
        })
    })
    //#endregion

    //#region 标题
    useEffect(() => {
        if (inViewport) {
            emiter.on("secondMenuTabDataChange", onSecondMenuDataChange)
            return () => {
                emiter.off("secondMenuTabDataChange", onSecondMenuDataChange)
            }
        }
    }, [inViewport])

    const onSecondMenuDataChange = useMemoizedFn(() => {
        const t = initTabName()
        setNote((v) => ({...v, Title: t}))
        setTabName(t)
    })

    /**设置标题 */
    const onSetTabName = useMemoizedFn((title) => {
        if (title.length > 50) {
            yakitNotify("error", "标题不超过50个字符")
            return
        }
        if (title) {
            perTabName.current = title
        }
        setTabName(title)
        setNote((v) => ({...v, Title: title}))
        onSetPageTabName(title)
    })
    /**标题更改与页面菜单名称同步 */
    const onSetPageTabName = useDebounceFn(
        useMemoizedFn((tabName: string) => {
            emiter.emit(
                "onUpdateSubMenuNameFormPage",
                JSON.stringify({route: YakitRoute.Modify_Notepad, value: tabName, pageId})
            )
        }),
        {wait: 500}
    ).run
    //#endregion

    const onExport = useMemoizedFn(() => {
        setNotepadLoading(true)
        onSaveNewContent(notepadContentRef.current)
            .then(() => {
                setExportVisible(true)
            })
            .finally(() =>
                setTimeout(() => {
                    setNotepadLoading(false)
                }, 200)
            )
    })

    // 删除文档
    const onSingleRemove = useMemoizedFn(() => {
        if (!note.Id) return
        setNotepadLoading(true)
        const removeParams: DeleteNoteRequest = {
            Filter: filterRef.current
        }
        grpcDeleteNote(removeParams)
            .then(() => {
                emiter.emit("onCloseCurrentPage", pageId)
            })
            .finally(() =>
                setTimeout(() => {
                    setNotepadLoading(false)
                }, 200)
            )
    })

    return (
        <>
            <ModifyNotepadContent
                ref={modifyNotepadContentRef}
                tabName={tabName}
                spinning={notepadLoading}
                titleExtra={
                    <div className={styles["modify-notepad-local-heard-extra"]}>
                        <YakitButton type='outline2' icon={<OutlineExportIcon />} size='large' onClick={onExport}>
                            导出
                        </YakitButton>
                        <YakitButton type='primary' icon={<OutlineStoreIcon />} size='large' onClick={onSave}>
                            保存
                        </YakitButton>
                        <FuncFilterPopover
                            icon={<OutlineDotshorizontalIcon />}
                            button={{type: "text2", size: "large"}}
                            menu={{
                                type: "primary",
                                data: [
                                    {
                                        key: "remove",
                                        label: "删除",
                                        type: "danger",
                                        itemIcon: <OutlineTrashIcon />
                                    }
                                ],
                                onClick: ({key}) => {
                                    switch (key) {
                                        case "remove":
                                            onSingleRemove()
                                            break
                                        default:
                                            break
                                    }
                                }
                            }}
                            placement='bottomRight'
                        />
                    </div>
                }
            >
                <div className={styles["notepad-content"]} ref={notepadRef}>
                    <div className={styles["notepad-heard"]}>
                        <YakitInput
                            placeholder='请输入标题'
                            size='large'
                            bordered={false}
                            className={styles["notepad-input"]}
                            wrapperStyle={{height: 40}}
                            value={tabName}
                            onChange={(e) => {
                                onSetTabName(e.target.value)
                            }}
                            maxLength={50}
                        />
                        <div className={styles["notepad-heard-subTitle"]}>
                            <span>最近修改时间:{formatTimestamp(note?.UpdateAt)}</span>
                        </div>
                    </div>
                    <div className={styles["notepad-editor"]}>
                        <MilkdownEditorLocal
                            type='notepad'
                            defaultValue={note.Content}
                            customPlugin={cataloguePlugin((v) => modifyNotepadContentRef.current?.getCatalogue(v))}
                            onMarkdownUpdated={onMarkdownUpdated}
                            setEditor={setEditor}
                            onSaveContentBeforeDestroy={onSaveNewContent}
                        />
                    </div>
                </div>
            </ModifyNotepadContent>
            {exportVisible && <NotepadExport filter={filterRef.current} onClose={() => setExportVisible(false)} />}
        </>
    )
})

export default ModifyNotepadLocal
