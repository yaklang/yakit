import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {useEffect, useMemo, useState, type FC} from "react"
import styles from "./FilePreview.module.scss"
import {OutlineDocumentaddIcon, OutlineFolderaddIcon, OutlineFolderopenIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {
    getCodeByPath,
    getCodeSizeByPath,
    getNameByPath,
    MAX_FILE_SIZE_BYTES,
    monacaLanguageType
} from "@/pages/yakRunner/utils"
import {useMemoizedFn} from "ahooks"
import {Result} from "antd"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {yakitNotify} from "@/utils/notification"
import type {FileInfo} from "../type"
import {getLocalFileName} from "@/components/MilkdownEditor/CustomFile/utils"
import {onOpenFileFolder} from "../utils"
import {historyStore, useHistoryItems} from "../store/useHistoryFolder"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const FilePreviewEmpty: FC = () => {
    const {t} = useI18nNamespaces(["aiAgent"])
    // 历史文件夹
    const historyItems = useHistoryItems()
    const [fileNames, setFileNames] = useState<string[]>([])

    // 在组件挂载时获取所有文件名
    useEffect(() => {
        const fetchFileNames = async () => {
            const names = await Promise.all(
                historyItems.map(async (item) => {
                    return getNameByPath(item.path || "")
                })
            )
            setFileNames(names)
        }
        fetchFileNames()
    }, [historyItems])
    
    return (
        <div className={styles["file-preview-empty"]}>
            <div className={styles["file-preview-empty-title"]}>
                <div className={styles["file-preview-empty-title-text"]}>{t("FilePreview.fileSystem")}</div>
                <div className={styles["file-preview-empty-title-subtitle"]}>{t("FilePreview.chooseFile")}</div>
            </div>
            <div className={styles["file-preview-empty-content"]}>
                <YakitButton
                    className={styles["file-preview-empty-content-button"]}
                    icon={<OutlineDocumentaddIcon />}
                    size='large'
                    type='secondary2'
                    onClick={() => onOpenFileFolder(false)}
                >
                    {t("FilePreview.openFile")}
                </YakitButton>
                <YakitButton
                    className={styles["file-preview-empty-content-button"]}
                    icon={<OutlineFolderaddIcon />}
                    size='large'
                    type='secondary2'
                    onClick={() => onOpenFileFolder(true)}
                >
                    {t("FilePreview.openFolder")}
                </YakitButton>
                <div className={styles["file-preview-empty-content-recent"]}>
                    <div className={styles["file-preview-empty-content-recent-title"]}>{t("FilePreview.recentOpen")}</div>
                    <div className={styles["file-preview-empty-content-recent-list"]}>
                        {historyItems.map((item, index) => {
                            return (
                                <div
                                    key={item.path}
                                    className={styles["file-preview-empty-content-recent-list-item"]}
                                    onClick={() => historyStore.addHistoryItem(item)}
                                >
                                    {fileNames[index]} <span> {item.path}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

const FilePreview: FC<{data?: FileNodeProps}> = ({data}) => {
    const {t} = useI18nNamespaces(["aiAgent"])
    const path = data?.path ?? ""
    const name = data?.name ?? ""
    const icon = data?.icon ?? "default"

    const [showFileHint, setShowFileHint] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
    const [isBinary, setIsBinary] = useState(false)

    const iconPath = useMemo(() => {
        return KeyToIcon[icon]?.iconPath ?? ""
    }, [icon])

    const fetchFileInfo = useMemoizedFn(async (targetPath: string) => {
        if (!targetPath) return
        try {
            setLoading(true)
            const {size, isPlainText} = await getCodeSizeByPath(path)
            if (size > MAX_FILE_SIZE_BYTES) {
                setFileInfo(null)
                setShowFileHint(true)
                return
            }
            setIsBinary(!isPlainText)
            const content = await getCodeByPath(path)
            const file = await getLocalFileName(path)
            setFileInfo({path, size, isPlainText, content, language: monacaLanguageType(file.suffix)})
        } catch (err) {
            yakitNotify("error", t("FilePreview.loadFailed", {error: String(err)}))
        } finally {
            setLoading(false)
        }
    })

    useEffect(() => {
        setFileInfo(null)
        setShowFileHint(false)
        if (path) {
            fetchFileInfo(path)
        }
    }, [path])

    if (!data) {
        return <FilePreviewEmpty />
    }
    return (
        <div className={styles["file-preview"]}>
            <div className={styles["file-preview-title"]}>
                <div className={styles["file-preview-title-icon"]}>
                    <div className={styles["file-preview-title-icon-left"]}>
                        <img src={iconPath} alt='' />
                        <span>{name}</span>
                    </div>
                    <div className={styles["file-preview-title-icon-right"]}>
                        <CopyComponents
                            copyText={fileInfo?.content || ""}
                            iconColor='var(--Colors-Use-Neutral-Text-3-Secondary)'
                        />
                        <YakitButton
                            type='text2'
                            size='middle'
                            icon={<OutlineFolderopenIcon />}
                            onClick={() => onOpenLocalFileByPath(path)}
                        />
                    </div>
                </div>
                <div className={styles["file-preview-title-path"]}>{path}</div>
            </div>
            <div className={styles["file-preview-content"]}>
                <YakitSpin spinning={loading}>
                    {isBinary ? (
                        <Result
                            status={"warning"}
                            subTitle={t("FilePreview.binaryNotice")}
                            extra={[
                                <YakitButton size='max' type='primary' onClick={() => setIsBinary(false)}>
                                    {t("FilePreview.openAnyway")}
                                </YakitButton>
                            ]}
                        />
                    ) : (
                        <YakitEditor
                            key={fileInfo?.path || "empty-editor"}
                            value={fileInfo?.content}
                            readOnly
                            editorOperationRecord='YAK_RUNNNER_EDITOR_RECORF'
                            type={fileInfo?.language === "yak" ? "yak" : "plaintext"}
                        />
                    )}
                </YakitSpin>

                {/* 文件过大弹窗 */}
                <YakitHint
                    visible={showFileHint}
                    title={t("FilePreview.warningTitle")}
                    content={t("FilePreview.tooLarge")}
                    cancelButtonProps={{style: {display: "none"}}}
                    onOk={() => {
                        setFileInfo(null)
                        setShowFileHint(false)
                    }}
                    okButtonText={t("FilePreview.gotIt")}
                />
            </div>
        </div>
    )
}
export default FilePreview
