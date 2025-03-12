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
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
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

    const [tabName, setTabName] = useState<string>(initTabName())

    const [note, setNote] = useState<Note>({
        Id: 0,
        Title: "",
        Content: "",
        CreateAt: moment().unix(),
        UpdateAt: moment().unix()
    })
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
    }, [])

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
    const onSaveNewContent = useMemoizedFn((markdownContent) => {
        if (!note.Id) {
            yakitNotify("error", "笔记本Id不存在")
            return
        }
        const params: UpdateNoteRequest = {
            Filter: filterRef.current,
            UpdateTitle: true,
            Title: perTabName.current,
            UpdateContent: true,
            Content: markdownContent || ""
        }
        grpcUpdateNote(params)
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
        onSaveNewContent(notepadContentRef.current)
    })

    const onExport = useMemoizedFn(() => {
        setExportVisible(true)
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
                        <MilkdownEditor
                            type='notepad'
                            defaultValue={note.Content}
                            customPlugin={cataloguePlugin((v) => modifyNotepadContentRef.current.getCatalogue(v))}
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
