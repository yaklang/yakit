import React, {useEffect, useRef, useState} from "react"
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import styles from "./ModifyNotepad.module.scss"
import {cataloguePlugin} from "@/components/MilkdownEditor/utils/cataloguePlugin"
import {ProsemirrorAdapterProvider, usePluginViewContext} from "@prosemirror-adapter/react"
import {MilkdownProvider} from "@milkdown/react"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {CatalogueTreeNodeProps, MilkdownCatalogueProps, ModifyNotepadProps, OnlineUsersProps} from "./ModifyNotepadType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Avatar, Badge, Divider, Tree} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondownIcon,
    OutlineCloseIcon,
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlineOpenIcon,
    OutlineShareIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import YakitTree from "@/components/yakitUI/YakitTree/YakitTree"
import {buildTOCTree} from "./utils"
import {DataNode} from "antd/lib/tree"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {useMenuHeight} from "@/store/menuHeight"
import {shallow} from "zustand/shallow"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitRouteToPageInfo} from "@/routes/newRoute"
import {AuthorImg} from "@/pages/plugins/funcTemplate"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"

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
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const {menuBodyHeight} = useMenuHeight(
        (s) => ({
            menuBodyHeight: s.menuBodyHeight
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Modify_Notepad, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.Modify_Notepad].label || "未命名文档"
    })
    const [editor, setEditor] = useState<EditorMilkdownProps>()
    const [catalogue, setCatalogue] = useState<MilkdownCatalogueProps[]>([])
    const [expand, setExpand] = useState<boolean>(true)
    const [onlineUsers, setOnlineUsers] = useState<OnlineUsersProps[]>(onlineUserList)
    const [excludeExpandedKeys, setExcludeExpandedKeys] = useState<string[]>([])

    const notepadRef = useRef<HTMLDivElement>(null)
    const treeKeysRef = useRef<string[]>([])

    const notepadWidth = useListenWidth(notepadRef)
    const clientWidthRef = useRef(document.body.clientWidth)
    const clientHeightRef = useRef(document.body.clientHeight)

    const [tabName, setTabName] = useState<string>(initPageInfo())

    useEffect(() => {
        clientWidthRef.current = document.body.clientWidth
        clientHeightRef.current = document.body.clientHeight
        setExpand(notepadWidth > notepadMixWidth)
    }, [notepadWidth])

    useEffect(() => {
        if (!editor) return
        editor
            ?.use(cataloguePlugin(getCatalogue))

            .create()
    }, [editor])
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
    const expandedKeys = useCreation(() => {
        return treeKeysRef.current.filter((ele) => !excludeExpandedKeys.includes(ele))
    }, [excludeExpandedKeys, treeKeysRef.current])
    const treeMaxHeight = useCreation(() => {
        return menuBodyHeight.firstTabMenuBodyHeight - 24 - 32 - 53 - 24 - 24 // 一级菜单+二级菜单+头部+编辑底部padding+padding-top
    }, [menuBodyHeight.firstTabMenuBodyHeight])
    const top = useCreation(() => {
        const currentHeight = clientHeightRef.current
        const t = currentHeight - menuBodyHeight.firstTabMenuBodyHeight + 24 + 32 + 53 + 24 // 一级菜单+二级菜单+头部+padding-top
        if (notepadWidth < notepadMixWidth) return t
        return 0
    }, [expand, notepadWidth, menuBodyHeight.firstTabMenuBodyHeight, clientHeightRef.current])

    const onExpandIcon = useMemoizedFn(() => {
        if (notepadWidth < notepadMixWidth) return
        setExpand(!expand)
    })
    const treeMaxWidth = useCreation(() => {
        if ((notepadWidth || clientWidthRef.current) < notepadMixWidth) return 300
        return (clientWidthRef.current - 820 - 32) / 2
    }, [notepadWidth, clientWidthRef.current])
    return (
        <>
            <div className={styles["modify-notepad"]}>
                <div className={styles["modify-notepad-heard"]}>
                    <div className={styles["modify-notepad-heard-title"]}>{tabName}</div>
                    <div className={styles["modify-notepad-heard-extra"]}>
                        <div className={styles["modify-notepad-heard-extra-online-user"]}>
                            {onlineUsers.map((item) => (
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
                            ))}
                        </div>
                        <YakitButton type='outline1' icon={<OutlineShareIcon />} size='large'>
                            分享
                        </YakitButton>
                        <YakitButton type='primary' icon={<OutlineClouddownloadIcon />} size='large'>
                            下载
                        </YakitButton>
                        <YakitDropdownMenu
                            menu={{
                                data: [{key: "remove", label: "删除", type: "danger"}],
                                onClick: ({key}) => {
                                    switch (key) {
                                        default:
                                            break
                                    }
                                }
                            }}
                        >
                            <YakitButton type='text2' icon={<OutlineDotshorizontalIcon />} size='large' />
                        </YakitDropdownMenu>
                        <Divider type='vertical' style={{margin: 0}} />
                        <AuthorImg />
                    </div>
                </div>

                <div className={classNames(styles["notepad"])} ref={notepadRef}>
                    <div className={styles["notepad-catalogue-wrapper"]}>
                        <div
                            className={classNames(styles["notepad-catalogue"], {
                                [styles["notepad-catalogue-retract"]]: !expand && notepadWidth < notepadMixWidth,
                                [styles["notepad-catalogue-hidden"]]: !expand
                            })}
                            style={{top, maxWidth: expand ? treeMaxWidth : 24, maxHeight: expand ? treeMaxHeight : 24}}
                        >
                            <div className={styles["notepad-button"]}>
                                <YakitButton
                                    type='text2'
                                    icon={expand ? <OutlineCloseIcon /> : <OutlineOpenIcon />}
                                    onClick={onExpandIcon}
                                />
                            </div>
                            <Tree
                                treeData={catalogue}
                                expandedKeys={expandedKeys}
                                switcherIcon={<></>}
                                showIcon={false}
                                className={classNames(styles["notepad-catalogue-tree"], {
                                    // [styles["notepad-catalogue-tree-hidden"]]: !expand
                                })}
                                titleRender={(nodeData) => {
                                    return (
                                        <React.Fragment key={nodeData.key}>
                                            <CatalogueTreeNode
                                                info={nodeData}
                                                onClick={onCatalogueClick}
                                                onExpand={onExpand}
                                            />
                                        </React.Fragment>
                                    )
                                }}
                            />
                        </div>
                    </div>
                    <div className={styles["notepad-content"]}>
                        <div className={styles["notepad-heard"]}>
                            <YakitInput placeholder='请输入标题' />
                            <div className={styles["notepad-heard-subTitle"]}>
                                <AuthorImg />
                                <span>白日爱做梦</span>
                                <span>作者</span>
                                <Divider type='vertical' style={{margin: "0 8px"}} />
                                <span>创建时间:2024-05-27 15:32</span>
                            </div>
                        </div>
                        <div className={styles["notepad-editor"]}>
                            <MilkdownEditor setEditor={setEditor} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
})

export default ModifyNotepad

const CatalogueTreeNode: React.FC<CatalogueTreeNodeProps> = React.memo((props) => {
    const {info, onClick, onExpand} = props
    return (
        <div className={styles["catalogue-tree-node"]}>
            {(info.children?.length || 0) > 0 && (
                <OutlineChevrondownIcon className={styles["icon"]} onClick={() => onExpand(info)} />
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
