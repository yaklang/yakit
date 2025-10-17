import type {FC} from "react"
import {useMemoizedFn, useRequest, useSafeState} from "ahooks"

import {
    OutlineAiChatIcon,
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineLoadingIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {manageMenuList, targetIcon} from "../utils"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useKnowledgeBase, type KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {SolidDotsverticalIcon, SolidLightningBoltIcon, SolidOutlineSearchIcon} from "@/assets/icon/solid"
import {AddKnowledgenBaseDropdownMenu} from "./AddKnowledgenBaseDropdownMenu"
import {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "../TKnowledgeBase"
export interface TKnowledgeBaseSidebarProps {
    knowledgeBases: KnowledgeBaseItem[]
    knowledgeBaseID: string
    setKnowledgeBaseID: (knowledgeBaseID: TKnowledgeBaseSidebarProps["knowledgeBaseID"]) => void
}

const {ipcRenderer} = window.require("electron")

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID
}) => {
    const initializeKnowledgeBase = useKnowledgeBase((s) => s.initialize)
    const [expand, setExpand] = useSafeState(true)

    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")

    const handleChangeExpand = useMemoizedFn(() => {
        setExpand((old) => !old)
    })

    // 查询知识库
    const {runAsync: knowledgeBasesRunAsync} = useRequest(
        async (Keyword?: string, createKnwledgeData?: CreateKnowledgeBaseData) => {
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {Keyword})
            const {KnowledgeBases} = result
            const resultData = KnowledgeBases?.map((it) => ({
                ...createKnwledgeData,
                ...it
            }))
            return resultData
        },
        {
            manual: true,
            onSuccess: (value) => {
                if (value) initializeKnowledgeBase(value)
            }
        }
    )

    return (
        <div
            className={classNames(styles["knowledge-base-info"], {
                [styles["knowledge-base-info-hidden"]]: !expand
            })}
        >
            <div className={styles["knowledge-base-info-context"]}>
                <div className={styles["knowledge-base-info-header"]}>
                    <div className={styles["knowledge-base-info-header-button"]} onClick={handleChangeExpand}>
                        <YakitButton
                            type='outline2'
                            size='small'
                            className={styles["expand-btn"]}
                            icon={<OutlineChevronrightIcon />}
                        />
                        <div className={styles["header-title"]}>知识库管理</div>
                        <div className={styles["knowledge-size"]}>{knowledgeBases.length ?? 0}</div>
                    </div>
                    <div className={styles["header-operate"]}>
                        <div className={styles["ai-button"]}>
                            <OutlineAiChatIcon />
                            AI问答
                        </div>
                        <AddKnowledgenBaseDropdownMenu knowledgeBasesRunAsync={knowledgeBasesRunAsync} />
                    </div>
                </div>
                <div className={styles["repository-manage-search"]}>
                    <YakitInput
                        placeholder={"请输入请输入关键字搜索"}
                        allowClear
                        prefix={<SolidOutlineSearchIcon />}
                        value={sidebarSearchValue}
                        onChange={(e) => setSidebarSearchValue(e.target.value)}
                        onPressEnter={(e) => knowledgeBasesRunAsync(sidebarSearchValue)}
                    />
                </div>

                <div className={styles["knowledge-base-info-body"]}>
                    {knowledgeBases.map((it, index) => {
                        const Icon = targetIcon(index)
                        return (
                            <div
                                className={classNames(styles["knowledge-base-info-card"], {
                                    [styles["base-info-card-selected"]]: knowledgeBaseID === it.ID
                                })}
                                key={it.ID}
                                onClick={() => setKnowledgeBaseID(it.ID)}
                            >
                                <div
                                    className={classNames({
                                        [styles["initial"]]: it.streamToken,
                                        [styles["content"]]: !it.streamToken
                                    })}
                                >
                                    <div className={styles["header"]}>
                                        <Icon className={styles["icon"]} />
                                        <div className={styles["title"]}>{it.KnowledgeBaseName}</div>
                                        {it.streamToken ? (
                                            <div className={styles["tag"]}>
                                                <OutlineLoadingIcon className={styles["loading-icon"]} />
                                                生成中
                                            </div>
                                        ) : (
                                            <div className={styles["type-tag"]}>{it.KnowledgeBaseType}</div>
                                        )}
                                        <div className={styles["operate"]}>
                                            <SolidLightningBoltIcon
                                                className={styles["lightning-bolt-icon"]}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    //    setQaDrawerVisible(true)
                                                }}
                                            />
                                            <YakitDropdownMenu
                                                menu={{
                                                    data: manageMenuList,
                                                    onClick: ({key}) => {
                                                        //    setMenuOpen?.(false)
                                                        switch (key) {
                                                            case "edit":
                                                                // setVisible((prevalue) => !prevalue)
                                                                break
                                                            case "delete":
                                                                //    setDeletConfirm((preValue) => !preValue)
                                                                break

                                                            default:
                                                                break
                                                        }
                                                    }
                                                }}
                                                dropdown={{
                                                    trigger: ["click"],
                                                    placement: "bottomRight",
                                                    //    onVisibleChange: (v) => {
                                                    //        setMenuOpenKey?.(itemsData!.ID)
                                                    //        setMenuOpen?.(v)
                                                    //    },
                                                    visible: false
                                                }}
                                            >
                                                <SolidDotsverticalIcon
                                                    className={styles["dotsvertical-icon"]}
                                                    // className={classNames({
                                                    //     [styles["manage-menu-icon-selected"]]:
                                                    //         menuOpenKey === itemsData!.ID && menuOpen
                                                    // })}
                                                />
                                            </YakitDropdownMenu>
                                        </div>
                                    </div>
                                    <div className={styles["description"]}>
                                        {it.streamToken
                                            ? "知识库生成中，大概需要 3～5 秒，请耐心等待..."
                                            : it.KnowledgeBaseDescription}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className={styles["knowledge-base-side-bar"]}>
                <div className={styles["knowledge-base-side-bar-header"]} onClick={handleChangeExpand}>
                    <YakitButton
                        type='outline2'
                        size='small'
                        className={styles["expand-btn"]}
                        icon={<OutlineChevrondownIcon />}
                    />
                    <div className={styles["header-title"]}>知识库管理</div>
                </div>
            </div>
        </div>
    )
}

export {KnowledgeBaseSidebar}
