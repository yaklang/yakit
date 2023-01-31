import React, {useEffect, useRef, useState, ReactNode} from "react"
import {Button, Checkbox, Divider, Form, Input, List, Popconfirm, Space, Spin, Tag} from "antd"
import {SearchOutlined} from "@ant-design/icons"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../schema"
import {FieldName} from "../../risks/RiskTable"
import {useDebounce, useMemoizedFn, useDebounceFn} from "ahooks"
import {AutoCard} from "../../../components/AutoCard"
import {ItemSelects} from "../../../components/baseTemplate/FormItemUtil"
import {PluginListOptInfo} from "../../../components/businessTemplate/yakitPlugin"
import {YakFilterModuleList} from "@/pages/yakitStore/YakitStorePage"
import "./QueryYakScriptParam.css"
import {useHotkeys} from "react-hotkeys-hook"
import {showDrawer, showModal} from "../../../utils/showModal"
import {ImportConfig, SaveConfig} from "./SaveConfig"
import {info} from "../../../utils/notification"
import {startExecYakCode} from "../../../utils/basic"
import {ImportMenuConfig} from "./consts_importConfigYakCode"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {CheckboxChangeEvent} from "antd/lib/checkbox"

export interface QueryYakScriptParamProp {
    params: SimpleQueryYakScriptSchema
    onParams: (param: SimpleQueryYakScriptSchema) => any
    loading: boolean
    allTag: FieldName[]
    onAllTag: () => any
    isAll: boolean
    onIsAll: (flag: boolean) => any
    historyTask: string
}

export interface SimpleQueryYakScriptSchema {
    type: string
    tags: string
    exclude: string[]
    include: string[]
}

const {ipcRenderer} = window.require("electron")

export const QueryYakScriptParamSelector: React.FC<QueryYakScriptParamProp> = React.memo((props) => {
    const {loading, allTag, onAllTag, isAll, onIsAll, historyTask} = props
    // 下拉框选中tag值
    const selectRef = useRef(null)
    const [itemSelects, setItemSelects] = useState<string[]>([])
    const [selectLoading, setSelectLoading] = useState<boolean>(true)
    useEffect(() => {
        setTimeout(() => setSelectLoading(false), 300)
    }, [selectLoading])

    // 设置本地搜索 tags 的状态
    const [searchTag, setSearchTag] = useState("")
    // 用于存储 tag 的搜索与结果
    const [topTags, setTopTags] = useState<FieldName[]>([])
    const [topN, setTopN] = useState(15)
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    // 更新搜索，这个也可以用于后端保存
    const [params, setParams] = useState<SimpleQueryYakScriptSchema>(props.params)

    useEffect(() => {
        // console.log("params1",params)
        props.onParams(params)
    }, [params])

    // 辅助变量
    const [updateTagsSelectorTrigger, setUpdateTagsSelector] = useState(false)

    // 设置最大最小值
    const [minTagWeight, setMinTagWeight] = useState(1)
    const [maxTagWeight, setMaxTagWeight] = useState(2000)

    useEffect(() => {
        let count = 0
        const showTags = allTag.filter((d) => {
            if (
                count <= topN && // 限制数量
                d.Total >= minTagWeight &&
                d.Total <= maxTagWeight &&
                !selectedTags.includes(d.Name) &&
                d.Name.toLowerCase().includes(searchTag.toLowerCase()) // 设置搜索结果
            ) {
                count++
                return true
            }
            return false
        })
        setTopTags([...showTags])
    }, [
        allTag,
        useDebounce(minTagWeight, {wait: 500}),
        useDebounce(maxTagWeight, {wait: 500}),
        useDebounce(searchTag, {wait: 500}),
        useDebounce(selectedTags, {wait: 500}),
        useDebounce(topN, {wait: 500}),
        updateTagsSelectorTrigger
    ])

    const updateTagsSelector = () => {
        setUpdateTagsSelector(!updateTagsSelectorTrigger)
    }
    const syncTags = useMemoizedFn(() => {
        setParams({
            type: params.type,
            tags: selectedTags.join(","),
            include: params.include,
            exclude: []
        })
    })

    useEffect(() => {
        const tags = historyTask ? historyTask.split(",") : []
        setSelectedTags(tags)
    }, [historyTask])

    // 更新 params Tags
    useEffect(() => {
        syncTags()
    }, [useDebounce(selectedTags, {wait: 300})])

    useEffect(() => {
        setTopN(10)
    }, [searchTag])

    const selectedAll = useMemoizedFn((value: boolean) => {
        if (value) {
            setTimeout(() => {
                onIsAll(true)
                setItemSelects([])
                setSearchTag("")
                setParams({type: params.type, tags: selectedTags.join(","), include: [], exclude: []})
            }, 200)
        } else {
            onIsAll(false)
            setSelectedTags([])
            setParams({type: params.type, tags: "", include: [], exclude: []})
            updateTagsSelector()
        }
    })
    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>
                    {/* <div className='select-render-all' onClick={() => selectedAll(true)}>
                        全选
                    </div> */}
                    {originNode}
                </Spin>
            </div>
        )
    })

    const saveConfigTemplate = useMemoizedFn(() => {
        let m = showModal({
            title: "导出批量扫描配置",
            width: "50%",
            content: (
                <>
                    <SaveConfig
                        QueryConfig={params}
                        onSave={(filename) => {
                            info(`保存到 ${filename}`)
                            m.destroy()
                        }}
                    />
                </>
            )
        })
    })
    useHotkeys("alt+p", saveConfigTemplate)
    const importConfigTemplate = useMemoizedFn(() => {
        let m = showModal({
            title: "导出批量扫描配置",
            width: "50%",
            content: (
                <>
                    <ImportConfig />
                </>
            )
        })
    })
    useHotkeys("alt+u", importConfigTemplate)
    const TagsSelectRender = () => (
        <ItemSelects
            item={{}}
            select={{
                ref: selectRef,
                className: "div-width-100",
                allowClear: true,
                autoClearSearchValue: false,
                maxTagCount: "responsive",
                mode: "multiple",
                size: "small",
                data: topTags,
                optValue: "Name",
                optionLabelProp: "Name",
                renderOpt: (info: FieldName) => {
                    return (
                        <div style={{display: "flex", justifyContent: "space-between"}}>
                            <span>{info.Name}</span>
                            <span>{info.Total}</span>
                        </div>
                    )
                },
                value: itemSelects, // selectedTags
                onSearch: (keyword: string) => setSearchTag(keyword),
                setValue: (value) => {
                    setItemSelects(value)
                },
                onDropdownVisibleChange: (open) => {
                    if (open) {
                        setItemSelects([])
                        setSearchTag("")
                    } else {
                        const filters = itemSelects.filter((item) => !selectedTags.includes(item))
                        setSelectedTags(selectedTags.concat(filters))
                        setItemSelects([])
                        setSearchTag("")
                    }
                },
                onPopupScroll: (e) => {
                    const {target} = e
                    const ref: HTMLDivElement = target as unknown as HTMLDivElement
                    if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                        setSelectLoading(true)
                        setTopN(topN + 10)
                    }
                },
                dropdownRender: (originNode: React.ReactNode) => selectDropdown(originNode)
            }}
        />
    )
    return (
        <AutoCard
            size={"small"}
            bordered={true}
            title={"选择插件"}
            extra={
                <Space>
                    <Popconfirm title={"强制更新将重新构建 Tags 索引"} onConfirm={() => onAllTag()}>
                        <a href={"#"}>强制更新 Tags</a>
                    </Popconfirm>
                    <Popconfirm
                        title={"清空已选 Tag？"}
                        onConfirm={() => {
                            onIsAll(false)
                            setSelectedTags([])
                            setParams({type: params.type, tags: "", include: [], exclude: []})
                            updateTagsSelector()
                        }}
                    >
                        <Button size={"small"} type={"link"} danger={true}>
                            清空
                        </Button>
                    </Popconfirm>
                </Space>
            }
            loading={loading}
            bodyStyle={{display: "flex", flexDirection: "column", overflow: "hidden"}}
        >
            <div style={{flex: 1, overflow: "hidden", paddingTop: 0, marginTop: 2}}>
                <SearchYakScriptForFilter
                    TagsSelectRender={TagsSelectRender}
                    searchFilter={{
                        selectedTags,
                        setSelectedTags,
                        selectedAll,
                        
                    }}
                    setIncludeFun={(v:string[])=>{
                        setParams({...params,include:v})
                    }}
                    simpleFilter={params}
                    isAll={isAll}
                    onInclude={(i) => {
                        setParams({
                            ...params,
                            include: isAll ? [...params.include] : [...params.include, i.ScriptName],
                            exclude: [...params.exclude.filter((target) => i.ScriptName != target)]
                        })
                    }}
                    onExclude={(i) => {
                        const existedInTag = isAll
                            ? true
                            : params.tags
                                  .split(",")
                                  .filter((tag) => !!tag)
                                  .filter((tag) => i.Tags.includes(tag)).length > 0

                        if (existedInTag) {
                            setParams({
                                ...params,
                                exclude: [...params.exclude, i.ScriptName],
                                include: [...params.include.filter((target) => i.ScriptName != target)]
                            })
                        } else {
                            setParams({
                                ...params,
                                include: [...params.include.filter((target) => i.ScriptName != target)]
                            })
                        }
                    }}
                />
            </div>
        </AutoCard>
    )
})
interface searchFilterProps {
    selectedTags: string[]
    setSelectedTags: (v: string[]) => void
    selectedAll: (v: boolean) => void
}
interface SearchYakScriptForFilterProp {
    simpleFilter: SimpleQueryYakScriptSchema
    isAll: boolean
    TagsSelectRender: () => any
    searchFilter: searchFilterProps
    setIncludeFun:(v:string[])=>void
    onExclude: (i: YakScript) => any
    onInclude: (i: YakScript) => any
}
const SearchYakScriptForFilter: React.FC<SearchYakScriptForFilterProp> = React.memo((props) => {
    const {selectedTags, setSelectedTags, selectedAll} = props.searchFilter
    const [params, setParams] = useState<QueryYakScriptRequest>({
        ExcludeNucleiWorkflow: true,
        ExcludeScriptNames: [],
        Keyword: "",
        Pagination: genDefaultPagination(20),
        Type: "mitm,port-scan,nuclei"
    })
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)

    const [refresh, setRefresh] = useState(true)
    const [searchType, setSearchType] = useState<"Tags" | "Keyword">("Tags")
    const [total, setTotal] = useState<number>()
    const [allResponse, setAllResponse] = useState<YakScript[]>([])
    // 单选或全选中的插件组
    const [cachePlugInList, setCachePlugInList] = useState<string[]>([])
    // Tag标签对应的插件组
    const [tagsPlugInList,setTagsPlugInList] = useState<string[]>([])
    // 获取全部插件数据 用于插件组本地缓存
    useEffect(() => {
        const payload = {
            ...params,
            Pagination: {
                Limit: 10000,
                Page: 1
            },
        }
        ipcRenderer.invoke("QueryYakScript", payload).then((item: QueryYakScriptsResponse) => {
            // console.log("获取所有数据", item.Data)
            setAllResponse(item.Data)
        })
    }, [selectedTags])
    useEffect(() => {
        if (selectedTags.length) {
            const payload = {
                ExcludeNucleiWorkflow: true,
                Tag: selectedTags,
                Type: "mitm,port-scan,nuclei",
                Pagination: {
                    Limit: 10000,
                    Page: 1
                }
            }
            ipcRenderer.invoke("QueryYakScript", payload).then((item: QueryYakScriptsResponse) => {
                let arr:string[] =  item.Data.map((i)=>i.ScriptName)
                // console.log("获取所有TAG数据", arr,cachePlugInList)
                setTagsPlugInList(arr)
            })
        }
    }, [selectedTags])
    // 全选
    const onCheckAllChange = (value) => {
        if (value) {
            let arr = allResponse.map((item) => item.ScriptName)
            setCachePlugInList(arr)
        } else {
            setCachePlugInList([])
            setTagsPlugInList([])
        }
        selectedAll(value)
    }
    const update = useMemoizedFn((page: number) => {
        const payload = {
            ...params,
            Pagination: {
                ...params.Pagination,
                Page: page
            },
            Tag: props.simpleFilter.tags.split(",")
        }
        setLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", payload)
            .then((item: QueryYakScriptsResponse) => {
                setTotal(item.Total)
                const data = page === 1 ? item.Data : response.Data.concat(item.Data)
                const isMore = item.Data.length < item.Pagination.Limit
                setHasMore(!isMore)
                setResponse({
                    ...item,
                    Data: [...data]
                })
                if (page === 1) {
                    setIsRef(!isRef)
                }
            })
            .catch((e) => {
                console.info(e)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    // 保留数组中非重复数据
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    const onSelect = useMemoizedFn((selected: boolean, item: YakScript) => {
        if (selected) {
            // 选中则去重
            if(cachePlugInList.indexOf(item.ScriptName)>=0){
                let arr = filterNonUnique([...cachePlugInList, item.ScriptName])
                setCachePlugInList(arr)
            }
            if(tagsPlugInList.indexOf(item.ScriptName)>=0){
                let arr = filterNonUnique([...tagsPlugInList, item.ScriptName])
                setCachePlugInList(arr)
            }
            props.onExclude(item)
        } else {
            setCachePlugInList([...cachePlugInList, item.ScriptName])
            props.onInclude(item)
        }
    })

    useEffect(() => {
        update(1)
    }, [props.simpleFilter, refresh])
    const loadMoreData = useMemoizedFn(() => {
        update(Number(response.Pagination.Page) + 1)
    })
    // console.log("选中项",cachePlugInList,tagsPlugInList,Array.from(new Set([...cachePlugInList,...tagsPlugInList])))
    return (
        <AutoCard
            title={
                <YakFilterModuleList
                    TYPE='BATCH_EXECUTOR_PAGE_EX'
                    tag={selectedTags}
                    setTag={(v:string[])=>{
                        if(v.length===0){
                            setTagsPlugInList([])
                        }
                        setSelectedTags(v)
                    }}
                    checkAll={props.isAll}
                    onCheckAllChange={onCheckAllChange}
                    setSearchKeyword={(value) => setParams({...params, Keyword: value})}
                    checkList={Array.from(new Set([...cachePlugInList,...tagsPlugInList]))} // props.simpleFilter.include
                    searchType={searchType}
                    setSearchType={setSearchType}
                    // 动态加载tags列表
                    TagsSelectRender={props.TagsSelectRender}
                    refresh={refresh}
                    setRefresh={setRefresh}
                    onDeselect={() => {}}
                    multipleCallBack={(value) => {props.setIncludeFun(value)}}
                />
            }
            size={"small"}
            bordered={false}
            headStyle={{padding: 0, borderBottom: "0px"}}
            bodyStyle={{padding: "0 0 12px 0", overflow: "hidden auto"}}
        >
            <RollingLoadList<YakScript>
                isRef={isRef}
                data={response.Data}
                page={response.Pagination.Page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={loadMoreData}
                defItemHeight={36}
                renderRow={(item: YakScript, index) => {
                    const haveBeenExcluded = props.simpleFilter.exclude.includes(item.ScriptName)
                    let selected = false

                    if (!haveBeenExcluded) {
                        if (props.isAll) {
                            selected = true
                        } else {
                            props.simpleFilter.tags.split(",").forEach((e) => {
                                if (!e) return

                                if (item.Tags.includes(e)) {
                                    selected = true
                                    return
                                }
                            })
                            if (!selected) {
                                selected = props.simpleFilter.include.includes(item.ScriptName)
                            }
                        }
                    }

                    return (
                        <AutoCard size={"small"} style={{marginBottom: 4}} bodyStyle={{padding: "6px 12px"}}>
                            <PluginListOptInfo
                                info={item}
                                selected={selected}
                                onSelect={() => {
                                    onSelect(selected, item)
                                }}
                            />
                        </AutoCard>
                    )
                }}
            />
            {/* <List
                pagination={false}
                dataSource={data}
                split={false}
                renderItem={(item: YakScript) => {
                    const haveBeenExcluded = props.simpleFilter.exclude.includes(item.ScriptName)
                    let selected = false

                    if (!haveBeenExcluded) {
                        if (props.isAll) {
                            selected = true
                        } else {
                            props.simpleFilter.tags.split(",").forEach((e) => {
                                if (!e) return

                                if (item.Tags.includes(e)) {
                                    selected = true
                                    return
                                }
                            })
                            if (!selected) {
                                selected = props.simpleFilter.include.includes(item.ScriptName)
                            }
                        }
                    }

                    return (
                        <AutoCard size={"small"} style={{marginBottom: 4}} bodyStyle={{padding: "6px 12px"}}>
                            <PluginListOptInfo
                                info={item}
                                selected={selected}
                                onSelect={() => onSelect(selected, item)}
                            />
                        </AutoCard>
                    )
                }}
            ></List> */}
        </AutoCard>
    )
})
