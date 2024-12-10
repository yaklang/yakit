import React, {useEffect, useRef, useState} from "react"
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
import {CollabStatus, EditorMilkdownProps, MilkdownCollabProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import styles from "./ModifyNotepad.module.scss"
import {cataloguePlugin} from "@/components/MilkdownEditor/utils/cataloguePlugin"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
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
import {cloneDeep} from "lodash"
import {defaultModifyNotepadPageInfo} from "@/defaultConstants/ModifyNotepad"
import {API} from "@/services/swagger/resposeType"
import {apiDeleteNotepadDetail, apiGetNotepadDetail, apiSaveNotepadList} from "../notepadManage/utils"
import moment from "moment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {CollabUserInfo} from "@/components/MilkdownEditor/CollabManager"
import {notepadRole} from "../NotepadShareModal/constants"

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
        return YakitRouteToPageInfo[YakitRoute.Modify_Notepad].label || "未命名文档"
    })
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, pageId)
        if (currentItem && currentItem.pageParamsInfo.modifyNotepadPageInfo) {
            return currentItem.pageParamsInfo.modifyNotepadPageInfo
        }
        return cloneDeep(defaultModifyNotepadPageInfo)
    })

    const [loading, setLoading] = useState<boolean>(true)
    const [editor, setEditor] = useState<EditorMilkdownProps>()
    const [catalogue, setCatalogue] = useState<MilkdownCatalogueProps[]>([])
    const [expand, setExpand] = useState<boolean>(true)
    const [onlineUsers, setOnlineUsers] = useState<CollabUserInfo[]>([])
    const [excludeExpandedKeys, setExcludeExpandedKeys] = useState<string[]>([])

    const [shareVisible, setShareVisible] = useState<boolean>(false)

    const [tabName, setTabName] = useState<string>(initTabName())
    const [pageInfo, setPageInfo] = useState<ModifyNotepadPageInfoProps>(initPageInfo())
    const [notepadDetail, setNotepadDetail] = useState<API.GetNotepadList>({
        id: 0,
        created_at: moment().valueOf(),
        updated_at: moment().valueOf(),
        title: initTabName(),
        content: "",
        userName: userInfo.companyName || "-",
        headImg: userInfo.companyHeadImg || "",
        collaborator: [],
        hash: ""
    })

    const [documentLinkStatus, setDocumentLinkStatus] = useState<CollabStatus>({
        status: "disconnected",
        isSynced: false
    })

    const notepadRef = useRef<HTMLDivElement>(null)
    const treeKeysRef = useRef<string[]>([])

    const notepadWidth = useListenWidth(notepadRef)
    const clientWidthRef = useRef(document.body.clientWidth)
    const clientHeightRef = useRef(document.body.clientHeight)
    const avatarColor = useRef<string>(randomAvatarColor())

    useEffect(() => {
        if (pageInfo.notepadHash) {
            // 查询该笔记本详情
            apiGetNotepadDetail(pageInfo.notepadHash).then((res) => {
                setNotepadDetail(res)
            })
        } else {
            // 新建笔记本并保存
            const params: API.PostNotepadRequest = {
                title: initTabName(),
                content: ""
            }
            setLoading(true)
            apiSaveNotepadList(params)
                .then((hash) => {
                    setNotepadDetail({...(notepadDetail || {}), hash})
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                )
        }
        return () => {
            try {
                const markdownContent = editor?.action(getMarkdown())
                onSaveNewContent(markdownContent)
            } catch (error) {}
            onRemoveEmptyNotepad()
        }
    }, [pageInfo])

    /**新建进来，然后退出时文档为空，需要删除文档 */
    const onRemoveEmptyNotepad = useMemoizedFn(() => {
        const markdownContent = editor?.action(getMarkdown())
        const isRemove = !pageInfo.notepadHash && !markdownContent && notepadDetail.hash
        if (!!isRemove) {
            apiDeleteNotepadDetail({hash: notepadDetail.hash})
        }
    })
    /**保存最新的文档内容 */
    const onSaveNewContent = useMemoizedFn((markdownContent) => {
        const params: API.PostNotepadRequest = {
            hash: notepadDetail.hash,
            title: tabName,
            content: markdownContent || ""
        }
        apiSaveNotepadList(params)
    })

    /**TODO -  编辑器内容的变化，更新数据 */
    const onMarkdownUpdated = useDebounceFn(
        (value) => {
            // onSaveNewContent(value)
        },
        {wait: 1000 * 60, leading: true}
    ).run

    /**设置标题 */
    const onSetTabName = useMemoizedFn((title) => {
        setTabName(title)
        onSetPageTabName(title)
    })
    /**标题更改与页面菜单名称同步 */
    const onSetPageTabName = useDebounceFn(
        useMemoizedFn((tabName: string) => {
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, pageId)
            if (!currentItem) return
            const newCurrentItem: PageNodeItemProps = {
                ...currentItem,
                pageName: tabName
            }
            updatePagesDataCacheById(YakitRoute.Modify_Notepad, {...newCurrentItem})
        }),
        {wait: 200, leading: true}
    ).run

    const authorAvatar = useCreation(() => {
        return judgeAvatar(userInfo, 28, avatarColor.current)
    }, [userInfo.companyName])
    //#region 目录
    useEffect(() => {
        clientWidthRef.current = document.body.clientWidth
        clientHeightRef.current = document.body.clientHeight
        setExpand(notepadWidth > notepadMixWidth)
    }, [notepadWidth])
    const getCatalogue = useDebounceFn(
        (view) => {
            const headings: MilkdownCatalogueProps[] = []
            const {doc} = view.state

            // 遍历文档节点，提取标题（heading）
            doc.descendants((node) => {
                if (node.type.name === "heading") {
                    const {attrs} = node
                    headings.push({
                        id: attrs.id,
                        title: node.textContent, // 标题文本
                        key: "",
                        level: attrs.level, // 标题级别,
                        children: []
                    })
                }
            })
            // 生成目录树形结构
            const tocTree = buildTOCTree(headings)
            treeKeysRef.current = tocTree.keys
            setCatalogue(tocTree.treeData)
        },
        {wait: 200, leading: true}
    ).run
    const onCatalogueClick = useMemoizedFn((info: MilkdownCatalogueProps) => {
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
    const currentRole = useCreation(() => {
        /**TODO 需要增加是否是本人的判断 */
        // const owner = notepadDetail.collaborator.find((ele) => ele.user_id === userInfo.user_id)
        // return owner ? owner.role : ""
        return notepadRole.editPermission
    }, [notepadDetail.collaborator, userInfo.user_id])
    const readonly = useCreation(() => {
        return currentRole !== notepadRole.editPermission
    }, [currentRole])
    const collabProps: MilkdownCollabProps = useCreation(() => {
        const enableCollab = currentRole === notepadRole.editPermission
        const collabValue: MilkdownCollabProps = {
            enableCollab,
            milkdownHash: notepadDetail.hash,
            routeInfo: {
                pageId,
                route: YakitRoute.Modify_Notepad
            },
            enableSaveHistory: true,
            onChangeWSLinkStatus: onSetDocumentLinkStatus,
            // onChangeOnlineUser: setOnlineUsers
            onChangeOnlineUser: onSetOnlineUsers // 过滤了作者本人
        }
        return collabValue
    }, [notepadDetail.hash, pageId, currentRole, YakitRoute.Modify_Notepad])
    //#endregion
    /**在线链接&&文档保存状态 */
    const renderOnlineStatus = useCreation(() => {
        const {status, isSynced = true, isSave = true} = documentLinkStatus
        switch (status) {
            case "connected":
                return (
                    <>
                        <YakitTag color='green'>在线</YakitTag>
                        <span>{isSave ? "已经保存到云端" : "保存中..."}</span>
                        {isSynced && "已同步"}
                    </>
                )
            case "connecting":
                return <YakitTag color='blue'>连接中...</YakitTag>
            default:
                return collabProps.enableCollab ? <YakitTag color='red'>离线</YakitTag> : <></>
        }
    }, [documentLinkStatus, collabProps.enableCollab])
    return (
        <YakitSpin spinning={collabProps.enableCollab && loading}>
            <div className={styles["modify-notepad"]}>
                <div className={styles["modify-notepad-heard"]}>
                    <div className={styles["modify-notepad-heard-title"]}>{tabName}</div>
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
                        <YakitButton type='primary' icon={<OutlineClouddownloadIcon />} size='large'>
                            下载
                        </YakitButton>
                        <FuncFilterPopover
                            icon={<OutlineDotshorizontalIcon />}
                            button={{type: "text2", size: "large"}}
                            menu={{
                                type: "primary",
                                data: [{key: "remove", label: "删除", type: "danger", itemIcon: <OutlineTrashIcon />}],
                                onClick: ({key}) => {
                                    switch (key) {
                                        default:
                                            break
                                    }
                                }
                            }}
                            placement='bottomRight'
                        />
                        <Divider type='vertical' style={{margin: 0}} />

                        <Tooltip title={userInfo.companyName}>{authorAvatar}</Tooltip>
                    </div>
                </div>
                <div className={classNames(styles["notepad"])} ref={notepadRef}>
                    <div className={styles["notepad-catalogue-wrapper"]}>
                        <div
                            className={classNames(styles["notepad-catalogue"], {
                                [styles["notepad-catalogue-hover"]]: notepadWidth < notepadMixWidth,
                                [styles["notepad-catalogue-hidden"]]: !expand
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
                            <YakitInput
                                placeholder='请输入标题'
                                size='large'
                                bordered={false}
                                className={styles["notepad-input"]}
                                value={tabName}
                                onChange={(e) => onSetTabName(e.target.value)}
                            />
                            <div className={styles["notepad-heard-subTitle"]}>
                                {notepadDetail?.headImg ? <AuthorImg src={notepadDetail?.headImg} /> : authorAvatar}
                                <span>{notepadDetail?.userName}</span>
                                <AuthorIcon />
                                <Divider type='vertical' style={{margin: "0 8px"}} />
                                <span>
                                    创建时间:
                                    {moment(notepadDetail?.updated_at).format("YYYY-MM-DD HH:mm")}
                                </span>
                                <Divider type='vertical' style={{margin: "0 8px"}} />
                                {renderOnlineStatus}
                                <YakitButton
                                    onClick={() => {
                                        if (editor) {
                                            const markdownContent = editor.action(getMarkdown())
                                            console.log("当前 Markdown 内容:", markdownContent)
                                        }
                                    }}
                                >
                                    保存
                                </YakitButton>
                            </div>
                        </div>
                        <div className={styles["notepad-editor"]}>
                            <MilkdownEditor
                                readonly={readonly}
                                defaultValue={notepadDetail.content}
                                setEditor={setEditor}
                                customPlugin={cataloguePlugin(getCatalogue)}
                                collabProps={collabProps}
                                onMarkdownUpdated={onMarkdownUpdated}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </YakitSpin>
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
