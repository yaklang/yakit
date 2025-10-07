import {useEffect, type FC} from "react"
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
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {type KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {SolidDotsverticalIcon, SolidLightningBoltIcon, SolidOutlineSearchIcon} from "@/assets/icon/solid"
import {AddKnowledgenBaseDropdownMenu} from "./AddKnowledgenBaseDropdownMenu"
import {TExistsKnowledgeBaseAsync} from "../TKnowledgeBase"
import {
    DeleteConfirm,
    EditKnowledgenBaseModal,
    ExportModal,
    OperateKnowledgenBaseItem
} from "./OperateKnowledgenBaseItem"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"

export interface TKnowledgeBaseSidebarProps extends Omit<TExistsKnowledgeBaseAsync, "streams"> {
    knowledgeBases: KnowledgeBaseItem[]
    knowledgeBaseID: string
    setKnowledgeBaseID: (knowledgeBaseID: TKnowledgeBaseSidebarProps["knowledgeBaseID"]) => void
}

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID,
    existsKnowledgeBaseAsync
}) => {
    const [expand, setExpand] = useSafeState(true)
    const [knowledgeBase, setKnowledgeBase] = useSafeState<KnowledgeBaseItem[]>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()

    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")

    const handleChangeExpand = useMemoizedFn(() => {
        setExpand((old) => !old)
    })

    useEffect(() => {
        setKnowledgeBaseID(knowledgeBases?.[0]?.ID || "")
    }, [])

    useEffect(() => {
        setKnowledgeBase(knowledgeBases)
    }, [knowledgeBases])

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
                        <div className={styles["knowledge-size"]}>{knowledgeBase.length ?? 0}</div>
                    </div>
                    <div className={styles["header-operate"]}>
                        <div className={styles["ai-button"]}>
                            <OutlineAiChatIcon />
                            AI问答
                        </div>
                        <AddKnowledgenBaseDropdownMenu existsKnowledgeBaseAsync={existsKnowledgeBaseAsync} />
                    </div>
                </div>
                <div className={styles["repository-manage-search"]}>
                    <YakitInput
                        placeholder={"请输入请输入关键字搜索"}
                        allowClear
                        prefix={<SolidOutlineSearchIcon />}
                        value={sidebarSearchValue}
                        onChange={(e) => setSidebarSearchValue(e.target.value)}
                        onPressEnter={() =>
                            setKnowledgeBase(() =>
                                knowledgeBases.filter(
                                    (it) =>
                                        it?.KnowledgeBaseName?.toLowerCase().startsWith(
                                            sidebarSearchValue.toLowerCase()
                                        )
                                )
                            )
                        }
                    />
                </div>

                <div className={styles["knowledge-base-info-body"]}>
                    {knowledgeBase.length > 0 ? (
                        knowledgeBase.map((items, index) => {
                            const Icon = targetIcon(index)
                            return (
                                <div
                                    className={classNames(styles["knowledge-base-info-card"], {
                                        [styles["base-info-card-selected"]]: knowledgeBaseID === items.ID
                                    })}
                                    key={items.ID}
                                    onClick={() => setKnowledgeBaseID(items.ID)}
                                >
                                    <div
                                        className={classNames({
                                            [styles["initial"]]: items.streamstep === 1,
                                            [styles["content"]]: items.streamstep !== 1
                                        })}
                                    >
                                        <div
                                            className={classNames([styles["header"]], {
                                                [styles["operate-dropdown-menu-open"]]: menuSelectedId === items.ID
                                            })}
                                        >
                                            <Icon className={styles["icon"]} />
                                            <div className={styles["title"]}>{items.KnowledgeBaseName}</div>
                                            {items.streamstep === 1 ? (
                                                <div className={styles["tag"]}>
                                                    <OutlineLoadingIcon className={styles["loading-icon"]} />
                                                    生成中
                                                </div>
                                            ) : (
                                                <div className={styles["type-tag"]}>{items.KnowledgeBaseType}</div>
                                            )}

                                            <div
                                                className={classNames([styles["operate"]])}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            >
                                                <SolidLightningBoltIcon
                                                    className={styles["lightning-bolt-icon"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        //    setQaDrawerVisible(true)
                                                    }}
                                                />
                                                <OperateKnowledgenBaseItem
                                                    items={items}
                                                    setMenuSelectedId={setMenuSelectedId}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles["description"]}>
                                            {items.streamstep === 1
                                                ? "知识库生成中，大概需要 3～5 秒，请耐心等待..."
                                                : items.KnowledgeBaseDescription}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <YakitEmpty style={{width: "100%"}} />
                    )}
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
