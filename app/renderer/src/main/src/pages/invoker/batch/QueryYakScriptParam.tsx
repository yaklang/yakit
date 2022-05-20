import React, {useEffect, useRef, useState} from "react";
import {Button, Checkbox, Divider, Form, Input, List, Popconfirm, Space, Spin, Tag} from "antd";
import {SearchOutlined} from '@ant-design/icons';
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../schema";
import {FieldName} from "../../risks/RiskTable";
import {useDebounce, useMemoizedFn} from "ahooks";
import {AutoCard} from "../../../components/AutoCard";
import {ItemSelects} from "../../../components/baseTemplate/FormItemUtil";
import {PluginListOptInfo} from "../../../components/businessTemplate/yakitPlugin";

import "./QueryYakScriptParam.css"
import {useHotkeys} from "react-hotkeys-hook";
import {showDrawer, showModal} from "../../../utils/showModal";
import {SaveConfig} from "./SaveConfig";
import {info} from "../../../utils/notification";

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

const {ipcRenderer} = window.require("electron");

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
    const [searchTag, setSearchTag] = useState("");
    // 用于存储 tag 的搜索与结果
    const [topTags, setTopTags] = useState<FieldName[]>([]);
    const [topN, setTopN] = useState(15);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // 更新搜索，这个也可以用于后端保存
    const [params, setParams] = useState<SimpleQueryYakScriptSchema>(props.params)

    useEffect(() => {
        props.onParams(params)
    }, [params])

    // 辅助变量
    const [updateTagsSelectorTrigger, setUpdateTagsSelector] = useState(false);

    // 设置最大最小值
    const [minTagWeight, setMinTagWeight] = useState(1);
    const [maxTagWeight, setMaxTagWeight] = useState(2000);

    useEffect(() => {
        let count = 0;
        const showTags = allTag.filter(d => {
            if (
                count <= topN // 限制数量
                && d.Total >= minTagWeight && d.Total <= maxTagWeight
                && !selectedTags.includes(d.Name)
                && d.Name.toLowerCase().includes(searchTag.toLowerCase()) // 设置搜索结果
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
        updateTagsSelectorTrigger,
    ])

    const updateTagsSelector = () => {
        setUpdateTagsSelector(!updateTagsSelectorTrigger)
    }
    const syncTags = useMemoizedFn(() => {
        setParams({
            type: params.type,
            tags: selectedTags.join(","),
            include: params.include,
            exclude: [],
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

    const selectedAll = useMemoizedFn(() => {
        if (!selectRef || !selectRef.current) return
        const ref = selectRef.current as unknown as HTMLDivElement
        ref.blur()
        setTimeout(() => {
            onIsAll(true)
            setItemSelects([])
            setSearchTag("")
            setParams({type: params.type, tags: "", include: [], exclude: []})
        }, 200);
    })
    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>
                    <div className="select-render-all" onClick={selectedAll}>全选</div>
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
                    <SaveConfig QueryConfig={params} onSave={filename => {
                        info(`保存到 ${filename}`)
                        m.destroy()
                    }}/>
                </>
            ),
        })
    })
    useHotkeys("alt+p", saveConfigTemplate)

    return (
        <AutoCard
            size={"small"}
            bordered={true}
            title={"选择插件"}
            extra={
                <Space>

                    <Popconfirm
                        title={"强制更新"}
                        onConfirm={() => onAllTag()}
                    >
                        <a href={"#"}>更新 Tags</a>
                    </Popconfirm>
                </Space>
            }
            loading={loading}
            bodyStyle={{display: "flex", flexDirection: "column", overflow: "hidden"}}
        >
            <div className="div-width-100" style={{maxHeight: 237}}>
                <div className="div-width-100">
                    <Form size="small">
                        <ItemSelects
                            item={{
                                style: {marginBottom: 0},
                                label: "设置Tag"
                            }}
                            select={{
                                ref: selectRef,
                                className: "div-width-100",
                                allowClear: true,
                                autoClearSearchValue: false,
                                maxTagCount: "responsive",
                                mode: "multiple",
                                data: topTags,
                                optValue: "Name",
                                optionLabelProp: "Name",
                                renderOpt: (info: FieldName) => {
                                    return <div style={{display: "flex", justifyContent: "space-between"}}>
                                        <span>{info.Name}</span><span>{info.Total}</span></div>
                                },
                                value: itemSelects,
                                onSearch: (keyword: string) => setSearchTag(keyword),
                                setValue: (value) => setItemSelects(value),
                                onDropdownVisibleChange: (open) => {
                                    if (open) {
                                        setItemSelects([])
                                        setSearchTag("")
                                    } else {
                                        const filters = itemSelects.filter(item => !selectedTags.includes(item))
                                        setSelectedTags(selectedTags.concat(filters))
                                        setItemSelects([])
                                        setSearchTag("")
                                    }
                                },
                                onPopupScroll: (e) => {
                                    const {target} = e
                                    const ref: HTMLDivElement = target as unknown as HTMLDivElement
                                    if (ref.scrollTop + ref.offsetHeight === ref.scrollHeight) {
                                        setSelectLoading(true)
                                        setTopN(topN + 10)
                                    }
                                },
                                dropdownRender: (originNode: React.ReactNode) => selectDropdown(originNode)
                            }}
                        ></ItemSelects>
                    </Form>
                </div>

                <Divider style={{margin: "6px 0"}}/>

                {(isAll || selectedTags.length !== 0) && (
                    <div className='div-width-100 div-height-100' style={{maxHeight: 200}}>
                        <AutoCard
                            size='small'
                            title={"已选中 Tag"}
                            bodyStyle={{overflow: "hidden auto"}}
                            extra={
                                <Popconfirm
                                    title={"清空已选 Tag？"}
                                    onConfirm={() => {
                                        onIsAll(false)
                                        setSelectedTags([])
                                        setParams({type: params.type, tags: "", include: [], exclude: []})
                                        updateTagsSelector()
                                    }}
                                >
                                    <Button size={"small"} danger={true}>
                                        清空
                                    </Button>
                                </Popconfirm>
                            }
                        >
                            {isAll ? (
                                <Tag
                                    style={{marginBottom: 2}}
                                    color={"blue"}
                                    onClose={() => {
                                        onIsAll(false)
                                        setSelectedTags([])
                                        setParams({type: params.type, tags: "", include: [], exclude: []})
                                        updateTagsSelector()
                                    }}
                                    closable={true}
                                >
                                    全选
                                </Tag>
                            ) : (
                                selectedTags.map((i) => {
                                    return (
                                        <Tag
                                            key={i}
                                            style={{marginBottom: 2}}
                                            color={"blue"}
                                            onClose={() => {
                                                setSelectedTags(selectedTags.filter((element) => i !== element))
                                            }}
                                            closable={true}
                                        >
                                            {i}
                                        </Tag>
                                    )
                                })
                            )}
                        </AutoCard>
                    </div>
                )}
            </div>

            <div style={{flex: 1, overflow: "hidden", paddingTop: 6}}>
                <SearchYakScriptForFilter
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
                        const existedInTag = isAll ? true :
                            params.tags
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
});

interface SearchYakScriptForFilterProp {
    simpleFilter: SimpleQueryYakScriptSchema
    isAll: boolean
    onExclude: (i: YakScript) => any
    onInclude: (i: YakScript) => any
}

const SearchYakScriptForFilter: React.FC<SearchYakScriptForFilterProp> = React.memo((props) => {
    const [params, setParams] = useState<QueryYakScriptRequest>({
        ExcludeNucleiWorkflow: true,
        ExcludeScriptNames: [],
        Keyword: "",
        Pagination: genDefaultPagination(20),
        Type: "mitm,port-scan,nuclei"
    });
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    });
    const [loading, setLoading] = useState(false)
    const data = response.Data;

    const update = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("QueryYakScript", {...params,}).then((data: QueryYakScriptsResponse) => {
            setResponse(data)
        }).catch(e => {
            console.info(e)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    const onSelect = useMemoizedFn((selected: boolean, item: YakScript) => {
        if (selected) {
            props.onExclude(item)
        } else {
            props.onInclude(item)
        }
    })

    useEffect(() => {
        update()
    }, [useDebounce(params.Keyword, {wait: 500})])

    return (
        <AutoCard
            title={
                <Input
                    allowClear={true}
                    prefix={<SearchOutlined/>}
                    placeholder="搜索插件"
                    value={params.Keyword}
                    onChange={(e) => setParams({...params, Keyword: e.target.value})}
                />
            }
            loading={loading}
            size={"small"}
            bordered={false}
            headStyle={{padding: 0, borderBottom: "0px"}}
            bodyStyle={{padding: "0 0 12px 0", overflow: "hidden auto"}}
        >
            <List
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
            ></List>
        </AutoCard>
    )
});