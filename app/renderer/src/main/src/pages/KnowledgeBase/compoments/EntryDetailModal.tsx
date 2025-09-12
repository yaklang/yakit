import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {FC} from "react"
import {v4 as uuidv4} from "uuid"

import styles from "../knowledgeBase.module.scss"
import {randomString} from "@/utils/randomUtil"
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag"

interface TVectorDetailModalProps {
    entryDetailModalData: {
        EntityDetailModalVisible: boolean
        selectedEntryDetail: Record<string, any>
    }
    setEntryDetailModalData: (preValue: {
        EntityDetailModalVisible: boolean
        selectedEntryDetail: Record<string, any>
    }) => void
}

const EntryDetailModal: FC<TVectorDetailModalProps> = ({
    entryDetailModalData: {EntityDetailModalVisible, selectedEntryDetail},
    setEntryDetailModalData
}) => {

    const handClose = () =>
        setEntryDetailModalData({
            EntityDetailModalVisible: false,
            selectedEntryDetail
        })

    return (
        <YakitModal
            getContainer={document.getElementById("repository-manage") || document.body}
            title='实体条目详情'
            visible={EntityDetailModalVisible}
            onCancel={handClose}
            maskClosable={false}
            footer={[
                <div className={styles["vector-detail-modal-footer"]} key={randomString(50)}>
                    <YakitButton key='vectorDatailClose' onClick={handClose}>
                        关闭
                    </YakitButton>
                </div>
            ]}
            width={900}
            bodyStyle={{maxHeight: "80vh", overflow: "auto"}}
            className={styles["entry-detail-modal-container"]}
        >
            <div className={styles["table-row"]}>
                <div className={styles["boxs"]}>
                    <div className={styles["label"]}>名称</div>
                    <div className={styles["value"]}>{selectedEntryDetail.Name ?? "-"}</div>
                </div>
                <div className={styles["boxs"]}>
                    <div className={styles["label"]}>类型</div>
                    <div className={styles["value"]}>{selectedEntryDetail.Type ?? "-"}</div>
                </div>

                <div className={styles["boxs"]}>
                    <div className={styles["label"]}>描述</div>
                    <div className={styles["value"]}>{selectedEntryDetail.Description ?? "-"}</div>
                </div>
                <div className={styles["boxs"]}>
                    <div className={styles["label"]}>属性</div>
                    <div className={styles["value"]}>
                        {selectedEntryDetail?.Attributes && selectedEntryDetail?.Attributes?.length > 0 ? selectedEntryDetail?.Attributes?.map((it) => (
                            <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                                {it?.Value}
                            </YakitTag>
                        )) : "-"}
                    </div>
                </div>
            </div>
        </YakitModal>
    )
}

export {EntryDetailModal}
