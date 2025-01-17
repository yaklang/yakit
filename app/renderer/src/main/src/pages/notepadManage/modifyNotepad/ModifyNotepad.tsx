import React, {useEffect, useRef, useState} from "react"
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
import {CollabStatus, EditorMilkdownProps, MilkdownCollabProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import styles from "./ModifyNotepad.module.scss"
import {cataloguePlugin} from "@/components/MilkdownEditor/utils/cataloguePlugin"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {CatalogueTreeNodeProps, MilkdownCatalogueProps, ModifyNotepadProps} from "./ModifyNotepadType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Divider, Tooltip, Tree} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineCloseIcon,
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlineOpenIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {buildTOCTree} from "./utils"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {useMenuHeight} from "@/store/menuHeight"
import {shallow} from "zustand/shallow"
import {ModifyNotepadPageInfoProps, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitRouteToPageInfo} from "@/routes/newRoute"
import {AuthorIcon, AuthorImg, FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {getMarkdown} from "@milkdown/kit/utils"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {useStore} from "@/store"
import {judgeAvatar} from "@/pages/MainOperator"
import {randomAvatarColor} from "@/components/layout/FuncDomain"
import {cloneDeep, isEqual} from "lodash"
import {defaultModifyNotepadPageInfo} from "@/defaultConstants/ModifyNotepad"
import {API} from "@/services/swagger/resposeType"
import {
    SaveDialogResponse,
    apiDeleteNotepadDetail,
    apiGetNotepadDetail,
    apiSaveNotepad,
    onBaseNotepadDown,
    onOpenLocalFileByPath
} from "../notepadManage/utils"
import moment from "moment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {CollabUserInfo} from "@/components/MilkdownEditor/CollabManager"
import {notepadRole} from "../NotepadShareModal/constants"
import {notepadSaveStatus} from "@/components/MilkdownEditor/WebsocketProvider/constants"
import emiter from "@/utils/eventBus/eventBus"
import {yakitNotify} from "@/utils/notification"
import {DownFilesModal} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"

const NotepadShareModal = React.lazy(() => import("../NotepadShareModal/NotepadShareModal"))

const notepadMixWidth = 1200
const ModifyNotepad: React.FC<ModifyNotepadProps> = React.memo((props) => {
    const {pageId} = props
    const userInfo = useStore((s) => s.userInfo)
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const {menuBodyHeight} = useMenuHeight(
        (s) => ({
            menuBodyHeight: s.menuBodyHeight
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
    const [catalogue, setCatalogue] = useState<MilkdownCatalogueProps[]>([])
    const [expand, setExpand] = useState<boolean>(true)
    const [onlineUsers, setOnlineUsers] = useState<CollabUserInfo[]>([])
    const [excludeExpandedKeys, setExcludeExpandedKeys] = useState<string[]>([])

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

    const notepadContentRef = useRef<string>("")
    const notepadRef = useRef<HTMLDivElement>(null)
    const treeKeysRef = useRef<string[]>([])

    const notepadWidth = useListenWidth(notepadRef)
    const clientWidthRef = useRef(document.body.clientWidth)
    const clientHeightRef = useRef(document.body.clientHeight)
    const avatarColor = useRef<string>(randomAvatarColor())
    const perTabName = useRef<string>(initTabName())
    const perHeadings = useRef<MilkdownCatalogueProps[]>([])

    const [inViewport = true] = useInViewport(notepadRef)

    useEffect(() => {
        if (!inViewport) {
            notepadContentRef.current = editor?.action(getMarkdown()) || ""
            onSaveNewContent(notepadContentRef.current)
        }
    }, [inViewport])
    useEffect(() => {
        const pageInfo: ModifyNotepadPageInfoProps = initPageInfo()
        if (pageInfo.notepadHash) {
            // 查询该笔记本详情
            setNotepadLoading(true)
            apiGetNotepadDetail(pageInfo.notepadHash)
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
        // return () => {
        //     const notepadContent = notepadContentRef.current
        //     onSaveNewContent(notepadContent)
        // }
    }, [])

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
    /** 编辑器内容的变化，更新数据 */
    const onMarkdownUpdated = useDebounceFn(
        (value) => {
            notepadContentRef.current = value
            const time = moment().unix()
            setNotepadDetail((v) => ({...v, updated_at: time}))
        },
        {wait: 200, leading: true}
    ).run

    const userAvatar = useCreation(() => {
        return judgeAvatar(userInfo, 28, avatarColor.current)
    }, [userInfo.companyName, userInfo.companyHeadImg])

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

    //#region 目录
    useEffect(() => {
        clientWidthRef.current = document.body.clientWidth
        clientHeightRef.current = document.body.clientHeight
        setExpand(notepadWidth > notepadMixWidth)
    }, [notepadWidth])
    const getCatalogue = useDebounceFn(
        (headings) => {
            if (isEqual(perHeadings.current, headings)) return
            // 生成目录树形结构
            const tocTree = buildTOCTree(headings)
            perHeadings.current = headings
            treeKeysRef.current = tocTree.keys
            setCatalogue(tocTree.treeData)
        },
        {wait: 500, leading: true}
    ).run
    const onCatalogueClick = useMemoizedFn((info: MilkdownCatalogueProps) => {
        if (!info.id) return
        const element = document.getElementById(info.id)
        if (element) {
            element.scrollIntoView({behavior: "smooth"})
        }
    })
    const onExpand = useMemoizedFn((info: MilkdownCatalogueProps) => {
        const key = info.key as string
        if (excludeExpandedKeys.includes(key)) {
            setExcludeExpandedKeys((k) => k.filter((ele) => ele !== key))
        } else {
            setExcludeExpandedKeys((k) => [...k, key])
        }
    })
    const onCatalogueMouseEnter = useMemoizedFn(() => {
        if (notepadWidth < notepadMixWidth) {
            setExpand(true)
        }
    })
    const onCatalogueMouseLeave = useMemoizedFn(() => {
        if (notepadWidth < notepadMixWidth) {
            setExpand(false)
        }
    })
    const onExpandIcon = useMemoizedFn(() => {
        setExpand(!expand)
    })

    const expandedKeys = useCreation(() => {
        return treeKeysRef.current.filter((ele) => !excludeExpandedKeys.includes(ele))
    }, [excludeExpandedKeys, treeKeysRef.current])
    const treeMaxHeight = useCreation(() => {
        return menuBodyHeight.firstTabMenuBodyHeight - 24 - 32 - 53 - 24 - 24 // 一级菜单+二级菜单+头部+编辑底部padding+padding-top
    }, [menuBodyHeight.firstTabMenuBodyHeight])
    const catalogueTop = useCreation(() => {
        const currentHeight = clientHeightRef.current
        const t = currentHeight - menuBodyHeight.firstTabMenuBodyHeight + 24 + 32 + 53 + 24 // 一级菜单+二级菜单+头部+padding-top
        if (notepadWidth < notepadMixWidth) return t
        return 0
    }, [expand, notepadWidth, menuBodyHeight.firstTabMenuBodyHeight, clientHeightRef.current])
    const treeMaxWidth = useCreation(() => {
        if ((notepadWidth || clientWidthRef.current) < notepadMixWidth) return 300
        return (notepadWidth - 820 - 32) / 2
    }, [notepadWidth, clientWidthRef.current])
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
        <div className={styles["modify-notepad"]}>
            <YakitSpin spinning={notepadLoading}>
                <div className={styles["modify-notepad-heard"]}>
                    <div className={styles["modify-notepad-heard-title"]}>{composedTabName}</div>
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
                                        {key: "remove", label: "删除", type: "danger", itemIcon: <OutlineTrashIcon />}
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
                </div>
                <div className={classNames(styles["notepad"])} ref={notepadRef}>
                    <div
                        className={classNames(styles["notepad-catalogue-wrapper"], {
                            [styles["notepad-catalogue-wrapper-hidden"]]: !catalogue.length
                        })}
                    >
                        <div
                            className={classNames(styles["notepad-catalogue"], {
                                [styles["notepad-catalogue-hover"]]: notepadWidth < notepadMixWidth,
                                [styles["notepad-catalogue-overflow-hidden"]]: !expand
                            })}
                            style={{
                                top: catalogueTop,
                                maxWidth: expand ? treeMaxWidth : 26,
                                maxHeight: expand ? treeMaxHeight : 24
                            }}
                            onMouseEnter={onCatalogueMouseEnter}
                            onMouseLeave={onCatalogueMouseLeave}
                        >
                            <div className={styles["notepad-button"]}>
                                <Tooltip title={expand ? "收起" : "展开"}>
                                    <YakitButton
                                        type='text2'
                                        icon={expand ? <OutlineCloseIcon /> : <OutlineOpenIcon />}
                                        onClick={onExpandIcon}
                                    />
                                </Tooltip>
                            </div>
                            <Tree
                                treeData={catalogue}
                                expandedKeys={expandedKeys}
                                switcherIcon={<></>}
                                showIcon={true}
                                className={classNames(styles["notepad-catalogue-tree"], {
                                    [styles["notepad-catalogue-tree-hidden"]]: !expand || notepadWidth < notepadMixWidth
                                })}
                                style={{
                                    maxHeight: expand ? treeMaxHeight - 24 : 0
                                }}
                                titleRender={(nodeData) => (
                                    <React.Fragment key={nodeData.key}>
                                        <CatalogueTreeNode
                                            info={nodeData}
                                            isExpanded={expandedKeys.includes(nodeData.key)}
                                            onClick={onCatalogueClick}
                                            onExpand={onExpand}
                                        />
                                    </React.Fragment>
                                )}
                            />
                        </div>
                    </div>
                    <div className={styles["notepad-content"]}>
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
                                <span>
                                    最近修改时间:
                                    {moment.unix(notepadDetail?.updated_at).format("YYYY-MM-DD HH:mm")}
                                </span>
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
                                    customPlugin={cataloguePlugin(getCatalogue)}
                                    collabProps={collabProps}
                                    onMarkdownUpdated={onMarkdownUpdated}
                                    setEditor={setEditor}
                                    onSaveContentBeforeDestroy={onSaveNewContent}
                                />
                            </YakitSpin>
                        </div>
                    </div>
                </div>
            </YakitSpin>
        </div>
    )
})

export default ModifyNotepad

const CatalogueTreeNode: React.FC<CatalogueTreeNodeProps> = React.memo((props) => {
    const {info, onClick, isExpanded, onExpand} = props
    return (
        <div className={styles["catalogue-tree-node"]}>
            {(info.children?.length || 0) > 0 && (
                <div className={styles["tree-expand-icon"]} onClick={() => onExpand(info)}>
                    {isExpanded ? <OutlineChevrondownIcon /> : <OutlineChevronrightIcon />}
                </div>
            )}
            <div
                className={classNames(styles["tree-node-title"], {
                    [styles["tree-node-title-level-one"]]: `${info.key}`.endsWith("1")
                })}
                onClick={() => onClick(info)}
            >
                {info.title as string}
            </div>
        </div>
    )
})
