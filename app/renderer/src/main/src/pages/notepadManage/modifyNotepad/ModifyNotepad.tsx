import React, {useEffect, useRef, useState} from "react"
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import styles from "./ModifyNotepad.module.scss"
import {cataloguePlugin} from "@/components/MilkdownEditor/utils/cataloguePlugin"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {CatalogueTreeNodeProps, MilkdownCatalogueProps, ModifyNotepadProps, OnlineUsersProps} from "./ModifyNotepadType"
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

const NotepadShareModal = React.lazy(() => import("../NotepadShareModal/NotepadShareModal"))

const onlineUserList: OnlineUsersProps[] = [
    {
        id: 1,
        name: "张三",
        img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500",
        onlineStatus: "#56C991"
    },
    {
        id: 2,
        name: "李四",
        img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500",
        onlineStatus: "#4A94F8"
    },
    {
        id: 3,
        name: "王五",
        img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500",
        onlineStatus: "#8863F7"
    }
]
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

    const [loading, setLoading] = useState<boolean>(false)
    const [editor, setEditor] = useState<EditorMilkdownProps>()
    const [catalogue, setCatalogue] = useState<MilkdownCatalogueProps[]>([])
    const [expand, setExpand] = useState<boolean>(true)
    const [onlineUsers, setOnlineUsers] = useState<OnlineUsersProps[]>(onlineUserList)
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
                title: initTabName() + moment().format("YYYY-MM-DD HH:mm:ss"),
                content: initTabName()
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
            onRemoveEmptyNotepad()
        }
    }, [pageInfo])

    useEffect(() => {
        clientWidthRef.current = document.body.clientWidth
        clientHeightRef.current = document.body.clientHeight
        setExpand(notepadWidth > notepadMixWidth)
    }, [notepadWidth])

    useEffect(() => {
        if (!editor) return
        // editor?.use(cataloguePlugin(getCatalogue)).create()
        // editor?.use(cataloguePlugin(getCatalogue))
    }, [editor])
    const onRemoveEmptyNotepad = useMemoizedFn(() => {
        const markdownContent = editor?.action(getMarkdown())
        if (!pageInfo.notepadHash && !markdownContent && notepadDetail.hash) {
            apiDeleteNotepadDetail({hash: notepadDetail.hash})
        }
    })
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

    const onSetTabName = useMemoizedFn((title) => {
        setTabName(title)
        onSetPageTabName(title)
    })

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

    return (
        <>
            <div className={styles["modify-notepad"]}>
                <div className={styles["modify-notepad-heard"]}>
                    <div className={styles["modify-notepad-heard-title"]}>{tabName}</div>
                    <div className={styles["modify-notepad-heard-extra"]}>
                        <div className={styles["modify-notepad-heard-extra-online-user"]}>
                            {onlineUsers.map((item) => (
                                <Tooltip key={item.id} title={item.name}>
                                    <div key={item.id}>
                                        <AuthorImg
                                            src={item.img}
                                            icon={
                                                <div
                                                    className={styles["online-user-dot"]}
                                                    style={{backgroundColor: item.onlineStatus}}
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
                                    <NotepadShareModal notepadInfo={notepadDetail} onClose={() => setShareVisible(false)} />
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

                        <Tooltip title={userInfo.companyName}>{judgeAvatar(userInfo, 28, avatarColor.current)}</Tooltip>
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
                                <AuthorImg src={notepadDetail?.headImg} />
                                <span>{notepadDetail?.userName}</span>
                                <AuthorIcon />
                                <Divider type='vertical' style={{margin: "0 8px"}} />
                                <span>
                                    创建时间:
                                    {moment(notepadDetail?.updated_at).format("YYYY-MM-DD HH:mm")}
                                </span>
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
                            <MilkdownEditor setEditor={setEditor} customPlugin={cataloguePlugin(getCatalogue)} />
                        </div>
                    </div>
                </div>
            </div>
        </>
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
