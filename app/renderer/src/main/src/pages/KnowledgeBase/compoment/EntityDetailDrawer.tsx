import {Dispatch, FC, SetStateAction, useEffect, useMemo} from "react"
import {Divider, Form} from "antd"

import {Entity, GenerateERMDotResponse, QueryRelationshipResponse} from "@/components/playground/entityRepository"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useRequest, useSafeState} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, success} from "@/utils/notification"

import {randomString} from "@/utils/randomUtil"
import {OutlinePencilaltIcon, OutlinePhotographIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {apiSearchKnowledgeBaseEntry, transformToGraphData} from "../utils"
import GraphChart from "./GraphChart"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {GenerateKnowledge} from "./GenerateKnowledge"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"

interface EntityDetailDrawerProps {
    entityDrawerDetail: Partial<Entity> & {visible: boolean}
    setEntityDrawerDetail: Dispatch<
        SetStateAction<
            Partial<Entity> & {
                visible: boolean
            }
        >
    >
    setTData: (newData: Entity[]) => void
    tableData: Entity[]
    generateKnowledgeBaseItem: KnowledgeBaseTableProps["knowledgeBaseItems"]
}

const {Item} = Form

const {ipcRenderer} = window.require("electron")

const EntityDetailDrawer: FC<EntityDetailDrawerProps> = ({
    entityDrawerDetail,
    setEntityDrawerDetail,
    setTData,
    tableData,
    generateKnowledgeBaseItem
}) => {
    const [form] = Form.useForm()
    const [type, setType] = useSafeState("base")
    const [status, setStatus] = useSafeState("preview")
    const [relationshipType, setRelationshipType] = useSafeState("svg")
    const [depth, setDepth] = useSafeState<number>(2)

    const {
        data: dotCode,
        runAsync: dotCodeRunAsync,
        loading: dotCodeLoading
    } = useRequest(
        async (depth?: number) => {
            const response: GenerateERMDotResponse = await ipcRenderer.invoke("GenerateERMDot", {
                Filter: {
                    HiddenIndex: [entityDrawerDetail?.HiddenIndex]
                },
                Depth: depth ?? 2
            })
            return response.Dot || ""
        },
        {
            manual: true,
            debounceWait: 2000,
            debounceLeading: true
        }
    )

    // 获取实体关系图
    const {
        data: GraphData,
        runAsync,
        loading
    } = useRequest(
        async (depth?: number) => {
            const response = await ipcRenderer.invoke("QuerySubERM", {
                Filter: {
                    HiddenIndex: [entityDrawerDetail?.HiddenIndex]
                },
                Depth: depth ?? 2
            })
            return transformToGraphData(response)
        },
        {
            manual: true,
            onError: (err) => failed(`获取实体关系图失败: ${err}`),
            debounceWait: 2000,
            debounceLeading: true
        }
    )

    const {data: knowledgeBaseData, run} = useRequest(
        async (requestData) => {
            const response = await apiSearchKnowledgeBaseEntry({
                Filter: {
                    RelatedEntityUUIDS: [requestData?.HiddenIndex],
                    KnowledgeBaseId: generateKnowledgeBaseItem.ID
                },
                Pagination: {
                    Page: 1,
                    Limit: 9999
                }
            })
            return response?.KnowledgeBaseEntries ?? []
        },
        {manual: true, onError: (err) => failed(`获取实体关系图失败: ${err}`)}
    )

    const {data: relationsshipData, run: relationshipRun} = useRequest(
        async (requestData) => {
            const response: QueryRelationshipResponse = await ipcRenderer.invoke("QueryRelationship", {
                Filter: {
                    BaseIndex: requestData.BaseIndex,
                    BaseId: requestData.BaseId,
                    Types: [requestData.Type]
                },
                Pagination: {
                    Page: 1,
                    Limit: 999,
                    OrderBy: "id",
                    Order: "desc"
                }
            })
            // console.log(response, requestData, "sss")
        },
        {
            manual: true
        }
    )

    const onClose = () => {
        setEntityDrawerDetail((preValue) => ({...preValue, visible: false}))
        setStatus("preview")
        setType("base")
        setRelationshipType("svg")
        setDepth(2)
    }

    useEffect(() => {
        if (entityDrawerDetail.visible) {
            run(entityDrawerDetail)
            entityDrawerDetail?.HiddenIndex && runAsync()
            form.setFieldsValue({
                ...entityDrawerDetail,
                Attributes: entityDrawerDetail.Attributes?.map((it) => ({
                    value: it.Value,
                    key: it.Value
                })),
                relations: [{id: randomString(12)}]
            })
            if (entityDrawerDetail.ID) {
                // run(entityDrawerDetail.BaseID)
            }
        } else {
            form.resetFields()
        }
    }, [entityDrawerDetail])

    useEffect(() => {
        if (relationshipType === "code") {
            dotCodeRunAsync()
        }
    }, [entityDrawerDetail, relationshipType])

    const onSubmit = async () => {
        const resultData = await form.validateFields()
        const transformData = {
            ...entityDrawerDetail,
            ...resultData,
            Attributes: resultData.Attributes?.map((it) => ({
                Key: "",
                MarshalValue: "",
                Value: it
            }))
        }
        const newTableData = tableData.map((it) => (it.ID === transformData.ID ? transformData : it))

        await ipcRenderer
            .invoke("UpdateEntity", transformData)
            .then(() => {
                setTData(newTableData)
                setStatus("preview")
                success("实体更新成功")
            })
            .catch((err) => {
                failed(`实体更新失败: ${err}`)
            })
    }

    const targetButtonMemo = useMemo(() => {
        if (type === "base" && status === "preview") {
            return <YakitButton type='text2' icon={<OutlinePencilaltIcon />} onClick={() => setStatus("edit")} />
        } else if (type === "base" && status === "edit") {
            return (
                <div>
                    <YakitButton type='text2' onClick={() => setStatus("preview")}>
                        取消
                    </YakitButton>
                    <Divider type='vertical' />
                    <YakitButton type='text' onClick={onSubmit}>
                        保存
                    </YakitButton>
                </div>
            )
        } else {
            // return <YakitButton type='secondary2'>重新生成</YakitButton>
            return null
        }
    }, [type, status])

    return (
        <YakitDrawer
            placement='right'
            width='80%'
            onClose={onClose}
            visible={entityDrawerDetail.visible}
            title={"实体详情"}
            maskClosable={true}
            destroyOnClose={true}
            className={classNames(styles["entity-detail-drawer"])}
        >
            <div className={styles["detail-left"]}>
                <div className={styles["detail-header"]}>
                    <div className={styles["header-buttons"]}>
                        <YakitRadioButtons
                            buttonStyle='solid'
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            options={[
                                {
                                    value: "base",
                                    label: "基础信息"
                                },
                                {
                                    value: "related",
                                    label: "相关知识"
                                }
                            ]}
                        />
                        {type === "related" ? (
                            <>
                                <div className={styles["caption"]}>Total</div>
                                <div className={styles["number"]}>{knowledgeBaseData?.length ?? 0}</div>
                            </>
                        ) : null}
                    </div>
                    <div>{targetButtonMemo}</div>
                </div>
                <div className={styles["detail-container"]}>
                    {type === "base" ? (
                        <Form form={form} layout='vertical'>
                            <Item label='实体名称' name='Name' rules={[{required: true, message: "请输入实体名称"}]}>
                                <YakitInput disabled={status === "preview"} />
                            </Item>
                            <Item label='描述' name='Description'>
                                <YakitInput.TextArea disabled={status === "preview"} />
                            </Item>
                            <Item label='类型' name='Type' rules={[{required: true, message: "请输入实体类型"}]}>
                                <YakitInput disabled={status === "preview"} />
                            </Item>

                            <Form.Item label='属性' name='Attributes'>
                                <YakitSelect mode='tags' disabled={status === "preview"} />
                            </Form.Item>

                            {/* <RelationList form={form} disabled={status === "preview"} /> */}
                        </Form>
                    ) : (
                        <div className={styles["related-knowledge-box"]}>
                            {knowledgeBaseData?.map((item, index) => {
                                return (
                                    <div className={styles["related-box"]} key={item.ID}>
                                        <div className={styles["num-box"]}>
                                            <div className={styles["num-font"]}>
                                                {(index + 1).toString().padStart(2, "0")}
                                            </div>
                                        </div>
                                        <div className={styles["content"]}>
                                            <div className={styles["title-box"]}>
                                                <div className={styles["title"]}>{item.KnowledgeTitle}</div>
                                                <YakitTag color='blue' size='middle'>
                                                    {item.KnowledgeType}
                                                </YakitTag>
                                                <YakitTag color='warning' size='middle'>
                                                    {item?.ImportanceScore ?? 0}
                                                </YakitTag>
                                            </div>
                                            <div className={styles["description"]}>{item.KnowledgeDetails}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["detail-right"]}>
                <div className={styles["detail-header"]}>
                    <div className={styles["title"]}>知识 - 实体关系图</div>
                    <div className={styles["header-buttons"]}>
                        <div className={styles["in-depth-description"]}>深度</div>
                        <YakitInputNumber
                            className={styles["operate-inputNumber"]}
                            value={depth}
                            onChange={async (value) => {
                                if (typeof value === "number" && value) {
                                    runAsync(depth)
                                    dotCodeRunAsync(depth)
                                    setDepth(value)
                                }
                            }}
                        />
                        <Divider type={"vertical"} />
                        <GenerateKnowledge
                            generateKnowledgeDataList={[{...(entityDrawerDetail as any)}]}
                            generateKnowledgeBaseItem={generateKnowledgeBaseItem}
                            depth={depth}
                            knowledgeType='entity'
                        />
                        <Divider type={"vertical"} />
                        <YakitRadioButtons
                            buttonStyle='solid'
                            value={relationshipType}
                            onChange={(e) => setRelationshipType(e.target.value)}
                            options={[
                                {
                                    label: (
                                        <div className={styles["radio-buttons-label"]}>
                                            <OutlinePhotographIcon />
                                            SVG
                                        </div>
                                    ),
                                    value: "svg"
                                },
                                {
                                    label: (
                                        <div className={styles["radio-buttons-label"]}>
                                            <OutlineTerminalIcon />
                                            Code
                                        </div>
                                    ),
                                    value: "code"
                                }
                            ]}
                        />
                    </div>
                </div>
                <div className={styles["detail-diagram"]}>
                    <div className={styles["content"]}>
                        {relationshipType === "svg" ? (
                            <YakitSpin spinning={loading}>
                                {GraphData ? <GraphChart graphData={GraphData} /> : <YakitEmpty />}
                            </YakitSpin>
                        ) : (
                            <YakitSpin spinning={dotCodeLoading}>
                                <pre style={{padding: 12}}>{dotCode}</pre>
                            </YakitSpin>
                        )}
                    </div>
                </div>
            </div>
        </YakitDrawer>
    )
}

export {EntityDetailDrawer}
