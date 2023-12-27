import React, {useEffect} from "react"
import {Progress} from "antd"
import {useDebounceFn} from "ahooks"
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

interface UploadStatusInfoProps {
    title: string
    streamData: SaveProgressStream
    logListInfo: string[]
    /** @name 是否显示-剩余时间-耗时-下载速度 */
    showDownloadDetail: boolean
}

const UploadStatusInfo: React.FC<UploadStatusInfoProps> = (props) => {
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
                            <div>剩余时间 : {streamData.Progress === 1 ? "0s" : streamData.RestDurationVerbose}</div>
                            <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div>耗时 : {streamData.CostDurationVerbose}</div>
                            <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div>下载速度 : {streamData.Speed}M/s</div>
                        </div>
                    )}
                    <div className={styles["log-info"]}>
                        {logListInfo.map((item, index) => (
                            <div key={index} className={styles["log-item"]}>
                                {item}
                            </div>
                        ))}
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
export interface YakitUploadComponentProps {
    step: 1 | 2 // 步骤1或2 步骤1为上传 步骤2为进度条显示
    fileType?: string[] // 上传文件类型
    uploadList: UploadList[]
    onUploadList: (uploadList: UploadList[]) => void
    /** @name 步骤2标题 */
    nextTitle?: string
    /** @name 步骤2显示进度条-剩余时间-耗时-下载速度 */
    showDownloadDetail?: boolean
    /** @name 步骤2-导入流数据 */
    streamData?: SaveProgressStream
    /** @name 导入中的日志信息 */
    logListInfo?: string[]
}

export const YakitUploadComponent: React.FC<YakitUploadComponentProps> = (props) => {
    const {
        step,
        fileType = [],
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
                if (fileType.length && !fileType.includes(f.type)) {
                    failed(`${f.name}非${fileType.join("、")}文件，请上传正确格式文件！`)
                    return false
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
                                                <div className={styles["sub-title"]}>
                                                    支持文件夹批量上传
                                                    {fileType.length ? `(支持文件类型${fileType.join("、")})` : ""}
                                                </div>
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
                <UploadStatusInfo
                    title={nextTitle}
                    streamData={streamData}
                    showDownloadDetail={showDownloadDetail}
                    logListInfo={logListInfo || []}
                />
            )}
        </div>
    )
}

// declare type getContainerFunc = () => HTMLElement
// export interface YakitUploadModalProps extends YakitUploadComponentProps {
//     /** @name 控制Modal是否打开 */
//     visible: boolean
//     /** @name 控制Modal不全占据页面 */
//     getContainer?: string | HTMLElement | getContainerFunc | false
// }

// /**
//  * @description: 新样式上传Modal（包含2个步骤，步骤1选择上传，步骤2展示上传内容）
//  */
// export const YakitUploadModal: React.FC<YakitUploadModalProps> = (props) => {
//     const {visible, getContainer, ...restProps} = props
//     return (
//         <div>
//             <YakitModal
//                 // document.getElementById("new-payload") || document.body
//                 getContainer={getContainer}
//                 title={null}
//                 footer={null}
//                 width={520}
//                 type={"white"}
//                 closable={false}
//                 maskClosable={false}
//                 hiddenHeader={true}
//                 visible={visible}
//             >
//                 <YakitUploadComponent {...restProps} />
//             </YakitModal>
//         </div>
//     )
// }
