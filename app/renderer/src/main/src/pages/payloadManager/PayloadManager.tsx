import React, {useEffect, useRef, useState} from "react"
import {Button, Col, Form, List, PageHeader, Popconfirm, Row, Table, Tag, Upload, Typography, Select} from "antd"
import {DeleteOutlined, ThunderboltFilled} from "@ant-design/icons"
import {failed, info, success} from "../../utils/notification"
import {PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {showModal} from "../../utils/showModal"
import {InputItem} from "../../utils/inputUtil"
import {YakEditor} from "../../utils/editors"
import {CopyToClipboard} from "react-copy-to-clipboard"
import {AutoCard} from "../../components/AutoCard"

import "./PayloadManager.css"
import {useMemoizedFn} from "ahooks"
import {AutoSpin} from "../../components/AutoSpin"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography
const {Option} = Select

export interface PayloadManagerPageProp {
    readOnly?: boolean
    selectorHandle?: (i: string) => any
}

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

function fuzzTag(i: string) {
    return `{{x(${i})}}`
}

export const PayloadManagerPage: React.FC<PayloadManagerPageProp> = (props) => {
    const [groups, setGroups] = useState<string[]>([])
    const [selected, setSelected] = useState("")
    const [response, setResponse] = useState<QueryGeneralResponse<Payload>>()
    const [params, setParams] = useState<QueryPayloadParams>({
        Keyword: "",
        Group: "",
        Pagination: {Page: 1, Limit: 20, Order: "desc", OrderBy: "updated_at"}
    })
    const [selectedRows, setSelectedRows] = useState<Payload[]>([])
    const [loading, setLoading] = useState(false)
    const rowSelection = {
        selectedRowKeys: selectedRows.map((item) => item.Id),
        onChange: (selectedRowKeys, selectedRows) => setSelectedRows(selectedRows),
        fixed: true
    }
    const pagination: PaginationSchema | undefined = response?.Pagination

    const updateGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: { Groups: string[] }) => {
                setGroups(data.Groups || [])
            })
            .catch((e: any) => {
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
            .catch((e: any) => {
                failed(e?.details || "query payload failed")
            })
    }
    const delDictContent = (id?: number) => {
        let params: any = {}
        if (id !== undefined) params.Id = +id
        else params.Ids = selectedRows.map((item) => +item.Id)

        ipcRenderer
            .invoke("DeletePayloadByContent", params)
            .then(() => {
                setSelectedRows([])
                updateDict()
            })
            .catch((e: any) => {
                failed("batch delete failed")
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
        <div className='payload-manager-page'>
            <PageHeader
                title={"Payload / 字典管理"}
                subTitle={`增加 / 删除 / 管理字典，可以通过 fuzz 模块 {{x(字典名)}} 来渲染`}
            />
            <Row gutter={18} style={{flexGrow: 1}}>
                <Col span={8}>
                    <AutoCard
                        title={"选择 / 查看已有字典"}
                        size={"small"} loading={loading}
                        bordered={false}
                        bodyStyle={{overflow: "auto"}}
                        extra={
                            !props.readOnly && <Form size={"small"} onSubmitCapture={(e) => e.preventDefault()}>
                                <Form.Item style={{marginBottom: 0}} label={" "} colon={false}>
                                    <Button.Group>
                                        <Button
                                            size={"small"}
                                            onClick={() => {
                                                let m = showModal({
                                                    title: "创建新的 Payload 组/字典",
                                                    content: (
                                                        <>
                                                            <CreatePayloadGroup
                                                                onLoading={() => {
                                                                    setLoading(true)
                                                                }}
                                                                onLoadingFinished={() => {
                                                                    setTimeout(() => setLoading(false), 300)
                                                                }}
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
                                        <Button
                                            size={"small"}
                                            onClick={() => {
                                                let m = showModal({
                                                    title: "上传新的 Payload 组/字典",
                                                    content: (
                                                        <>
                                                            <UploadPayloadGroup
                                                                Group={""}
                                                                onFinished={(e) => {
                                                                    info("上传 Payload 字典/组成功")
                                                                    updateGroup()
                                                                    m.destroy()
                                                                }}
                                                            />
                                                        </>
                                                    ),
                                                    width: "60%",
                                                    maskClosable: false
                                                })
                                            }}
                                        >
                                            上传字典
                                        </Button>
                                    </Button.Group>
                                </Form.Item>
                            </Form>
                        }
                    >
                        <List<string>
                            style={{height: 200}}
                            dataSource={groups}
                            renderItem={(element, index) => {
                                return (
                                    <List.Item id={index.toString()}>
                                        <Button.Group style={{width: "100%", textAlign: "left"}}>
                                            <Button
                                                style={{width: "100%", textAlign: "left"}}
                                                type={selected === element ? "primary" : undefined}
                                                onClick={(e) => setSelected(element)}
                                            >
                                                字典分组名：{element}
                                            </Button>
                                            {props.selectorHandle && <Popconfirm title={"确定要使用该字典？"}
                                                                                 onConfirm={() => {
                                                                                     props.selectorHandle && props.selectorHandle(fuzzTag(element))
                                                                                 }}
                                            >
                                                <Button type={"primary"} icon={<ThunderboltFilled/>}/>
                                            </Popconfirm>}
                                            {!props.readOnly && <Popconfirm
                                                title={"确定删除该字典吗？"}
                                                onConfirm={(e) => {
                                                    ipcRenderer
                                                        .invoke("DeletePayloadByGroup", {
                                                            Group: element
                                                        })
                                                        .then(() => {
                                                            updateGroup()
                                                            if (selected === element) {
                                                                setSelected("")
                                                                setResponse(undefined)
                                                            }
                                                        })
                                                        .catch((e: any) => {
                                                            failed("Delete Payload By Group failed")
                                                        })
                                                }}
                                            >
                                                <Button
                                                    danger={true}
                                                    icon={<DeleteOutlined/>}
                                                    type={selected === element ? "primary" : undefined}
                                                />
                                            </Popconfirm>}
                                        </Button.Group>
                                    </List.Item>
                                )
                            }}
                        />
                    </AutoCard>
                </Col>
                <Col span={16}>
                    <AutoCard
                        title={
                            <>
                                <span>字典内容</span>
                                {selectedRows.length > 0 && !props.readOnly && (
                                    <Button size='small' type='link' danger onClick={() => delDictContent()}>
                                        批量删除
                                    </Button>
                                )}
                            </>
                        }
                        size={"small"}
                        bordered={false}
                        bodyStyle={{overflow: "auto", padding: 0}}
                        extra={
                            props.readOnly ?
                                (
                                    !!props.selectorHandle ? <Button size={"small"} type={"primary"} onClick={() => {
                                        props.selectorHandle && props.selectorHandle(`{{x(${selected})}}`)
                                    }}>
                                        选择该Fuzz标签
                                    </Button> : <CopyToClipboard
                                        text={`{{x(${selected})}}`}
                                        onCopy={(text, ok) => {
                                            if (ok) success("已复制到粘贴板")
                                        }}
                                    >
                                        <Button size={"small"}>复制Fuzz标签</Button>
                                    </CopyToClipboard>
                                ) : <Form
                                    size={"small"}
                                    onSubmitCapture={(e) => {
                                        e.preventDefault()

                                        updateDict(1, 20)
                                    }}
                                    layout={"inline"}
                                    style={{marginBottom: 0}}
                                >
                                    <Form.Item style={{marginBottom: 0}}>
                                        {selected && <Tag color={"geekblue"}>{selected}</Tag>}
                                    </Form.Item>
                                    <InputItem
                                        label={"搜索"}
                                        style={{marginBottom: 0}}
                                        setValue={(Keyword) => setParams({...params, Keyword})}
                                        value={params.Keyword}
                                    />
                                    <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                                        <Button.Group>
                                            <Button type='primary' htmlType='submit'>
                                                {" "}
                                                Search{" "}
                                            </Button>
                                            {!!props.selectorHandle ? <Button type={"primary"} onClick={() => {
                                                props.selectorHandle && props.selectorHandle(`{{x(${selected})}}`)
                                            }}>
                                                选择该Fuzz标签
                                            </Button> : <CopyToClipboard
                                                text={`{{x(${selected})}}`}
                                                onCopy={(text, ok) => {
                                                    if (ok) success("已复制到粘贴板")
                                                }}
                                            >
                                                <Button>复制Fuzz标签</Button>
                                            </CopyToClipboard>}
                                        </Button.Group>
                                    </Form.Item>
                                </Form>
                        }
                    >
                        <Table<Payload>
                            style={{height: 200}}
                            bordered={true}
                            size={"small"}
                            rowKey={(row) => row.Id}
                            rowSelection={rowSelection}
                            columns={[
                                {title: "所属字典", render: (e: Payload) => <Tag>{e.Group}</Tag>},
                                {
                                    title: "字典内容",
                                    render: (e: Payload) => (
                                        <Text style={{width: 500}} ellipsis={{tooltip: true}}>
                                            {e.Content}
                                        </Text>
                                    )
                                },
                                {
                                    title: "操作",
                                    fixed: "right",
                                    render: (e: Payload) => (
                                        <Button danger onClick={() => delDictContent(e.Id)}>
                                            删除
                                        </Button>
                                    )
                                }
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
                    </AutoCard>
                </Col>
            </Row>
        </div>
    )
}

export interface CreatePayloadGroupProp {
    Group?: string
    onFinished?: (group: string) => any
    onFinally?: () => any
    onLoading?: () => any
    onLoadingFinished?: () => any
}

export interface SavePayloadParams {
    Group: string
    Content: string
    IsFile: boolean
    Proxy?: string
    FileName?: string[]
}

export const CreatePayloadGroup: React.FC<CreatePayloadGroupProp> = (props) => {
    const [params, setParams] = useState<SavePayloadParams>({
        Group: "",
        Content: "",
        IsFile: false
    })
    const [groups, setGroups] = useState<string[]>([])

    const updateGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: { Groups: string[] }) => {
                setGroups(data.Groups || [])
            })
            .catch((e: any) => {
                failed(e?.details || "call GetAllPayloadGroup failed")
            })
            .finally()
    }
    useEffect(() => {
        updateGroup()
    }, [])

    return (
        <div>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if(params.Content.length > 2097152){
                        failed("字典内容大小过大，请使用上传功能的字典路径上传")
                        return
                    }

                    props.onLoading && props.onLoading()
                    ipcRenderer
                        .invoke("SavePayload", params)
                        .then(() => {
                            props.onFinished && props.onFinished(params.Group)
                        })
                        .catch((e: any) => {
                            failed("创建 Payload 失败 / 字典")
                        })
                        .finally(() => {
                            props.onFinally && props.onFinally()
                            props.onLoadingFinished && props.onLoadingFinished()
                        })
                }}
                wrapperCol={{span: 14}}
                labelCol={{span: 6}}
            >
                <Form.Item label={"字典名/组"} required>
                    <Select
                        mode='tags'
                        allowClear
                        removeIcon={""}
                        value={params.Group ? [params.Group] : []}
                        onChange={(value) => {
                            const str = value.length === 0 ? "" : value.pop() || ""
                            setParams({...params, Group: str})
                        }}
                    >
                        {groups.map((item) => {
                            return <Option key={item} value={item}>{item}</Option>
                        })}
                    </Select>
                </Form.Item>
                <Form.Item label={"字典内容"}>
                    <div style={{height: 300}}>
                        <YakEditor setValue={(Content) => setParams({...params, Content})} value={params.Content}/>
                    </div>
                </Form.Item>
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        创建新的字典
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}

// 可上传文件类型
const FileType = ["text/plain", "text/csv", "application/vnd.ms-excel"]

export const UploadPayloadGroup: React.FC<CreatePayloadGroupProp> = (props) => {
    const [params, setParams] = useState<SavePayloadParams>({
        Group: "",
        Content: "",
        IsFile: false,
        FileName: []
    })
    const [uploadLoading, setUploadLoading] = useState(false)
    const [groups, setGroups] = useState<string[]>([])
    // 防抖
    const routes = useRef<{ path: string, type: string }[]>([])
    const timer = useRef<any>()

    const updateGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: { Groups: string[] }) => {
                setGroups(data.Groups || [])
            })
            .catch((e: any) => {
                failed(e?.details || "call GetAllPayloadGroup failed")
            })
            .finally()
    }
    useEffect(() => {
        updateGroup()
    }, [])

    const fetchContent = useMemoizedFn(async () => {
        setUploadLoading(true)
        let content: string = ''
        for (let item of routes.current) {
            await ipcRenderer.invoke("fetch-file-content", item.path).then((res: string) => {
                let info = res
                if (item.type === "text/csv" || item.type === "application/vnd.ms-excel") {
                    const strs: string[] = res
                        .split("\n")
                        .map((item) => item.split(","))
                        .reduce((a, b) => a.concat(b))
                    const arr: string[] = []
                    for (let str of strs) if (str.replace(/\s+/g, "")) arr.push(str)
                    info = arr.join("\n")
                }
                content = content ? content + '\n' + info : info
            })
        }

        setParams({...params, Content: params.Content ? params.Content + '\n' + content : content})
        routes.current = []
        timer.current = null
        setTimeout(() => setUploadLoading(false), 100)
    })
    const fetchRoute = useMemoizedFn(() => {
        setUploadLoading(true)
        const arr: string[] = routes.current.map(item => item.path)

        setParams({
            ...params,
            IsFile: true,
            FileName: params.FileName?.length !== 0 ? params.FileName?.concat(arr) : arr
        })
        routes.current = []
        timer.current = null
        setTimeout(() => setUploadLoading(false), 100)
    })

    return (
        <div>
            <AutoSpin spinning={uploadLoading}>
                <Form
                    onSubmitCapture={(e) => {
                        e.preventDefault()

                        if(params.Content.length > 2097152){
                            failed("字典内容大小过大，请使用字典路径方式上传")
                            return
                        }

                        setUploadLoading(true)
                        ipcRenderer
                            .invoke("SavePayload", params)
                            .then(() => {
                                setTimeout(() => {
                                    setUploadLoading(false)
                                    props.onFinished && props.onFinished(params.Group)
                                }, 300)
                            })
                            .catch((e: any) => {
                                setTimeout(() => setUploadLoading(false), 100)
                                failed("创建 Payload 失败 / 字典")
                            })
                    }}
                    wrapperCol={{span: 14}}
                    labelCol={{span: 6}}
                >
                    <Form.Item label={"字典名/组"} required>
                        <Select
                            mode='tags'
                            allowClear
                            removeIcon={""}
                            value={params.Group ? [params.Group] : []}
                            onChange={(value) => {
                                const str = value.length === 0 ? "" : value.pop() || ""
                                setParams({...params, Group: str})
                            }}
                        >
                            {groups.map((item) => {
                                return <Option value={item} key={item}>{item}</Option>
                            })}
                        </Select>
                    </Form.Item>
                    <Upload.Dragger
                        className='targets-upload-dragger'
                        accept={FileType.join(",")}
                        multiple={true}
                        maxCount={1}
                        showUploadList={false}
                        disabled={(params.FileName || []).length === 0 ? false : true}
                        beforeUpload={(f: any) => {
                            if (!FileType.includes(f.type)) {
                                failed(`${f.name}非txt或csv文件，请上传txt、csv格式文件！`)
                                return false
                            }
                            routes.current.push({path: f.path, type: f.type})
                            if (timer) {
                                clearTimeout(timer.current)
                                timer.current = null
                            }
                            timer.current = setTimeout(() => fetchContent(), 100)
                            return false
                        }}
                    >
                        <InputItem
                            label={"字典内容"}
                            disable={(params.FileName || []).length === 0 ? false : true}
                            required={(params.FileName || []).length === 0 ? true : false}
                            setValue={(Content) => setParams({...params, Content})}
                            value={params.Content}
                            textarea={true}
                            textareaRow={10}
                            isBubbing={true}
                            help={
                                <div>
                                    可将TXT、CSV文件拖入框内或<span style={{color: "rgb(25,143,255)"}}>点击此处</span>
                                    上传 (<span style={{color: "red"}}>单文件过大的请用下方字典路径上传</span>)
                                </div>
                            }
                        />
                    </Upload.Dragger>
                    <Upload.Dragger
                        className='targets-upload-dragger'
                        accept={FileType.join(",")}
                        multiple={true}
                        maxCount={1}
                        showUploadList={false}
                        disabled={!params.Content ? false : true}
                        beforeUpload={(f: any) => {
                            if (!FileType.includes(f.type)) {
                                failed(`${f.name}非txt或csv文件，请上传txt、csv格式文件！`)
                                return false
                            }
                            routes.current.push({path: f.path, type: f.type})
                            if (timer) {
                                clearTimeout(timer.current)
                                timer.current = null
                            }
                            timer.current = setTimeout(() => fetchRoute(), 100)
                            return false
                        }}
                    >
                        <InputItem
                            label={"字典路径"}
                            disable={!params.Content ? false : true}
                            required={!params.Content ? true : false}
                            setValue={(Content) => {
                                setParams({
                                    ...params,
                                    FileName: Content ? Content.split("\n") : [],
                                    IsFile: Content ? true : false
                                })
                            }}
                            value={params.FileName?.join('\n')}
                            textarea={true}
                            autoSize={{minRows: 1, maxRows: 5}}
                            isBubbing={true}
                            help={
                                <div>
                                    可将TXT、CSV文件拖入框内或<span style={{color: "rgb(25,143,255)"}}>点击此处</span>
                                    上传
                                </div>
                            }
                        />
                    </Upload.Dragger>
                    <Form.Item colon={false} label={" "}>
                        <Button type='primary' htmlType='submit'>
                            创建新的字典
                        </Button>
                    </Form.Item>
                </Form>
            </AutoSpin>
        </div>
    )
}
