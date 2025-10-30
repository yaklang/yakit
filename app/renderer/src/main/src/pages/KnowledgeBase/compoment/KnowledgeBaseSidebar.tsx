import {Dispatch, SetStateAction, useEffect, type FC} from "react"
import {useMemoizedFn, useSafeState} from "ahooks"

import {
    OutlineAiChatIcon,
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineLoadingIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {targetIcon} from "../utils"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {type KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {SolidLightningBoltIcon, SolidOutlineSearchIcon} from "@/assets/icon/solid"
import {AddKnowledgenBaseDropdownMenu} from "./AddKnowledgenBaseDropdownMenu"
import {TExistsKnowledgeBaseAsync} from "../TKnowledgeBase"
import {OperateKnowledgenBaseItem} from "./OperateKnowledgenBaseItem"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

export interface TKnowledgeBaseSidebarProps extends Omit<TExistsKnowledgeBaseAsync, "streams"> {
    knowledgeBases: KnowledgeBaseItem[]
    knowledgeBaseID: string
    setKnowledgeBaseID: Dispatch<SetStateAction<string>>
    tokens?: string[]
}

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID,
    existsKnowledgeBaseAsync,
    tokens
}) => {
    const [expand, setExpand] = useSafeState(true)
    const [knowledgeBase, setKnowledgeBase] = useSafeState<KnowledgeBaseItem[]>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()

    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")

    const handleChangeExpand = useMemoizedFn(() => {
        setExpand((old) => !old)
    })

    useEffect(() => {
        setKnowledgeBase(knowledgeBases)
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        size='small'
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
                                            {tokens?.includes(items.streamToken) && items.streamstep === 1 ? (
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
                                                    setKnowledgeBaseID={setKnowledgeBaseID}
                                                    knowledgeBase={knowledgeBase}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles["description"]}>
                                            {tokens?.includes(items.streamToken) && items.streamstep === 1
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
