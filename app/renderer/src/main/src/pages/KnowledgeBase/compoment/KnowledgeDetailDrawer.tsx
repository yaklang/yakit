import {Dispatch, FC, SetStateAction, useEffect, useMemo, useRef} from "react"
import {Divider, Form, InputNumber, Tooltip} from "antd"

import {GenerateERMDotResponse} from "@/components/playground/entityRepository"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useRequest, useSafeState} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, success} from "@/utils/notification"

import {randomString} from "@/utils/randomUtil"
import {OutlinePencilaltIcon, OutlinePhotographIcon, OutlinePlay2Icon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {KnowledgeBaseEntry} from "../TKnowledgeBase"
import {PotentialQuestionsList} from "./PotentialQuestionsList"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {transformToGraphData} from "../utils"
import GraphChart from "./GraphChart"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {GenerateKnowledge} from "./GenerateKnowledge"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {HubButton} from "@/pages/pluginHub/hubExtraOperate/funcTemplate"
import React from "react"

interface KnowledgeDetailDrawerProps {
    knowledgeDrawerDetail: Partial<KnowledgeBaseEntry> & {visible: boolean}
    setKnowledgeDrawerDetail: Dispatch<
        SetStateAction<
            Partial<KnowledgeBaseEntry> & {
                visible: boolean
            }
        >
    >
    setTData: (newData: KnowledgeBaseEntry[]) => void
    tableData: KnowledgeBaseEntry[]
    generateKnowledgeBaseItem: KnowledgeBaseTableProps["knowledgeBaseItems"]
}

const {Item} = Form

const {ipcRenderer} = window.require("electron")

const KnowledgeDetailDrawer: FC<KnowledgeDetailDrawerProps> = ({
    knowledgeDrawerDetail,
    setKnowledgeDrawerDetail,
    setTData,
    tableData,
    generateKnowledgeBaseItem
}) => {
    const [form] = Form.useForm()
    const [type, setType] = useSafeState("base")
    const [status, setStatus] = useSafeState("preview")
    const [relationshipType, setRelationshipType] = useSafeState("svg")
    const [depth, setDepth] = useSafeState<number>(2)
    const wrapperWidth = useListenWidth(document.getElementById("repository-manage"))

    const {
        data: dotCode,
        runAsync: dotCodeRunAsync,
        loading: dotCodeLoading
    } = useRequest(
        async (depth?: number) => {
            const response: GenerateERMDotResponse = await ipcRenderer.invoke("GenerateERMDot", {
                Filter: {
                    HiddenIndex: knowledgeDrawerDetail?.RelatedEntityUUIDS?.split(",")
                },
                Depth: depth ?? 2
            })
            return response.Dot || ""
        },
        {
            manual: true,
            debounceWait: 2000,
            onError: (err) => failed(`获取实体关系图代码失败: ${err}`),
            debounceLeading: true
        }
    )

    // 获取实体关系图
    const {data, runAsync, loading} = useRequest(
        async (depth?: number) => {
            const response = await ipcRenderer.invoke("QuerySubERM", {
                Filter: {
                    HiddenIndex: knowledgeDrawerDetail?.RelatedEntityUUIDS?.split(",")
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

    const {runAsync: QueryEntityRunAsync, data: QueryEntityData} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("QueryEntity", {
                Filter: {
                    HiddenIndex: knowledgeDrawerDetail?.RelatedEntityUUIDS?.split(",")
                },
                Pagination: {
                    Page: 1,
                    Limit: -1,
                    OrderBy: "id",
                    Order: "desc" as const
                }
            })
            return result?.Entities ?? []
        },
        {
            manual: true,
            onError: (err) => failed(`获取实体信息失败: ${err}`)
        }
    )

    const onClose = () => {
        setKnowledgeDrawerDetail((preValue) => ({...preValue, visible: false}))
        setStatus("preview")
        setType("base")
        setRelationshipType("svg")
        setDepth(2)
    }

    useEffect(() => {
        if (knowledgeDrawerDetail.visible) {
            knowledgeDrawerDetail?.HiddenIndex && runAsync()
            form.setFieldsValue({
                ...knowledgeDrawerDetail,
                PotentialQuestions: knowledgeDrawerDetail?.PotentialQuestions?.map((it) => ({
                    relation: it,
                    id: randomString(10)
                }))
            })
        } else {
            form.resetFields()
        }
    }, [knowledgeDrawerDetail])

    useEffect(() => {
        if (relationshipType === "code") {
            dotCodeRunAsync()
        }
    }, [knowledgeDrawerDetail, relationshipType])

    const onSubmit = async () => {
        const resultData = await form.validateFields()
        const transformData = {
            ...knowledgeDrawerDetail,
            ...resultData,
            PotentialQuestions: resultData?.PotentialQuestions?.map((it) => it.relation).filter(Boolean),
            KnowledgeBaseEntryHiddenIndex: knowledgeDrawerDetail?.HiddenIndex,
            KnowledgeBaseID: knowledgeDrawerDetail?.KnowledgeBaseId
        }
        const result = resultData?.PotentialQuestions?.filter((item) => item.relation)
        const newTableData = tableData.map((it) => (it.ID === transformData.ID ? transformData : it))
        form.setFieldsValue({
            ...resultData,
            PotentialQuestions: result
        })

        ipcRenderer
            .invoke("UpdateKnowledgeBaseEntry", transformData)
            .then(() => {
                setTData(newTableData)
                setStatus("preview")
                success("知识更新成功")
            })
            .catch((err) => {
                failed(`${err}`)
            })
    }

    const targetButtonMemo = useMemo(() => {
        if (type === "base" && status === "preview") {
            return <YakitButton icon={<OutlinePencilaltIcon />} type='text2' onClick={() => setStatus("edit")} />
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
            visible={knowledgeDrawerDetail.visible}
            title={"知识详情"}
            maskClosable={true}
            destroyOnClose={true}
            className={classNames(styles["knowledge-detail-drawer"])}
        >
            <div className={styles["detail-drawer-content"]}>
                <div className={styles["detail-left"]}>
                    <div className={styles["detail-header"]}>
                        <div className={styles["header-buttons"]}>
                            <YakitRadioButtons
                                buttonStyle='solid'
                                value={type}
                                onChange={(e) => {
                                    setType(e.target.value)
                                    e.target.value === "related" && QueryEntityRunAsync()
                                }}
                                options={[
                                    {
                                        value: "base",
                                        label: "基础信息"
                                    },
                                    {
                                        value: "related",
                                        label: "相关实体"
                                    }
                                ]}
                            />
                            {type === "related" ? (
                                <>
                                    <div className={styles["caption"]}>Total</div>
                                    <div className={styles["number"]}>{QueryEntityData?.length ?? 0}</div>
                                </>
                            ) : null}
                        </div>
                        <div>{targetButtonMemo}</div>
                    </div>
                    <div className={styles["detail-container"]}>
                        {type === "base" ? (
                            <Form form={form} layout='vertical'>
                                <Item
                                    label='知识标题'
                                    name='KnowledgeTitle'
                                    rules={[{required: true, message: "请输入知识标题"}]}
                                >
                                    <YakitInput placeholder='请输入知识标题' disabled={status === "preview"} />
                                </Item>
                                <Item
                                    label='类型'
                                    name='KnowledgeType'
                                    rules={[{required: true, message: "请输入知识类型"}]}
                                    style={{marginTop: 24}}
                                >
                                    <YakitInput placeholder='请输入知识类型' disabled={status === "preview"} />
                                </Item>
                                <Item
                                    label='重要度评分'
                                    name='ImportanceScore'
                                    rules={[{required: true, message: "请输入重要度评分"}]}
                                >
                                    <YakitInputNumber
                                        min={1}
                                        max={10}
                                        style={{width: "100%"}}
                                        disabled={status === "preview"}
                                    />
                                </Item>

                                <Item label='关键词' name='Keywords'>
                                    <YakitSelect mode='tags' disabled={status === "preview"} />
                                </Item>
                                <Item
                                    label='知识详情'
                                    name='KnowledgeDetails'
                                    rules={[{required: true, message: "请输入知识详情"}]}
                                >
                                    <YakitInput.TextArea
                                        placeholder='请输入知识详情'
                                        rows={6}
                                        maxLength={5000}
                                        showCount
                                        disabled={status === "preview"}
                                    />
                                </Item>
                                <Item label='摘要' name='Summary'>
                                    <YakitInput.TextArea
                                        placeholder='请输入摘要'
                                        rows={3}
                                        maxLength={500}
                                        showCount
                                        disabled={status === "preview"}
                                    />
                                </Item>
                                <PotentialQuestionsList form={form} disabled={status === "preview"} />
                            </Form>
                        ) : (
                            <div className={styles["related-knowledge-box"]}>
                                {QueryEntityData?.map((item, index) => {
                                    return (
                                        <div className={styles["related-box"]} key={item.ID}>
                                            <div className={styles["num-box"]}>
                                                <div className={styles["num-font"]}>
                                                    {(index + 1).toString().padStart(2, "0")}
                                                </div>
                                            </div>
                                            <div className={styles["content"]}>
                                                <div className={styles["title-box"]}>
                                                    <div className={styles["title"]}>{item.Name}</div>
                                                    <YakitTag color='blue' size='middle'>
                                                        {item.Type}
                                                    </YakitTag>
                                                    <YakitTag color='warning' size='middle'>
                                                        {item?.Attributes?.length ?? 0}
                                                    </YakitTag>
                                                </div>
                                                <div className={styles["description"]}>{item.Description}</div>
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
                                generateKnowledgeDataList={[{...(knowledgeDrawerDetail as any)}]}
                                generateKnowledgeBaseItem={generateKnowledgeBaseItem}
                                depth={depth}
                                knowledgeType='entity'
                                children={
                                    <HubButton
                                        width={wrapperWidth}
                                        iconWidth={1500}
                                        icon={<OutlinePlay2Icon />}
                                        type='outline1'
                                        name={"从实体生成知识"}
                                    />
                                }
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
                                                {wrapperWidth > 1500 ? (
                                                    <React.Fragment>
                                                        <OutlinePhotographIcon />
                                                        SVG
                                                    </React.Fragment>
                                                ) : (
                                                    <Tooltip title='SVG'>
                                                        <OutlinePhotographIcon />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        ),
                                        value: "svg"
                                    },
                                    {
                                        label: (
                                            <div className={styles["radio-buttons-label"]}>
                                                {wrapperWidth > 1500 ? (
                                                    <React.Fragment>
                                                        <OutlineTerminalIcon />
                                                        Code
                                                    </React.Fragment>
                                                ) : (
                                                    <Tooltip title='Code'>
                                                        <OutlineTerminalIcon />
                                                    </Tooltip>
                                                )}
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
                                    {data ? <GraphChart graphData={data} /> : <YakitEmpty />}
                                </YakitSpin>
                            ) : (
                                <YakitSpin spinning={dotCodeLoading}>
                                    <pre style={{padding: 12}}>{dotCode}</pre>
                                </YakitSpin>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </YakitDrawer>
    )
}

export {KnowledgeDetailDrawer}
