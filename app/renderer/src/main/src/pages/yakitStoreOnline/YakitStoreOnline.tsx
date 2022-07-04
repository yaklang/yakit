import React, {memo, useEffect, useRef, useState} from "react"
import {Row, Col, Input, Button, Pagination, List, Space, Card, Tooltip, Progress} from "antd"
import {StarOutlined, StarFilled, LoadingOutlined} from "@ant-design/icons"
import {useDebounce, useGetState, useMemoizedFn} from "ahooks"
import {failed, warn, success, info} from "../../utils/notification"
import {ItemSelects} from "../../components/baseTemplate/FormItemUtil"
import {YakitPluginInfo} from "./YakitPluginInfo"
import {OfficialYakitLogoIcon} from "../../assets/icons"
import {AutoSpin} from "../../components/AutoSpin"
import {useStore} from "@/store"
import numeral from "numeral"

import "./YakitStoreOnline.scss"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {randomString} from "@/utils/randomUtil"
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream"

const {ipcRenderer} = window.require("electron")
const {Search} = Input

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
interface SearchPluginOnlineRequest {
    keywords: string
    status: number | null
    type: string
    order_by: string
    order?: string
    page?: number
    limit?: number
}

export interface StarsOperation {
    id: number
    operation: string
}

export interface DownloadOnlinePluginProps {
    OnlineID: number
}

interface DownloadOnlinePluginAllResProps {
    Progress: number
    Log: string
}

export const YakitStoreOnline: React.FC<YakitStoreOnlineProp> = (props) => {
    const [isAdmin, setIsAdmin] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)
    const [taskToken, setTaskToken] = useState(randomString(40))
    const [params, setParams] = useState<SearchPluginOnlineRequest>({
        keywords: "",
        order_by: "stars",
        order: "desc",
        type: "",
        page: 1,
        limit: 12,
        status: null
    })
    const [response, setResponse] = useState<API.YakitPluginListResponse>({
        data: [],
        pagemeta: {
            limit: 12,
            page: 1,
            total: 0,
            total_page: 1
        }
    })
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)

    const [pluginInfo, setPluginInfo] = useState<API.YakitPluginDetail>()
    const [index, setIndex] = useState<number>(-1)

    // 全局登录状态
    const {userInfo} = useStore()

    const search = useMemoizedFn(() => {
        let url = "yakit/plugin/unlogged"
        if (userInfo.isLogin) {
            url = "yakit/plugin"
        }
        setLoading(true)
        NetWorkApi<SearchPluginOnlineRequest, API.YakitPluginListResponse>({
            method: "get",
            url,
            params
        })
            .then((res) => {
                setResponse(res)
            })
            .catch((err) => {
                failed("插件列表获取失败:" + err)
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
    const [percent, setPercent, getPercent] = useGetState<number>(0)
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = data.Progress * 100
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            console.log("完", getPercent())
            setTimeout(() => {
                setAddLoading(false)
                setPercent(0)
            }, 500)
            success("全部添加成功")
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            failed("全部添加失败")
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        setAddLoading(true)
        ipcRenderer.invoke("DownloadOnlinePluginAll", {}, taskToken).catch((e) => {
            failed(`添加失败:${e}`)
        })
    })
    const StopAllPlugin = () => {
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePluginAll", taskToken).catch((e) => {
            failed(`停止添加失败:${e}`)
        })
    }

    const addLocalLab = useMemoizedFn((info: API.YakitPluginDetail, callback) => {
        if (!userInfo.isLogin) {
            warn("请先登录")
            return
        }
        ipcRenderer
            .invoke("DownloadOnlinePluginById", {
                OnlineID: info.id
            } as DownloadOnlinePluginProps)
            .then(() => {
                success("添加成功")
            })
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
            .finally(() => {
                if (callback) callback()
            })
    })

    const starredPlugin = useMemoizedFn((info: API.YakitPluginDetail) => {
        if (!userInfo.isLogin) {
            warn("请先登录")
            return
        }
        const prams: StarsOperation = {
            id: info?.id,
            operation: info.is_stars ? "remove" : "add"
        }
        NetWorkApi<StarsOperation, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/stars",
            params: prams
        })
            .then((res) => {
                if (!res.ok) return
                const index: number = response.data.findIndex((ele: API.YakitPluginDetail) => ele.id === info.id)
                if (index !== -1) {
                    if (info.is_stars) {
                        response.data[index].stars -= 1
                        response.data[index].is_stars = false
                    } else {
                        response.data[index].stars += 1
                        response.data[index].is_stars = true
                    }
                    setResponse({
                        ...response,
                        data: [...response.data]
                    })
                }
            })
            .catch((err) => {
                failed("点星:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    useEffect(() => {
        search()
    }, [userInfo.isLogin])

    useEffect(() => {
        setIsAdmin(userInfo.role === "admin")
    }, [userInfo.role])

    return !!pluginInfo ? (
        <YakitPluginInfo
            info={pluginInfo}
            index={index}
            isAdmin={isAdmin}
            onBack={() => {
                setPluginInfo(undefined)
                search()
            }}
            isLogin={userInfo.isLogin}
        />
    ) : (
        <AutoSpin spinning={loading}>
            <div className='plugin-list-container'>
                <div className={`grid-container  ${(!isAdmin || !userInfo.isLogin) && "grid-container-admin "}`}>
                    <div className='grid-item'>
                        <Search
                            placeholder='搜索商店内插件'
                            allowClear
                            size='small'
                            onSearch={triggerSearch}
                            value={params.keywords}
                            onChange={(e) => {
                                setParams({...params, keywords: e.target.value})
                                triggerSearch()
                            }}
                        />
                    </div>
                    <div className='grid-item'>
                        <span className='grid-text'>排序顺序</span>
                        <ItemSelects
                            isItem={false}
                            select={{
                                size: "small",
                                data: [
                                    {text: "按热度", value: "stars"},
                                    {text: "按时间", value: "created_at"}
                                ],
                                value: params.order_by,
                                setValue: (value) => {
                                    setParams({...params, order_by: value})
                                    triggerSearch()
                                }
                            }}
                        />
                    </div>
                    <div className='grid-item'>
                        <span className='grid-text'>插件类型</span>
                        <ItemSelects
                            isItem={false}
                            select={{
                                size: "small",
                                style: {width: 120},
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
                        <div className='grid-item'>
                            <span className='grid-text'>审核状态</span>
                            <ItemSelects
                                isItem={false}
                                select={{
                                    size: "small",
                                    style: {width: 150},
                                    data: [
                                        {text: "全部", value: "all"},
                                        {text: "待审核", value: "0"},
                                        {text: "审核通过", value: "1"},
                                        {text: "审核不通过", value: "2"}
                                    ], // 避免重复key
                                    value: params.status === null ? "all" : params.status.toString(),
                                    setValue: (value) => {
                                        setParams({
                                            ...params,
                                            status: value === "all" ? null : Number(value)
                                        })
                                        triggerSearch()
                                    }
                                }}
                            />
                        </div>
                    )}
                    <div className='grid-item btn'>
                        {(addLoading || getPercent() !== 0) && (
                            <div className='filter-opt-progress'>
                                <Progress
                                    size='small'
                                    status={!addLoading && getPercent() !== 0 ? "exception" : undefined}
                                    percent={getPercent()}
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
                            <Button className='filter-opt-btn' size='small' type='primary' onClick={AddAllPlugin}>
                                全部添加
                            </Button>
                        )}
                    </div>
                </div>

                <div className='list-body'>
                    <div className='list-content'>
                        <List<API.YakitPluginDetail>
                            grid={{gutter: 16, column: 4}}
                            dataSource={response.data || []}
                            renderItem={(i: API.YakitPluginDetail, index: number) => {
                                return (
                                    <List.Item style={{marginLeft: 0}} key={i.id}>
                                        <PluginListOpt
                                            index={index}
                                            isAdmin={isAdmin}
                                            info={i}
                                            onClick={(info) => {
                                                setPluginInfo(info)
                                                setIndex(index)
                                            }}
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
                            current={response?.pagemeta?.page || 1}
                            defaultPageSize={12}
                            showSizeChanger={false}
                            total={response?.pagemeta?.total || 0}
                            showTotal={(total) => `总共${total}个插件`}
                            onChange={(page, size) => {
                                setParams({...params, page})
                                setTimeout(() => search(), 300)
                            }}
                        ></Pagination>
                    </div>
                </div>
            </div>
        </AutoSpin>
    )
}

export const TagColor: {[key: string]: string} = {
    failed: "color-bgColor-red|审核不通过",
    success: "color-bgColor-green|审核通过",
    not: "color-bgColor-blue|待审核"
}
export const RandomTagColor: string[] = [
    "color-bgColor-orange",
    "color-bgColor-purple",
    "color-bgColor-blue",
    "color-bgColor-green",
    "color-bgColor-red"
]

interface PluginListOptProps {
    index: number
    isAdmin: boolean
    info: API.YakitPluginDetail
    onClick: (info: API.YakitPluginDetail) => any
    onDownload: (info: API.YakitPluginDetail, callback) => any
    onStarred: (info: API.YakitPluginDetail) => any
}

const PluginListOpt = memo((props: PluginListOptProps) => {
    const [loading, setLoading] = useState<boolean>(false)
    const {isAdmin, info, onClick, onDownload, onStarred, index} = props
    const tags: string[] = info.tags ? JSON.parse(info.tags) : []
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
    const add = useMemoizedFn(async () => {
        setLoading(true)
        onDownload(info, () => {
            setLoading(false)
        })
    })
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
                            title={info.script_name}
                        >
                            {info.script_name}
                        </span>
                        <div className='text-icon vertical-center'>
                            {isAdmin ? (
                                <div
                                    className={`text-icon-admin ${
                                        TagColor[["not", "success", "failed"][info.status]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["not", "success", "failed"][info.status]].split("|")[1]}
                                </div>
                            ) : (
                                info.official && (
                                    // @ts-ignore
                                    <OfficialYakitLogoIcon className='text-icon-style' />
                                )
                            )}
                        </div>
                    </div>

                    <div className='vertical-center'>
                        {(loading && <LoadingOutlined />) || (
                            <Tooltip title={"添加到插件仓库"}>
                                <Button
                                    className='title-add'
                                    type='link'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        add()
                                    }}
                                >
                                    添加
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </div>

                <div className='info-content'>
                    <div className='content-style content-ellipsis' title={info.content}>
                        {info.content}
                    </div>
                </div>

                <div ref={tagList} className='info-tag'>
                    {tags.length !== 0 ? (
                        tags.map((item, index) => {
                            const tagClass = RandomTagColor[index]
                            if (flag !== -1 && index > flag) return ""
                            return (
                                (item && (
                                    <div key={`${info.id}-${item}`} className={`tag-text ${tagClass}`}>
                                        {item}
                                    </div>
                                )) || <div className='tag-empty'></div>
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
                        <img src={info.head_img} className='left-pic-style' />
                    </div>
                    <div className='left-name vertical-center'>
                        <span className='left-name-style content-ellipsis' title={info.authors || "anonymous"}>
                            {info.authors || "anonymous"}
                        </span>
                    </div>
                </div>

                <div className='author-right hover-active'>
                    <div className='vertical-center ' onClick={(e) => onStarred(info)}>
                        {info.is_stars ? (
                            <StarFilled className='solid-star' />
                        ) : (
                            <StarOutlined className='empty-star hover-active' />
                        )}
                    </div>
                    <div
                        className={`stars-number vertical-center hover-active ${
                            info.is_stars && "stars-number-active"
                        }`}
                    >
                        {numeral(info.stars).format("0,0")}
                    </div>
                </div>
            </div>
        </Card>
    )
})
