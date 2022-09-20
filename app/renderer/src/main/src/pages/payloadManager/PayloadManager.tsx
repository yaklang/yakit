import React, {useEffect, useRef, useState} from "react"
import {
    Button,
    Col,
    Form,
    List,
    PageHeader,
    Popconfirm,
    Row,
    Table,
    Tag,
    Upload,
    Typography,
    Select,
    Space,
    Input
} from "antd"
import {DeleteOutlined, EditOutlined, ThunderboltFilled} from "@ant-design/icons"
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
import {randomString} from "@/utils/randomUtil"
import {UploadIcon} from "@/assets/icons"

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

interface UpdatePayloadRequest {
    OldGroup: string
    Group: string
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
    const [updateItem, setUpdateItem] = useState<UpdatePayloadRequest>({
        OldGroup: "",
        Group: ""
    })
    const [codePath, setCodePath] = useState<string>("")
    const pagination: PaginationSchema | undefined = response?.Pagination

    const updateGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: {Groups: string[]}) => {
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

    useEffect(() => {
        ipcRenderer.invoke("fetch-code-path").then((path: string) => {
            ipcRenderer
                .invoke("is-exists-file", path)
                .then(() => {
                    setCodePath("")
                })
                .catch(() => {
                    setCodePath(path)
                })
        })
    }, [])
    const onUpdatePayload = useMemoizedFn(() => {
        if (updateItem.OldGroup === updateItem.Group) {
            setUpdateItem({
                OldGroup: "",
                Group: ""
            })
            return
        }
        ipcRenderer
            .invoke("UpdatePayload", updateItem)
            .then(() => {
                updateGroup()
                setUpdateItem({
                    OldGroup: "",
                    Group: ""
                })
                success("修改成功")
            })
            .catch((e: any) => {
                failed("更新失败：" + e)
            })
    })

    const onDownload = useMemoizedFn((name: string) => {
        ipcRenderer
            .invoke("GetAllPayload", {Group: name})
            .then((res) => {
                const data = res?.Data.map((ele) => ele.Content).join("\r\n")
                const time = new Date().valueOf()
                const path = `${codePath}${codePath ? "/" : ""}${name}(${time}).txt`
                ipcRenderer.invoke("show-save-dialog", path).then((res) => {
                    if (res.canceled) return
                    const name = res.name
                    ipcRenderer
                        .invoke("write-file", {
                            route: res.filePath,
                            data
                        })
                        .then(() => {
                            success(`【${name}】下载成功`)
                        })
                        .catch((e) => {
                            failed(`【${name}】下载失败:` + e)
                        })
                })
            })
            .catch((e) => {
                failed(`获取【${name}】全部内容失败` + e)
            })
    })

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
                        size={"small"}
                        loading={loading}
                        bordered={false}
                        bodyStyle={{overflow: "auto"}}
                        extra={
                            !props.readOnly && (
                                <Form size={"small"} onSubmitCapture={(e) => e.preventDefault()}>
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
                            )
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
                                                type={selected === element ? "primary" : "default"}
                                                onClick={(e: any) => {
                                                    if (e.target.nodeName === "INPUT") return
                                                    setSelected(element)
                                                }}
                                                ghost={selected === element}
                                            >
                                                字典分组名：
                                                {(updateItem.OldGroup === element && (
                                                    <Input
                                                        size='small'
                                                        value={updateItem.Group}
                                                        onChange={(e) => {
                                                            setUpdateItem({...updateItem, Group: e.target.value})
                                                        }}
                                                        onPressEnter={onUpdatePayload}
                                                        onBlur={onUpdatePayload}
                                                        style={{width: "70%"}}
                                                    />
                                                )) ||
                                                    element}
                                            </Button>
                                            <Button
                                                type={selected === element ? "primary" : undefined}
                                                icon={<EditOutlined />}
                                                onClick={(e) => {
                                                    if (!updateItem.OldGroup) {
                                                        setUpdateItem({
                                                            OldGroup: element,
                                                            Group: element
                                                        })
                                                    } else {
                                                        setUpdateItem({
                                                            OldGroup: "",
                                                            Group: ""
                                                        })
                                                    }
                                                }}
                                            />

                                            <Button
                                                type={selected === element ? "primary" : undefined}
                                                icon={<UploadIcon />}
                                                onClick={() => onDownload(element)}
                                            />
                                            {props.selectorHandle && (
                                                <Popconfirm
                                                    title={"确定要使用该字典？"}
                                                    onConfirm={() => {
                                                        props.selectorHandle && props.selectorHandle(fuzzTag(element))
                                                    }}
                                                >
                                                    <Button type={"primary"} icon={<ThunderboltFilled />} />
                                                </Popconfirm>
                                            )}
                                            {!props.readOnly && (
                                                <Popconfirm
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
                                                        icon={<DeleteOutlined />}
                                                        type={selected === element ? "primary" : undefined}
                                                    />
                                                </Popconfirm>
                                            )}
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
                            props.readOnly ? (
                                !!props.selectorHandle ? (
                                    <Button
                                        size={"small"}
                                        type={"primary"}
                                        onClick={() => {
                                            props.selectorHandle && props.selectorHandle(`{{x(${selected})}}`)
                                        }}
                                    >
                                        选择该Fuzz标签
                                    </Button>
                                ) : (
                                    <CopyToClipboard
                                        text={`{{x(${selected})}}`}
                                        onCopy={(text, ok) => {
                                            if (ok) success("已复制到粘贴板")
                                        }}
                                    >
                                        <Button size={"small"}>复制Fuzz标签</Button>
                                    </CopyToClipboard>
                                )
                            ) : (
                                <Form
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
                                            {!!props.selectorHandle ? (
                                                <Button
                                                    type={"primary"}
                                                    onClick={() => {
                                                        props.selectorHandle &&
                                                            props.selectorHandle(`{{x(${selected})}}`)
                                                    }}
                                                >
                                                    选择该Fuzz标签
                                                </Button>
                                            ) : (
                                                <CopyToClipboard
                                                    text={`{{x(${selected})}}`}
                                                    onCopy={(text, ok) => {
                                                        if (ok) success("已复制到粘贴板")
                                                    }}
                                                >
                                                    <Button>复制Fuzz标签</Button>
                                                </CopyToClipboard>
                                            )}
                                        </Button.Group>
                                    </Form.Item>
                                </Form>
                            )
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
                                        <Button danger onClick={() => delDictContent(e.Id)} size={"small"}>
                                            删除{" "}
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
    const [token, setToken] = useState("")

    const updateGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: {Groups: string[]}) => {
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

    useEffect(() => {
        const token = randomString(40)
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {})
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`字典上传失败:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("字典上传完毕")
        })
        setToken(token)
        return () => {
            ipcRenderer.invoke("cancel-SavePayloadStream", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    return (
        <div>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (params.Content.length > 2097152) {
                        failed("字典内容过大，请使用上传功能的字典路径上传")
                        return
                    }

                    if (!!token) {
                        ipcRenderer.invoke("SavePayloadStream", {...params}, token).then((e) => {
                            info("开始上传字典")
                        })
                    } else {
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
                    }
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
                            return (
                                <Option key={item} value={item}>
                                    {item}
                                </Option>
                            )
                        })}
                    </Select>
                </Form.Item>
                <Form.Item label={"字典内容"}>
                    <div style={{height: 300}}>
                        <YakEditor setValue={(Content) => setParams({...params, Content})} value={params.Content} />
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

interface SavePayloadProgress {
    Progress: number
    CostDurationVerbose: string
    HandledBytesVerbose: string
    TotalBytesVerbose: string
}

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
    const routes = useRef<{path: string; type: string}[]>([])
    const [token, setToken] = useState("")
    const timer = useRef<any>()
    const [progress, setProgress] = useState<SavePayloadProgress>()

    const updateGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: {Groups: string[]}) => {
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

    useEffect(() => {
        const token = randomString(40)
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {
            setProgress(data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`字典上传失败:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("字典上传完毕")
            setTimeout(() => {
                setUploadLoading(false)
            }, 200)
        })
        setToken(token)
        return () => {
            ipcRenderer.invoke("cancel-SavePayloadStream", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const fetchContent = useMemoizedFn(async () => {
        setUploadLoading(true)
        let content: string = ""
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
                content = content ? content + "\n" + info : info
            })
        }

        setParams({...params, Content: params.Content ? params.Content + "\n" + content : content})
        routes.current = []
        timer.current = null
        setTimeout(() => setUploadLoading(false), 100)
    })
    const fetchRoute = useMemoizedFn(() => {
        setUploadLoading(true)
        const arr: string[] = routes.current.map((item) => item.path)

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
            <AutoSpin
                spinning={uploadLoading}
                tip={
                    <div>
                        {progress && (
                            <Space direction={"vertical"}>
                                <div>进度：{((progress?.Progress || 0) * 100).toFixed(4)} %</div>
                                <div>已处理大小：{progress.HandledBytesVerbose}</div>
                                <div>文件总大小：{progress.TotalBytesVerbose}</div>
                                <div>耗时：{progress.CostDurationVerbose}</div>
                            </Space>
                        )}
                    </div>
                }
            >
                <Form
                    onSubmitCapture={(e) => {
                        e.preventDefault()

                        if (params.Content.length > 2097152) {
                            failed("字典内容过大，请使用字典路径方式上传")
                            return
                        }

                        if (!!token) {
                            setUploadLoading(true)
                            ipcRenderer.invoke("SavePayloadStream", {...params}, token).then((e) => {
                                info("开始上传字典")
                            })
                        } else {
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
                        }
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
                                return (
                                    <Option value={item} key={item}>
                                        {item}
                                    </Option>
                                )
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
                            if (f.size > 2 * 1024 * 1024) {
                                failed(`字典文件过大，请使用字典路径方式上传`)
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
                            value={params.FileName?.join("\n")}
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
