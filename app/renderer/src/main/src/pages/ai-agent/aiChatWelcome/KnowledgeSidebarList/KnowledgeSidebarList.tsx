import {forwardRef, Ref, useEffect, useImperativeHandle, useRef} from "react"

import {useAsyncEffect, useDebounceEffect, useInViewport, useMemoizedFn, useSafeState} from "ahooks"

import useMultipleHoldGRPCStream from "@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream"
import {
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    insertModaOptions,
    prioritizeProcessingItems,
    targetIcon
} from "@/pages/KnowledgeBase/utils"
import {OutlineLoadingIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {OperateKnowledgenBaseItem} from "@/pages/KnowledgeBase/compoment/OperateKnowledgenBaseItem"

import classNames from "classnames"
import styles from "./knowledgeSidebarList.module.scss"
import {KnowledgeBaseItem, useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {PluginExecuteDetailDrawer} from "@/pages/KnowledgeBase/compoment/PluginExecuteDetailDrawer"
import {KnowledgeBaseTableHeaderProps} from "@/pages/KnowledgeBase/compoment/KnowledgeBaseTableHeader"
import emiter from "@/utils/eventBus/eventBus"
import {AIMentionCommandParams} from "../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import {KnowledgeBaseFormModal} from "@/pages/KnowledgeBase/compoment/KnowledgeBaseFormModal"
import {ImportModal} from "@/pages/KnowledgeBase/compoment/ImportModal"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import DragKnowledge from "./DragKnowledge/DragKnowledge"
import {useCheckKnowledgePlugin} from "@/pages/KnowledgeBase/hooks/useCheckKnowledgePlugin"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

interface KnowledgeSidebarListProps {
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    streams?: ReturnType<typeof useMultipleHoldGRPCStream>[0]
}

export interface KnowledgeModalRef {
    openAdd: () => void
    openImport: () => void
}

const KnowledgeSidebarList = ({api, streams}: KnowledgeSidebarListProps, ref: Ref<KnowledgeModalRef>) => {
    const {t} = useI18nNamespaces(["aiAgent"])
    const {knowledgeBases, editKnowledgeBase} = useKnowledgeBase()
    const refRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(refRef)

    const [knowledgeBase, setKnowledgeBase] = useSafeState<KnowledgeBaseItem[]>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()
    const [addMode, setAddMode] = useSafeState<string[]>([])
    const [selectedKnowledgeBaseItems, setSelectedKnowledgeBaseItems] = useSafeState<
        KnowledgeBaseTableHeaderProps["knowledgeBaseItems"]
    >({} as KnowledgeBaseTableHeaderProps["knowledgeBaseItems"])

    const {installPlug, ThirdPartyBinaryRunAsync} = useCheckKnowledgePlugin()

    const [buildingDrawer, setBuildingDrawer] = useSafeState<{
        visible: boolean
        streamToken?: string
        type: string
    }>({
        visible: false,
        streamToken: "",
        type: ""
    })

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
                    failed(t("KnowledgeSidebarList.startBuildFailed", {error: String(e)}))
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
                            failed(t("KnowledgeSidebarList.entryBuildFailed", {error: String(e)}))
                        }
                    }
                })
            }
        } catch (e) {
            failed(t("KnowledgeSidebarList.entryBuildFailed", {error: String(e)}))
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
        () => {
            return {
                openAdd() {
                    form.resetFields()
                    setVisible(true)
                },
                openImport() {
                    form.resetFields()
                    setImportVisible(true)
                },
                installPlug
            }
        },
        [installPlug, form, setVisible, setImportVisible]
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

    useAsyncEffect(async () => {
        if (inViewport) {
            try {
                await ThirdPartyBinaryRunAsync()
            } catch (error) {
                failed(error + "")
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inViewport])

    return (
        <div ref={refRef} style={{height: "100%"}}>
            <div className={styles["knowledge-base-info-body"]}>
                <div className={styles["knowledge-base-search"]}>
                    <YakitInput
                        prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                        allowClear
                        placeholder={t("KnowledgeSidebarList.searchPlaceholder")}
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
                            {tag.value === "manual"
                                ? t("KnowledgeSidebarList.manual")
                                : tag.value === "external"
                                  ? t("KnowledgeSidebarList.external")
                                  : t("KnowledgeSidebarList.other")}
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
                                                            {t("KnowledgeSidebarList.building")}
                                                        </div>
                                                    ) : items.IsDefault ? (
                                                        <div className={styles["default-tag"]}>{t("KnowledgeSidebarList.defaultKnowledgeBase")}</div>
                                                    ) : (
                                                        <div className={styles["type-tag"]}>
                                                            {items.CreatedFromUI
                                                                ? t("KnowledgeSidebarList.manual")
                                                                : items.IsImported
                                                                 ? t("KnowledgeSidebarList.external")
                                                                 : t("KnowledgeSidebarList.other")}
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
                                <div className={styles["min-reached"]}>{t("KnowledgeSidebarList.noMore")}</div>
                            </>
                        ) : (
                            <DragKnowledge setAddMode={setAddMode} />
                        )}
                    </YakitSpin>
                </div>
                <KnowledgeBaseFormModal
                    visible={visible}
                    title={t("KnowledgeSidebarList.addKnowledgeBase")}
                    handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                    form={form}
                    setAddMode={setAddMode}
                />
                {buildingDrawer.visible ? (
                    <PluginExecuteDetailDrawer
                        buildingDrawer={buildingDrawer}
                        onCloseViewBuildProcess={onCloseViewBuildProcess}
                        streams={streams}
                        api={api}
                        title={t("KnowledgeSidebarList.buildDetail")}
                        knowledgeBaseItems={selectedKnowledgeBaseItems}
                    />
                ) : null}
            </div>
            <ImportModal visible={importVisible} onVisible={setImportVisible} setAddMode={setAddMode} />
        </div>
    )
}

export default forwardRef<KnowledgeModalRef, KnowledgeSidebarListProps>(KnowledgeSidebarList)
