import React, {memo} from "react"
import {Progress} from "antd"
import styles from "./YakitUploadModal.module.scss"
import {SolidDocumentdownloadIcon} from "@/assets/icon/solid"
const {ipcRenderer} = window.require("electron")

export interface SaveProgressStream {
    Progress: number
    Speed?: string
    CostDurationVerbose?: string
    RestDurationVerbose?: string
}

export interface LogListInfo {
    message: string
    isError?: boolean
    key: string
}

export interface ImportAndExportStatusInfo {
    title: string
    streamData: SaveProgressStream
    logListInfo: LogListInfo[]
    showDownloadDetail: boolean // 是否显示-下载详细信息
}

export const ImportAndExportStatusInfo: React.FC<ImportAndExportStatusInfo> = memo((props) => {
    const {title, streamData, logListInfo, showDownloadDetail} = props

    console.log(streamData.Progress);

    return (
        <div className={styles["yaklang-engine-hint-wrapper"]}>
            <div className={styles["hint-left-wrapper"]}>
                <div className={styles["hint-icon"]}>
                    <SolidDocumentdownloadIcon />
                </div>
            </div>

            <div className={styles["hint-right-wrapper"]}>
                <div className={styles["hint-right-download"]}>
                    <div className={styles["hint-right-title"]}>{title}</div>
                    <div className={styles["download-progress"]}>
                        <Progress
                            strokeColor='var(--Colors-Use-Main-Primary)'
                            trailColor='var(--Colors-Use-Neutral-Bg)'
                            percent={Math.floor((streamData.Progress || 0) * 100)}
                            showInfo={false}
                        />
                        <div className={styles["progress-title"]}>进度 {Math.round(streamData.Progress * 100)}%</div>
                    </div>
                    {showDownloadDetail && (
                        <div className={styles["download-info-wrapper"]}>
                            <>
                                {streamData.RestDurationVerbose && (
                                    <>
                                        <div>
                                            剩余时间 :{" "}
                                            {streamData.Progress === 1 ? "0s" : streamData.RestDurationVerbose}
                                        </div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                    </>
                                )}
                            </>
                            <>
                                {streamData.CostDurationVerbose && (
                                    <>
                                        <div>耗时 : {streamData.CostDurationVerbose}</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                    </>
                                )}
                            </>
                            <>
                                {streamData.Speed && (
                                    <>
                                        <div>下载速度 : {streamData.Speed}M/s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                    </>
                                )}
                            </>
                        </div>
                    )}
                    <div className={styles["log-info"]}>
                        {logListInfo.map((item, index) => (
                            <div
                                key={item.key}
                                className={styles["log-item"]}
                                style={{color: item.isError ? "#f00" : "#85899e"}}
                            >
                                {item.message}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
})
