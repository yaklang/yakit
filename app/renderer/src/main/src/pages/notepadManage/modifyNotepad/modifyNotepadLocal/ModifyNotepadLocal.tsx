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
import {useDebounceEffect, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {
    OutlineDotshorizontalIcon,
    OutlineTrashIcon,
    OutlineStoreIcon,
    OutlineExportIcon,
    OutlineArrownarrowdownIcon,
    OutlineArrowupIcon
} from "@/assets/icon/outline"
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
import {defaultNote} from "@/defaultConstants/Note"
import Mark from "mark.js"
import {Divider} from "antd"
import {useGoEditNotepad} from "../../hook/useGoEditNotepad"
import {v4 as uuidv4} from "uuid"
import {editorViewCtx} from "@milkdown/core"
import {Decoration, DecorationSet} from "prosemirror-view"

const NotepadLocalList = React.lazy(() => import("./NotepadLocalList/NotepadLocalList"))
/**高亮关键字中当前选中的高亮元素样式 */
const highlightPulseClass = "highlight-pulse"

const ModifyNotepadLocal: React.FC<ModifyNotepadLocalProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const {goEditNotepad, goAddNotepad} = useGoEditNotepad()
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

    const [keyWord, setKeyWord] = useState<string>(initPageInfo().keyWordInfo?.keyWord || "") // 搜索关键词
    const [tabName, setTabName] = useState<string>(initTabName())

    const [note, setNote] = useState<Note>(cloneDeep(defaultNote))
    const [notepadLoading, setNotepadLoading] = useState<boolean>(true)

    const [exportVisible, setExportVisible] = useState<boolean>(false)

    // const [totalMatches, setTotalMatches] = useState<number>(0) //匹配总数
    // const [currentMatchesIndex, setCurrentMatchesIndex] = useState<number>(0) // 匹配第几个
    // const [positionElementId, setPositionElementId] = useState<string>("") // 定位元素id

    const modifyNotepadContentRef = useRef<ModifyNotepadContentRefProps>({
        getCatalogue: () => {}
    })
    const notepadContentRef = useRef<string>("")
    const notepadEditorRef = useRef<HTMLDivElement>(null)
    const markInstanceRef = useRef<Mark>()
    const resultsIdsRef = useRef<string[]>([])
    const perTargetIdRef = useRef<string>("")

    const perTabName = useRef<string>(initTabName())
    const filterRef = useRef<NoteFilter>(cloneDeep(defaultNoteFilter))

    const [inViewport = true] = useInViewport(notepadEditorRef)
    const isInitLoadingRef = useRef<boolean>(true) // 是否初次加载

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
                .finally(() => {
                    setTimeout(() => {
                        setNotepadLoading(false)
                    }, 200)
                })
        } else {
            let Content = pageInfo.content || ""
            // 新建笔记本并保存
            const params: CreateNoteRequest = {
                Title: initTabName(),
                Content
            }
            perTabName.current = params.Title
            notepadContentRef.current = params.Content
            setNotepadLoading(true)
            grpcCreateNote(params)
                .then((res) => {
                    filterRef.current = {
                        ...filterRef.current,
                        Id: [res.NoteId]
                    }
                    setNote((v) => ({
                        ...v,
                        Id: res.NoteId,
                        Content
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
                    ...(currentItem.pageParamsInfo.modifyNotepadPageInfo || defaultModifyNotepadPageInfo),
                    ...value
                }
            }
        }
        updatePagesDataCacheById(YakitRoute.Modify_Notepad, {...newCurrentItem})
    })
    const [jumpLine, setJumpLine] = useState(initPageInfo().keyWordInfo?.line || 0)

    useEffect(() => {
        if (!inViewport) {
            // 保存最新的文档内容
            notepadContentRef.current = editor?.action(getMarkdown()) || ""
            onSaveNewContent(notepadContentRef.current)
            return
        }
        const pageInfo: ModifyNotepadPageInfoProps = initPageInfo()

        if (!isInitLoadingRef.current && pageInfo.notepadHash) {
            // 初次进来不会进入这个查询
            // 只查询是否存在，不存在会发信号弹窗
            grpcQueryNoteById(+pageInfo.notepadHash)
        }
        isInitLoadingRef.current = false

        // 标题
        emiter.on("secondMenuTabDataChange", onSecondMenuDataChange)
        return () => {
            emiter.off("secondMenuTabDataChange", onSecondMenuDataChange)
        }
    }, [inViewport])
    //#region 数据错误处理
    useEffect(() => {
        markInstanceRef.current = new Mark(notepadEditorRef.current!)

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
                        goEditNotepad({notepadHash: res.NoteId, title: tabName})
                        s.destroy()
                    })
                } else {
                    onCloseCurrentPage()
                    goAddNotepad()
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
    //#endregion
    // //#region 搜索高亮
    // // NOTE 笔记本中存在代码块时，搜索会不正常
    // useEffect(() => {
    //     const pageInfo: ModifyNotepadPageInfoProps = initPageInfo()
    //     if (pageInfo.keyWordInfo?.keyWord || pageInfo.keyWordInfo?.position) {
    //         onSearchHighlightJump({
    //             keyWord: pageInfo.keyWordInfo?.keyWord || "",
    //             position: pageInfo.keyWordInfo?.position || 0,
    //             line: pageInfo.keyWordInfo?.line || 0
    //         })
    //     }
    // }, [initPageInfo()])

    // const onSearchHighlightJump = useMemoizedFn((value) => {
    //     if (value.keyWord !== keyWord) {
    //         setKeyWord(value.keyWord)
    //     }
    //     setTimeout(() => {
    //         onSearchHighlight(value?.keyWord || "", value?.position)
    //     }, 200)
    // })

    // const onSearchHighlight = useMemoizedFn((value: string, position?: number) => {
    //     // 先清除之前的高亮
    //     markInstanceRef.current?.unmark({
    //         done: () => {
    //             resultsIdsRef.current = []
    //             perTargetIdRef.current = ""
    //             setCurrentMatchesIndex(0)
    //             if (value.trim() !== "") {
    //                 markInstanceRef.current?.mark(value, {
    //                     separateWordSearch: false,
    //                     done: (total) => {
    //                         perTargetIdRef.current = ""
    //                         setTotalMatches(total)
    //                         setTimeout(() => {
    //                             jumpToMatch(position || 1, total)
    //                         }, 200)
    //                     },
    //                     exclude: [".milkdown-code,.milkdown-code *"], // 排除自身及所有子元素
    //                     each: (ele) => {
    //                         const id = uuidv4()
    //                         ele.setAttribute("id", id)
    //                         resultsIdsRef.current.push(id)
    //                     }
    //                 })
    //             } else {
    //                 setTotalMatches(0)
    //             }
    //         }
    //     })
    // })

    // // 跳转到指定匹配项
    // const jumpToMatch = (index: number, total?: number) => {
    //     if (index < 1 || index > (total || totalMatches)) {
    //         return
    //     }

    //     let targetId = resultsIdsRef.current[index - 1]
    //     if (!targetId) return
    //     const target = document.getElementById(targetId)!
    //     if (target) {
    //         if (perTargetIdRef.current) {
    //             const perTarget = document.getElementById(perTargetIdRef.current)!
    //             if (perTarget.classList.contains(highlightPulseClass)) perTarget.classList.remove(highlightPulseClass)
    //         }
    //         // 添加临时视觉反馈
    //         setPositionElementId(targetId)
    //         if (!target.classList.contains(highlightPulseClass)) target.classList.add(highlightPulseClass)
    //         perTargetIdRef.current = targetId
    //     }
    //     setCurrentMatchesIndex(index)
    // }
    // //#endregion
    //#region 保存最新的文档内容
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
                        {/* <YakitInput.Search
                            value={keyWord}
                            onChange={(e) => setKeyWord(e.target.value)}
                            onSearch={(val) => onSearchHighlight(val)}
                            onPressEnter={() => onSearchHighlight(keyWord)}
                        />

                        <>
                            <YakitButton
                                type='outline2'
                                icon={<OutlineArrowupIcon />}
                                onClick={() => {
                                    jumpToMatch(currentMatchesIndex - 1)
                                }}
                                disabled={currentMatchesIndex <= 1}
                            />
                            <YakitButton
                                type='outline2'
                                icon={<OutlineArrownarrowdownIcon />}
                                onClick={() => {
                                    if (currentMatchesIndex + 1 > totalMatches) return
                                    jumpToMatch(currentMatchesIndex + 1)
                                }}
                                disabled={currentMatchesIndex >= totalMatches}
                            />
                            <div className={styles["matcher-number"]}>
                                {currentMatchesIndex}&nbsp;/&nbsp;{totalMatches}
                            </div>
                        </>

                        <Divider type='vertical' /> */}
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
                listDom={<NotepadLocalList noteId={note.Id} />}
            >
                <div className={styles["notepad-content"]}>
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
                    <div className={styles["notepad-editor"]} ref={notepadEditorRef}>
                        <MilkdownEditorLocal
                            type='notepad'
                            line={jumpLine}
                            defaultValue={note.Content}
                            customPlugin={cataloguePlugin((v) => modifyNotepadContentRef.current?.getCatalogue(v))}
                            onMarkdownUpdated={onMarkdownUpdated}
                            setEditor={setEditor}
                            onSaveContentBeforeDestroy={onSaveNewContent}
                            // positionElementId={positionElementId}
                        />
                    </div>
                </div>
            </ModifyNotepadContent>
            {exportVisible && <NotepadExport filter={filterRef.current} onClose={() => setExportVisible(false)} />}
        </>
    )
})

export default ModifyNotepadLocal
