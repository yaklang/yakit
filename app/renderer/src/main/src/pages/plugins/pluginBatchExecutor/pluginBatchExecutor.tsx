import React, {useRef, useState, useReducer, useEffect, forwardRef, useImperativeHandle} from "react"
import {PluginDetails, PluginDetailsListItem, defaultSearch} from "../baseTemplate"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {useMemoizedFn, useCreation, useDebounceFn, useUpdateEffect, useInViewport, useControllableValue} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {PluginListPageMeta, PluginSearchParams} from "../baseTemplateType"
import {
    HybridScanRequest,
    PluginBatchExecutorInputValueProps,
    apiCancelHybridScan,
    apiGetPluginByGroup,
    apiHybridScan,
    apiQueryHybridScan,
    apiQueryYakScript,
    apiStopHybridScan,
    convertHybridScanParams,
    convertLocalPluginsRequestParams,
    hybridScanParamsConvertToInputValue
} from "../utils"
import {getRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import {useStore} from "@/store"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {Form} from "antd"

import "../plugins.scss"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {
    PluginExecuteProgress,
    PluginFixFormParams,
    defPluginExecuteFormValue
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {PluginExecuteExtraFormValue} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {HybridScanControlAfterRequest} from "@/models/HybridScan"
import {randomString} from "@/utils/randomUtil"
import useHoldBatchGRPCStream from "@/hook/useHoldBatchGRPCStream/useHoldBatchGRPCStream"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../operator/expandAndRetract/ExpandAndRetract"
import {PageNodeItemProps, PluginBatchExecutorPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRoute"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

const PluginBatchExecuteExtraParamsDrawer = React.lazy(() => import("./PluginBatchExecuteExtraParams"))

interface PluginBatchExecutorProps {
    id: string
}
export interface PluginBatchExecutorTaskProps {
    Proxy: string
    Concurrent: number
    TotalTimeoutSecond: number
}
export interface PluginBatchExecuteExtraFormValue extends PluginExecuteExtraFormValue, PluginBatchExecutorTaskProps {}
export const defPluginExecuteTaskValue: PluginBatchExecutorTaskProps = {
    Proxy: "",
    Concurrent: 30,
    TotalTimeoutSecond: 7200
}
export const defPluginBatchExecuteExtraFormValue: PluginBatchExecuteExtraFormValue = {
    ...cloneDeep(defPluginExecuteFormValue),
    ...cloneDeep(defPluginExecuteTaskValue)
}
export const PluginBatchExecutor: React.FC<PluginBatchExecutorProps> = React.memo((props) => {
    const {queryPagesDataById, removePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            removePagesDataCacheById: s.removePagesDataCacheById
        }),
        shallow
    )
    /**获取数据中心中的页面数据 */
    const initPluginBatchExecutorPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.BatchExecutorPage, props.id)
        if (currentItem && currentItem.pageParamsInfo.pluginBatchExecutorPageInfo) {
            return currentItem.pageParamsInfo.pluginBatchExecutorPageInfo
        } else {
            return {
                runtimeId: "",
                defaultActiveKey: ""
            }
        }
    })
    const [pageInfo, setPageInfo] = useState<PluginBatchExecutorPageInfoProps>(initPluginBatchExecutorPageInfo())

    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [loading, setLoading] = useState<boolean>(false)

    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)

    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    /**停止 */
    const [stopLoading, setStopLoading] = useState<boolean>(false)
    // const [privateDomain, setPrivateDomain] = useState<string>("") // 私有域地址
    const userInfo = useStore((s) => s.userInfo)

    /** 是否为初次加载 */
    const isLoadingRef = useRef<boolean>(true)
    const privateDomainRef = useRef<string>("") // 私有域地址
    const typeRef = useRef<string>("mitm,port-scan,nuclei")
    const pluginBatchExecuteContentRef = useRef<PluginBatchExecuteContentRefProps>(null)
    const batchExecuteDomRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(batchExecuteDomRef)

    useEffect(() => {
        getPrivateDomainAndRefList()
    }, [])
    // userInfo.isLogin, filters发生变化的时候触发；初始请求数据在 getPrivateDomainAndRefList
    useUpdateEffect(() => {
        fetchList(true)
    }, [userInfo.isLogin])
    useEffect(() => {
        if (inViewport) {
            emiter.on("onRefLocalPluginList", onRefLocalPluginList)
            emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        }
        return () => {
            emiter.off("onRefLocalPluginList", onRefLocalPluginList)
            emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        }
    }, [inViewport])
    /**设置输入模块的初始值后，根据value刷新列表相关数据 */
    const onInitInputValueAfter = useMemoizedFn((value: string) => {
        try {
            const inputValue: PluginBatchExecutorInputValueProps = hybridScanParamsConvertToInputValue(value)
            const {pluginInfo} = inputValue
            // 插件数据
            if (pluginInfo.selectPluginName.length > 0) {
                setSelectList(pluginInfo.selectPluginName)
            } else {
                setSelectList([])
                setSearch(pluginInfo.search)
                setTimeout(() => {
                    fetchList(true, true)
                }, 200)
            }
        } catch (error) {}
    })
    /** 通过runtimeId查询该条记录详情 */
    const onQueryHybridScanByRuntimeId = useMemoizedFn((runtimeId: string) => {
        if (!runtimeId) return
        pluginBatchExecuteContentRef.current?.onQueryHybridScanByRuntimeId(runtimeId).then(() => {
            setIsExpand(false)
            onClearPageInfo()
        })
    })
    /** 查询后清除页面的缓存 */
    const onClearPageInfo = useMemoizedFn(() => {
        removePagesDataCacheById(YakitRoute.BatchExecutorPage, props.id)
    })

    const onRefLocalPluginList = useMemoizedFn(() => {
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })

    /**获取最新的私有域,并刷新列表 */
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                privateDomainRef.current = values.BaseUrl
                setTimeout(() => {
                    fetchList(true)
                }, 200)
            }
        })
    })

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean, isAllCheck: boolean = false) => {
            if (reset) {
                isLoadingRef.current = true
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: +response.Pagination.Page + 1,
                      limit: +response.Pagination.Limit || 20
                  }
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({}, search, params),
                Type: typeRef.current
            }
            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const newData = res.Data.map((ele) => ({
                    ...ele,
                    isLocalPlugin: privateDomainRef.current !== ele.OnlineBaseUrl
                }))
                dispatch({
                    type: "add",
                    payload: {
                        response: {
                            ...res,
                            Data: newData
                        }
                    }
                })
                if (+res.Pagination.Page === 1) {
                    setAllCheck(isAllCheck)
                    setSelectList([])
                    onQueryHybridScanByRuntimeId(pageInfo.runtimeId)
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(
                response.Data.filter((item) => item.ScriptName !== data.ScriptName).map((item) => item.ScriptName)
            )
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...selectList, data.ScriptName])
        else setSelectList(selectList.filter((item) => item !== data.ScriptName))
    })
    const onPluginClick = useMemoizedFn((data: YakScript) => {
        const value = allCheck || selectList.includes(data.ScriptName)
        optCheck(data, !value)
    })
    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })
    /** 单项副标题组件 */
    const optExtra = useMemoizedFn((data: YakScript) => {
        if (privateDomainRef.current !== data.OnlineBaseUrl) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon className='icon-svg-16' />
        } else {
            return <SolidCloudpluginIcon className='icon-svg-16' />
        }
    })
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        setSelectList([])
    })
    // 选中插件的数量
    const selectNum = useCreation(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])
    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onStopExecute = useMemoizedFn(() => {
        pluginBatchExecuteContentRef.current?.onStopExecute()
    })
    /**在顶部的执行按钮 */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        pluginBatchExecuteContentRef.current?.onStartExecute()
    })
    const pluginInfo = useCreation(() => {
        return {
            selectPluginName: selectList,
            search
        }
    }, [selectList, search])
    return (
        <div className={styles["plugin-batch-executor"]} ref={batchExecuteDomRef}>
            <PluginDetails<YakScript>
                title='选择插件'
                filterNode={
                    <>
                        {/* <PluginGroup
                            checkList={selectList}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            isSelectAll={allCheck}
                        /> */}
                    </>
                }
                checked={allCheck}
                onCheck={onCheck}
                total={response.Total}
                selected={selectNum}
                listProps={{
                    rowKey: "ScriptName",
                    data: response.Data,
                    loadMoreData: onUpdateList,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || selectList.includes(info.ScriptName)
                        return (
                            <PluginDetailsListItem<YakScript>
                                order={i}
                                plugin={info}
                                selectUUId={""} //本地用的ScriptName代替uuid
                                check={check}
                                headImg={info.HeadImg || ""}
                                pluginUUId={info.ScriptName} //本地用的ScriptName代替uuid
                                pluginName={info.ScriptName}
                                help={info.Help}
                                content={info.Content}
                                optCheck={optCheck}
                                official={!!info.OnlineOfficial}
                                isCorePlugin={!!info.IsCorePlugin}
                                pluginType={info.Type}
                                onPluginClick={onPluginClick}
                                extra={optExtra}
                            />
                        )
                    },
                    page: response.Pagination.Page,
                    hasMore: +response.Total !== response.Data.length,
                    loading: loading,
                    defItemHeight: 46,
                    isRef: loading && isLoadingRef.current
                }}
                onBack={() => {}}
                search={search}
                setSearch={setSearch}
                onSearch={onSearch}
                // spinLoading={spinLoading || removeLoading}
                spinLoading={loading && isLoadingRef.current}
                rightHeardNode={
                    <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                        <div className={styles["plugin-batch-executor-title"]}>
                            <span className={styles["plugin-batch-executor-title-text"]}>已选插件</span>
                            {selectNum > 0 && (
                                <YakitTag closable onClose={onRemove} color='info'>
                                    {selectNum}
                                </YakitTag>
                            )}
                        </div>
                        <div className={styles["plugin-batch-executor-btn"]}>
                            {progressList.length === 1 && (
                                <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                            )}
                            {isExecuting
                                ? !isExpand && (
                                      <>
                                          <YakitButton danger onClick={onStopExecute} loading={stopLoading}>
                                              停止
                                          </YakitButton>
                                          <div className={styles["divider-style"]}></div>
                                      </>
                                  )
                                : !isExpand && (
                                      <>
                                          <YakitButton onClick={onExecuteInTop} disabled={selectNum === 0}>
                                              执行
                                          </YakitButton>
                                          <div className={styles["divider-style"]}></div>
                                      </>
                                  )}
                            <YakitButton
                                type='text2'
                                icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setHidden(!hidden)
                                }}
                            />
                        </div>
                    </ExpandAndRetract>
                }
                hidden={hidden}
                setHidden={setHidden}
                bodyClassName={styles["plugin-batch-executor-body"]}
            >
                <PluginBatchExecuteContent
                    ref={pluginBatchExecuteContentRef}
                    isExecuting={isExecuting}
                    isExpand={isExpand}
                    setIsExpand={setIsExpand}
                    selectNum={selectNum}
                    pluginType={typeRef.current}
                    defaultActiveKey={pageInfo.defaultActiveKey}
                    onInitInputValueAfter={onInitInputValueAfter}
                    setProgressList={setProgressList}
                    setIsExecuting={setIsExecuting}
                    stopLoading={stopLoading}
                    setStopLoading={setStopLoading}
                    pluginInfo={pluginInfo}
                />
            </PluginDetails>
        </div>
    )
})

interface PluginBatchExecuteContentProps {
    ref?: React.ForwardedRef<PluginBatchExecuteContentRefProps>
    /** 如果同时传了 pluginInfo.selectPluginName,以pluginInfo.selectPluginGroup查询回来的插件为主 */
    pluginInfo: {selectPluginName: string[]; search?: PluginSearchParams; selectPluginGroup?: string[]}
    /**选择插件得数量 */
    selectNum: number
    /**插件类型 */
    pluginType?: string
    /**插件执行输出结果默认选择得tabKey */
    defaultActiveKey?: string
    /** 设置输入模块的初始值后得回调事件，例如：插件批量执行页面(设置完初始值后，刷新左侧得插件列表页面) */
    onInitInputValueAfter?: (value: string) => void
    /**进度条新鲜 */
    setProgressList: (s: StreamResult.Progress[]) => void

    /**是否执行中 */
    isExecuting: boolean
    setIsExecuting: (value: boolean) => void

    /**停止 */
    stopLoading: boolean
    setStopLoading: (value: boolean) => void

    /**是否展开收起表单内容 */
    isExpand: boolean
    setIsExpand: (value: boolean) => void
}
export interface PluginBatchExecuteContentRefProps {
    onQueryHybridScanByRuntimeId: (runtimeId: string) => Promise<null>
    onStopExecute: () => void
    onStartExecute: () => void
}
export const PluginBatchExecuteContent: React.FC<PluginBatchExecuteContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {selectNum, pluginType = "", pluginInfo, defaultActiveKey, onInitInputValueAfter, setProgressList} = props
        const [form] = Form.useForm()
        const isRawHTTPRequest = Form.useWatch("IsRawHTTPRequest", form)
        useImperativeHandle(
            ref,
            () => ({
                onQueryHybridScanByRuntimeId,
                onStopExecute,
                onStartExecute: () => {
                    form.validateFields()
                        .then(onStartExecute)
                        .catch((e) => {
                            setIsExpand(true)
                        })
                }
            }),
            [form]
        )
        /**额外参数弹出框 */
        const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
        const [extraParamsValue, setExtraParamsValue] = useState<PluginBatchExecuteExtraFormValue>({
            ...cloneDeep(defPluginBatchExecuteExtraFormValue)
        })

        /**是否在执行中 */
        const [isExecuting, setIsExecuting] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "isExecuting",
            trigger: "setIsExecuting"
        })
        const [stopLoading, setStopLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "stopLoading",
            trigger: "setStopLoading"
        })
        /**是否展开/收起 */
        const [isExpand, setIsExpand] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "isExpand",
            trigger: "setIsExpand"
        })
        const [runtimeId, setRuntimeId] = useState<string>("")

        const tokenRef = useRef<string>(randomString(40))

        const [streamInfo, hybridScanStreamEvent] = useHoldBatchGRPCStream({
            taskName: "hybrid-scan",
            apiKey: "HybridScan",
            token: tokenRef.current,
            onEnd: () => {
                hybridScanStreamEvent.stop()
                setTimeout(() => {
                    setIsExecuting(false)
                    setStopLoading(false)
                }, 200)
            },
            setRuntimeId: (rId) => {
                setRuntimeId(rId)
            },
            onGetInputValue: (v) => onInitInputValue(v)
        })
        const progressList = useCreation(() => {
            return streamInfo.progressState
        }, [streamInfo.progressState])

        useEffect(() => {
            setProgressList(progressList)
        }, [progressList])

        /** 通过runtimeId查询该条记录详情 */
        const onQueryHybridScanByRuntimeId: (runtimeId: string) => Promise<null> = useMemoizedFn((runtimeId) => {
            return new Promise((resolve, reject) => {
                if (!runtimeId) reject("未设置正常得 runtimeId")
                hybridScanStreamEvent.reset()
                apiQueryHybridScan(runtimeId, tokenRef.current)
                    .then(() => {
                        setIsExecuting(true)
                        hybridScanStreamEvent.start()
                        resolve(null)
                    })
                    .catch(reject)
            })
        })
        /**设置输入模块的初始值 */
        const onInitInputValue = useMemoizedFn((value) => {
            const inputValue: PluginBatchExecutorInputValueProps = hybridScanParamsConvertToInputValue(value)
            const {params} = inputValue
            // form表单数据
            const extraForm = {
                ...params.HTTPRequestTemplate,
                Proxy: params.Proxy,
                Concurrent: params.Concurrent,
                TotalTimeoutSecond: params.TotalTimeoutSecond
            }
            form.setFieldsValue({
                Input: params.Input,
                IsHttps: params.HTTPRequestTemplate.IsHttps,
                IsRawHTTPRequest: !!params.HTTPRequestTemplate.IsRawHTTPRequest,
                RawHTTPRequest: params.HTTPRequestTemplate.RawHTTPRequest
            })
            setExtraParamsValue(extraForm)
            if (onInitInputValueAfter) onInitInputValueAfter(value)
        })

        /**开始执行 */
        const onStartExecute = useMemoizedFn(async (value) => {
            const {selectPluginGroup = []} = pluginInfo
            // 任务配置参数
            const taskParams: PluginBatchExecutorTaskProps = {
                Concurrent: extraParamsValue.Concurrent,
                TotalTimeoutSecond: extraParamsValue.TotalTimeoutSecond,
                Proxy: extraParamsValue.Proxy
            }
            const params: HybridScanRequest = {
                Input: value.Input,
                ...taskParams,
                HTTPRequestTemplate: {
                    ...extraParamsValue,
                    IsHttps: !!value.IsHttps,
                    IsRawHTTPRequest: value.IsRawHTTPRequest,
                    RawHTTPRequest: value.RawHTTPRequest
                        ? Buffer.from(value.RawHTTPRequest, "utf8")
                        : Buffer.from("", "utf8")
                }
            }
            let newPluginInfo = {...pluginInfo}
            if (selectPluginGroup.length > 0) {
                try {
                    const res = await apiGetPluginByGroup(selectPluginGroup)
                    console.log("QueryYakScriptByOnlineGroup", res)
                    newPluginInfo.selectPluginName = res.Data.map((item) => item.ScriptName)
                } catch (error) {
                    newPluginInfo.selectPluginName = []
                }
            }
            if (newPluginInfo.selectPluginName.length === 0) return
            const hybridScanParams: HybridScanControlAfterRequest = convertHybridScanParams(
                params,
                newPluginInfo,
                pluginType
            )
            hybridScanStreamEvent.reset()
            apiHybridScan(hybridScanParams, tokenRef.current).then(() => {
                setIsExecuting(true)
                setIsExpand(false)
                hybridScanStreamEvent.start()
            })
        })
        const openExtraPropsDrawer = useMemoizedFn(() => {
            setExtraParamsVisible(true)
        })
        /**保存额外参数 */
        const onSaveExtraParams = useMemoizedFn((v: PluginBatchExecuteExtraFormValue) => {
            setExtraParamsValue({...v} as PluginBatchExecuteExtraFormValue)
            setExtraParamsVisible(false)
        })
        /**取消执行 */
        const onStopExecute = useMemoizedFn(() => {
            setStopLoading(true)
            apiStopHybridScan(runtimeId, tokenRef.current)
        })

        const isShowResult = useCreation(() => {
            return isExecuting || runtimeId
        }, [isExecuting, runtimeId])

        return (
            <>
                <div
                    className={classNames(styles["plugin-batch-execute-form-wrapper"], {
                        [styles["plugin-batch-execute-form-wrapper-hidden"]]: !isExpand
                    })}
                >
                    <Form
                        form={form}
                        onFinish={onStartExecute}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} 是必填字段"
                        }}
                        labelWrap={true}
                    >
                        <PluginFixFormParams form={form} disabled={isExecuting} />
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["plugin-execute-form-operate"]}>
                                {isExecuting ? (
                                    <YakitButton danger onClick={onStopExecute} size='large' loading={stopLoading}>
                                        停止
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        className={styles["plugin-execute-form-operate-start"]}
                                        htmlType='submit'
                                        size='large'
                                        disabled={selectNum === 0}
                                    >
                                        开始执行
                                    </YakitButton>
                                )}
                                <YakitButton
                                    type='text'
                                    onClick={openExtraPropsDrawer}
                                    disabled={isExecuting}
                                    size='large'
                                >
                                    额外参数
                                </YakitButton>
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                {isShowResult && (
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        pluginType={pluginType}
                        defaultActiveKey={defaultActiveKey}
                    />
                )}
                <React.Suspense fallback={<div>loading...</div>}>
                    <PluginBatchExecuteExtraParamsDrawer
                        isRawHTTPRequest={isRawHTTPRequest}
                        extraParamsValue={extraParamsValue}
                        visible={extraParamsVisible}
                        setVisible={setExtraParamsVisible}
                        onSave={onSaveExtraParams}
                    />
                </React.Suspense>
            </>
        )
    })
)
