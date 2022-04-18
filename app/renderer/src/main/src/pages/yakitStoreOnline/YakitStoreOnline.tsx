import React, {memo, useEffect, useRef, useState} from "react"
import {Row, Col, Input, Button, Pagination, List, Space, Card, Tooltip, Progress, Typography} from "antd"
import {StarOutlined, StarFilled} from "@ant-design/icons"
import {QueryGeneralRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {failed, success} from "../../utils/notification"
import {ItemSelects} from "../../components/baseTemplate/FormItemUtil"
import {YakitPluginInfo} from "./YakitPluginInfo"
import {OfficialYakitLogoIcon} from "../../assets/icons"
import {AutoSpin} from "../../components/AutoSpin"

import "./YakitStoreOnline.css"

const {ipcRenderer} = window.require("electron")
const {Paragraph} = Typography

const PluginType: {text: string; value: string}[] = [
    {text: "全部", value: ""},
    {text: "YAK 插件", value: "yak"},
    {text: "MITM 插件", value: "mitm"},
    {text: "数据包扫描", value: "packet-hack"},
    {text: "端口扫描插件", value: "port-scan"},
    {text: "CODEC插件", value: "codec"},
    {text: "YAML POC", value: "nuclei"}
]

export interface YakitStoreOnlineProp {}
interface SearchPluginOnlineRequest extends QueryGeneralRequest {
    title?: string
    order: string
    type: string
    status: string
}

export const YakitStoreOnline: React.FC<YakitStoreOnlineProp> = (props) => {
    const [isAdmin, setIsAdmin] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams] = useState<SearchPluginOnlineRequest>({
        title: "",
        order: "hot",
        Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
        type: "",
        status: "no"
    })
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 10,
            Page: 1,
            Order: "desc",
            OrderBy: "updated_at"
        },
        Total: 0
    })
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [percent, setPercent] = useState<number>(0)

    const [pluginInfo, setPluginInfo] = useState<YakScript>()

    const search = useMemoizedFn(() => {
        const paramss = {
            IsHistory: false,
            Keyword: params.title,
            Pagination: params.Pagination,
            Type: params.type,
            IsIgnore: false
        }
        console.log(paramss, paramss.Pagination)

        setLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", paramss)
            .then((data) => {
                console.log(data.Data)
                setResponse(data)
            })
            .catch((e: any) => {
                failed("Query Local Yak Script failed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const timer = useRef<any>(null)
    const triggerSearch = useMemoizedFn(() => {
        if (timer.current) {
            clearTimeout(timer.current)
            timer.current = null
        }
        timer.current = setTimeout(() => {
            search()
        }, 400)
    })

    const AddAllPlugin = useMemoizedFn(() => {
        setAddLoading(true)
    })
    const StopAllPlugin = () => {
        setAddLoading(false)
    }

    const addLocalLab = useMemoizedFn((info: YakScript) => {
        success("添加成功")
    })

    const starredPlugin = useMemoizedFn((info: YakScript) => {
        success("星星改变成功")
    })

    useEffect(() => {
        search()
    }, [])

    return !!pluginInfo ? (
        <YakitPluginInfo info={pluginInfo} onBack={() => setPluginInfo(undefined)} />
    ) : (
        <AutoSpin spinning={loading}>
            <div className='plugin-list-container'>
                <div className='list-filter'>
                    <Row>
                        <Col span={18}>
                            <Space>
                                <Input
                                    size='small'
                                    value={params.title}
                                    allowClear
                                    placeholder='搜索商店内插件'
                                    onChange={(e) => {
                                        setParams({...params, title: e.target.value})
                                        triggerSearch()
                                    }}
                                />
                                <div className='filter-opt'>
                                    <span>排序顺序</span>
                                    <ItemSelects
                                        isItem={false}
                                        select={{
                                            size: "small",
                                            style: {width: 100, marginLeft: 3},
                                            data: [
                                                {text: "按热度", value: "hot"},
                                                {text: "按时间", value: "time"}
                                            ],
                                            value: params.order,
                                            setValue: (value) => {
                                                setParams({...params, order: value})
                                                triggerSearch()
                                            }
                                        }}
                                    />
                                </div>
                                <div className='filter-opt'>
                                    <span>插件类型</span>
                                    <ItemSelects
                                        isItem={false}
                                        select={{
                                            size: "small",
                                            style: {width: 120, marginLeft: 3},
                                            data: PluginType,
                                            value: params.type,
                                            setValue: (value) => {
                                                setParams({...params, type: value})
                                                triggerSearch()
                                            }
                                        }}
                                    />
                                </div>
                                {isAdmin && (
                                    <div className='filter-opt'>
                                        <span>审核状态</span>
                                        <ItemSelects
                                            isItem={false}
                                            select={{
                                                size: "small",
                                                style: {width: 120, marginLeft: 3},
                                                data: [
                                                    {text: "全部", value: ""},
                                                    {text: "未审核", value: "no"},
                                                    {text: "审核通过", value: "success"},
                                                    {text: "审核不通过", value: "failed"}
                                                ],
                                                value: params.status,
                                                setValue: (value) => {
                                                    setParams({...params, status: value})
                                                    triggerSearch()
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                                <ItemSelects
                                    isItem={false}
                                    select={{
                                        size: "small",
                                        style: {width: 100},
                                        data: ["true", "false"],
                                        value: isAdmin.toString(),
                                        setValue: (value) => setIsAdmin(value === "true" ? true : false)
                                    }}
                                />
                            </Space>
                        </Col>
                        <Col span={6} style={{textAlign: "right"}}>
                            <Space>
                                {(addLoading || percent !== 0) && (
                                    <div className='filter-opt-progress'>
                                        <Progress
                                            size='small'
                                            status={!addLoading && percent !== 0 ? "exception" : undefined}
                                            percent={percent}
                                        />
                                    </div>
                                )}
                                {addLoading ? (
                                    <Button
                                        className='filter-opt-btn'
                                        size='small'
                                        type='primary'
                                        danger
                                        onClick={StopAllPlugin}
                                    >
                                        停止添加
                                    </Button>
                                ) : (
                                    <Button
                                        className='filter-opt-btn'
                                        size='small'
                                        type='primary'
                                        onClick={AddAllPlugin}
                                    >
                                        全部添加
                                    </Button>
                                )}
                            </Space>
                        </Col>
                    </Row>
                </div>

                <div className='list-body'>
                    <div className='list-content'>
                        <List
                            grid={{gutter: 16, column: 4}}
                            dataSource={response.Data}
                            renderItem={(i: YakScript, index: number) => {
                                let isAnonymous = false
                                if (i.Author === "" || i.Author === "anonymous") {
                                    isAnonymous = true
                                }

                                return (
                                    <List.Item style={{marginLeft: 0}} key={i.Id}>
                                        <PluginListOpt
                                            index={index}
                                            isAdmin={isAdmin}
                                            info={i}
                                            onClick={setPluginInfo}
                                            onDownload={addLocalLab}
                                            onStarred={starredPlugin}
                                        />
                                    </List.Item>
                                )
                            }}
                        ></List>
                    </div>

                    <div className='list-pagination vertical-center'>
                        <Pagination
                            size='small'
                            current={params.Pagination.Page}
                            defaultPageSize={20}
                            showSizeChanger={false}
                            total={response.Total}
                            showTotal={(total) => `总共${total}个插件`}
                            onChange={(page, size) => {
                                setParams({...params, Pagination: {...params.Pagination, Page: page}})
                                setTimeout(() => search(), 300)
                            }}
                        ></Pagination>
                    </div>
                </div>
            </div>
        </AutoSpin>
    )
}

const TagColor: {[key: string]: string} = {
    failed: "plugin-tag-red|审核不通过",
    success: "plugin-tag-green|审核通过",
    not: "plugin-tag-blue|未审核"
}
const RandomTagColor: string[] = [
    "plugin-tag-orange",
    "plugin-tag-purple",
    "plugin-tag-blue",
    "plugin-tag-green",
    "plugin-tag-red"
]

interface PluginListOptProps {
    index: number
    isAdmin: boolean
    info: YakScript
    onClick: (info: YakScript) => any
    onDownload: (info: YakScript) => any
    onStarred: (info: YakScript) => any
}

const PluginListOpt = memo((props: PluginListOptProps) => {
    const {isAdmin, info, onClick, onDownload, onStarred, index} = props
    const Tags: string[] = info.Tags ? info.Tags.split(",") : []
    const tagList = useRef(null)

    const [flag, setFlag] = useState<number>(-1)

    useEffect(() => {
        setTimeout(() => {
            if (tagList && tagList.current) {
                const body = tagList.current as unknown as HTMLDivElement
                const arr: number[] = []
                for (let i = 0; i < body.childNodes.length; i++) arr.push((body.childNodes[i] as any).offsetWidth)

                let flagIndex = 0
                let sum = 0
                const width = body.offsetWidth
                for (let id in arr) {
                    sum += arr[id] + 5
                    if (sum >= width) break
                    flagIndex = +id
                }
                if (flagIndex !== flag) setFlag(flagIndex)
            }
        }, 50)
    }, [])

    return (
        <Card
            size={"small"}
            className='plugin-list-opt'
            bordered={false}
            bodyStyle={{padding: 0, border: "1px solid #EFF1F5", borderRadius: "4px"}}
            onClick={() => onClick(info)}
        >
            <div className='opt-info'>
                <div className='info-title'>
                    <div className='title-text'>
                        <span
                            style={{maxWidth: isAdmin ? "60%" : "80%"}}
                            className='text-style content-ellipsis'
                            title={info.ScriptName}
                        >
                            {info.ScriptName}
                        </span>
                        <div className='text-icon vertical-center'>
                            {isAdmin ? (
                                <div
                                    className={`text-icon-admin ${
                                        TagColor[["failed", "success", "not"][index % 3]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["failed", "success", "not"][index % 3]].split("|")[1]}
                                </div>
                            ) : (
                                index % 7 === 4 && (
                                    // @ts-ignore
                                    <OfficialYakitLogoIcon className='text-icon-style' />
                                )
                            )}
                        </div>
                    </div>

                    <div className='vertical-center'>
                        <Tooltip title={"添加到插件仓库"}>
                            <Button
                                className='title-add'
                                type='link'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDownload(info)
                                }}
                            >
                                添加
                            </Button>
                        </Tooltip>
                    </div>
                </div>

                <div className='info-content'>
                    <Paragraph className='content-style' ellipsis={{tooltip: true}}>
                        {info.Help}
                    </Paragraph>
                </div>

                <div ref={tagList} className='info-tag'>
                    {Tags.length !== 0 ? (
                        Tags.map((item, index) => {
                            const tagClass = RandomTagColor[parseInt(`${Math.random() * 5}`)]
                            if (flag !== -1 && index > flag) return ""
                            return (
                                <div key={`${info.Id}-${item}`} className={`tag-text ${tagClass}`}>
                                    {item}
                                </div>
                            )
                        })
                    ) : (
                        <div className='tag-empty'></div>
                    )}
                </div>
            </div>

            <div className='opt-author horizontal-divide-aside' onClick={(e) => e.stopPropagation()}>
                <div className='author-left'>
                    <div className='left-pic vertical-center'>
                        <img
                            src='https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg'
                            className='left-pic-style'
                        />
                    </div>
                    <div className='left-name vertical-center'>
                        <span className='left-name-style content-ellipsis' title={info.Author || "anonymous"}>
                            {info.Author || "anonymous"}
                        </span>
                    </div>
                </div>

                <div className='author-right'>
                    <div className='vertical-center' onClick={(e) => onStarred(info)}>
                        {index % 5 === 4 ? (
                            <StarFilled className='solid-star' />
                        ) : (
                            <StarOutlined className='empty-star' />
                        )}
                    </div>
                    <div className='vertical-center'>{index * 7 + 3}</div>
                </div>
            </div>
        </Card>
    )
})
