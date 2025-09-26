import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {FC, useEffect, useState} from "react"
import {v4 as uuidv4} from "uuid"

import styles from "../knowledgeBase.module.scss"
import {randomString} from "@/utils/randomUtil"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {useRequest} from "ahooks"
import {GraphData, transform} from "./KnowledgenBaseDetailDrawer"
import {failed} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import GraphDemo from "./demo"

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
const {ipcRenderer} = window.require("electron")

const EntryDetailModal: FC<TVectorDetailModalProps> = ({
    entryDetailModalData: {EntityDetailModalVisible, selectedEntryDetail},
    setEntryDetailModalData
}) => {
    const [depth, setDepth] = useState(2)
    const [resultData, setResultData] = useState<GraphData>()

    const {runAsync, loading} = useRequest(
        async (HiddenIndex: string[], Depth?: number) => {
            const response = await ipcRenderer.invoke("QuerySubERM", {
                Filter: {
                    HiddenIndex
                },
                Depth: Depth ?? 2
            })
            const targetNodes = response?.Entities?.map((it) => {
                return {
                    id: it?.HiddenIndex,
                    name: it?.Name
                }
            })

            const targetLinks = response?.Relationships?.map((it) => ({
                source: it?.SourceEntityIndex,
                target: it?.TargetEntityIndex,
                type: it?.Type
            }))

            const resultData =
                targetLinks.length > 0 && targetLinks.length > 0
                    ? {
                          nodes: targetNodes,
                          links: targetLinks
                      }
                    : {
                          nodes: [],
                          links: []
                      }

            setResultData({
                nodes: transform(resultData),
                links: resultData?.links
            })
            return "请求完成"
        },
        {
            manual: true,
            onError: (err) => failed(`获取实体关系图失败: ${err}`),
            debounceWait: 1000,
            debounceLeading: true
        }
    )

    useEffect(() => {
        EntityDetailModalVisible && runAsync([selectedEntryDetail?.HiddenIndex], depth)
    }, [EntityDetailModalVisible, selectedEntryDetail?.HiddenIndex])

    const handClose = () => {
        setDepth(2)
        setResultData({
            nodes: [],
            links: []
        })
        setEntryDetailModalData({
            EntityDetailModalVisible: false,
            selectedEntryDetail
        })
    }

    return (
        <YakitModal
            // getContainer={document.getElementById("repository-manage") || document.body}
            title='实体条目详情'
            visible={EntityDetailModalVisible}
            destroyOnClose={true}
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
            <div className={styles["knowledgen-base-container"]}>
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
                            {selectedEntryDetail?.Attributes && selectedEntryDetail?.Attributes?.length > 0
                                ? selectedEntryDetail?.Attributes?.map((it) => (
                                      <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                                          {it?.Value}
                                      </YakitTag>
                                  ))
                                : "-"}
                        </div>
                    </div>
                </div>
                <YakitSpin spinning={loading}>
                    <div className={styles["knowledgen-base-grap"]}>
                        <div className={styles["header"]}>
                            <div className={styles["title"]}>实体关系图</div>
                            <div className={styles["depth"]}>
                                <div>深度</div>{" "}
                                <YakitInputNumber
                                    value={depth}
                                    onChange={async (e) => {
                                        setDepth(e as number)
                                        await runAsync([selectedEntryDetail?.HiddenIndex], e as number)
                                    }}
                                    min={1}
                                />
                            </div>
                        </div>
                        <div className={styles["knowledge-base-grap"]}>
                            {resultData?.links &&
                            resultData?.links.length > 0 &&
                            resultData?.nodes &&
                            resultData?.nodes.length > 0 ? (
                                <GraphDemo data={resultData} />
                            ) : (
                                <YakitEmpty title='暂无数据' />
                            )}
                        </div>
                    </div>
                </YakitSpin>
            </div>
        </YakitModal>
    )
}

export {EntryDetailModal}
