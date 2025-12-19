import React, {Dispatch, ReactNode, SetStateAction, useEffect, type FC} from "react"
import {useMemoizedFn, useSafeState} from "ahooks"

import {
    OutlineAiChatIcon,
    OutlineExclamationcircleIcon,
    OutlineFolderopenIcon,
    OutlineLoadingIcon,
    OutlineRefreshIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {KnowledgeTabList, KnowledgeTabListEnum, prioritizeProcessingItems, targetIcon} from "../utils"
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
import {BinaryInfo} from "./AllInstallPluginsProps"
import {YakitLogoSvgIcon, YakitSpinLogoSvgIcon} from "../icon/sidebarIcon"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {CreateKnowledgeBaseData} from "../TKnowledgeBase"

import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {installWithEvents} from "./AllInstallPlugins"
import {failed, success} from "@/utils/notification"
import AIModelList from "@/pages/ai-agent/aiModelList/AIModelList"

const {ipcRenderer} = window.require("electron")

export interface TKnowledgeBaseSidebarProps {
    knowledgeBases: KnowledgeBaseItem[]
    knowledgeBaseID: string
    setKnowledgeBaseID: (id: string) => void
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    setOpenQA: Dispatch<SetStateAction<boolean>>
    binariesToInstall?: BinaryInfo[]
    refreshAsync?: () => Promise<CreateKnowledgeBaseData[] | undefined>
    binariesToInstallRefreshAsync?: () => Promise<any[]>
}

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID,
    api,
    setOpenQA,
    binariesToInstall,
    refreshAsync,
    binariesToInstallRefreshAsync
}) => {
    const [active, setActive] = useSafeState<KnowledgeTabListEnum>(KnowledgeTabListEnum.Knowledge)
    const [expand, setExpand] = useSafeState<boolean>(true)
    const [knowledgeBase, setKnowledgeBase] = useSafeState<KnowledgeBaseItem[]>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()
    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")
    const [checked, setChecked] = useSafeState(false)
    const [eachProgress, setEachProgress] = useSafeState<Record<string, number>>({})
    const [installTokens, setInstallTokens] = useSafeState<string[]>([])

    const downloadSingle = async (binary: {Name: string; installToken: string}) => {
        try {
            setInstallTokens((prev) => {
                if (!prev.includes(binary.installToken)) {
                    return [...prev, binary.installToken]
                }
                return prev
            })

            await installWithEvents({Name: binary.Name}, binary.installToken)

            success(`${binary.Name} 下载完成`)
            await binariesToInstallRefreshAsync?.()
            setInstallTokens([])
        } catch (err) {
            failed(`${binary.Name} 下载失败: ${err}`)
        }
    }

    // 监听插件下载进度（单独下载）
    useEffect(() => {
        if (!installTokens || installTokens.length === 0) return

        installTokens.forEach((token) => {
            const onData = (_, data) => {
                if (data?.Progress > 0) {
                    const progressValue = Math.ceil(data.Progress)
                    setEachProgress((prev) => ({
                        ...prev,
                        [token]: progressValue
                    }))
                }
            }

            const onError = (_, error) => {
                failed(`下载失败: ${error}`)
            }

            const onEnd = () => {}

            ipcRenderer.on(`${token}-data`, onData)
            ipcRenderer.on(`${token}-error`, onError)
            ipcRenderer.on(`${token}-end`, onEnd)
        })

        return () => {
            installTokens.forEach((token) => {
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            })
        }
    }, [installTokens])

    const handleSetActive = useMemoizedFn((value: KnowledgeTabListEnum) => {
        setActive(value)
    })

    useEffect(() => {
        setKnowledgeBase(() => {
            const externalImportKnowledgeBase = checked ? knowledgeBases : knowledgeBases.filter((it) => !it.IsImported)
            return prioritizeProcessingItems(externalImportKnowledgeBase)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeBases, checked])

    const renderTabContent = useMemoizedFn((key: KnowledgeTabListEnum) => {
        let content: ReactNode = <></>
        switch (key) {
            case KnowledgeTabListEnum.Knowledge:
                content = (
                    <div className={classNames(styles["knowledge-base-info"])}>
                        <div className={styles["knowledge-base-info-context"]}>
                            <div className={styles["knowledge-base-info-header"]}>
                                <div className={styles["knowledge-base-info-header-button"]}>
                                    <div className={styles["header-title"]}>知识库管理</div>
                                    <div className={styles["knowledge-size"]}>{knowledgeBase.length ?? 0}</div>
                                    <Tooltip title='刷新知识库列表'>
                                        <YakitButton
                                            type='text'
                                            icon={<OutlineRefreshIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                refreshAsync?.()
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                                <div className={styles["header-operate"]}>
                                    <div
                                        className={styles["ai-button"]}
                                        onClick={() => {
                                            emiter.emit(
                                                "openPage",
                                                JSON.stringify({
                                                    route: YakitRoute.AI_Agent,
                                                    params: {
                                                        inputString: "使用知识库回答:"
                                                    }
                                                })
                                            )
                                        }}
                                    >
                                        <OutlineAiChatIcon />
                                        AI 问答
                                    </div>
                                    <AddKnowledgenBaseDropdownMenu
                                        setKnowledgeBaseID={setKnowledgeBaseID}
                                        setChecked={setChecked}
                                    />
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

                            <div className={styles["repository-manage-checked"]}>
                                <YakitCheckbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
                                    外部导入{" "}
                                    <Tooltip title='勾选以后可以查看外部导入的知识库'>
                                        <OutlineExclamationcircleIcon />
                                    </Tooltip>
                                </YakitCheckbox>
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
                                                    setOpenQA(false)
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
                                                            [styles["operate-dropdown-menu-open"]]:
                                                                menuSelectedId === items.ID
                                                        })}
                                                    >
                                                        <Icon className={styles["icon"]} />
                                                        <div className={styles["title"]}>{items.KnowledgeBaseName}</div>
                                                        {api?.tokens?.includes(items.streamToken) &&
                                                        items.streamstep === 1 ? (
                                                            <div className={styles["tag"]}>
                                                                <OutlineLoadingIcon
                                                                    className={styles["loading-icon"]}
                                                                />
                                                                生成中
                                                            </div>
                                                        ) : (
                                                            <div className={styles["type-tag"]}>
                                                                {items.IsImported ? "外部导入" : "手动创建"}
                                                            </div>
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
                                                                        setOpenQA(true)
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
                                                        {api?.tokens?.includes(items.streamToken) &&
                                                        items.streamstep === 1
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
                    </div>
                )
                break
            case KnowledgeTabListEnum.Plugin:
                content = (
                    <React.Suspense>
                        <div className={classNames(styles["knowledge-base-info"])}>
                            <div className={styles["knowledge-base-info-context"]}>
                                <div className={styles["knowledge-base-info-header"]}>
                                    <div className={styles["knowledge-base-info-header-button"]}>
                                        <div className={styles["header-title"]}>插件</div>
                                        <Tooltip title='刷新插件'>
                                            <YakitButton
                                                type='text'
                                                icon={<OutlineRefreshIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    binariesToInstallRefreshAsync?.()
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className={styles["install-box"]}>
                                    {binariesToInstall?.map((it, key) => (
                                        <div className={styles["install-content-box"]} key={it.InstallPath + key}>
                                            <div className={styles["first-box"]}>
                                                <YakitLogoSvgIcon />
                                                <YakitSpinLogoSvgIcon className={styles["yakit-svg"]} />
                                            </div>
                                            <div
                                                className={classNames(styles["middle-box"], {
                                                    [styles["middle-width"]]: eachProgress?.[it.installToken] < 100
                                                })}
                                            >
                                                <div className={styles["title"]}>{it.Name}</div>
                                                <Tooltip title={it.Description}>
                                                    <div className={styles["describe"]}>{it.Description}</div>
                                                </Tooltip>
                                            </div>
                                            <div className={styles["last-box"]}>
                                                {!it.InstallPath && !eachProgress?.[it.installToken] ? (
                                                    <YakitButton
                                                        icon={<CloudDownloadIcon />}
                                                        onClick={() => downloadSingle(it)}
                                                    >
                                                        下载
                                                    </YakitButton>
                                                ) : eachProgress?.[it.installToken] < 100 ? (
                                                    <div className={styles["downloading"]}>
                                                        正在下载.. （{eachProgress?.[it.installToken]}.0%）
                                                    </div>
                                                ) : (
                                                    <YakitButton
                                                        type='text'
                                                        icon={<OutlineFolderopenIcon />}
                                                        onClick={() => onOpenLocalFileByPath(it.InstallPath)}
                                                    >
                                                        打开
                                                    </YakitButton>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </React.Suspense>
                )
                break
            case KnowledgeTabListEnum.AI_Model:
                content = (
                    <React.Suspense>
                        <AIModelList />
                    </React.Suspense>
                )
                break
            default:
                break
        }
        return content
    })

    return (
        <YakitSideTab
            type='vertical'
            yakitTabs={KnowledgeTabList}
            activeKey={active}
            onActiveKey={(v) => handleSetActive(v as KnowledgeTabListEnum)}
            show={expand}
            setShow={setExpand}
        >
            <div
                className={classNames(styles["tab-content"], {
                    [styles["tab-content-hidden"]]: !expand
                })}
            >
                {renderTabContent(active)}
            </div>
        </YakitSideTab>
    )
}

export {KnowledgeBaseSidebar}
