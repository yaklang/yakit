import React, {useEffect, useRef, useState} from "react"
import {Button, Col, Form, List, PageHeader, Popconfirm, Row, Table, Tag, Upload, Typography, Select, Space} from "antd"
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
import {randomString} from "@/utils/randomUtil";

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
                title={"Payload / ????????????"}
                subTitle={`?????? / ?????? / ??????????????????????????? fuzz ?????? {{x(?????????)}} ?????????`}
            />
            <Row gutter={18} style={{flexGrow: 1}}>
                <Col span={8}>
                    <AutoCard
                        title={"?????? / ??????????????????"}
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
                                                    title: "???????????? Payload ???/??????",
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
                                                                    info("??????/?????? Payload ??????/?????????")
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
                                            ?????? / ????????????
                                        </Button>
                                        <Button
                                            size={"small"}
                                            onClick={() => {
                                                let m = showModal({
                                                    title: "???????????? Payload ???/??????",
                                                    content: (
                                                        <>
                                                            <UploadPayloadGroup
                                                                Group={""}
                                                                onFinished={(e) => {
                                                                    info("?????? Payload ??????/?????????")
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
                                            ????????????
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
                                                ??????????????????{element}
                                            </Button>
                                            {props.selectorHandle && <Popconfirm title={"???????????????????????????"}
                                                                                 onConfirm={() => {
                                                                                     props.selectorHandle && props.selectorHandle(fuzzTag(element))
                                                                                 }}
                                            >
                                                <Button type={"primary"} icon={<ThunderboltFilled/>}/>
                                            </Popconfirm>}
                                            {!props.readOnly && <Popconfirm
                                                title={"???????????????????????????"}
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
                                <span>????????????</span>
                                {selectedRows.length > 0 && !props.readOnly && (
                                    <Button size='small' type='link' danger onClick={() => delDictContent()}>
                                        ????????????
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
                                        ?????????Fuzz??????
                                    </Button> : <CopyToClipboard
                                        text={`{{x(${selected})}}`}
                                        onCopy={(text, ok) => {
                                            if (ok) success("?????????????????????")
                                        }}
                                    >
                                        <Button size={"small"}>??????Fuzz??????</Button>
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
                                        label={"??????"}
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
                                                ?????????Fuzz??????
                                            </Button> : <CopyToClipboard
                                                text={`{{x(${selected})}}`}
                                                onCopy={(text, ok) => {
                                                    if (ok) success("?????????????????????")
                                                }}
                                            >
                                                <Button>??????Fuzz??????</Button>
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
                                {title: "????????????", render: (e: Payload) => <Tag>{e.Group}</Tag>},
                                {
                                    title: "????????????",
                                    render: (e: Payload) => (
                                        <Text style={{width: 500}} ellipsis={{tooltip: true}}>
                                            {e.Content}
                                        </Text>
                                    )
                                },
                                {
                                    title: "??????",
                                    fixed: "right",
                                    render: (e: Payload) => (
                                        <Button danger onClick={() => delDictContent(e.Id)} size={"small"}>
                                            ??????{" "}
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
                                showTotal: (i) => <Tag>???{i}???????????????</Tag>
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
    const [token, setToken] = useState("");

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

    useEffect(() => {
        const token = randomString(40);
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`??????????????????:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("??????????????????")
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
                        failed("???????????????????????????????????????????????????????????????")
                        return
                    }


                    if (!!token) {
                        ipcRenderer.invoke("SavePayloadStream", {...params}, token).then(e => {
                            info("??????????????????")
                        })
                    } else {
                        props.onLoading && props.onLoading()
                        ipcRenderer
                            .invoke("SavePayload", params)
                            .then(() => {
                                props.onFinished && props.onFinished(params.Group)
                            })
                            .catch((e: any) => {
                                failed("?????? Payload ?????? / ??????")
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
                <Form.Item label={"?????????/???"} required>
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
                <Form.Item label={"????????????"}>
                    <div style={{height: 300}}>
                        <YakEditor setValue={(Content) => setParams({...params, Content})} value={params.Content}/>
                    </div>
                </Form.Item>
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        ??????????????????
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}

// ?????????????????????
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
    // ??????
    const routes = useRef<{ path: string, type: string }[]>([])
    const [token, setToken] = useState("");
    const timer = useRef<any>()
    const [progress, setProgress] = useState<SavePayloadProgress>();

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

    useEffect(() => {
        const token = randomString(40);
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {
            setProgress(data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`??????????????????:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("??????????????????")
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
            <AutoSpin spinning={uploadLoading} tip={<div>
                {progress && <Space direction={"vertical"}>
                    <div>?????????{((progress?.Progress || 0) * 100).toFixed(4)} %</div>
                    <div>??????????????????{progress.HandledBytesVerbose}</div>
                    <div>??????????????????{progress.TotalBytesVerbose}</div>
                    <div>?????????{progress.CostDurationVerbose}</div>
                </Space>}
            </div>}>
                <Form
                    onSubmitCapture={(e) => {
                        e.preventDefault()

                        if (params.Content.length > 2097152) {
                            failed("??????????????????????????????????????????????????????")
                            return
                        }

                        if (!!token) {
                            setUploadLoading(true)
                            ipcRenderer.invoke("SavePayloadStream", {...params}, token).then(e => {
                                info("??????????????????")
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
                                    failed("?????? Payload ?????? / ??????")
                                })
                        }
                    }}
                    wrapperCol={{span: 14}}
                    labelCol={{span: 6}}
                >
                    <Form.Item label={"?????????/???"} required>
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
                                failed(`${f.name}???txt???csv??????????????????txt???csv???????????????`)
                                return false
                            }
                            if (f.size > (2 * 1024 * 1024)) {
                                failed(`??????????????????????????????????????????????????????`)
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
                            label={"????????????"}
                            disable={(params.FileName || []).length === 0 ? false : true}
                            required={(params.FileName || []).length === 0 ? true : false}
                            setValue={(Content) => setParams({...params, Content})}
                            value={params.Content}
                            textarea={true}
                            textareaRow={10}
                            isBubbing={true}
                            help={
                                <div>
                                    ??????TXT???CSV?????????????????????<span style={{color: "rgb(25,143,255)"}}>????????????</span>
                                    ?????? (<span style={{color: "red"}}>????????????????????????????????????????????????</span>)
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
                                failed(`${f.name}???txt???csv??????????????????txt???csv???????????????`)
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
                            label={"????????????"}
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
                                    ??????TXT???CSV?????????????????????<span style={{color: "rgb(25,143,255)"}}>????????????</span>
                                    ??????
                                </div>
                            }
                        />
                    </Upload.Dragger>
                    <Form.Item colon={false} label={" "}>
                        <Button type='primary' htmlType='submit'>
                            ??????????????????
                        </Button>
                    </Form.Item>
                </Form>
            </AutoSpin>
        </div>
    )
}
