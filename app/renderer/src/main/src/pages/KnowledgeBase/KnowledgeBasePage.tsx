import {useEffect, useMemo, useRef, type FC} from "react"

import {Form} from "antd"
import {useRequest, useSafeState, useUpdateEffect} from "ahooks"

import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import AllInstallPlugins from "./compoment/AllInstallPlugins"
import {success, failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"

import KnowledgeBaseContent from "./compoment/KnowledgeBaseContent"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CreateKnowledgeBase} from "./compoment/CreateKnowledgeBase"

import {getFileInfoList, targetInstallList} from "./utils"

import {useKnowledgeBase} from "./hooks/useKnowledgeBase"

import styles from "./knowledgeBase.module.scss"

import type {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "./TKnowledgeBase"

const {ipcRenderer} = window.require("electron")

const KnowledgeBase: FC = () => {
    const [form] = Form.useForm()
    const {initialize} = useKnowledgeBase()

    const [installPlug, setInstallPlug] = useSafeState(false)
    const createKnwledgeDataRef = useRef<CreateKnowledgeBaseData>()

    // 拉取还没安装的 binaries
    const {data: binariesToInstall, loading} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("ListThirdPartyBinary", {})
            const binariesList =
                result?.Binaries?.map((it) => ({
                    Name: it?.Name,
                    InstallPath: it?.InstallPath,
                    installToken: randomString(50)
                })) ?? []

            const resultList = targetInstallList
                .map((name) => binariesList.find((it) => it.Name === name && !it.InstallPath))
                .filter((v) => v !== undefined)

            return resultList
        },
        {
            onSuccess: (result) => {
                if (result.length !== 0) {
                    success(`获取所需安装插件成功，共 ${result.length} 个`)
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
            await ipcRenderer.invoke("CreateKnowledgeBase", params)
        },
        {
            manual: true,
            onSuccess: () => {
                refreshAsync()
                success("创建知识库成功")
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
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {Keyword})
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
                if (value) {
                    initialize(value)
                }
            }
        }
    )

    useEffect(() => {
        if (!installPlug) {
            existsKnowledgeBaseAsync()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installPlug])

    // 创建知识库回调事件
    const handCreateKnowledgBase = async () => {
        const resultFormData = await form.validateFields()
        const file = getFileInfoList(resultFormData.KnowledgeBaseFile)
        const transformFormData = {
            ...resultFormData,
            KnowledgeBaseFile: file,
            streamToken: randomString(50),
            streamstep: 1
        }
        createKnwledgeDataRef.current = transformFormData
        createKnowledgRunAsync(transformFormData)
    }

    useUpdateEffect(() => {
        // TODO 此处需要去卸载流 apiCancelDebugPlugin
        return () => {
            console.log(222)
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
                            <CreateKnowledgeBase form={form} />
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
                return <KnowledgeBaseContent existsKnowledgeBaseAsync={existsKnowledgeBaseAsync} />
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existsKnowledgeBase, installPlug, loading])

    return (
        <div className={styles["repository-manage"]} id='repository-manage'>
            <div className={styles["repository-container"]}>{knowledgeBaseEntrance}</div>
        </div>
    )
}

export default KnowledgeBase
