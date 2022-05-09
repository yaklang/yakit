import React, {useDebugValue, useEffect, useState} from "react";
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../schema";
import {AutoCard} from "../../../components/AutoCard";
import {Button, Checkbox, Divider, Form, InputNumber, List, Popconfirm, Space, Spin, Tag} from "antd";
import {FieldName, Fields} from "../../risks/RiskTable";
import {Field} from "ahooks/es/useFusionTable/types";
import {useDebounce, useMemoizedFn} from "ahooks";
import {InputInteger, InputItem, OneLine} from "../../../utils/inputUtil";
import {AutoSpin} from "../../../components/AutoSpin";

export interface QueryYakScriptParamProp {
    params: SimpleQueryYakScriptSchema
    onParams: (param: SimpleQueryYakScriptSchema) => any
}

export interface SimpleQueryYakScriptSchema {
    type: string
    tags: string
    exclude: string[]
    include: string[]
}

const {ipcRenderer} = window.require("electron");

export const QueryYakScriptParamSelector: React.FC<QueryYakScriptParamProp> = React.memo((props) => {
    // 用于存储 tag 的搜索与结果
    const [tags, setTags] = useState<Fields>({Values: []});
    const [topTags, setTopTags] = useState<FieldName[]>([]);
    const [topN, setTopN] = useState(15);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // 更新搜索，这个也可以用于后端保存
    const [params, setParams] = useState<SimpleQueryYakScriptSchema>(props.params)

    useEffect(() => {
        props.onParams(params)
    }, [params])

    // 辅助变量
    const [loading, setLoading] = useState(false);
    const [updateTagsTrigger, setUpdateTagsTrigger] = useState(true);
    const [updateTagsSelectorTrigger, setUpdateTagsSelector] = useState(false);

    // 设置本地搜索 tags 的状态
    const [searchTag, setSearchTag] = useState("");

    // 设置最大最小值
    const [minTagWeight, setMinTagWeight] = useState(1);
    const [maxTagWeight, setMaxTagWeight] = useState(2000);

    const updateTags = () => {
        setUpdateTagsTrigger(!updateTagsTrigger)
    }
    const updateTagsSelector = () => {
        setUpdateTagsSelector(!updateTagsSelectorTrigger)
    }

    const [loadingSelectorFlag, setLoadingSelector] = useState(true);
    const loadingSelector = () => {
        setLoadingSelector(true)
    }


    // 加载 topN
    useEffect(() => {
        setTimeout(() => setLoadingSelector(false), 300)
    }, [loadingSelectorFlag])
    useEffect(() => {
        let count = 0;
        const showTags = tags.Values.filter(d => {
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
        tags,
        useDebounce(minTagWeight, {wait: 500}),
        useDebounce(maxTagWeight, {wait: 500}),
        useDebounce(searchTag, {wait: 500}),
        useDebounce(selectedTags, {wait: 500}),
        useDebounce(topN, {wait: 500}),
        updateTagsSelectorTrigger,
    ])

    const syncTags = useMemoizedFn(() => {
        setParams({
            type: params.type,
            tags: selectedTags.join(","),
            include: params.include,
            exclude: [],
        })
    })

    // 更新 params Tags
    useEffect(() => {
        syncTags()
    }, [useDebounce(selectedTags, {wait: 300})])

    useEffect(() => {
        setTopN(10)
    }, [searchTag])

    // 加载所有标签
    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("GetAvailableYakScriptTags", {}).then((data: Fields) => {
            setTags(data)
        }).catch(e => {
            console.info(e)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [updateTagsTrigger])

    return <AutoCard size={"small"} bordered={true} title={"选择插件"} extra={(
        <Popconfirm title={"强制更新"} onConfirm={() => {
            updateTags()
        }}>
            <a href={"#"}>更新 Tags</a>
        </Popconfirm>
    )} loading={loading} bodyStyle={{display: "flex", flexDirection: "column"}}>
        <Space direction={"vertical"} style={{width: "100%"}}>
            <AutoCard bordered={false} size={"small"} title={(
                <>
                    <Form layout={"inline"} onSubmitCapture={e => {
                        e.preventDefault()
                    }} size={"small"}>
                        <InputItem
                            label={"搜索Tag"}
                            extraFormItemProps={{style: {marginBottom: 0}}}
                            value={searchTag}
                            setValue={setSearchTag}
                        />
                        {/*<InputInteger label={"TOP"} value={topN} setValue={setTopN}/>*/}
                    </Form>
                </>
            )}>
                <Spin spinning={loadingSelectorFlag}>
                    <div>
                        {topTags.map(i => <Tag style={{marginBottom: 4}}>
                            <Checkbox checked={selectedTags.includes(i.Name)} onClick={() => {
                                if (selectedTags.includes(i.Name)) {
                                    return
                                }
                                setSelectedTags([...selectedTags, i.Name])
                            }}>
                                {i.Name}[{i.Total}]
                            </Checkbox>
                        </Tag>)}
                        <Button type={"link"} size={"small"} onClick={() => {
                            setTopN(topN + 10)
                            loadingSelector()
                        }}>展开更多</Button>
                        {topN > 5 && <Button type={"link"} size={"small"} onClick={() => {
                            if (topN - 5 > 0) {
                                setTopN(topN - 5)
                                loadingSelector()
                            }
                        }} danger={true}>减少展示</Button>}
                    </div>
                </Spin>
            </AutoCard>
            <AutoCard title={"已选中 Tag"} size={"small"} extra={(
                <Popconfirm title={"清空已选 Tag？"} onConfirm={() => {
                    setSelectedTags([])
                    setParams({type: params.type, tags: "", include: [], exclude: []})
                    updateTagsSelector()
                }}>
                    <Button size={"small"} danger={true}>清空</Button>
                </Popconfirm>
            )}>
                {selectedTags.map(i => {
                    return <Tag style={{marginBottom: 2}} color={"red"} onClose={() => {
                        setSelectedTags(selectedTags.filter(element => i !== element))
                    }} closable={true}>{i}</Tag>
                })}
            </AutoCard>
        </Space>
        <SearchYakScriptForFilter simpleFilter={params} onInclude={(i) => {
            setParams({
                ...params,
                include: [...params.include, i.ScriptName],
                exclude: [...params.exclude.filter(target => i.ScriptName != target)]
            })
        }} onExclude={i => {
            const existedInTag = params.tags.split(",").filter(tag => !!tag).filter(
                tag => i.Tags.includes(tag)
            ).length > 0;
            if (existedInTag) {
                setParams({
                    ...params,
                    exclude: [...params.exclude, i.ScriptName],
                    include: [...params.include.filter(target => i.ScriptName != target)]
                })
            } else {
                setParams({
                    ...params,
                    include: [...params.include.filter(target => i.ScriptName != target)]
                })
            }
        }}/>
    </AutoCard>
});

interface SearchYakScriptForFilterProp {
    simpleFilter: SimpleQueryYakScriptSchema
    onExclude: (i: YakScript) => any
    onInclude: (i: YakScript) => any
}

const SearchYakScriptForFilter: React.FC<SearchYakScriptForFilterProp> = React.memo((props) => {
    const [params, setParams] = useState<QueryYakScriptRequest>({
        ExcludeNucleiWorkflow: true,
        ExcludeScriptNames: [],
        Keyword: "",
        Pagination: genDefaultPagination(10),
        Type: ""
    });
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: genDefaultPagination(10),
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

    useEffect(() => {
        update()
    }, [])

    return <AutoCard
        title={"搜索" + `${props.simpleFilter.tags}`}
        loading={loading} size={"small"} bordered={false}
    >
        <List
            pagination={false}
            dataSource={data}
            split={false}
            renderItem={(item: YakScript) => {
                const haveBeenExcluded = props.simpleFilter.exclude.includes(item.ScriptName);
                let selected = false;
                if (!haveBeenExcluded) {
                    props.simpleFilter.tags.split(",").forEach(e => {
                        if (!e) {
                            return
                        }
                        if (item.Tags.includes(e)) {
                            selected = true
                            return
                        }
                    })
                    if (!selected) {
                        selected = props.simpleFilter.include.includes(item.ScriptName)
                    }
                }

                return <>
                    <AutoCard size={"small"} style={{marginBottom: 4}}>
                        <Checkbox checked={selected} onClick={() => {
                            if (selected) {
                                props.onExclude(item)
                            } else {
                                props.onInclude(item)
                            }
                        }}><OneLine maxWidth={240}
                                    overflow={"eclipse"}>
                            {item.ScriptName}
                        </OneLine>
                        </Checkbox>
                    </AutoCard>
                </>
            }}
        >

        </List>
    </AutoCard>
});