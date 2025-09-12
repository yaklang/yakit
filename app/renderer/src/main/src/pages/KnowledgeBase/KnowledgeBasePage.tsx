import {FC, useEffect, useRef, useState} from "react"
import {useRequest, useSafeState} from "ahooks"
import {Progress} from "antd"
import {randomString} from "@/utils/randomUtil"
import {success, failed} from "@/utils/notification"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {KnowledgeBaseManage} from "./KnowledgeBaseManage"
import KnowledgeBaseTable from "./knowledgeBaseTable"
import styles from "./knowledgeBase.module.scss"

const {ipcRenderer} = window.require("electron")

const targetInstallList = [
    "ffmpeg",
    "llama-server",
    "model-Qwen3-Embedding-0.6B-Q4",
    "model-whisper-medium-q5",
    "page2image",
    "pandoc",
    "whisper.cpp"
]

interface ExecResult {
    Progress: number
    IsMessage: boolean
    Message?: Uint8Array
}

interface BinaryInfo {
    Name: string
    InstallPath?: string
    installToken: string
}

// Promise，-end resolve，-error reject
const installWithEvents = (binary: {Name: string}, token: string) => {
    return new Promise<void>((resolve, reject) => {
        ipcRenderer.invoke("InstallThirdPartyBinary", binary, token).catch(reject)

        ipcRenderer.once(`${token}-end`, () => {
            resolve()
        })

        ipcRenderer.once(`${token}-error`, (_, error) => {
            reject(error)
        })
    })
}

const KnowledgeBase: FC = () => {
    const [knowledgeBaseitems, setKnowledgeBaseItems] = useSafeState<{id: number; name: string}>()
    const [binariesToInstall, setBinariesToInstall] = useSafeState<BinaryInfo[]>([])
    const [installTokens, setInstallTokens] = useState<string[]>([])
    const [overallProgress, setOverallProgress] = useState(0)
    const progressMap = useRef<Record<string, number>>({})
    const [installPlug, setInstallPlug] = useState(false)

    // 拉取还没安装的 binaries
    const {run: fetchBinaries} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("ListThirdPartyBinary", {})
            const binariesList: BinaryInfo[] =
                result?.Binaries?.map((it: any) => ({
                    Name: it?.Name,
                    InstallPath: it?.InstallPath,
                    installToken: randomString(50)
                })) ?? []

            const resultList = targetInstallList
                .map((name) => binariesList.find((it) => it.Name === name && !it.InstallPath))
                .filter((v) => v !== undefined) as BinaryInfo[]

            setBinariesToInstall(resultList)
            return resultList
        },
        {
            manual: true,
            onSuccess: (result) => {
                if (result.length !== 0) {
                    success(`获取所需安装插件成功，共 ${result.length} 个`)
                    runInstallAll()
                    setInstallPlug(true)
                }
            },
            onError: (err) => {
                failed(`获取插件失败: ${err}`)
            }
        }
    )

    useEffect(() => {
        fetchBinaries()
    }, [])

    // 并发安装所有
    const {run: runInstallAll} = useRequest(
        async () => {
            if (!binariesToInstall || binariesToInstall.length === 0) {
                return
            }

            setOverallProgress(0)
            progressMap.current = {}

            const tokens = binariesToInstall.map((b) => b.installToken)
            setInstallTokens(tokens)

            // 并发执行安装
            const promises = binariesToInstall.map((b) => installWithEvents({Name: b.Name}, b.installToken))
            await Promise.all(promises)

            return "ok"
        },
        {
            manual: true,
            onSuccess: () => {
                success("知识库所需插件安装完成")
                setOverallProgress(100)
                setInstallPlug(false)
                setInstallTokens([])
            },
            onError: (err) => {
                failed(`插件安装失败: ${err}`)
            }
        }
    )

    // 进度监听
    useEffect(() => {
        installTokens.forEach((token) => {
            const onData = (_, data: ExecResult) => {
                if (data.Progress > 0) {
                    progressMap.current[token] = Math.ceil(data.Progress)

                    const values = Object.values(progressMap.current)
                    const sum = values.reduce((a, b) => a + b, 0)
                    const avg = installTokens.length > 0 ? Math.floor(sum / installTokens.length) : 0

                    setOverallProgress(avg)
                }
            }

            const onError = (_, error) => {
                console.error(`[InstallThirdPartyBinary][${token}] error: ${error}`)
            }

            const onEnd = () => {
                console.log(`[InstallThirdPartyBinary][${token}] finished`)
            }

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

    return (
        <div className={styles["repository-manage"]} id='repository-manage'>
            {!installPlug ? (
                <YakitResizeBox
                    firstNodeStyle={{padding: 0}}
                    lineStyle={{display: "none"}}
                    firstNode={
                        <KnowledgeBaseManage
                            setKnowledgeBaseItems={setKnowledgeBaseItems}
                            knowledgeBaseitems={knowledgeBaseitems}
                        />
                    }
                    firstRatio='300px'
                    firstMinSize={300}
                    secondNode={<KnowledgeBaseTable knowledgeBaseitems={knowledgeBaseitems} />}
                />
            ) : (
                <div className={styles["install-box"]}>
                    <div className={styles["install-title"]}>知识库插件安装</div>
                    <div>
                        <div className={styles["install-desc"]}>正在安装知识库所需插件，请稍候...</div>
                    </div>
                    <div className={styles["install-content"]}>
                        <Progress percent={overallProgress} />
                    </div>
                </div>
            )}
        </div>
    )
}

export default KnowledgeBase
