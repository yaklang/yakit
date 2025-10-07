import {FC, memo, useEffect, useRef, useState} from "react"

import {Progress} from "antd"
import {useRequest, useSafeState} from "ahooks"

import {CloudDownloadIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {success, failed} from "@/utils/notification"

import styles from "../knowledgeBase.module.scss"

import type {AllInstallPluginsProps, ExecResult} from "./AllInstallPluginsProps"

const {ipcRenderer} = window.require("electron")

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

const AllInstallPlugins: FC<AllInstallPluginsProps> = ({onInstallPlug, binariesToInstall}) => {
    const [installTokens, setInstallTokens] = useState<string[]>([])
    const [overallProgress, setOverallProgress] = useState(0)
    const progressMap = useRef<Record<string, number>>({})

    // 并发安装所有
    const {run: runInstallAll, loading} = useRequest(
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
                onInstallPlug(false)
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
                failed(`下载失败:${error}`)
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

    return (
        <div className={styles["install-box"]}>
            <YakitEmpty title='检测到有插件未下载' description='请点击下载后，再创建知识库' />
            {overallProgress ? (
                <div className={styles["install-content"]}>
                    <Progress percent={overallProgress} />
                </div>
            ) : (
                <YakitButton
                    type='outline1'
                    icon={<CloudDownloadIcon />}
                    onClick={() => runInstallAll()}
                    loading={loading}
                >
                    一键下载
                </YakitButton>
            )}
        </div>
    )
}

export default memo(AllInstallPlugins)
