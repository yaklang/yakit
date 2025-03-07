import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./ModifyNotepad.module.scss"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {
    CatalogueTreeNodeProps,
    MilkdownCatalogueProps,
    ModifyNotepadContentProps,
    ModifyNotepadProps
} from "./ModifyNotepadType"
import {Tooltip, Tree} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondownIcon, OutlineChevronrightIcon, OutlineCloseIcon, OutlineOpenIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {buildTOCTree} from "./utils"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {useMenuHeight} from "@/store/menuHeight"
import {shallow} from "zustand/shallow"
import {isEqual} from "lodash"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {isCommunityEdition} from "@/utils/envfile"

const ModifyNotepadOnline = React.lazy(() => import("./modifyNotepadOnline/ModifyNotepadOnline"))
const ModifyNotepadLocal = React.lazy(() => import("./modifyNotepadLocal/ModifyNotepadLocal"))

const notepadMixWidth = 1200

const ModifyNotepad: React.FC<ModifyNotepadProps> = React.memo((props) => {
    const {pageId} = props
    return isCommunityEdition() ? (
        <ModifyNotepadLocal />
    ) : (
        <OnlineJudgment isJudgingLogin={true}>
            <ModifyNotepadOnline pageId={pageId} />
        </OnlineJudgment>
    )
})
export default ModifyNotepad

export const ModifyNotepadContent: React.FC<ModifyNotepadContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {tabName, spinning} = props
        const {menuBodyHeight} = useMenuHeight(
            (s) => ({
                menuBodyHeight: s.menuBodyHeight
            }),
            shallow
        )

        const [catalogue, setCatalogue] = useState<MilkdownCatalogueProps[]>([])
        const [expand, setExpand] = useState<boolean>(true)
        const [excludeExpandedKeys, setExcludeExpandedKeys] = useState<string[]>([])

        const notepadRef = useRef<HTMLDivElement>(null)
        const treeKeysRef = useRef<string[]>([])

        const notepadWidth = useListenWidth(notepadRef)
        const clientWidthRef = useRef(document.body.clientWidth)
        const clientHeightRef = useRef(document.body.clientHeight)
        const perHeadings = useRef<MilkdownCatalogueProps[]>([])

        useImperativeHandle(
            ref,
            () => ({
                getCatalogue
            }),
            []
        )

        //#region 目录
        useEffect(() => {
            clientWidthRef.current = document.body.clientWidth
            clientHeightRef.current = document.body.clientHeight
            setExpand(notepadWidth > notepadMixWidth)
        }, [notepadWidth])
        const getCatalogue = useDebounceFn(
            (headings: MilkdownCatalogueProps[]) => {
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

        return (
            <div className={styles["modify-notepad"]}>
                <YakitSpin spinning={spinning}>
                    <div className={styles["modify-notepad-heard"]}>
                        <div className={styles["modify-notepad-heard-title"]}>{tabName}</div>
                        {props.titleExtra}
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
                                        [styles["notepad-catalogue-tree-hidden"]]:
                                            !expand || notepadWidth < notepadMixWidth
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
                        {props.children}
                    </div>
                </YakitSpin>
            </div>
        )
    })
)
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
