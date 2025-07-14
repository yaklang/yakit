import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./ModifyNotepad.module.scss"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {
    CatalogueTreeNodeProps,
    MilkdownCatalogueProps,
    ModifyNotepadContentProps,
    ModifyNotepadProps
} from "./ModifyNotepadType"
import {Tree} from "antd"
import {
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineListOneIcon,
    OutlineListTwoIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {buildTOCTree} from "./utils"
import {isEqual} from "lodash"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {isCommunityEdition} from "@/utils/envfile"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {NotepadRemoteGV} from "@/enums/notepad"

const ModifyNotepadOnline = React.lazy(() => import("./modifyNotepadOnline/ModifyNotepadOnline"))
const ModifyNotepadLocal = React.lazy(() => import("./modifyNotepadLocal/ModifyNotepadLocal"))

const ModifyNotepad: React.FC<ModifyNotepadProps> = React.memo((props) => {
    return isCommunityEdition() ? (
        <ModifyNotepadLocal {...props} />
    ) : (
        <OnlineJudgment isJudgingLogin={true}>
            <ModifyNotepadOnline {...props} />
        </OnlineJudgment>
    )
})
export default ModifyNotepad

export const ModifyNotepadContent: React.FC<ModifyNotepadContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {tabName, spinning, listDom} = props
        //#region 目录
        const [catalogue, setCatalogue] = useState<MilkdownCatalogueProps[]>([])
        const [excludeExpandedKeys, setExcludeExpandedKeys] = useState<string[]>([])
        const treeKeysRef = useRef<string[]>([])

        const perHeadings = useRef<MilkdownCatalogueProps[]>([])

        useImperativeHandle(
            ref,
            () => ({
                getCatalogue: (h) => {
                    getCatalogue(h)
                }
            }),
            []
        )

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
        const expandedKeys = useCreation(() => {
            return treeKeysRef.current.filter((ele) => !excludeExpandedKeys.includes(ele))
        }, [excludeExpandedKeys, treeKeysRef.current])

        //#endregion
        //#region 侧边栏
        const [activeKey, setActiveKey] = useState<string>("catalogue")
        const [yakitTab, setYakitTab] = useState<YakitTabsProps[]>([
            {
                icon: <OutlineListOneIcon />,
                label: "目录",
                value: "catalogue",
                show: true
            },
            {
                icon: <OutlineListTwoIcon />,
                label: "列表",
                value: "list",
                show: true
            }
        ])
        useEffect(() => {
            getRemoteValue(NotepadRemoteGV.NotepadDetailsTabKey).then((res) => {
                if (!!res) {
                    setActiveKey(res)
                }
            })
        }, [])
        const show = useCreation(() => {
            return yakitTab.find((ele) => ele.value === activeKey)?.show !== false
        }, [yakitTab, activeKey])
        const onActiveKey = useMemoizedFn((key) => {
            setActiveKey(key)
            setRemoteValue(NotepadRemoteGV.NotepadDetailsTabKey, key)
        })
        //#endregion
        return (
            <div className={styles["modify-notepad"]}>
                <YakitSpin spinning={spinning}>
                    <div className={styles["modify-notepad-heard"]}>
                        <div className={styles["modify-notepad-heard-title"]}>{tabName}</div>
                        {props.titleExtra}
                    </div>
                    <div className={classNames(styles["notepad"])}>
                        <YakitResizeBox
                            freeze={show}
                            lineDirection='right'
                            firstRatio={show ? "300px" : "25px"}
                            firstNodeStyle={show ? {padding: 0} : {padding: 0, maxWidth: 25}}
                            firstMinSize={show ? 300 : 25}
                            secondMinSize={830}
                            firstNode={
                                <div className={styles["notepad-tab-body"]}>
                                    <YakitSideTab
                                        yakitTabs={yakitTab}
                                        setYakitTabs={setYakitTab}
                                        activeKey={activeKey}
                                        onActiveKey={onActiveKey}
                                    />
                                    <div className={styles["notepad-tab-content"]}>
                                        {activeKey === "catalogue" && (
                                            <>
                                                {catalogue.length > 0 ? (
                                                    <Tree
                                                        treeData={catalogue}
                                                        expandedKeys={expandedKeys}
                                                        switcherIcon={<></>}
                                                        showIcon={true}
                                                        className={classNames(styles["notepad-catalogue-tree"])}
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
                                                ) : (
                                                    <YakitEmpty style={{paddingTop: 48}} title='暂无数据' />
                                                )}
                                            </>
                                        )}
                                        {activeKey === "list" && listDom}
                                    </div>
                                </div>
                            }
                            secondNodeStyle={
                                show
                                    ? {overflow: "auto", padding: "24px 16px 24px 12px"}
                                    : {padding: "24px 16px 24px 12px", minWidth: "calc(100% - 25px)"}
                            }
                            secondNode={<>{props.children}</>}
                        />
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
