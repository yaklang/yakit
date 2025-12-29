import React, {useEffect, useRef, useState, type FC} from "react"

import {
    useAsyncEffect,
    useCreation,
    useDebounceFn,
    useMemoizedFn,
    useRequest,
    useSafeState,
    useUpdateEffect
} from "ahooks"

import useMultipleHoldGRPCStream from "@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream"
import {
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    compareKnowledgeBaseChange,
    insertModaOptions,
    prioritizeProcessingItems,
    targetIcon,
    targetInstallList
} from "@/pages/KnowledgeBase/utils"
import {OutlineLoadingIcon} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {OperateKnowledgenBaseItem} from "@/pages/KnowledgeBase/compoment/OperateKnowledgenBaseItem"

import classNames from "classnames"
import styles from "./knowledgeSidebarList.module.scss"
import {KnowledgeBaseItem, useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import Dragger from "antd/lib/upload/Dragger"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {failed, info, success} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {PluginExecuteDetailDrawer} from "@/pages/KnowledgeBase/compoment/PluginExecuteDetailDrawer"
import {KnowledgeBaseTableHeaderProps} from "@/pages/KnowledgeBase/compoment/KnowledgeBaseTableHeader"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import AllInstallPlugins from "@/pages/KnowledgeBase/compoment/AllInstallPlugins"

const {ipcRenderer} = window.require("electron")

interface KnowledgeSidebarListProps {
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    streams?: ReturnType<typeof useMultipleHoldGRPCStream>[0]
}

const KnowledgeSidebarList: FC<KnowledgeSidebarListProps> = ({api, streams}) => {
    const [installPlug, setInstallPlug] = useSafeState(false)

    const {knowledgeBases, previousKnowledgeBases, addKnowledgeBase, editKnowledgeBase} = useKnowledgeBase()
    const {selectKnowledgeBases} = useChatIPCStore()
    const {setSelectKnowledgeBases} = useChatIPCDispatcher()

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

    const {runAsync, loading} = useRequest(
        async (params) => {
            const result = await ipcRenderer.invoke("CreateKnowledgeBaseV2", {
                Name: params.KnowledgeBaseName,
                Description: params.KnowledgeBaseDescription,
                Type: params.KnowledgeBaseType,
                Tags: params.Tags,
                IsDefault: params.IsDefault,
                CreatedFromUI: params.CreatedFromUI ?? true
            })
            const KnowledgeBaseID = result?.KnowledgeBase?.ID
            const hasKnowledgeBaseById = knowledgeBases.find((it) => it.ID === KnowledgeBaseID)
            if (hasKnowledgeBaseById) {
                editKnowledgeBase(KnowledgeBaseID, {
                    ...params
                })
            } else {
                addKnowledgeBase({...result.KnowledgeBase, ...params})
            }

            return "suecess"
        },
        {
            manual: true,
            onSuccess: () => success("创建知识库成功"),
            onError: (err) => failed(`创建知识库失败: ${err}`)
        }
    )

    const onCloseViewBuildProcess = useMemoizedFn(() => {
        setBuildingDrawer({visible: false, streamToken: "", type: ""})
    })

    useEffect(() => {
        setKnowledgeBase(knowledgeBases)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeBases])

    // 对比知识库变化，有删除则同步删除已选择项
    useUpdateEffect(() => {
        const diff = compareKnowledgeBaseChange(previousKnowledgeBases, knowledgeBases)
        if (typeof diff === "object" && diff.delete) {
            setSelectKnowledgeBases((preList) => preList?.filter((it) => it.id !== diff.delete?.ID))
        }
    }, [knowledgeBases])

    const beforeUploadFun = useDebounceFn(
        async (fileList: Array<File & {path: string}>) => {
            let arr: {
                path: string
                name: string
            }[] = []
            fileList.forEach((f) => {
                let name = f.name.split(".")[0]
                arr.push({
                    path: f.path,
                    name
                })
            })
            const findDefaultKnowledgeBase = knowledgeBases.find((it) => it.IsDefault)

            try {
                await runAsync({
                    ...findDefaultKnowledgeBase,
                    streamstep: 1,
                    streamToken: randomString(50),
                    KnowledgeBaseFile: arr.map((it) => {
                        const fileName = it.path.split(/[\\/]/).pop() || ""
                        const ext = fileName.includes(".")
                            ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
                            : ""

                        return {
                            fileType: ext,
                            path: it.path
                        }
                    }),
                    KnowledgeBaseName: findDefaultKnowledgeBase?.KnowledgeBaseName ?? "default",
                    KnowledgeBaseDescription:
                        findDefaultKnowledgeBase?.KnowledgeBaseDescription ??
                        "系统默认知识库，存储常用知识内容，为AI对话提供上下文增强。",
                    Tags: findDefaultKnowledgeBase?.Tags ?? [],
                    IsDefault: findDefaultKnowledgeBase?.IsDefault ?? true,
                    CreatedFromUI: findDefaultKnowledgeBase?.CreatedFromUI ?? true
                })
            } catch (error) {
                failed(`知识库创建失败:` + error)
            }
        },
        {
            wait: 200
        }
    ).run

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
                    await BuildingKnowledgeBase(kb)

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

    useEffect(() => {
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
        const processed = prioritizeProcessingItems(result)
        setKnowledgeBase(processed)
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
                        {knowledgeBase.length > 0 ? (
                            knowledgeBase.map((items, index) => {
                                const Icon = targetIcon(index)
                                return (
                                    <div
                                        className={classNames(styles["knowledge-base-info-card"], {
                                            [styles["base-info-card-selected"]]: selectKnowledgeBases?.some(
                                                (it) => it.id === items.ID
                                            )
                                        })}
                                        key={items.ID}
                                        onClick={() => {
                                            const targetKnowledgeBase = selectKnowledgeBases?.some(
                                                (it) => it.id === items.ID
                                            )
                                                ? selectKnowledgeBases?.filter((it) => it.id !== items.ID)
                                                : selectKnowledgeBases?.concat({
                                                      id: items.ID,
                                                      name: items.KnowledgeBaseName
                                                  })
                                            setSelectKnowledgeBases(targetKnowledgeBase)
                                        }}
                                    >
                                        <div
                                            className={classNames({
                                                [styles["initial"]]: items.streamstep !== "success",
                                                [styles["content"]]: items.streamstep === "success"
                                            })}
                                        >
                                            <div
                                                className={classNames([styles["header"]], {
                                                    [styles["operate-dropdown-menu-open"]]: menuSelectedId === items.ID
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
                                                        currentPage={"ai-agent"}
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles["description"]}>
                                                {items.KnowledgeBaseDescription?.trim() || "-"}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <YakitEmpty style={{width: "100%", margin: 0}} />
                        )}
                    </div>

                    <div className={styles["upload-dragger-box"]}>
                        <YakitSpin spinning={loading}>
                            <Dragger
                                className={styles["upload-dragger"]}
                                multiple={true}
                                showUploadList={false}
                                beforeUpload={(_, fileList: any) => {
                                    beforeUploadFun(fileList)
                                    return false
                                }}
                            >
                                <div className={styles["upload-info"]}>
                                    <div className={styles["add-file-icon"]}>
                                        <PropertyIcon />
                                    </div>
                                    <div className={styles["content"]}>
                                        <div className={styles["title"]}>
                                            可将文件拖入框内，或
                                            <span className={styles["hight-light"]}>点击此处导入</span>
                                            即可开始创建知识库
                                        </div>
                                        <div className={styles["sub-title"]}>数据会存到默认库，可选择多个文件</div>
                                    </div>
                                </div>
                            </Dragger>
                        </YakitSpin>
                    </div>
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

export {KnowledgeSidebarList}
