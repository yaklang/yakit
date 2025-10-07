import type {FC} from "react"
import {useMemoizedFn, useSafeState} from "ahooks"

import {OutlineAiChatIcon, OutlineChevrondownIcon, OutlineChevronrightIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {createMenuList, manageMenuList, targetIcon} from "../utils"
import {PlusIcon} from "@/assets/newIcon"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {type KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {SolidDotsverticalIcon, SolidLightningBoltIcon, SolidOutlineSearchIcon} from "@/assets/icon/solid"
export interface TKnowledgeBaseSidebarProps {
    knowledgeBases: KnowledgeBaseItem[]
    knowledgeBaseID: string
    setKnowledgeBaseID: (knowledgeBaseID: TKnowledgeBaseSidebarProps["knowledgeBaseID"]) => void
}

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID
}) => {
    const [expand, setExpand] = useSafeState(true)
    const [createMenuOpen, setCreateMenuOpen] = useSafeState(false)
    const [visible, setVisible] = useSafeState(false)
    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")

    const handleChangeExpand = useMemoizedFn(() => {
        setExpand((old) => !old)
    })

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
                        <YakitDropdownMenu
                            menu={{
                                data: createMenuList,
                                onClick: ({key}) => {
                                    setCreateMenuOpen(false)
                                    switch (key) {
                                        case "import":
                                            setVisible((prevalue) => !prevalue)
                                            break
                                        case "create":
                                            // handOpenKnowledgeBasesModal()
                                            break
                                        default:
                                            break
                                    }
                                }
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottomRight",
                                onVisibleChange: (v) => {
                                    setCreateMenuOpen(v)
                                },
                                visible: createMenuOpen
                            }}
                        >
                            <YakitButton icon={<PlusIcon />} size='small' />
                        </YakitDropdownMenu>
                    </div>
                </div>
                <div className={styles["repository-manage-search"]}>
                    <YakitInput
                        placeholder={"请输入请输入关键字搜索"}
                        allowClear
                        prefix={<SolidOutlineSearchIcon />}
                        value={sidebarSearchValue}
                        onChange={(e) => setSidebarSearchValue(e.target.value)}
                        onPressEnter={(e) => console.log(sidebarSearchValue)}
                        // onSearch={(value) => knowledgeBasesRunAsync(value)}
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
                                <div className={styles["content"]}>
                                    <div className={styles["header"]}>
                                        <Icon className={styles["icon"]} />
                                        <div className={styles["title"]}>{it.KnowledgeBaseName}</div>
                                        <div className={styles["type-tag"]}>{it.KnowledgeBaseType}</div>
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
                                                                setVisible((prevalue) => !prevalue)
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
                                    <div className={styles["description"]}>{it.KnowledgeBaseDescription}</div>
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
