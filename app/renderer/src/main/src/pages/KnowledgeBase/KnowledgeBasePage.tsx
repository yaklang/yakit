// import React, {useState} from "react"
// import {Button, Card, Typography, Space} from "antd"
// import Joyride, {Step, CallBackProps, STATUS} from "react-joyride"

// const {Title, Paragraph} = Typography

// export default function KnowledgeBase() {
//     const [run, setRun] = useState(true)

//     // Joyride 步骤定义
//     const steps: Step[] = [
//         {
//             target: ".first-step",
//             content: "这是第 1 步：欢迎使用知识库功能!"
//         },
//         {
//             target: ".second-step",
//             content: "这是第 2 步：点击这里可以了解更多信息!"
//         },
//         {
//             target: ".third-step",
//             content: "这是第 3 步：引导完成，你可以开始操作了!"
//         }
//     ]

//     // Joyride 回调
//     const handleJoyrideCallback = (data: CallBackProps) => {
//         const {status} = data
//         console.log(status, STATUS, run, "status")
//         if (status === STATUS.SKIPPED) {
//             setRun(false)
//         }
//     }

//     return (
//         <div style={{padding: 24}}>
//             {/* Joyride 引导组件 */}
//             <Joyride
//                 steps={steps}
//                 run={run}
//                 // continuous
//                 showSkipButton
//                 showProgress
//                 callback={handleJoyrideCallback}
//                 styles={{
//                     options: {
//                         primaryColor: "#5E50FF",
//                         zIndex: 1000,
//                         width: 300
//                     }
//                 }}
//             />

//             {/* 页面内容 */}
//             <Space direction='vertical' size='large' style={{width: "100%"}}>
//                 <Card className='first-step' hoverable>
//                     <Title level={3}>欢迎来到知识库页面</Title>
//                     <Paragraph>这里是知识库首页，你可以在这里查看所有文档和记录。</Paragraph>
//                 </Card>

//                 <Card className='second-step' hoverable>
//                     <Title level={4}>操作指南</Title>
//                     <Paragraph>点击下面按钮了解更多知识库的操作方法。</Paragraph>
//                     <Button type='primary'>点我了解更多</Button>
//                 </Card>

//                 <Card className='third-step' hoverable>
//                     <Title level={4}>完成引导</Title>
//                     <Paragraph>恭喜，你已经完成知识库功能的引导，可以开始使用了。</Paragraph>
//                     <Button onClick={() => setRun(true)}>重新开始引导</Button>
//                 </Card>
//             </Space>
//         </div>
//     )
// }

import {useEffect, useMemo, useRef, type FC} from "react"

import {useAsyncEffect, useDebounceFn, useInViewport, useRequest, useSafeState, useUpdateEffect} from "ahooks"

import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import AllInstallPlugins from "./compoment/AllInstallPlugins"
import {failed, info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"

import KnowledgeBaseContent from "./compoment/KnowledgeBaseContent"

import {compareKnowledgeBaseChangeList, targetInstallList} from "./utils"

import {useKnowledgeBase} from "./hooks/useKnowledgeBase"

import styles from "./knowledgeBase.module.scss"

import type {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "./TKnowledgeBase"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {KnowledgeBaseTableHeaderProps} from "./compoment/KnowledgeBaseTableHeader"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {isForcedSetAIModal} from "../ai-agent/aiModelList/utils"

const {ipcRenderer} = window.require("electron")

const KnowledgeBase: FC = () => {
    const apiRef = useRef<KnowledgeBaseTableHeaderProps["api"]>()
    const streamsRef = useRef<KnowledgeBaseTableHeaderProps["streams"]>()
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
    const {
        data: binariesToInstall,
        loading,
        refreshAsync: binariesToInstallRefreshAsync
    } = useRequest(
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
                if (filteredInstall?.length !== 0) {
                    info(`使用知识库缺少第三方依赖，需安装${filteredInstall?.length}个`)
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

    // 获取数据库侧边栏是否存在数据
    const {
        data: existsKnowledgeBase,
        runAsync: existsKnowledgeBaseAsync,
        refreshAsync,
        loading: existsKnowledgeLoading
    } = useRequest(
        async (Keyword?: string) => {
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {
                Keyword,
                // OnlyCreatedFromUI: true,
                Pagination: {Limit: 9999, Page: 1, OrderBy: "updated_at", Sort: "desc"}
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
                const FirstknowledgeBaseID = value?.findLast((item) => item.IsImported === false)?.ID
                const selectedKnowledgeBaseId = FirstknowledgeBaseID ? FirstknowledgeBaseID : value?.[0]?.ID ?? ""
                if (value?.length && value.length > 0) {
                    !knowledgeBaseID && setKnowledgeBaseID(selectedKnowledgeBaseId ?? "")
                } else {
                    setKnowledgeBaseID("")
                }
            }
        }
    )

    useUpdateEffect(() => {
        if (!existsKnowledgeBase) return

        const diff = compareKnowledgeBaseChangeList(knowledgeBases, existsKnowledgeBase)

        // 如果没有变化，直接退出，不要再 add/delete
        if (!diff || (!diff.increased?.length && !diff.deleted?.length)) {
            return
        }

        // 有新增
        if (diff.increased?.length) {
            addKnowledgeBase(diff.increased)
        }

        // 有删除
        if (diff.deleted?.length) {
            deleteKnowledgeBase(diff.deleted.map((it) => it.ID))
        }
    }, [existsKnowledgeBase])

    useAsyncEffect(async () => {
        if (!installPlug && !loading) {
            try {
                const res = await existsKnowledgeBaseAsync()
                const initKnowledgeBase =
                    res?.map((it) => ({
                        ...it,
                        streamstep: "success" as 1 | 2 | "success",
                        addManuallyItem: false,
                        historyGenerateKnowledgeList: []
                    })) ?? []
                res && initialize(initKnowledgeBase)
            } catch (error) {
                failed(error + "")
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installPlug, loading])

    useEffect(() => {
        const FirstknowledgeBaseID = knowledgeBases?.find((item) => item.IsImported === false)?.ID
        setKnowledgeBaseID(FirstknowledgeBaseID || "")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onCloseKnowledgeRepository = () => {
        if (apiRef?.current && apiRef.current.tokens?.length > 0) {
            setVisible(true)
            return
        } else {
            clearAll()
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

    const refRef = useRef<HTMLDivElement>(null)
    const [aiModelOptions, setAIModelOptions] = useSafeState<string>("")
    const [inViewport = true] = useInViewport(refRef)

    const getAIModelListOption = useDebounceFn(
        (_) => {
            isForcedSetAIModal({
                noDataCall: () => {
                    setAIModelOptions("")
                },
                haveDataCall: (_) => {}
            })
        },
        {wait: 200, leading: true}
    ).run

    useEffect(() => {
        inViewport && getAIModelListOption(!aiModelOptions)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiModelOptions, inViewport])

    const knowledgeBaseEntrance = useMemo(() => {
        switch (true) {
            // 缺失插件时展示需下载插件页面
            case installPlug:
                return (
                    <YakitSpin spinning={loading || existsKnowledgeLoading}>
                        <AllInstallPlugins
                            onInstallPlug={setInstallPlug}
                            binariesToInstall={binariesToInstall}
                            binariesToInstallRefreshAsync={binariesToInstallRefreshAsync}
                        />
                    </YakitSpin>
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
                        loading={existsKnowledgeLoading}
                        binariesToInstallRefreshAsync={binariesToInstallRefreshAsync}
                        inViewport={inViewport}
                        streamsRef={streamsRef}
                    />
                )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        installPlug,
        loading,
        existsKnowledgeLoading,
        binariesToInstall,
        existsKnowledgeBase?.length,
        knowledgeBaseID,
        knowledgeBases,
        inViewport,
        previousKnowledgeBases
    ])

    return (
        <div className={styles["repository-manage"]} id='repository-manage'>
            <div ref={refRef} />

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
