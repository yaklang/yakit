import {useNodeViewContext} from "@prosemirror-adapter/react"
import styles from "./CustomFile.module.scss"
import {useEffect, useRef, useState} from "react"
import {randomString} from "@/utils/randomUtil"
import {failed, yakitNotify} from "@/utils/notification"
import {
    IconNotepadFileTypeWord,
    IconNotepadFileTypeCompress,
    IconNotepadFileTypePPT,
    IconNotepadFileTypePdf,
    IconNotepadFileTypeUnknown,
    IconNotepadFileTypeExcel
} from "../icon/icon"
import {Progress} from "antd"
import {OutlineDownloadIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import numeral from "numeral"

const {ipcRenderer} = window.require("electron")

interface CustomFileItem {
    id: string
    name: string
    size: number
    type: string
}
export const CustomFile = () => {
    const {node, contentRef} = useNodeViewContext()
    const {attrs} = node
    const [file, setFile] = useState<CustomFileItem>()
    const [percent, setPercent] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)

    const uploadTokenRef = useRef(randomString(40))

    useEffect(() => {
        const {fileId, path: initPath} = attrs
        // console.log("CustomFile-attrs", attrs)
        const path = initPath.replace(/\\/g, "\\")
        if (path) {
            ipcRenderer
                .invoke("fetch-file-info-by-path", path)
                .then((fileInfo) => {
                    const index = path.lastIndexOf(".")
                    const fileType = path.substring(index, path.length)
                    const fileName = path.split("\\").pop()
                    const item = {
                        id: fileInfo.uid,
                        name: fileName,
                        size: fileInfo.size,
                        type: fileType
                    }
                    // console.log("fileInfo", fileInfo, item)
                    setFile(item)
                    onUpload(path)
                })
                .catch((err) => {
                    failed(`项目上传失败:${err}`)
                })
        } else {
        }
    }, [attrs])
    useEffect(() => {
        ipcRenderer.on(`callback-split-upload-${uploadTokenRef.current}`, async (e, res: any) => {
            const {progress} = res
            const p = Math.trunc(progress)
            if (p >= 100) setLoading(false)
            setPercent(p)
        })
        return () => {
            ipcRenderer.removeAllListeners(`callback-split-upload-${uploadTokenRef.current}`)
        }
    }, [])
    const onUpload = (filePath) => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 5000)
        // ipcRenderer.invoke("split-upload", {url: "import/project", path: filePath, token: uploadTokenRef.current})
        // .then((TaskStatus) => {
        //     if (TaskStatus) {
        //         setPercent(1)
        //         yakitNotify("success", "上传数据成功")
        //     } else {
        //         failed(`项目上传失败`)
        //     }
        // })
        // .catch((err) => {
        //     failed(`项目上传失败:${err}`)
        // })
        // .finally(() => {
        //     setTimeout(() => {
        //         setLoading(false)
        //         setPercent(0)
        //     }, 200)
        // })
    }
    const renderType = () => {
        switch (file?.type) {
            case ".doc":
                return <IconNotepadFileTypeWord />
            case ".zip":
            case ".7z":
            case ".tar":
                return <IconNotepadFileTypeCompress />
            case ".ppt":
                return <IconNotepadFileTypePPT />
            case ".csv":
                return <IconNotepadFileTypeExcel />
            case ".pdf":
                return <IconNotepadFileTypePdf />
            default:
                return <IconNotepadFileTypeUnknown />
        }
    }
    const onDown=(e)=>{
        e.stopPropagation()
        e.preventDefault()
    }
    return (
        <div className={styles["file-custom"]} ref={contentRef}>
            {file ? (
                <div className={styles["file-custom-content"]}>
                    <div className={styles["file-type"]}>{renderType()}</div>
                    <div className={styles["file-info"]}>
                        <div className={styles["info-name"]}>{file.name}</div>
                        <div className={styles["info-size"]}>{numeral(file.size).format("0b")}</div>
                    </div>
                    <div className={styles["file-extra"]}>
                        {loading ? (
                            <div className={styles["loading"]}>
                                <div className={styles["percent-loading"]}>
                                    <span>{percent}%</span>
                                    <Progress
                                        strokeColor='#F28B44'
                                        trailColor='#F0F2F5'
                                        type='circle'
                                        percent={percent}
                                        width={20}
                                        format={() => null}
                                        strokeWidth={12}
                                    />
                                </div>
                                <YakitButton className={styles["x-btn"]} type='text2' icon={<OutlineXIcon />} />
                            </div>
                        ) : (
                            <YakitButton type='text2' icon={<OutlineDownloadIcon />} onClick={onDown}/>
                        )}
                    </div>
                </div>
            ) : (
                "正在加载..."
            )}
        </div>
    )
}
