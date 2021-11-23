import React, { useEffect, useState } from "react"
import { Button, Card, Col, Form, List, PageHeader, Popconfirm, Row, Space, Table, Tag } from "antd"
import { failed, info, success } from "../../utils/notification"
import { PaginationSchema, QueryGeneralRequest, QueryGeneralResponse } from "../invoker/schema"
import { showModal } from "../../utils/showModal"
import { InputItem } from "../../utils/inputUtil"
import { YakEditor } from "../../utils/editors"
import { CopyToClipboard } from "react-copy-to-clipboard"

const { ipcRenderer } = window.require("electron")

export interface PayloadManagerPageProp {}

export interface Payload {
    Content: string
    ContentRaw: Uint8Array
    Group: string
    Id: number
}

export interface QueryPayloadParams extends QueryGeneralRequest {
    Group: string
    Keyword: string
}

export const PayloadManagerPage: React.FC<PayloadManagerPageProp> = (props) => {
    const [groups, setGroups] = useState<string[]>([])
    const [selected, setSelected] = useState("")
    const [response, setResponse] = useState<QueryGeneralResponse<Payload>>()
    const [params, setParams] = useState<QueryPayloadParams>({
        Keyword: "",
        Group: "",
        Pagination: { Page: 1, Limit: 20, Order: "desc", OrderBy: "updated_at" }
    })
    const pagination: PaginationSchema | undefined = response?.Pagination

    const updateGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: { Groups: string[] }) => {
                setGroups(data.Groups || [])
            })
            .catch((e) => {
                failed(e?.details || "call GetAllPayloadGroup failed")
            })
            .finally()
    }
    const updateDict = (page?: number, limit?: number) => {
        ipcRenderer
            .invoke("QueryPayload", {
                ...params,
                Group: selected,
                Pagination: {
                    ...params.Pagination,
                    Page: page || params.Pagination.Page,
                    Limit: limit || params.Pagination.Limit
                }
            } as QueryPayloadParams)
            .then((data) => {
                setResponse(data)
            })
            .catch((e) => {
                failed(e?.details || "query payload failed")
            })
    }

    useEffect(() => {
        updateGroup()
    }, [])

    useEffect(() => {
        if (!selected) {
            return
        }

        updateDict()
    }, [selected])

    return (
        <div>
            <PageHeader
                title={"Payload / 字典管理"}
                subTitle={`增加 / 删除 / 管理字典，可以通过 fuzz 模块 {{x(字典名)}} 来渲染`}
            />
            <Row gutter={18}>
                <Col span={8}>
                    <Card
                        title={"选择 / 查看已有字典"}
                        size={"small"}
                        bordered={false}
                        extra={
                            <Form size={"small"} onSubmitCapture={(e) => e.preventDefault()}>
                                <Form.Item style={{ marginBottom: 0 }} label={" "} colon={false}>
                                    <Button.Group>
                                        <Button
                                            size={"small"}
                                            onClick={() => {
                                                let m = showModal({
                                                    title: "创建新的 Payload 组/字典",
                                                    content: (
                                                        <>
                                                            <CreatePayloadGroup
                                                                Group={""}
                                                                onFinished={(e) => {
                                                                    info("创建/修改 Payload 字典/组成功")
                                                                    updateGroup()
                                                                    m.destroy()
                                                                }}
                                                            />
                                                        </>
                                                    ),
                                                    width: "60%"
                                                })
                                            }}
                                        >
                                            新增 / 扩充字典
                                        </Button>
                                    </Button.Group>
                                </Form.Item>
                            </Form>
                        }
                    >
                        <List<string>
                            // bordered={true}
                            dataSource={groups}
                            renderItem={(element, index) => {
                                return (
                                    <List.Item id={index.toString()}>
                                        <Button.Group style={{ width: "100%", textAlign: "left" }}>
                                            <Button
                                                style={{ width: "100%", textAlign: "left" }}
                                                type={selected === element ? "primary" : undefined}
                                                onClick={(e) => setSelected(element)}
                                            >
                                                字典分组名：{element}
                                            </Button>
                                            <Popconfirm
                                                title={"确定删除该字典吗？"}
                                                onConfirm={(e) => {
                                                    ipcRenderer
                                                        .invoke("DeletePayloadByGroup", {
                                                            Group: element
                                                        })
                                                        .then(() => {
                                                            updateGroup()
                                                        })
                                                        .catch((e) => {
                                                            failed("Delete Payload By Group failed")
                                                        })
                                                }}
                                            >
                                                <Button
                                                    danger={true}
                                                    type={selected === element ? "primary" : undefined}
                                                >
                                                    删除字典
                                                </Button>
                                            </Popconfirm>
                                        </Button.Group>
                                    </List.Item>
                                )
                            }}
                        />
                    </Card>
                </Col>
                <Col span={16}>
                    <Card
                        title={"字典内容"}
                        size={"small"}
                        bordered={false}
                        extra={
                            <Form
                                size={"small"}
                                onSubmitCapture={(e) => {
                                    e.preventDefault()

                                    updateDict(1, 20)
                                }}
                                layout={"inline"}
                                style={{ marginBottom: 0 }}
                            >
                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Tag color={"geekblue"}>{selected}</Tag>
                                </Form.Item>
                                <InputItem
                                    label={"搜索"}
                                    style={{ marginBottom: 0 }}
                                    setValue={(Keyword) => setParams({ ...params, Keyword })}
                                    value={params.Keyword}
                                />
                                <Form.Item colon={false} label={" "} style={{ marginBottom: 0 }}>
                                    <Button.Group>
                                        <Button type="primary" htmlType="submit">
                                            {" "}
                                            Search{" "}
                                        </Button>
                                        <CopyToClipboard
                                            text={`{{x(${selected})}}`}
                                            onCopy={(text, ok) => {
                                                if (ok) success("已复制到粘贴板")
                                            }}
                                        >
                                            <Button>复制Fuzz标签</Button>
                                        </CopyToClipboard>
                                    </Button.Group>
                                </Form.Item>
                            </Form>
                        }
                    >
                        <Table<Payload>
                            bordered={true}
                            size={"small"}
                            columns={[
                                { title: "所属字典", render: (e: Payload) => <Tag>{e.Group}</Tag> },
                                { title: "字典内容", render: (e: Payload) => e.Content }
                            ]}
                            onChange={(p) => {
                                updateDict(p.current, p.pageSize)
                            }}
                            pagination={{
                                size: "small",
                                pageSize: pagination?.Limit || 10,
                                total: response?.Total || 0,
                                showTotal: (i) => <Tag>共{i}条历史记录</Tag>
                            }}
                            dataSource={response?.Data}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

export interface CreatePayloadGroupProp {
    Group?: string
    onFinished?: (group: string) => any
    onFinally?: () => any
}

export interface SavePayloadParams {
    Group: string
    Content: string
    IsFile: boolean
    Proxy?: string
}

export const CreatePayloadGroup: React.FC<CreatePayloadGroupProp> = (props) => {
    const [params, setParams] = useState<SavePayloadParams>({
        Group: "",
        Content: "",
        IsFile: false
    })

    return (
        <div>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    ipcRenderer
                        .invoke("SavePayload", params)
                        .then(() => {
                            props.onFinished && props.onFinished(params.Group)
                        })
                        .catch((e) => {
                            failed("创建 Payload 失败 / 字典")
                        })
                        .finally(props.onFinally)
                }}
                wrapperCol={{ span: 14 }}
                labelCol={{ span: 6 }}
            >
                <InputItem
                    label={"字典名/组"}
                    setValue={(Group) => setParams({ ...params, Group })}
                    value={params.Group}
                    required={true}
                />
                <Form.Item label={"字典内容"}>
                    <div style={{ height: 300 }}>
                        <YakEditor setValue={(Content) => setParams({ ...params, Content })} value={params.Content} />
                    </div>
                </Form.Item>
                <Form.Item colon={false} label={" "}>
                    <Button type="primary" htmlType="submit">
                        {" "}
                        创建新的字典{" "}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}
