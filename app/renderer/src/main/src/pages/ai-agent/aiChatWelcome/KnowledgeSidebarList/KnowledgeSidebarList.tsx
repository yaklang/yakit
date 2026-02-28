import React, {forwardRef, Ref, useEffect, useImperativeHandle, useRef, type FC} from "react"

import {useAsyncEffect, useDebounceEffect, useMemoizedFn, useRequest, useSafeState} from "ahooks"

import useMultipleHoldGRPCStream from "@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream"
import {
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    insertModaOptions,
    prioritizeProcessingItems,
    targetIcon,
    targetInstallList
} from "@/pages/KnowledgeBase/utils"
import {OutlineLoadingIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {OperateKnowledgenBaseItem} from "@/pages/KnowledgeBase/compoment/OperateKnowledgenBaseItem"

import classNames from "classnames"
import styles from "./knowledgeSidebarList.module.scss"
import {KnowledgeBaseItem, useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {failed, info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {PluginExecuteDetailDrawer} from "@/pages/KnowledgeBase/compoment/PluginExecuteDetailDrawer"
import {KnowledgeBaseTableHeaderProps} from "@/pages/KnowledgeBase/compoment/KnowledgeBaseTableHeader"
import AllInstallPlugins from "@/pages/KnowledgeBase/compoment/AllInstallPlugins"
import emiter from "@/utils/eventBus/eventBus"
import {AIMentionCommandParams} from "../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import {KnowledgeBaseFormModal} from "@/pages/KnowledgeBase/compoment/KnowledgeBaseFormModal"
import {ImportModal} from "@/pages/KnowledgeBase/compoment/ImportModal"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

const {ipcRenderer} = window.require("electron")

interface KnowledgeSidebarListProps {
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    streams?: ReturnType<typeof useMultipleHoldGRPCStream>[0]
}

export interface KnowledgeModalRef {
    openAdd: () => void
    openImport: () => void
}

const KnowledgeSidebarList = ({api, streams}: KnowledgeSidebarListProps, ref: Ref<KnowledgeModalRef>) => {
    const [installPlug, setInstallPlug] = useSafeState(false)

    const {knowledgeBases, editKnowledgeBase} = useKnowledgeBase()

    const [knowledgeBase, setKnowledgeBase] = useSafeState<KnowledgeBaseItem[]>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()
    const [addMode, setAddMode] = useSafeState<string[]>(["manual"])
    const [selectedKnowledgeBaseItems, setSelectedKnowledgeBaseItems] = useSafeState<
        KnowledgeBaseTableHeaderProps["knowledgeBaseItems"]
    >({} as KnowledgeBaseTableHeaderProps["knowledgeBaseItems"])

    const [buildingDrawer, setBuildingDrawer] = useSafeState<{
        visible: boolean
        streamToken?: string
        type: string
    }>({
        visible: false,
        streamToken: "",
        type: ""
    })

    // 拉取还没安装的 binaries
    const {data: binariesToInstall, refreshAsync: binariesToInstallRefreshAsync} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("ListThirdPartyBinary", {
                Pagination: {
                    Limit: 999
                }
            })
            const binariesList =
                result?.Binaries?.map((it) => ({
                    Name: it?.Name,
                    InstallPath: it?.InstallPath,
                    installToken: randomString(50),
                    Description: it.Description
                })) ?? []
            const resultList = targetInstallList
                .map((name) => binariesList.find((it) => it.Name === name))
                .filter((v) => v !== undefined)
            return resultList
        },
        {
            onSuccess: (result) => {
                const resultList = targetInstallList
                    .map((name) => result.find((it) => it.Name === name && !it.InstallPath))
                    .filter((v) => v !== undefined)
                const exclude = ["llama-server", "model-Qwen3-Embedding-0.6B-Q4"]

                const filteredInstall = resultList.filter((item) => !exclude.includes(item.Name))
                if (filteredInstall.length !== 0) {
                    info(`使用知识库缺少第三方依赖，需安装${filteredInstall.length}个`)
                    setInstallPlug(true)
                } else {
                    setInstallPlug(false)
                }
            },
            onError: (err) => {
                failed(`获取插件失败: ${err}`)
            }
        }
    )

    const onCloseViewBuildProcess = useMemoizedFn(() => {
        setBuildingDrawer({visible: false, streamToken: "", type: ""})
    })

    useEffect(() => {
        setKnowledgeBase(knowledgeBases)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeBases])

    const buildingRef = useRef<Set<string>>(new Set())

    useAsyncEffect(async () => {
        for (const kb of knowledgeBases) {
            // 知识库构建
            if (kb.streamstep === 1) {
                const key = `kb:${kb.ID}`
                if (buildingRef.current.has(key)) continue
                buildingRef.current.add(key)

                try {
                    setAddMode([])
                    await BuildingKnowledgeBase({...kb, chunk: "Medium", concurrency: 10})

                    api?.createStream?.(kb.streamToken, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: kb.streamToken,
                        onEnd: (info) => {
                            api.removeStream?.(kb.streamToken)
                            buildingRef.current.delete(key)

                            editKnowledgeBase(kb.ID, {
                                ...kb,
                                streamstep: 2,
                                streamToken: randomString(50)
                            })
                        },
                        onError: (e) => {
                            buildingRef.current.delete(key)
                            api.removeStream?.(kb.streamToken)
                            editKnowledgeBase(kb.ID, {...kb, streamstep: "success"})
                        }
                    })
                } catch (e) {
                    buildingRef.current.delete(key)
                    failed(`启动知识库构建失败: ${e + ""}`)
                }
            }

            // 条目构建
            if (kb.streamstep === 2 && kb.streamToken) {
                const key = `entry:${kb.streamToken}`
                if (buildingRef.current.has(key)) continue
                buildingRef.current.add(key)

                try {
                    await starKnowledgeeBaseEntry(kb)
                } catch (e) {
                    buildingRef.current.delete(key)
                    failed(String(e))
                }
            }
        }
    }, [knowledgeBases])

    const starKnowledgeeBaseEntry = useMemoizedFn(async (updateItems: KnowledgeBaseItem) => {
        try {
            await BuildingKnowledgeBaseEntry(updateItems)
            if (api && typeof api.createStream === "function") {
                api.createStream(updateItems.streamToken, {
                    taskName: "debug-plugin",
                    apiKey: "DebugPlugin",
                    token: updateItems.streamToken,
                    onEnd: () => {
                        api.removeStream && api.removeStream(updateItems.streamToken)
                        editKnowledgeBase(updateItems.ID, {
                            ...updateItems,
                            streamstep: "success"
                        })
                    },
                    onError: (e) => {
                        try {
                            editKnowledgeBase(updateItems.ID, {
                                ...updateItems,
                                streamstep: "success"
                            })
                            api.removeStream && api.removeStream(updateItems.streamToken)
                        } catch {
                            failed(`知识库条目构建流失败: ${e}`)
                        }
                    }
                })
            }
        } catch (e) {
            failed(`知识库条目构建流失败: ${e}`)
        }
    })

    const processed = useMemoizedFn(() => {
        const isExternal = (it) => it.IsImported === true && (it.CreatedFromUI ?? false) === false
        const isManual = (it) => it.IsImported === false && it.CreatedFromUI === true
        const isOther = (it) => it.IsImported === false && (it.CreatedFromUI ?? false) === false

        const result =
            addMode.length === 0
                ? knowledgeBases
                : knowledgeBases.filter((it) => {
                      if (addMode.includes("external") && isExternal(it)) return true
                      if (addMode.includes("manual") && isManual(it)) return true
                      if (addMode.includes("other") && isOther(it)) return true
                      return false
                  })
        return prioritizeProcessingItems(result)
    })

    useEffect(() => {
        setKnowledgeBase(processed())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeBases, addMode])

    const onViewBuildProcess = useMemoizedFn((e, streamToken, type) => {
        e.stopPropagation()
        if (streams) {
            setBuildingDrawer({
                visible: true,
                streamToken,
                type
            })
        }
    })

    const onSelectItem = useMemoizedFn((item: KnowledgeBaseItem) => {
        const params: AIMentionCommandParams = {
            mentionId: item.ID,
            mentionType: "knowledgeBase",
            mentionName: item.KnowledgeBaseName
        }
        emiter.emit(
            "setAIInputByType",
            JSON.stringify({
                type: "mention",
                params
            })
        )
    })

    // 新增、导入知识库modal状态管理
    const [visible, setVisible] = useSafeState(false)
    const [importVisible, setImportVisible] = useSafeState(false)
    const [form] = Form.useForm()
    const handOpenKnowledgeBasesModal = useMemoizedFn(() => {
        form.resetFields()
        setVisible((preValue) => !preValue)
    })

    useImperativeHandle(
        ref,
        () => ({
            openAdd() {
                form.resetFields()
                setVisible(true)
            },
            openImport() {
                form.resetFields()
                setImportVisible(true)
            }
        }),
        [form, setVisible, setImportVisible]
    )

    // 搜索和筛选
    const [search, setSearch] = useSafeState("")
    const [loading, setLoading] = useSafeState(false)
    useDebounceEffect(
        () => {
            setLoading(true)
            if (search.trim() === "") {
                setKnowledgeBase(processed())
            } else {
                const filtered = processed().filter((kb) => kb.KnowledgeBaseName.includes(search.trim()))
                setKnowledgeBase(filtered)
            }
            setTimeout(() => {
                setLoading(false)
            }, 300)
        },
        [search],
        {wait: 300}
    )

    return (
        <React.Fragment>
            {installPlug ? (
                <AllInstallPlugins
                    onInstallPlug={setInstallPlug}
                    binariesToInstall={binariesToInstall}
                    binariesToInstallRefreshAsync={binariesToInstallRefreshAsync}
                    isShow={false}
                />
            ) : (
                <div className={styles["knowledge-base-info-body"]}>
                    <div className={styles["knowledge-base-search"]}>
                        <YakitInput
                            prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                            allowClear
                            placeholder='请输入关键词搜索'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={styles["knowledge-base-filter-tags"]}>
                        {insertModaOptions.map((tag) => (
                            <YakitCheckableTag
                                key={tag.value}
                                checked={addMode.includes(tag.value)}
                                onChange={(checked) => {
                                    checked
                                        ? setAddMode((it) => it.concat(tag.value))
                                        : setAddMode((it) => it.filter((tar) => tar !== tag.value))
                                }}
                            >
                                {tag.label}
                            </YakitCheckableTag>
                        ))}
                    </div>
                    <div className={styles["knowledge-base-info-list"]}>
                        <YakitSpin wrapperClassName={styles["knowledge-base-info-list-spin"]} spinning={loading}>
                            {knowledgeBase.length > 0 ? (
                              <>
                                {knowledgeBase.map((items, index) => {
                                    const Icon = targetIcon(index)
                                    return (
                                        <div
                                            className={classNames(styles["knowledge-base-info-card"])}
                                            key={items.ID}
                                            onClick={() => onSelectItem(items)}
                                        >
                                            <div
                                                className={classNames({
                                                    [styles["initial"]]: items.streamstep !== "success",
                                                    [styles["content"]]: items.streamstep === "success"
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
                                                    items.streamstep !== "success" ? (
                                                        <div
                                                            className={styles["tag"]}
                                                            onClick={(e) => {
                                                                setSelectedKnowledgeBaseItems(
                                                                    items as KnowledgeBaseTableHeaderProps["knowledgeBaseItems"]
                                                                )
                                                                onViewBuildProcess(e, items.streamToken, "routine")
                                                            }}
                                                        >
                                                            <OutlineLoadingIcon className={styles["loading-icon"]} />
                                                            生成中,点击查看进度
                                                        </div>
                                                    ) : items.IsDefault ? (
                                                        <div className={styles["default-tag"]}>默认知识库</div>
                                                    ) : (
                                                        <div className={styles["type-tag"]}>
                                                            {items.CreatedFromUI
                                                                ? "手动创建"
                                                                : items.IsImported
                                                                ? "外部导入"
                                                                : "其他"}
                                                        </div>
                                                    )}

                                                    <div
                                                        className={classNames([styles["operate"]])}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        <OperateKnowledgenBaseItem
                                                            items={items}
                                                            setMenuSelectedId={setMenuSelectedId}
                                                            knowledgeBase={knowledgeBase}
                                                            api={api}
                                                            addMode={addMode}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles["description"]}>
                                                    {items.KnowledgeBaseDescription?.trim() || "-"}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                 <div className={styles["min-reached"]}>已经到底啦~</div>
                              </>
                            ) : (
                                <YakitEmpty style={{width: "100%", margin: 0}} />
                            )}
                        </YakitSpin>
                    </div>

                    <KnowledgeBaseFormModal
                        visible={visible}
                        title='新增知识库'
                        handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                        form={form}
                        setAddMode={setAddMode}
                    />

                    <ImportModal visible={importVisible} onVisible={setImportVisible} setAddMode={setAddMode} />

                    {buildingDrawer.visible ? (
                        <PluginExecuteDetailDrawer
                            buildingDrawer={buildingDrawer}
                            onCloseViewBuildProcess={onCloseViewBuildProcess}
                            streams={streams}
                            api={api}
                            title={"知识条目构建详情"}
                            knowledgeBaseItems={selectedKnowledgeBaseItems}
                        />
                    ) : null}
                </div>
            )}
        </React.Fragment>
    )
}

export default forwardRef<KnowledgeModalRef, KnowledgeSidebarListProps>(KnowledgeSidebarList)
