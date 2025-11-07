import {Dispatch, SetStateAction, useEffect, type FC} from "react"
import {useMemoizedFn, useSafeState} from "ahooks"

import {
    OutlineAiChatIcon,
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineFolderopenIcon,
    OutlineLoadingIcon,
    SolidPuzzleIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {targetIcon} from "../utils"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {type KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {SolidLightningBoltIcon, SolidOutlineSearchIcon} from "@/assets/icon/solid"
import {AddKnowledgenBaseDropdownMenu} from "./AddKnowledgenBaseDropdownMenu"
import {OperateKnowledgenBaseItem} from "./OperateKnowledgenBaseItem"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {Tooltip} from "antd"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {BinaryInfo} from "./AllInstallPluginsProps"
import {YakitLogoSvgIcon, YakitSpinLogoSvgIcon} from "../icon/sidebarIcon"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"

export interface TKnowledgeBaseSidebarProps {
    knowledgeBases: KnowledgeBaseItem[]
    knowledgeBaseID: string
    setKnowledgeBaseID: Dispatch<SetStateAction<string>>
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    setOpenQA: Dispatch<
        SetStateAction<{
            status: boolean
            all: boolean
        }>
    >
    binariesToInstall?: BinaryInfo[]
}

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID,
    api,
    setOpenQA,
    binariesToInstall
}) => {
    const [expand, setExpand] = useSafeState(true)
    const [knowledgeBase, setKnowledgeBase] = useSafeState<KnowledgeBaseItem[]>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()
    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")

    const handleChangeExpand = useMemoizedFn((e) => {
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
            onClick={(e) => !expand && handleChangeExpand(e)}
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
                        <YakitPopover
                            overlayClassName={styles["install-content-popover"]}
                            content={
                                <div className={styles["install-content"]}>
                                    <div className={styles["title"]}>
                                        <SolidPuzzleIcon />
                                        <div>插件</div>
                                    </div>
                                    {binariesToInstall?.map((it, key) => (
                                        <div className={styles["install-content-box"]} key={it.InstallPath + key}>
                                            <div className={styles["first-box"]}>
                                                <YakitLogoSvgIcon />
                                                <YakitSpinLogoSvgIcon className={styles["yakit-svg"]} />
                                            </div>
                                            <div className={styles["middle-box"]}>
                                                <div className={styles["title"]}>{it.Name}</div>
                                                <div className={styles["describe"]}>{it.Description}</div>
                                            </div>
                                            <div className={styles["last-box"]}>
                                                <YakitButton
                                                    type='text'
                                                    icon={<OutlineFolderopenIcon />}
                                                    onClick={() => onOpenLocalFileByPath(it.InstallPath)}
                                                >
                                                    打开
                                                </YakitButton>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }
                            trigger='click'
                            placement='bottomRight'
                        >
                            <YakitButton type='text2' icon={<SolidPuzzleIcon />} />
                        </YakitPopover>
                        <div
                            className={styles["ai-button"]}
                            onClick={() => {
                                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_Agent}))
                            }}
                        >
                            <OutlineAiChatIcon />
                            AI 问答
                        </div>
                        <AddKnowledgenBaseDropdownMenu setKnowledgeBaseID={setKnowledgeBaseID} />
                    </div>
                </div>
                <div className={styles["repository-manage-search"]}>
                    <YakitInput
                        placeholder={"请输入关键字搜索"}
                        allowClear
                        size='middle'
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
                                    onClick={() => {
                                        setOpenQA({
                                            all: false,
                                            status: false
                                        })
                                        setKnowledgeBaseID(items.ID)
                                    }}
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
                                            {api?.tokens?.includes(items.streamToken) && items.streamstep === 1 ? (
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
                                                <Tooltip title='AI 召回'>
                                                    <SolidLightningBoltIcon
                                                        className={styles["lightning-bolt-icon"]}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setKnowledgeBaseID(items.ID)
                                                            setOpenQA({
                                                                status: true,
                                                                all: false
                                                            })
                                                        }}
                                                    />
                                                </Tooltip>

                                                <OperateKnowledgenBaseItem
                                                    items={items}
                                                    setMenuSelectedId={setMenuSelectedId}
                                                    setKnowledgeBaseID={setKnowledgeBaseID}
                                                    knowledgeBase={knowledgeBase}
                                                    api={api}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles["description"]}>
                                            {api?.tokens?.includes(items.streamToken) && items.streamstep === 1
                                                ? "知识库生成中，大概需要 3～5 秒，请耐心等待..."
                                                : items.KnowledgeBaseDescription?.trim() || "-"}
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
                <div
                    className={styles["knowledge-base-side-bar-header"]}
                    onClick={(e) => {
                        e.stopPropagation()
                        handleChangeExpand(e)
                    }}
                >
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
