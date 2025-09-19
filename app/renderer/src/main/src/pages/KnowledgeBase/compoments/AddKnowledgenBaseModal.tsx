import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {FC, useState} from "react"
import styles from "../knowledgeBase.module.scss"
import Dragger from "antd/lib/upload/Dragger"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {failed} from "@/utils/notification"
import {useDebounceFn} from "ahooks"
import {warn} from "console"
import {OutlinePaperclipIcon} from "@/assets/icon/outline"
import {SolidXcircleIcon} from "@/assets/icon/solid"

interface TAddKnowledgenBaseModalProps {
    addKnowledgenBaseModal: {
        addKnowledgenBaseModalVisible: boolean
        knowledgeBaseId: number | undefined
        KnowledgeBaseName: string | undefined
    }
    setAddKnowledgenBaseModal: (preValue: {
        addKnowledgenBaseModalVisible: boolean
        knowledgeBaseId: number | undefined
        KnowledgeBaseName: string | undefined
    }) => void
}

const AddKnowledgenBaseModal: FC<TAddKnowledgenBaseModalProps> = ({
    addKnowledgenBaseModal,
    setAddKnowledgenBaseModal
}) => {
    const [uploadList, setUploadList] = useState<{path: string; name: string}[]>([])

    const beforeUploadFun = useDebounceFn(
        (fileList: any[]) => {
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
            setUploadList(arr)
        },
        {
            wait: 200
        }
    ).run

    const handleOk = () => {
        console.log(1)
    }

    return (
        <YakitModal
            title={"添加知识库条目"}
            visible={addKnowledgenBaseModal.addKnowledgenBaseModalVisible}
            onCancel={() => {
                setAddKnowledgenBaseModal({
                    addKnowledgenBaseModalVisible: false,
                    knowledgeBaseId: addKnowledgenBaseModal.knowledgeBaseId,
                    KnowledgeBaseName: addKnowledgenBaseModal.KnowledgeBaseName
                })
                setUploadList([])
            }}
            onOk={handleOk}
            width={600}
            destroyOnClose
            okText='确认'
            cancelText='取消'
        >
            <Dragger
                className={styles["upload-dragger"]}
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
                        <div className={styles["sub-title"]}>支持文件夹批量上传(支持文件类型txt/csv)</div>
                    </div>
                </div>
            </Dragger>
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
                                const newUploadList = uploadList.filter((itemIn) => itemIn.path !== item.path)
                                setUploadList(newUploadList)
                            }}
                        >
                            <SolidXcircleIcon />
                        </div>
                    </div>
                ))}
            </div>
        </YakitModal>
    )
}

export {AddKnowledgenBaseModal}
