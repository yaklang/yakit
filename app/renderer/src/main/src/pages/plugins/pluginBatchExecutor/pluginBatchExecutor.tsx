import React, {useRef, useState, useReducer, useEffect} from "react"
import {PluginDetails, PluginDetailsListItem, defaultSearch} from "../baseTemplate"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {PluginGroup, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {useMemoizedFn, useCreation, useDebounceFn, useUpdateEffect} from "ahooks"
import {cloneDeep} from "bizcharts/lib/utils"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "../baseTemplateType"
import {
    HybridScanRequest,
    apiHybridScan,
    apiQueryYakScript,
    convertHybridScanParams,
    convertLocalPluginsRequestParams
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
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon, OutlineChevrondownIcon} from "@/assets/icon/outline"
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

const PluginBatchExecuteExtraParamsDrawer = React.lazy(() => import("./PluginBatchExecuteExtraParams"))

interface PluginBatchExecutorProps {}
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
const defPluginBatchExecuteExtraFormValue: PluginBatchExecuteExtraFormValue = {
    ...cloneDeep(defPluginExecuteFormValue),
    ...cloneDeep(defPluginExecuteTaskValue)
}
export const PluginBatchExecutor: React.FC<PluginBatchExecutorProps> = React.memo((props) => {
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [loading, setLoading] = useState<boolean>(false)

    const [selectList, setSelectList] = useState<YakScript[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)

    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)
    /**是否展开/收起 */
    const [isExpend, setIsExpend] = useState<boolean>(false)
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)

    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<PluginBatchExecuteExtraFormValue>({
        ...cloneDeep(defPluginBatchExecuteExtraFormValue)
    })

    // const [privateDomain, setPrivateDomain] = useState<string>("") // 私有域地址
    const userInfo = useStore((s) => s.userInfo)

    /** 是否为初次加载 */
    const isLoadingRef = useRef<boolean>(true)
    const privateDomainRef = useRef<string>("") // 私有域地址
    const typeRef = useRef<string>("mitm,port-scan,nuclei")
    const tokenRef = useRef<string>(randomString(40))

    const [form] = Form.useForm()
    const isRawHTTPRequest = Form.useWatch("IsRawHTTPRequest", form)

    useEffect(() => {
        getPrivateDomainAndRefList()
    }, [])
    // userInfo.isLogin, filters发生变化的时候触发；初始请求数据在 getPrivateDomainAndRefList
    useUpdateEffect(() => {
        fetchList(true)
    }, [userInfo.isLogin])
    useEffect(() => {
        emiter.on("onRefLocalPluginList", onRefLocalPluginList)
        emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        return () => {
            emiter.off("onRefLocalPluginList", onRefLocalPluginList)
            emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        }
    }, [])

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
        useMemoizedFn(async (reset?: boolean) => {
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
                    setAllCheck(false)
                    setSelectList([])
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
            setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...selectList, data])
        else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
    })
    const onPluginClick = useMemoizedFn((data: YakScript) => {
        const value = selectList.findIndex((item) => item.ScriptName === data.ScriptName) === -1
        // 单项勾选回调
        if (value) setSelectList([...selectList, data])
        else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
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
    const onRemove = useMemoizedFn(() => {
        setSelectList([])
    })
    const checkList = useCreation(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])
    // 选中插件的数量
    const selectNum = useCreation(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])

    /**开始执行 */
    const onStartExecute = useMemoizedFn((value) => {
        // 任务配置参数
        const taskParams: PluginBatchExecutorTaskProps = {
            Concurrent: extraParamsValue.Concurrent,
            TotalTimeoutSecond: extraParamsValue.Concurrent,
            Proxy: extraParamsValue.Proxy
        }
        const params: HybridScanRequest = {
            Code: value.Code,
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
        const pluginInfo = {
            selectPluginName: selectList.map((ele) => ele.ScriptName),
            search
        }
        const hybridScanParams: HybridScanControlAfterRequest = convertHybridScanParams(
            params,
            pluginInfo,
            typeRef.current
        )
        apiHybridScan(hybridScanParams,tokenRef.current).then(() => {
            setIsExecuting(true)
            setIsExpend(false)
        })
        console.log("hybridScanParams", hybridScanParams)
    })
    /**取消执行 */
    const onStopExecute = useMemoizedFn(() => {})
    const openExtraPropsDrawer = useMemoizedFn(() => {
        setExtraParamsVisible(true)
    })
    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn((v: PluginBatchExecuteExtraFormValue) => {
        setExtraParamsValue({...v} as PluginBatchExecuteExtraFormValue)
        setExtraParamsVisible(false)
    })
    return (
        <div className={styles["plugin-batch-executor"]}>
            <PluginDetails<YakScript>
                title='选择插件'
                filterNode={
                    <>
                        {/* <PluginGroup
                            checkList={checkList}
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
                        const check = allCheck || checkList.includes(info.ScriptName)
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
                    <div className={styles["plugin-batch-executor-header"]}>
                        <div className={styles["plugin-batch-executor-title"]}>
                            <span className={styles["plugin-batch-executor-title-text"]}>已选插件</span>
                            {selectNum > 0 && (
                                <YakitTag closable onClose={onRemove} color='info'>
                                    {selectNum}
                                </YakitTag>
                            )}
                        </div>
                        <div className={styles["plugin-batch-executor-btn"]}>
                            <PluginExecuteProgress percent={0.6} name={"main"} />
                            {isExecuting ? (
                                <>
                                    <YakitButton danger onClick={onStopExecute}>
                                        停止
                                    </YakitButton>
                                </>
                            ) : (
                                <></>
                            )}
                            {isExpend ? (
                                <YakitButton type='text2' onClick={() => setIsExpend(false)}>
                                    收起
                                    <OutlineChevrondownIcon />
                                </YakitButton>
                            ) : (
                                <YakitButton type='text2' onClick={() => setIsExpend(true)}>
                                    展开
                                    <OutlineChevrondownIcon />
                                </YakitButton>
                            )}
                            <div className={styles["divider-style"]}></div>
                            <YakitButton
                                type='text2'
                                icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                                onClick={() => setHidden(!hidden)}
                            />
                        </div>
                    </div>
                }
                hidden={hidden}
                setHidden={setHidden}
            >
                <Form
                    form={form}
                    onFinish={onStartExecute}
                    className={classNames(styles["plugin-batch-execute-form-wrapper"], {
                        [styles["plugin-batch-execute-form-wrapper-hidden"]]: isExpend
                    })}
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
                                <YakitButton danger onClick={onStopExecute} size='large'>
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
                            <YakitButton type='text' onClick={openExtraPropsDrawer} disabled={isExecuting} size='large'>
                                额外参数
                            </YakitButton>
                        </div>
                    </Form.Item>
                </Form>
            </PluginDetails>
            <React.Suspense fallback={<div>loading...</div>}>
                <PluginBatchExecuteExtraParamsDrawer
                    isRawHTTPRequest={isRawHTTPRequest}
                    extraParamsValue={extraParamsValue}
                    visible={extraParamsVisible}
                    setVisible={setExtraParamsVisible}
                    onSave={onSaveExtraParams}
                />
            </React.Suspense>
        </div>
    )
})
