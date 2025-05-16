import React, {useEffect, useRef, useState} from "react"
import {ModifyNotepadOnlineProps} from "./ModifyNotepadOnlineType"
import {ModifyNotepadContent} from "../ModifyNotepad"
import styles from "./ModifyNotepadOnline.module.scss"
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
import {cataloguePlugin} from "@/components/MilkdownEditor/utils/cataloguePlugin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {judgeAvatar} from "@/pages/MainOperator"
import {AuthorImg, AuthorIcon, FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {Divider, Tooltip} from "antd"
import moment from "moment"
import {ModifyNotepadPageInfoProps, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {YakitRoute} from "@/enums/yakitRoute"
import {yakitNotify} from "@/utils/notification"
import {API} from "@/services/swagger/resposeType"
import {randomAvatarColor} from "@/components/layout/FuncDomain"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {CollabUserInfo} from "@/components/MilkdownEditor/CollabManager"
import {CollabStatus, EditorMilkdownProps, MilkdownCollabProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {notepadSaveStatus} from "@/components/MilkdownEditor/WebsocketProvider/constants"
import {notepadRole} from "../../NotepadShareModal/constants"
import emiter from "@/utils/eventBus/eventBus"
import {getMarkdown} from "@milkdown/kit/utils"
import {defaultModifyNotepadPageInfo} from "@/defaultConstants/ModifyNotepad"
import {cloneDeep} from "lodash"
import {
    apiDeleteNotepadDetail,
    apiGetNotepadDetail,
    apiSaveNotepad,
    onBaseNotepadDown,
    onOpenLocalFileByPath
} from "../../notepadManage/utils"
import {ModifyNotepadContentRefProps} from "../ModifyNotepadType"
import {useStore} from "@/store"
import {
    OutlineShareIcon,
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {DownFilesModal} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {formatTimestamp} from "@/utils/timeUtil"

const NotepadShareModal = React.lazy(() => import("../../NotepadShareModal/NotepadShareModal"))

const ModifyNotepadOnline: React.FC<ModifyNotepadOnlineProps> = React.memo((props) => {
    const {pageId} = props

    const userInfo = useStore((s) => s.userInfo)
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

    const [downItemLoading, setDownItemLoading] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false) // 编辑器ws是否连接上
    const [notepadLoading, setNotepadLoading] = useState<boolean>(true)

    const [onlineUsers, setOnlineUsers] = useState<CollabUserInfo[]>([])
    const [shareVisible, setShareVisible] = useState<boolean>(false)

    const [tabName, setTabName] = useState<string>(initTabName())
    const [composedTabName, setComposedTabName] = useState<string>(initTabName()) // 不会保存拼音的中间状态

    const [editor, setEditor] = useState<EditorMilkdownProps>()
    const [notepadDetail, setNotepadDetail] = useState<API.GetNotepadList>({
        id: 0,
        created_at: moment().unix(),
        updated_at: moment().unix(),
        title: initTabName(),
        content: "",
        userName: "",
        headImg: "",
        collaborator: [],
        hash: ""
    })

    const [documentLinkStatus, setDocumentLinkStatus] = useState<CollabStatus>({
        status: "disconnected",
        isSynced: false,
        saveStatus: notepadSaveStatus.saveProgress
    })

    const modifyNotepadContentRef = useRef<ModifyNotepadContentRefProps>({
        getCatalogue: () => {}
    })
    const notepadContentRef = useRef<string>("")
    const notepadRef = useRef<HTMLDivElement>(null)
    const avatarColor = useRef<string>(randomAvatarColor())
    const perTabName = useRef<string>(initTabName())

    const [inViewport = true] = useInViewport(notepadRef)

    useEffect(() => {
        const pageInfo: ModifyNotepadPageInfoProps = initPageInfo()
        if (pageInfo.notepadHash) {
            // 查询该笔记本详情
            setNotepadLoading(true)
            apiGetNotepadDetail(`${pageInfo.notepadHash}`)
                .then((res) => {
                    perTabName.current = res.title
                    notepadContentRef.current = res.content
                    setNotepadDetail(res)
                })
                .finally(() =>
                    setTimeout(() => {
                        setNotepadLoading(false)
                    }, 200)
                )
        } else {
            // 新建笔记本并保存
            const params: API.PostNotepadRequest = {
                title: initTabName(),
                content: ""
            }
            perTabName.current = params.title
            setNotepadLoading(true)
            apiSaveNotepad(params)
                .then((hash) => {
                    setNotepadDetail({
                        ...(notepadDetail || {}),
                        notepadUserId: userInfo.user_id || 0,
                        headImg: userInfo.companyHeadImg || "",
                        userName: userInfo.companyName || "",
                        hash
                    })
                    onUpdatePageInfo({
                        notepadHash: hash
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

    // 删除文档
    const onSingleRemove = useMemoizedFn(() => {
        if (!notepadDetail.hash) return
        setNotepadLoading(true)
        apiDeleteNotepadDetail({hash: notepadDetail.hash})
            .then(() => {
                emiter.emit("onCloseCurrentPage", pageId)
            })
            .finally(() => {
                setTimeout(() => {
                    setNotepadLoading(false)
                }, 200)
            })
    })

    // 下载文档
    const onDownNotepad = useMemoizedFn(() => {
        notepadContentRef.current = editor?.action(getMarkdown()) || ""
        const params: API.PostNotepadRequest = {
            hash: notepadDetail.hash,
            title: tabName,
            content: notepadContentRef.current
        }
        setDownItemLoading(true)
        apiSaveNotepad(params).then(() => {
            const downParams: API.NotepadDownloadRequest = {
                hash: notepadDetail.hash
            }
            onBaseNotepadDown(downParams)
                .then((res) => {
                    const m = showYakitModal({
                        hiddenHeader: true,
                        footer: <></>,
                        mask: false,
                        content: (
                            <DownFilesModal
                                isDeleteOOSAfterEnd={true}
                                url={res.url}
                                path={res.path}
                                visible={true}
                                setVisible={() => m.destroy()}
                                onCancelDownload={() => m.destroy()}
                                onSuccess={() => {
                                    onOpenLocalFileByPath(res?.path)
                                    m.destroy()
                                }}
                                isEncodeURI={false}
                            />
                        ),
                        bodyStyle: {padding: 0}
                    })
                })
                .finally(() =>
                    setTimeout(() => {
                        setDownItemLoading(false)
                    }, 200)
                )
        })
    })

    const userAvatar = useCreation(() => {
        return judgeAvatar(userInfo, 28, avatarColor.current)
    }, [userInfo.companyName, userInfo.companyHeadImg])

    //#region 保存最新的文档内容
    useEffect(() => {
        if (!inViewport) {
            notepadContentRef.current = editor?.action(getMarkdown()) || ""
            onSaveNewContent(notepadContentRef.current)
        }
    }, [inViewport])
    /**保存最新的文档内容 */
    const onSaveNewContent = useMemoizedFn((markdownContent) => {
        if (userInfo.isLogin && !readonly) {
            const params: API.PostNotepadRequest = {
                hash: notepadDetail.hash,
                title: composedTabName || perTabName.current,
                content: markdownContent || ""
            }
            apiSaveNotepad(params)
        }
    })
    //#endregion
    /** 编辑器内容的变化，更新数据 */
    const onMarkdownUpdated = useDebounceFn(
        (value) => {
            notepadContentRef.current = value
            const time = moment().unix()
            setNotepadDetail((v) => ({...v, updated_at: time}))
        },
        {wait: 200, leading: true}
    ).run

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
        setNotepadDetail((v) => ({...v, title: t}))
        setTabName(t)
        setComposedTabName(t)
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
        setNotepadDetail((v) => ({...v, title}))
        setComposedTabName(title)
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
    //#region  编辑器相关
    const onSetDocumentLinkStatus = useMemoizedFn((val: CollabStatus) => {
        setDocumentLinkStatus(val)
        if (val.status === "connected") {
            setLoading(false)
        }
    })
    const onSetOnlineUsers = useMemoizedFn((users: CollabUserInfo[]) => {
        setOnlineUsers(users.filter((ele) => ele.userId !== userInfo.user_id))
    })
    /**当前登录人的笔记本权限 */
    const currentRole = useCreation(() => {
        if (userInfo.user_id === notepadDetail.notepadUserId) return notepadRole.adminPermission
        const owner = notepadDetail.collaborator?.find((ele) => ele.user_id === userInfo.user_id)
        return owner ? owner.role : ""
    }, [notepadDetail.collaborator, userInfo.user_id, notepadDetail.notepadUserId])
    /**作者和赋予了编辑权限的协作者才有编辑权限，其余为只读 */
    const readonly = useCreation(() => {
        switch (currentRole) {
            case notepadRole.adminPermission:
            case notepadRole.editPermission:
                return false
            default:
                return true
        }
    }, [currentRole])
    const collabProps: MilkdownCollabProps = useCreation(() => {
        const enableCollab = !readonly
        const newTitle = composedTabName
        const collabValue: MilkdownCollabProps = {
            title: newTitle,
            enableCollab,
            milkdownHash: notepadDetail.hash,
            routeInfo: {
                pageId,
                route: YakitRoute.Modify_Notepad
            },
            enableSaveHistory: true,
            onChangeWSLinkStatus: onSetDocumentLinkStatus,
            onChangeOnlineUser: onSetOnlineUsers, // 过滤了作者本人
            onSetTitle: (v) => {
                setTabName(v)
                onSetTabName(v)
            }
        }
        return collabValue
    }, [notepadDetail.hash, pageId, readonly, YakitRoute.Modify_Notepad, composedTabName])
    //#endregion

    /**在线链接&&文档保存状态 */
    const renderOnlineStatus = useCreation(() => {
        const {status, saveStatus = notepadSaveStatus.saveProgress} = documentLinkStatus
        switch (status) {
            case "connected":
                return (
                    <>
                        <YakitTag color='green'>在线</YakitTag>
                        {/* 暂时不显示保存失败的显示文案 */}
                        <span>{saveStatus === notepadSaveStatus.saveSuccess ? "已经保存到云端" : "保存中..."}</span>
                    </>
                )
            case "connecting":
                return <YakitTag color='blue'>连接中...</YakitTag>
            default:
                return collabProps.enableCollab ? <YakitTag color='red'>离线</YakitTag> : <></>
        }
    }, [documentLinkStatus, collabProps.enableCollab])

    /**如果当前用户没有编辑权限,没有启动协作，阅读权限的人不能查看最新的编辑过程的文件 */
    const spinning = useCreation(() => {
        const enableCollab = currentRole === notepadRole.editPermission
        if (enableCollab) return loading
        return false
    }, [loading, currentRole])
    return (
        <ModifyNotepadContent
            ref={modifyNotepadContentRef}
            tabName={composedTabName}
            spinning={notepadLoading}
            titleExtra={
                <div className={styles["modify-notepad-heard-extra"]}>
                    <div className={styles["modify-notepad-heard-extra-online-user"]}>
                        {onlineUsers.map((item) => (
                            <Tooltip key={item.userId} title={item.name}>
                                <div key={item.userId}>
                                    <AuthorImg
                                        src={item.heardImg}
                                        icon={
                                            <div
                                                className={styles["online-user-dot"]}
                                                style={{backgroundColor: item.color}}
                                            />
                                        }
                                        iconClassName={styles["online-user-icon"]}
                                    />
                                </div>
                            </Tooltip>
                        ))}
                    </div>
                    {currentRole === notepadRole.adminPermission && (
                        <YakitPopover
                            content={
                                <React.Suspense fallback={"loading"}>
                                    <NotepadShareModal
                                        notepadInfo={notepadDetail}
                                        onClose={() => setShareVisible(false)}
                                    />
                                </React.Suspense>
                            }
                            visible={shareVisible}
                            onVisibleChange={setShareVisible}
                            overlayClassName={styles["share-popover"]}
                            placement='bottom'
                        >
                            <YakitButton type='outline1' icon={<OutlineShareIcon />} size='large'>
                                分享
                            </YakitButton>
                        </YakitPopover>
                    )}
                    <YakitButton
                        type='primary'
                        icon={<OutlineClouddownloadIcon />}
                        size='large'
                        onClick={onDownNotepad}
                        loading={downItemLoading}
                    >
                        下载
                    </YakitButton>
                    {currentRole === notepadRole.adminPermission && (
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
                    )}
                    <Divider type='vertical' style={{margin: 0}} />

                    <Tooltip title={userInfo.companyName}>{userAvatar}</Tooltip>
                </div>
            }
        >
            <div className={styles["notepad-content"]} ref={notepadRef}>
                <div className={styles["notepad-heard"]}>
                    {/* 
                        TODO- 标题共享后续需要优化
                        同时使用onChange和onCompositionEnd
                        1.拼音中间状态失焦不会进入onChange
                        2.删除键不会进入onCompositionEnd
                    */}
                    <YakitInput
                        placeholder='请输入标题'
                        size='large'
                        bordered={false}
                        className={styles["notepad-input"]}
                        value={tabName}
                        onChange={(e) => {
                            setTabName(e.target.value)
                            if (!(e.nativeEvent as InputEvent).isComposing) {
                                onSetTabName(e.target.value)
                            }
                        }}
                        maxLength={50}
                        onCompositionEnd={(e) => {
                            onSetTabName((e.target as HTMLInputElement).value)
                        }}
                    />
                    <div className={styles["notepad-heard-subTitle"]}>
                        {notepadDetail?.headImg ? (
                            <AuthorImg src={notepadDetail?.headImg} />
                        ) : (
                            judgeAvatar(
                                {
                                    companyName: notepadDetail?.userName || "-",
                                    companyHeadImg: ""
                                },
                                28,
                                avatarColor.current
                            )
                        )}
                        <span>{notepadDetail?.userName || "-"}</span>
                        <AuthorIcon />
                        <Divider type='vertical' style={{margin: "0 8px"}} />
                        <span>最近修改时间:{formatTimestamp(notepadDetail?.updated_at)}</span>
                        <Divider type='vertical' style={{margin: "0 8px"}} />
                        {renderOnlineStatus}
                    </div>
                </div>
                <div className={styles["notepad-editor"]}>
                    <YakitSpin spinning={spinning}>
                        <MilkdownEditor
                            type='notepad'
                            readonly={readonly}
                            defaultValue={notepadDetail.content}
                            customPlugin={cataloguePlugin((v) => modifyNotepadContentRef.current?.getCatalogue(v))}
                            collabProps={collabProps}
                            onMarkdownUpdated={onMarkdownUpdated}
                            setEditor={setEditor}
                            onSaveContentBeforeDestroy={onSaveNewContent}
                            positionElementId={initPageInfo().domId}
                        />
                    </YakitSpin>
                </div>
            </div>
        </ModifyNotepadContent>
    )
})

export default ModifyNotepadOnline
