import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "../knowledgeSidebarList.module.scss"
import Dragger from "antd/lib/upload/Dragger"
import {failed, success} from "@/utils/notification"
import {useDebounceFn, useRequest, useUpdateEffect} from "ahooks"
import {useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"
import {randomString} from "@/utils/randomUtil"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {useState, useEffect, FC, Dispatch, SetStateAction} from "react"
import {KnowledgeBaseContentProps} from "@/pages/KnowledgeBase/TKnowledgeBase"
import {mergeKnowledgeBaseList} from "@/pages/KnowledgeBase/utils"
import {reseultKnowledgePlugin, useCheckKnowledgePlugin} from "@/pages/KnowledgeBase/hooks/useCheckKnowledgePlugin"
import {InstallPluginModal} from "@/pages/KnowledgeBase/compoment/InstallPluginModal/InstallPluginModal"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

const DragKnowledge: FC<{setAddMode: Dispatch<SetStateAction<string[]>>}> = ({setAddMode}) => {
    const {t} = useI18nNamespaces(["aiAgent"])
    const {knowledgeBases, addKnowledgeBase, editKnowledgeBase, initialize} = useKnowledgeBase()
    const {installPlug, refresh: refreshPluginStatus, ThirdPartyBinaryRunAsync} = useCheckKnowledgePlugin()
    const [allDownloadToken, setAllDownloadToken] = useState<string>("")
    const [allDownloadProgress, setAllDownloadProgress] = useState<number>(0)

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
                        t("DragKnowledge.defaultKnowledgeBaseDescription"),
                    Tags: findDefaultKnowledgeBase?.Tags ?? [],
                    IsDefault: findDefaultKnowledgeBase?.IsDefault ?? true,
                    CreatedFromUI: findDefaultKnowledgeBase?.CreatedFromUI ?? true
                })
            } catch (error) {
                failed(t("DragKnowledge.createKnowledgeBaseFailed", {error: String(error)}))
            }
        },
        {
            wait: 200
        }
    ).run

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
            onSuccess: () => success(t("DragKnowledge.createKnowledgeBaseSuccess")),
            onError: (err) => failed(t("DragKnowledge.createKnowledgeBaseFailed", {error: String(err)}))
        }
    )

    const handleDownloadAllOnlineRag = async () => {
        try {
            const token = randomString(50)
            setAllDownloadToken(token)
            setAllDownloadProgress(0)

            const invokeArgs = {Force: true, All: true}
            await new Promise<void>((resolve, reject) => {
                let settled = false

                const safeResolve = () => {
                    if (!settled) {
                        settled = true
                        ipcRenderer.removeAllListeners(`${token}-data`)
                        ipcRenderer.removeAllListeners(`${token}-end`)
                        ipcRenderer.removeAllListeners(`${token}-error`)
                        resolve()
                    }
                }

                const safeReject = (err) => {
                    if (!settled) {
                        settled = true
                        ipcRenderer.removeAllListeners(`${token}-data`)
                        ipcRenderer.removeAllListeners(`${token}-end`)
                        ipcRenderer.removeAllListeners(`${token}-error`)
                        reject(err)
                    }
                }

                ipcRenderer.invoke("DownloadRAGs", invokeArgs, token).catch(safeReject)

                const onData = (_, data) => {
                    if (data?.Progress > 0) {
                        const progressValue = Math.ceil(data.Progress)
                        setAllDownloadProgress(progressValue)
                    }
                }

                ipcRenderer.on(`${token}-data`, onData)

                ipcRenderer.once(`${token}-end`, () => {
                    safeResolve()
                })

                ipcRenderer.once(`${token}-error`, (_, error) => {
                    safeReject(error)
                })
            })
            run()
            success(t("DragKnowledge.downloadAllSuccess"))
            setAddMode([])
        } catch (err) {
            failed(t("DragKnowledge.downloadAllFailed", {error: String(err)}))
        } finally {
            setAllDownloadToken("")
            setAllDownloadProgress(0)
        }
    }

    // 监听下载进度
    useEffect(() => {
        if (!allDownloadToken) return

        const onData = (_, data) => {
            if (data?.Progress > 0) {
                const progressValue = Math.ceil(data.Progress)
                setAllDownloadProgress(progressValue)
            }
        }

        const onError = () => {}

        const onEnd = () => {}

        ipcRenderer.on(`${allDownloadToken}-data`, onData)
        ipcRenderer.on(`${allDownloadToken}-error`, onError)
        ipcRenderer.on(`${allDownloadToken}-end`, onEnd)

        return () => {
            ipcRenderer.removeAllListeners(`${allDownloadToken}-data`)
            ipcRenderer.removeAllListeners(`${allDownloadToken}-error`)
            ipcRenderer.removeAllListeners(`${allDownloadToken}-end`)
        }
    }, [allDownloadToken])

    useUpdateEffect(() => {
        if (allDownloadProgress === 100) {
            setAddMode((pre) => (pre.includes("external") ? pre : pre.concat("external")))
        }
    }, [allDownloadProgress])

    // 获取数据库 列表数据
    const {run} = useRequest(
        async (Keyword?: string) => {
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {
                Keyword,
                Pagination: {Limit: 9999, Page: 1, OrderBy: "updated_at", Sort: "desc"}
            })
            const {KnowledgeBases} = result
            return KnowledgeBases
        },
        {
            onError: (error) => {
                failed(t("DragKnowledge.getKnowledgeBaseListFailed", {error: String(error)}))
            },
            onSuccess: (value) => {
                if (value) {
                    const initKnowledgeBase = mergeKnowledgeBaseList(value, knowledgeBases)
                    initialize(initKnowledgeBase)
                }
            },
            manual: true
        }
    )

    return (
        <div className={styles["upload-dragger-box"]}>
            <YakitSpin spinning={loading}>
                <Dragger
                    className={styles["upload-dragger"]}
                    multiple={true}
                    style={{borderRadius: 8, backgroundColor: "var(--Colors-Use-Neutral-Bg)"}}
                    showUploadList={false}
                    beforeUpload={async (_, fileList: any) => {
                        try {
                            const result = await ThirdPartyBinaryRunAsync()
                            const targetInstallPlugins = reseultKnowledgePlugin(result)
                            targetInstallPlugins
                                ? InstallPluginModal({
                                      getContainer: "#main-operator-page-body-ai-agent",
                                      callback: () => {
                                          refreshPluginStatus()
                                      }
                                  })
                                : beforeUploadFun(fileList)
                            return false
                        } catch (error) {}
                    }}
                >
                    <div className={styles["upload-info"]}>
                        <div className={styles["add-file-icon"]}>
                            <PropertyIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>
                                {t("DragKnowledge.dragHintPrefix")}
                                <span className={styles["hight-light"]}>{t("DragKnowledge.dragHintHighlight")}</span>
                                {t("DragKnowledge.dragHintSuffix")}
                            </div>
                            <div className={styles["sub-title"]}>{t("DragKnowledge.dragSubHint")}</div>
                        </div>
                    </div>
                </Dragger>
            </YakitSpin>
            <YakitButton
                className={styles["download-btn"]}
                type='outline1'
                icon={<CloudDownloadIcon />}
                onClick={() => {
                    try {
                        handleDownloadAllOnlineRag()
                    } catch (error) {
                        failed(error + "")
                    }
                }}
                loading={!!allDownloadToken}
                disabled={!!allDownloadToken}
            >
                {allDownloadToken
                    ? t("DragKnowledge.downloadingAll", {progress: allDownloadProgress})
                    : t("DragKnowledge.downloadAll")}
            </YakitButton>
        </div>
    )
}
export default DragKnowledge
