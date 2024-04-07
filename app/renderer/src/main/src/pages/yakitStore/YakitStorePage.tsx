import React, {useEffect, useState, useRef, ReactNode} from "react"
import {Tooltip, Spin, Modal} from "antd"
import {GithubOutlined, UploadOutlined, LoadingOutlined, LockOutlined, InfoCircleOutlined} from "@ant-design/icons"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {failed} from "../../utils/notification"
import {CopyableField} from "../../utils/inputUtil"
import {formatDate} from "../../utils/timeUtil"
import {UserInfoProps, useStore} from "@/store"
import "./YakitStorePage.scss"
import {useCreation, useMemoizedFn} from "ahooks"
import {SelectIcon, OnlineCloudIcon} from "../../assets/icons"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {setTimeout} from "timers"
import {SyncCloudButton} from "@/components/SyncCloudButton/SyncCloudButton"
import {getRemoteValue} from "@/utils/kv"
import {ShareIcon} from "@/assets/newIcon"

const {ipcRenderer} = window.require("electron")

export interface GetYakScriptByOnlineIDRequest {
    OnlineID?: number
    UUID: string
}

export interface YakModuleListProp {
    onClicked: (y?: YakScript, i?: number) => any
    currentScript?: YakScript
    itemHeight: number
    isRef?: boolean
    onYakScriptRender?: (i: YakScript, maxWidth?: number) => any
    setTotal?: (n: number) => void
    queryLocal?: QueryYakScriptRequest
    refresh?: boolean
    deletePluginRecordLocal?: YakScript
    updatePluginRecordLocal?: YakScript
    trigger?: boolean
    isSelectAll?: boolean
    setIsSelectAll?: (s: boolean) => void
    selectedRowKeysRecord?: YakScript[]
    onSelectList?: (m: YakScript[]) => void
    setUpdatePluginRecordLocal?: (y: YakScript) => any
    numberLocalRoll?: number
    isGridLayout?: boolean
    // searchKeyword?: string
    tag?: string[]
    onSetUser?: (u: PluginUserInfoLocalProps) => void
    setIsRequest?: (s: boolean) => void
    emptyNode?: ReactNode
    targetRef?: React.RefObject<any>
}
/**@description 目前MITM在使用 */
export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    const defaultQuery = useCreation(() => {
        return {
            Tag: [],
            Type: "mitm,port-scan",
            Keyword: "",
            Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
        }
    }, [])
    const {
        deletePluginRecordLocal,
        itemHeight,
        queryLocal = defaultQuery,
        updatePluginRecordLocal,
        isSelectAll,
        selectedRowKeysRecord,
        onSelectList,
        setUpdatePluginRecordLocal,
        numberLocalRoll,
        isGridLayout,
        setIsSelectAll,
        onSetUser,
        setIsRequest,
        emptyNode,
        targetRef
    } = props

    // 全局登录状态
    const {userInfo} = useStore()
    const [params, setParams] = useState<QueryYakScriptRequest>({
        ...queryLocal
    })
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 20,
            Page: 0,
            Order: "desc",
            OrderBy: "updated_at"
        },
        Total: 0
    })
    const [maxWidth, setMaxWidth] = useState<number>(260)
    const [loading, setLoading] = useState(false)
    const [listBodyLoading, setListBodyLoading] = useState(false)
    const [recalculation, setRecalculation] = useState(false)
    const numberLocal = useRef<number>(0) // 本地 选择的插件index
    const [baseUrl, setBaseUrl] = useState<string>("") // 获取私有域
    useEffect(() => {
        if (isSelectAll) {
            if (onSelectList) onSelectList(response.Data)
        }
    }, [isSelectAll])

    useEffect(() => {
        getRemoteValue("httpSetting").then((setting) => {
            const values = JSON.parse(setting)
            const baseUrl: string = values.BaseUrl
            setBaseUrl(baseUrl)
        })
    }, [])
    useEffect(() => {
        if (!updatePluginRecordLocal) return
        // 列表中第一次上传的时候,本地返回的数据有OnlineId ,但是列表中的上传的那个没有OnlineId
        // 且列表中的本地Id和更新的那个Id不一样
        // 所有以本地ScriptName进行查找 ,ScriptName在本地和线上都是唯一的
        let index = response.Data.findIndex((ele) => ele.ScriptName === updatePluginRecordLocal.ScriptName)
        if (index === -1) return
        response.Data[index] = {...updatePluginRecordLocal}
        setResponse({
            ...response,
            Data: [...response.Data]
        })
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
    }, [updatePluginRecordLocal])
    const update = (page?: number, limit?: number, query?: QueryYakScriptRequest) => {
        const newParams = {
            ...params,
            ...query
        }
        if (page) newParams.Pagination.Page = page
        if (limit) newParams.Pagination.Limit = limit
        setLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", newParams)
            .then((item: QueryYakScriptsResponse) => {
                const data = page === 1 ? item.Data : response.Data.concat(item.Data)
                const isMore = item.Data.length < item.Pagination.Limit || data.length === response.Total
                setHasMore(!isMore)
                if (newParams.Pagination.Page > 1 && isSelectAll) {
                    if (onSelectList) onSelectList(data)
                }
                setResponse({
                    ...item,
                    Data: [...data]
                })
                if (page === 1) {
                    if (props.setTotal) props.setTotal(item.Total || 0)
                    setIsRef(!isRef)
                }
            })
            .catch((e: any) => {
                failed("Query Local Yak Script failed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setListBodyLoading(false)
                    if (setIsRequest) setIsRequest(false)
                }, 200)
            })
    }
    const [isRef, setIsRef] = useState(false)
    useEffect(() => {
        const newParams = {
            ...params,
            ...queryLocal
        }
        setParams(newParams)
        setListBodyLoading(true)
        update(1, undefined, queryLocal)
        if (onSelectList) onSelectList([])
    }, [userInfo.isLogin, props.refresh])

    useEffect(() => {
        if (!deletePluginRecordLocal) return
        response.Data.splice(numberLocal.current, 1)
        setResponse({
            ...response,
            Data: [...response.Data]
        })
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
        props.onClicked()
    }, [deletePluginRecordLocal?.Id])
    const [hasMore, setHasMore] = useState<boolean>(false)
    const loadMoreData = useMemoizedFn(() => {
        update(parseInt(`${response.Pagination.Page}`) + 1, undefined)
    })
    const onSelect = useMemoizedFn((item: YakScript) => {
        if (!selectedRowKeysRecord) return
        const index = selectedRowKeysRecord.findIndex((ele) => ele.Id === item.Id)
        if (index === -1) {
            selectedRowKeysRecord.push(item)
            if (onSelectList) onSelectList([...selectedRowKeysRecord])
        } else {
            const newSelectedRowKeysRecord = selectedRowKeysRecord.filter((ele) => ele.Id !== item.Id)
            if (onSelectList) onSelectList([...newSelectedRowKeysRecord])
        }
        if (setIsSelectAll) setIsSelectAll(false)
    })
    const onShare = useMemoizedFn((item: YakScript) => {
        Modal.info({
            title: "请将插件id复制以后分享给朋友，导入后即可使用。",
            icon: <InfoCircleOutlined />,
            content: <CopyableField text={item.UUID} />
        })
    })
    return (
        <Spin spinning={listBodyLoading}>
            {(response.Data.length === 0 && emptyNode) || (
                <RollingLoadList<YakScript>
                    targetRef={targetRef}
                    isGridLayout={isGridLayout}
                    numberRoll={numberLocalRoll}
                    isRef={isRef}
                    recalculation={recalculation}
                    data={response.Data}
                    page={response.Pagination.Page}
                    hasMore={hasMore}
                    loading={loading}
                    loadMoreData={loadMoreData}
                    classNameList='plugin-list-body'
                    defItemHeight={itemHeight}
                    renderRow={(data: YakScript, index) => (
                        <PluginListLocalItem
                            plugin={data}
                            userInfo={userInfo}
                            onClicked={(info) => {
                                numberLocal.current = index
                                props.onClicked(info, index)
                            }}
                            onlineProfile={baseUrl}
                            currentScript={props.currentScript}
                            onYakScriptRender={props.onYakScriptRender}
                            maxWidth={maxWidth}
                            selectedRowKeysRecord={selectedRowKeysRecord || []}
                            onSelect={onSelect}
                            setUpdatePluginRecordLocal={(s) => {
                                if (setUpdatePluginRecordLocal) setUpdatePluginRecordLocal(s)
                            }}
                            onShare={onShare}
                            onSetUser={onSetUser}
                        />
                    )}
                />
            )}
        </Spin>
    )
}

export interface YakFilterModuleSelectProps {
    selectedTags: string[]
    setSelectedTags: (v: string[]) => void
}

export interface TagValue {
    Name: string
    Total: number
}

interface PluginUserInfoLocalProps {
    UserId: number
    HeadImg: string
}

interface PluginListLocalProps {
    plugin: YakScript
    userInfo: UserInfoProps
    onClicked: (y: YakScript) => any
    currentScript?: YakScript
    onYakScriptRender?: (i: YakScript, maxWidth?: number) => any
    maxWidth: number
    onSelect: (info: YakScript) => any
    onShare: (info: YakScript) => any
    selectedRowKeysRecord: YakScript[]
    setUpdatePluginRecordLocal: (y: YakScript) => any
    onSetUser?: (u: PluginUserInfoLocalProps) => any
    onlineProfile: string
}
export const PluginListLocalItem: React.FC<PluginListLocalProps> = (props) => {
    const {
        plugin,
        selectedRowKeysRecord,
        onSelect,
        setUpdatePluginRecordLocal,
        currentScript,
        onShare,
        onSetUser,
        onlineProfile
    } = props
    const {userInfo, maxWidth, onClicked} = props
    const [uploadLoading, setUploadLoading] = useState(false)
    const updateListItem = useMemoizedFn((updatePlugin: YakScript) => {
        setUpdatePluginRecordLocal(updatePlugin)
        if (!currentScript) return
        // 本地插件OnlineId为0,本地Id不一样,所以用 ScriptName  是唯一的
        if ((updatePlugin.OnlineId as number) > 0 && currentScript.ScriptName === updatePlugin.ScriptName) {
            onClicked(updatePlugin)
        }
    })
    if (props.onYakScriptRender) {
        return props.onYakScriptRender(plugin, maxWidth)
    }
    const isShowPrivateDom = plugin?.OnlineBaseUrl && plugin.OnlineBaseUrl !== onlineProfile ? false : true
    // console.log("私有域比较",plugin.OnlineBaseUrl,onlineProfile)
    return (
        <div
            className={`plugin-item ${currentScript?.Id === plugin.Id && "plugin-item-active"}`}
            onClick={() => props.onClicked(plugin)}
        >
            <div className={`plugin-item-heard ${currentScript?.Id === plugin.Id && "plugin-item-heard-active"}`}>
                <div className='plugin-item-left'>
                    <div className='text-style content-ellipsis'>{plugin.ScriptName}</div>
                    <div className='icon-body'>
                        <div className='text-icon'>
                            {plugin.OnlineId > 0 && !plugin.OnlineIsPrivate && isShowPrivateDom && <OnlineCloudIcon />}
                            {plugin.OnlineId > 0 && plugin.OnlineIsPrivate && <LockOutlined />}
                        </div>
                        {gitUrlIcon(plugin.FromGit)}
                    </div>
                </div>
                <div className='plugin-item-right'>
                    {plugin.UUID && (
                        <ShareIcon
                            // @ts-ignore
                            className='operation-icon'
                            onClick={(e) => {
                                e.stopPropagation()
                                onShare(plugin)
                            }}
                        />
                    )}
                    {(uploadLoading && <LoadingOutlined className='upload-outline' />) || (
                        <>
                            {(userInfo.user_id == plugin.UserId || plugin.UserId == 0) && (
                                <SyncCloudButton
                                    params={plugin}
                                    setParams={updateListItem}
                                    uploadLoading={setUploadLoading}
                                >
                                    <UploadOutlined className='upload-outline' />
                                </SyncCloudButton>
                            )}
                        </>
                    )}
                </div>
                <SelectIcon
                    //  @ts-ignore
                    className={`icon-select  ${
                        selectedRowKeysRecord.findIndex((ele) => ele.Id === plugin.Id) !== -1 && "icon-select-active"
                    }`}
                    onClick={(e) => {
                        e.stopPropagation()
                        onSelect(plugin)
                    }}
                />
            </div>
            <div className='plugin-item-content'>
                <div className='plugin-help content-ellipsis'>{plugin.Help || "No Description about it."}</div>
                <div className='plugin-type-body'>
                    {PluginTypeText(plugin.Type)}
                    {plugin.Tags && plugin.Tags !== "null" && <div className='plugin-tag'>TAG:{plugin.Tags}</div>}
                </div>
                <div className='plugin-item-footer'>
                    <div
                        className='plugin-item-footer-left'
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        {plugin.HeadImg && (
                            <img
                                alt=''
                                src={plugin.HeadImg}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onSetUser)
                                        onSetUser({
                                            UserId: plugin.UserId,
                                            HeadImg: plugin.HeadImg || ""
                                        })
                                }}
                            />
                        )}
                        <div className='plugin-item-author content-ellipsis'>{plugin.Author || "anonymous"}</div>
                    </div>
                    <div className='plugin-item-time'>{formatDate(plugin.CreatedAt)}</div>
                </div>
            </div>
        </div>
    )
}
export const PluginType = {
    yak: "YAK 插件",
    mitm: "MITM 插件",
    "packet-hack": "数据包扫描",
    "port-scan": "端口扫描插件",
    codec: "CODEC插件",
    nuclei: "YAML POC"
}
const PluginTypeText = (type) => {
    switch (type) {
        case "yak":
            return <div className='plugin-type plugin-yak'>{PluginType[type]}</div>
        case "mitm":
            return <div className='plugin-type plugin-mitm'>{PluginType[type]}</div>
        case "packet-hack":
            return <div className='plugin-type plugin-packet-hack'>{PluginType[type]}</div>
        case "port-scan":
            return <div className='plugin-type plugin-port-scan'>{PluginType[type]}</div>
        case "codec":
            return <div className='plugin-type plugin-codec'>{PluginType[type]}</div>
        case "nuclei":
            return <div className='plugin-type plugin-nuclei'>{PluginType[type]}</div>
        default:
            break
    }
}

export const loadNucleiPoCFromLocal = `yakit.AutoInitYakit();

loglevel("info");

localPath = cli.String("local-path");

yakit.Info("Load Local Nuclei Templates Repository: %v", localPath)
err = nuclei.UpdateDatabase(localPath)
if err != nil {
    yakit.Error("Update Failed: %v", err)
    return
}
yakit.Info("Update Nuclei PoC Finished")
`

export const loadYakitPluginCode = `yakit.AutoInitYakit()
loglevel("info")

gitUrl = cli.String("giturl")
nucleiGitUrl = cli.String("nuclei-templates-giturl")
proxy = cli.String("proxy")

yakit.Info("Checking Plugins Resources ...")
if gitUrl == "" && nucleiGitUrl == "" {
    yakit.Error("Empty Plugin Storage")
    die("empty giturl")
}
yakit.Info("preparing for loading yak plugins：%v", gitUrl)
yakit.Info("preparing for loading nuclei-templates pocs：%v", nucleiGitUrl)

wg = sync.NewWaitGroup()
wg.Add(2)

go func{
    defer wg.Done()
    defer func{
        err = recover()
        if err != nil {
            yakit.Error("error: %v", err)
        }
    }
    
    if !str.HasPrefix(gitUrl, "http") { return }
    yakit.Info("Start to load Yak Plugin!")
    
    if proxy != "" {
        yakit.Info("proxy: %v", proxy)
        log.Info("proxy: %v", proxy)
        err := yakit.UpdateYakitStoreFromGit(context.Background(), gitUrl, proxy)
        if err != nil {
            yakit.Error("load URL[%v] failed: %v", gitUrl, err)
            die(err)
        }
    } else{
        yakit.Info("No Proxy")
        err = yakit.UpdateYakitStoreFromGit(context.Background(), gitUrl)
        if err != nil {
            yakit.Error("load URL[%v] failed: %v", gitUrl, err)
            die(err)
        }
    }
}

go func {
    defer wg.Done()
    defer func{
        err = recover()
        if err != nil {
            yakit.Error("error: %v", err)
        }
    }
    
    if nucleiGitUrl == "" {
        yakit.Info("no nuclei git url input")
        return
    }
    
    yakit.Info("Start to load Yaml PoC!")
    proxies = make([]string)
    if proxy != "" {
        proxies = append(proxies, proxy)
    }
    
    path, err = nuclei.PullDatabase(nucleiGitUrl, proxies...)
    if err != nil {
        yakit.Error("pull nuclei templates failed: %s", err)
        die(err)
    }
    
    err = nuclei.UpdateDatabase(path)
    if err != nil {
        yakit.Error("update database from %v failed: %v", path, dir)
        die(err)
    }
}


yakit.Output("Waiting for loading...")
wg.Wait()
yakit.Output("Update Finished...")
`

export interface DownloadOnlinePluginAllResProps {
    Progress: number
    Log: string
}

export const gitUrlIcon = (url: string | undefined, noTag?: boolean) => {
    if (!url) {
        return <></>
    }
    return (
        <Tooltip title={url}>
            <GithubOutlined className='github-icon' />
        </Tooltip>
    )
}
