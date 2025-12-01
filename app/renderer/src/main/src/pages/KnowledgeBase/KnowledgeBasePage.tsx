import {useEffect, useMemo, useRef, type FC} from "react"

import {Form} from "antd"
import {useAsyncEffect, useRequest, useSafeState, useUpdateEffect} from "ahooks"

import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import AllInstallPlugins from "./compoment/AllInstallPlugins"
import {success, failed, info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"

import KnowledgeBaseContent from "./compoment/KnowledgeBaseContent"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CreateKnowledgeBase} from "./compoment/CreateKnowledgeBase"

import {compareKnowledgeBaseChange, getFileInfoList, prioritizeProcessingItems, targetInstallList} from "./utils"

import {useKnowledgeBase} from "./hooks/useKnowledgeBase"

import styles from "./knowledgeBase.module.scss"

import type {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "./TKnowledgeBase"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {KnowledgeBaseTableHeaderProps} from "./compoment/KnowledgeBaseTableHeader"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"

const {ipcRenderer} = window.require("electron")

const KnowledgeBase: FC = () => {
    const [form] = Form.useForm()
    const apiRef = useRef<KnowledgeBaseTableHeaderProps["api"]>()
    const contentRef = useRef<any>(null)
    const [visible, setVisible] = useSafeState(false)

    const {
        initialize,
        editKnowledgeBase,
        knowledgeBases,
        addKnowledgeBase,
        deleteKnowledgeBase,
        clearAll,
        previousKnowledgeBases
    } = useKnowledgeBase()

    const [installPlug, setInstallPlug] = useSafeState(false)
    const [knowledgeBaseID, setKnowledgeBaseID] = useSafeState("")

    const createKnwledgeDataRef = useRef<CreateKnowledgeBaseData>()

    // 拉取还没安装的 binaries
    const {data: binariesToInstall, loading} = useRequest(
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
                if (resultList.length !== 0) {
                    info(`使用知识库缺少第三方依赖，需安装${resultList.length}个`)
                    setInstallPlug(true)
                }
            },
            onError: (err) => {
                failed(`获取插件失败: ${err}`)
            }
        }
    )

    // 创建知识库
    const {runAsync: createKnowledgRunAsync, loading: createKnowledgLoading} = useRequest(
        async (params) => {
            const result = await ipcRenderer.invoke("CreateKnowledgeBaseV2", {
                Name: params.KnowledgeBaseName,
                Description: params.KnowledgeBaseDescription,
                Type: params.KnowledgeBaseType
            })
            return result
        },
        {
            manual: true,
            onSuccess: async (value) => {
                try {
                    await refreshAsync()
                    const KnowledgeBaseID = value?.KnowledgeBase?.ID
                    setKnowledgeBaseID(KnowledgeBaseID)
                    const addKnowledgeData = {
                        ...createKnwledgeDataRef.current,
                        ID: KnowledgeBaseID,
                        addManuallyItem: false
                    }
                    addKnowledgeBase(addKnowledgeData as CreateKnowledgeBaseData & {ID: string})
                    form.resetFields()
                    createKnwledgeDataRef.current = undefined
                    success("创建知识库成功")
                } catch (error) {
                    failed(`刷新知识库列表失败: ${error}`)
                }
            },
            onError: (error) => {
                failed(`创建知识库失败: ${error}`)
            }
        }
    )

    // 获取数据库侧边栏是否存在数据
    const {
        data: existsKnowledgeBase,
        runAsync: existsKnowledgeBaseAsync,
        refreshAsync
    } = useRequest(
        async (Keyword?: string) => {
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {
                Keyword,
                Pagination: {Limit: 9999, Page: 1}
            })
            const {KnowledgeBases} = result

            const resultData = KnowledgeBases?.map((it) => ({
                ...createKnwledgeDataRef.current,
                ...it
            }))
            return resultData
        },
        {
            manual: true,
            onSuccess: (value) => {
                const FirstknowledgeBaseID = value?.find((item) => item.IsImported === false)?.ID
                if (FirstknowledgeBaseID) {
                    !knowledgeBaseID && setKnowledgeBaseID(FirstknowledgeBaseID)
                }
            }
        }
    )

    useUpdateEffect(() => {
        const diffKnowledgeBase = compareKnowledgeBaseChange(knowledgeBases, existsKnowledgeBase)
        if (
            typeof diffKnowledgeBase === "object" &&
            diffKnowledgeBase.increase &&
            previousKnowledgeBases?.length &&
            previousKnowledgeBases.length > 0
        ) {
            addKnowledgeBase(diffKnowledgeBase.increase)
        } else if (typeof diffKnowledgeBase === "object" && diffKnowledgeBase.delete) {
            deleteKnowledgeBase(diffKnowledgeBase.delete.ID)
        } else {
            return
            // no change
        }
    }, [existsKnowledgeBase])

    useAsyncEffect(async () => {
        if (!installPlug) {
            existsKnowledgeBaseAsync().then((res) => {
                const initKnowledgeBase =
                    res?.map((it) => ({
                        ...it,
                        streamstep: "success" as 1 | 2 | "success",
                        addManuallyItem: false,
                        historyGenerateKnowledgeList: []
                    })) ?? []
                res && initialize(initKnowledgeBase)
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installPlug])

    useEffect(() => {
        const FirstknowledgeBaseID = knowledgeBases?.find((item) => item.IsImported === false)?.ID
        setKnowledgeBaseID(FirstknowledgeBaseID || "")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useUpdateEffect(() => {
        refreshAsync()
    }, [knowledgeBases])

    // 创建知识库回调事件
    const handCreateKnowledgBase = async () => {
        try {
            const resultFormData = await form.validateFields()
            const file = getFileInfoList(resultFormData.KnowledgeBaseFile)
            const transformFormData = {
                ...resultFormData,
                KnowledgeBaseFile: file,
                streamToken: randomString(50),
                streamstep: 1,
                addManuallyItem: false,
                historyGenerateKnowledgeList: []
            }
            createKnwledgeDataRef.current = transformFormData
            await createKnowledgRunAsync(transformFormData)
        } catch (error) {
            failed(error + "")
        }
    }

    useUpdateEffect(() => {
        return () => {
            clearAll()
        }
    }, [])

    const onCloseKnowledgeRepository = () => {
        if (apiRef?.current && apiRef.current.tokens.length > 0) {
            setVisible(true)
            return
        } else {
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
        }
    }

    const onCancel = () => {
        setVisible(false)
    }

    useEffect(() => {
        emiter.on("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        return () => {
            emiter.off("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        }
    }, [])

    const knowledgeBaseEntrance = useMemo(() => {
        switch (true) {
            // 缺失插件时展示需下载插件页面
            case installPlug:
                return (
                    <YakitSpin spinning={loading}>
                        <AllInstallPlugins onInstallPlug={setInstallPlug} binariesToInstall={binariesToInstall} />
                    </YakitSpin>
                )
            // 无知识库时展示添加知识库页面
            case !existsKnowledgeBase?.length:
                return (
                    <div className={styles["create-knowledgBase"]}>
                        <div className={styles["create-content"]}>
                            <div className={styles["create-title"]}>创建知识库</div>
                            <CreateKnowledgeBase form={form} type={"new"} />
                            <div className={styles["create-button"]} onClick={handCreateKnowledgBase}>
                                <YakitButton icon={<SolidPlayIcon />} loading={createKnowledgLoading}>
                                    开始创建
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                )

            // 正常进入知识库页面
            default:
                return (
                    <KnowledgeBaseContent
                        ref={contentRef}
                        knowledgeBaseID={knowledgeBaseID}
                        setKnowledgeBaseID={setKnowledgeBaseID}
                        knowledgeBases={knowledgeBases}
                        previousKnowledgeBases={previousKnowledgeBases}
                        editKnowledgeBase={editKnowledgeBase}
                        clearAll={clearAll}
                        binariesToInstall={binariesToInstall}
                        apiRef={apiRef}
                        refreshAsync={refreshAsync}
                    />
                )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existsKnowledgeBase, installPlug, loading, knowledgeBaseID])

    return (
        <div className={styles["repository-manage"]} id='repository-manage'>
            <div className={styles["repository-container"]}>{knowledgeBaseEntrance}</div>
            <YakitHint
                visible={visible}
                // heardIcon={<OutlineLoadingIcon className={styles["icon-rotate-animation"]} />}
                title={"知识库未构建完成"}
                content={"知识未构建完成，是否确定关闭"}
                okButtonText='立即关闭'
                onOk={() => contentRef.current?.onOK?.()}
                cancelButtonText='稍后再说'
                onCancel={onCancel}
            />
        </div>
    )
}

export default KnowledgeBase
