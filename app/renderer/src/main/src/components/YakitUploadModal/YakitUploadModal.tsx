import React, {useRef} from "react"
import {Progress} from "antd"
import {useDebounceFn, useVirtualList} from "ahooks"
import styles from "./YakitUploadModal.module.scss"
import {failed, warn} from "@/utils/notification"
import {OutlinePaperclipIcon} from "@/assets/icon/outline"
import Dragger from "antd/lib/upload/Dragger"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {SolidDocumentdownloadIcon, SolidXcircleIcon} from "@/assets/icon/solid"

export interface SaveProgressStream {
    Progress: number
    Speed?: string
    CostDurationVerbose?: string
    RestDurationVerbose?: string
}

export interface LogListInfo {
    message: string
    isError?: boolean
}

export interface ImportAndExportStatusInfo {
    title: string
    streamData: SaveProgressStream
    logListInfo: LogListInfo[]
    showDownloadDetail: boolean // 是否显示-下载详细信息
}

export const ImportAndExportStatusInfo: React.FC<ImportAndExportStatusInfo> = (props) => {
    const {title, streamData, logListInfo, showDownloadDetail} = props

    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    
    const [list] = useVirtualList(logListInfo, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 24,
        overscan: 5
    })

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
                    <div className={styles["log-info"]} ref={containerRef} style={{ height: list.length > 5 ? 200 : 50 }}>
                        <div ref={wrapperRef}>
                            {list.map((item, index) => (
                                <div
                                    key={index}
                                    className={styles["log-item"]}
                                    style={{color: item.data.isError ? "#f00" : "#85899e"}}
                                >
                                    {item.data.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export interface UploadList {
    path: string
    name: string
}

interface FileRegexInfo {
    fileType?: string[] // 上传文件类型
    fileTypeErrorMsg?: string
    fileNameRegex?: RegExp // 文件名正则
    fileNameErrorMsg?: string
}

export interface YakitUploadComponentProps {
    step: 1 | 2 // 步骤1或2 步骤1为上传 步骤2为进度条显示
    stepOneSubTitle: React.ReactElement | string // 步骤1-子标题
    fileRegexInfo?: FileRegexInfo // 文件校验相关信息
    uploadList: UploadList[] // 上传列表
    onUploadList: (uploadList: UploadList[]) => void
    nextTitle?: string // 步骤2-标题
    showDownloadDetail?: boolean // 步骤2-显示进度条-剩余时间-耗时-下载速度
    streamData?: SaveProgressStream // 步骤2-导入流数据
    logListInfo?: LogListInfo[] // 步骤2-导入中的日志信息
}

export const YakitUploadComponent: React.FC<YakitUploadComponentProps> = (props) => {
    const {
        step,
        stepOneSubTitle,
        fileRegexInfo,
        uploadList = [],
        onUploadList,
        nextTitle = "导入中",
        showDownloadDetail = true,
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
                // 格式校验
                if (fileRegexInfo) {
                    const {
                        fileType = [],
                        fileNameRegex,
                        fileTypeErrorMsg = "不符合上传要求，请上传正确格式文件",
                        fileNameErrorMsg = "不符合上传要求，请上传正确格式文件"
                    } = fileRegexInfo

                    if (fileType.length && !fileType.includes(f.type)) {
                        failed(`${f.name}${fileTypeErrorMsg}`)
                        return false
                    }
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

    return (
        <div className={styles["yakit-upload-component"]}>
            {step === 1 && (
                <>
                    <div className={styles["info-box"]}>
                        <div className={styles["card-box"]}>
                            <>
                                <div className={styles["upload-dragger-box"]}>
                                    <Dragger
                                        className={styles["upload-dragger"]}
                                        // accept={FileType.join(",")}
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
                                                    <span className={styles["hight-light"]}>点击此处导入</span>
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
