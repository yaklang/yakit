import React, {memo, useMemo, useRef} from "react"
import {Progress} from "antd"
import {useDebounceFn, useMemoizedFn, useVirtualList} from "ahooks"
import styles from "./YakitUploadModal.module.scss"
import {failed, warn, yakitFailed} from "@/utils/notification"
import {OutlinePaperclipIcon} from "@/assets/icon/outline"
import Dragger from "antd/lib/upload/Dragger"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {SolidDocumentdownloadIcon, SolidXcircleIcon} from "@/assets/icon/solid"
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
                            strokeColor='#F28B44'
                            trailColor='#F0F2F5'
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

export interface UploadList {
    path: string
    name: string
}

interface FileRegexInfo {
    fileType?: string[] // 上传文件后缀类型
    fileTypeErrorMsg?: string
    fileNameRegex?: RegExp // 文件名正则
    fileNameErrorMsg?: string
}

export interface YakitUploadComponentProps {
    step: 1 | 2 // 步骤1或2 步骤1为上传 步骤2为进度条显示
    stepOneSubTitle: React.ReactElement | string // 步骤1-子标题
    fileRegexInfo?: FileRegexInfo // 文件校验相关信息
    directory?: boolean // 是否上传文件夹 默认文件夹
    uploadList: UploadList[] // 上传列表
    onUploadList: (uploadList: UploadList[]) => void
    nextTitle?: string // 步骤2-标题
    showDownloadDetail?: boolean // 步骤2-显示进度条-剩余时间-耗时-下载速度
    streamData?: SaveProgressStream // 步骤2-导入流数据
    logListInfo?: LogListInfo[] // 步骤2-导入中的日志信息
}

/**
 * 暂不支持同时传文件或文件夹
 */
export const YakitUploadComponent: React.FC<YakitUploadComponentProps> = (props) => {
    const {
        step,
        stepOneSubTitle,
        fileRegexInfo,
        directory = true,
        uploadList = [],
        onUploadList,
        nextTitle = "导入中",
        showDownloadDetail = false,
        streamData,
        logListInfo
    } = props

    const beforeUploadFun = useDebounceFn(
        (fileList: any[]) => {
            let arr: {
                path: string
                name: string
            }[] = []
            fileList.forEach((f) => {
                if (fileRegexInfo) {
                    const {
                        fileType = [],
                        fileNameRegex,
                        fileTypeErrorMsg = "不符合上传要求，请上传正确格式文件",
                        fileNameErrorMsg = "不符合上传要求，请上传正确格式文件"
                    } = fileRegexInfo

                    if (!directory) {
                        const index = f.name.indexOf(".")

                        if (index === -1) {
                            failed("请误上传文件夹")
                            return false
                        } else {
                            // 校验文件名后缀
                            const extname = f.name.split(".").pop()
                            if (fileType.length && !fileType.includes("." + extname)) {
                                failed(`${f.name}${fileTypeErrorMsg}`)
                                return false
                            }
                        }
                    }

                    // 校验文件名或文件夹名
                    if (fileNameRegex && !fileNameRegex.test(f.name)) {
                        failed(`${f.name}${fileNameErrorMsg}`)
                        return
                    }
                }

                if (uploadList.map((item) => item.path).includes(f.path)) {
                    warn(`${f.path}已选择`)
                    return
                }
                let name = f.name.split(".")[0]
                arr.push({
                    path: f.path,
                    name
                })
            })
            onUploadList([...uploadList, ...arr])
        },
        {
            wait: 200
        }
    ).run

    const onUploadFolder = useMemoizedFn(async () => {
        try {
            const data: {filePaths: string[]} = await ipcRenderer.invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory", "multiSelections"]
            })
            if (data.filePaths.length) {
                let arr: {
                    path: string
                    name: string
                }[] = []

                const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, "\\"))
                const setAllPath = new Set(uploadList.map((item) => item.path))
                absolutePath.forEach((path) => {
                    const name = path.split("\\").pop() || ""
                    if (fileRegexInfo && name) {
                        const {fileNameRegex, fileNameErrorMsg = "不符合上传要求，请上传正确格式文件"} = fileRegexInfo

                        if (fileNameRegex && !fileNameRegex.test(name)) {
                            failed(`${name}${fileNameErrorMsg}`)
                            return
                        }
                    }

                    if (setAllPath.has(path)) {
                        warn(`${path}已选择`)
                        return
                    }

                    name &&
                        arr.push({
                            path: path,
                            name
                        })
                })
                onUploadList([...uploadList, ...arr])
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    return (
        <div className={styles["yakit-upload-component"]}>
            {step === 1 && (
                <>
                    <div className={styles["info-box"]}>
                        <div className={styles["card-box"]}>
                            <>
                                <div className={styles["upload-dragger-box"]}>
                                    {/* 不要设置directory属性 会导致前端很卡 */}
                                    <Dragger
                                        className={styles["upload-dragger"]}
                                        // accept={fileRegexInfo?.fileType?.join(',')} 不在这里给限制 由于前端需要给msg提示
                                        multiple={true}
                                        showUploadList={false}
                                        beforeUpload={(f: any, fileList: any) => {
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
                                                    <span
                                                        className={styles["hight-light"]}
                                                        onClick={(e) => {
                                                            if (directory) {
                                                                e.stopPropagation()
                                                                onUploadFolder()
                                                            }
                                                        }}
                                                    >
                                                        点击此处导入
                                                    </span>
                                                </div>
                                                <div className={styles["sub-title"]}>{stepOneSubTitle}</div>
                                            </div>
                                        </div>
                                    </Dragger>
                                </div>
                            </>
                        </div>
                        <div className={styles["upload-list"]}>
                            {uploadList.map((item, index) => (
                                <div className={styles["upload-list-item"]} key={index}>
                                    <div className={styles["link-icon"]}>
                                        <OutlinePaperclipIcon />
                                    </div>
                                    <div className={styles["text"]}>{item.path}</div>
                                    <div
                                        className={styles["close-icon"]}
                                        onClick={() => {
                                            const newUploadList = uploadList.filter(
                                                (itemIn) => itemIn.path !== item.path
                                            )
                                            onUploadList(newUploadList)
                                        }}
                                    >
                                        <SolidXcircleIcon />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {step === 2 && streamData && (
                <ImportAndExportStatusInfo
                    title={nextTitle}
                    streamData={streamData}
                    showDownloadDetail={showDownloadDetail}
                    logListInfo={logListInfo || []}
                />
            )}
        </div>
    )
}
