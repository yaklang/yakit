import {Dispatch, FC, SetStateAction, useEffect} from "react"
import {VectorStoreEntry} from "../TKnowledgeBase"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import classNames from "classnames"
import styles from "../knowledgeBase.module.scss"
import {Descriptions} from "antd"
import {useRequest} from "ahooks"
import {info} from "console"
import {useTheme} from "@/hook/useTheme"
import MDEditor from "@uiw/react-md-editor"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
const {Markdown} = MDEditor

const {ipcRenderer} = window.require("electron")

interface VectorDetailDrawerProps {
    openVectorDetailDrawerData: {
        vectorDetailModalVisible: boolean
        selectedVectorDetail?: VectorStoreEntry | undefined
    }
    setOpenVectorDetailDrawerData: Dispatch<
        SetStateAction<{
            vectorDetailModalVisible: boolean
            selectedVectorDetail?: VectorStoreEntry
        }>
    >
    knowledgeBaseId: string
}

const VectorDetailDrawer: FC<VectorDetailDrawerProps> = ({
    openVectorDetailDrawerData,
    setOpenVectorDetailDrawerData,
    knowledgeBaseId
}) => {
    const {theme} = useTheme()

    const {data: entryDocument, run} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("GetDocumentByVectorStoreEntryID", {
                ID: openVectorDetailDrawerData.selectedVectorDetail?.ID
            })
            return result?.Document
        },
        {
            manual: true,
            onError: (error) => info(error)
        }
    )

    useEffect(() => {
        openVectorDetailDrawerData.vectorDetailModalVisible &&
            openVectorDetailDrawerData.selectedVectorDetail?.ID &&
            run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openVectorDetailDrawerData.selectedVectorDetail])

    return (
        <YakitDrawer
            placement='right'
            width='80%'
            onClose={() =>
                setOpenVectorDetailDrawerData((preValue) => ({...preValue, vectorDetailModalVisible: false}))
            }
            visible={openVectorDetailDrawerData.vectorDetailModalVisible}
            title={"向量详情"}
            maskClosable={true}
            destroyOnClose={true}
            footer={null}
            className={classNames(styles["vector-detail-drawer"])}
        >
            <div className={styles["vector-drawer-container"]}>
                <div className={styles["vector-drawer-box"]}>
                    <div className={styles["title"]}>基本信息</div>
                    <div className={styles["box-content"]}>
                        <Descriptions bordered column={5}>
                            <Descriptions.Item label='条目 ID'>
                                {openVectorDetailDrawerData.selectedVectorDetail?.ID ?? "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label='集合 ID'>{knowledgeBaseId}</Descriptions.Item>
                            <Descriptions.Item label='向量维度'>
                                {openVectorDetailDrawerData.selectedVectorDetail?.Embedding
                                    ? openVectorDetailDrawerData.selectedVectorDetail.Embedding.length
                                    : 0}
                            </Descriptions.Item>
                            <Descriptions.Item label='内容长度'>
                                {openVectorDetailDrawerData.selectedVectorDetail?.Content
                                    ? openVectorDetailDrawerData.selectedVectorDetail.Content.length
                                    : 0}{" "}
                                字符
                            </Descriptions.Item>
                            <Descriptions.Item label='元数据长度'>
                                {openVectorDetailDrawerData.selectedVectorDetail?.Metadata
                                    ? openVectorDetailDrawerData.selectedVectorDetail.Metadata.length
                                    : 0}{" "}
                                字符
                            </Descriptions.Item>
                            <Descriptions.Item label='UID' span={4}>
                                {openVectorDetailDrawerData.selectedVectorDetail?.UID ?? "-"}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                </div>
                <div className={styles["vector-drawer-box"]}>
                    <div className={styles["title"]}>内容预览</div>
                    <Markdown
                        source={openVectorDetailDrawerData.selectedVectorDetail?.Content}
                        className={classNames(styles["box-content"], styles["markdown-box"])}
                        warpperElement={{"data-color-mode": theme}}
                    />
                </div>
                <div className={styles["vector-drawer-box"]}>
                    <div className={styles["title"]}>元数据</div>
                    <Markdown
                        source={openVectorDetailDrawerData.selectedVectorDetail?.Metadata}
                        className={classNames(styles["box-content"], styles["markdown-box"])}
                        warpperElement={{"data-color-mode": theme}}
                    />
                </div>
                {entryDocument ? (
                    <div className={styles["vector-drawer-box"]}>
                        <div className={styles["title"]}>关联知识库条目</div>
                        <div className={styles["box-content"]}>
                            <Descriptions bordered column={3}>
                                <Descriptions.Item label='标题:' span={2}>
                                    {entryDocument?.KnowledgeTitle ?? "-"}
                                </Descriptions.Item>

                                <Descriptions.Item label='类型:'>
                                    {entryDocument?.KnowledgeType ?? "-"}
                                </Descriptions.Item>

                                <Descriptions.Item label='重要度:'>
                                    {entryDocument?.ImportanceScore ?? "-"}
                                </Descriptions.Item>

                                <Descriptions.Item label='源页码:'>
                                    {entryDocument?.SourcePage ?? "-"}
                                </Descriptions.Item>

                                <Descriptions.Item label='潜在问题:'>
                                    {entryDocument?.PotentialQuestions?.join("; ") ?? "-"}
                                </Descriptions.Item>

                                <Descriptions.Item label='详细内容' span={3}>
                                    {entryDocument.KnowledgeDetails ?? "-"}
                                </Descriptions.Item>
                                <Descriptions.Item label='摘要:' span={3}>
                                    {entryDocument?.Summary ?? "-"}
                                </Descriptions.Item>

                                <Descriptions.Item label='关键词:' span={3}>
                                    {entryDocument?.Keywords?.join(", ") ?? "-"}
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    </div>
                ) : null}
                <div className={classNames(styles["vector-drawer-box"])}>
                    <div className={styles["title"]}>向量数据(前20维)</div>
                    {openVectorDetailDrawerData.selectedVectorDetail?.Embedding &&
                    openVectorDetailDrawerData.selectedVectorDetail?.Embedding.length > 0 ? (
                        <div className={classNames(styles["box-content"], styles["vector-drawer-tag"])}>
                            <div className={styles["vector-display"]}>
                                {openVectorDetailDrawerData.selectedVectorDetail.Embedding.slice(0, 20).map(
                                    (value, index) => (
                                        <YakitTag key={index} size='small'>
                                            {index}: {typeof value === "number" ? value.toFixed(6) : value}
                                        </YakitTag>
                                    )
                                )}
                                {openVectorDetailDrawerData.selectedVectorDetail.Embedding.length > 20 && (
                                    <YakitTag size='small'>
                                        ...还有 {openVectorDetailDrawerData.selectedVectorDetail.Embedding.length - 21}
                                        维
                                    </YakitTag>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </YakitDrawer>
    )
}

export {VectorDetailDrawer}
