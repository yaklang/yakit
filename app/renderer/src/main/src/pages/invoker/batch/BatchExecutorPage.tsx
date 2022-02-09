import React, {Ref, useEffect, useRef, useState} from "react";
import {queryYakScriptList} from "../../yakitStore/network";
import {Button, Card, Checkbox, Divider, Form, List, Popover, Progress, Space, Tabs, Tag, Tooltip} from "antd";
import {AutoCard} from "../../../components/AutoCard";
import {
    CopyableField,
    InputFileNameItem,
    InputInteger,
    InputItem,
    OneLine,
    SelectOne,
    SwitchItem
} from "../../../utils/inputUtil";
import {ExecResult, QueryYakScriptRequest, YakScript} from "../schema";
import {QuestionCircleOutlined, SearchOutlined, SettingOutlined, UserOutlined} from "@ant-design/icons"
import {useCreation, useGetState, useMemoizedFn, useSize, useVirtualList} from "ahooks";
import ReactResizeDetector from "react-resize-detector";
import {showModal} from "../../../utils/showModal";
import {randomString} from "../../../utils/randomUtil";
import {failed} from "../../../utils/notification";
import {ExecBatchYakScriptResult} from "./YakBatchExecutorLegacy";
import moment from "moment";
import {ExecResultsViewer} from "./ExecMessageViewer";

export interface BatchExecutorPageProp {

}

const {ipcRenderer} = window.require("electron");

/*
* message ExecBatchYakScriptRequest {
  // 目标会被自动拆分
  string Target = 1;
  string TargetFile = 11;

  // 额外参数可以被添加
  repeated ExecParamItem ExtraParams = 7;

  // 筛选与限制
  string Keyword = 2;
  string ExcludedYakScript = 22;
  int64 Limit = 3;

  // 默认总用时
  int64 TotalTimeoutSeconds = 4;

  // 模块类型，默认为 nuclei
  string Type = 5;

  // 并发
  int64 Concurrent = 6;

  // 精确使用脚本名称
  repeated string ScriptNames = 8;
}
* */
const StartExecBatchYakScript = (target: TargetRequest, names: string[], token: string) => {
    const params = {
        Target: target.target,
        TargetFile: target.targetFile,
        ScriptNames: names,
        Concurrent: 5,
        TotalTimeoutSeconds: 1800,
    };
    return ipcRenderer.invoke("ExecBatchYakScript", params, token)
};

const CancelBatchYakScript = (token: string) => {
    return ipcRenderer.invoke("cancel-ExecBatchYakScript", token)
}

export const BatchExecutorPage: React.FC<BatchExecutorPageProp> = (props) => {
    const [pluginType, setPluginType] = useState<"yak" | "nuclei">("yak");
    const [loading, setLoading] = useState(false);
    const [limit, setLimit] = useState(200);
    const [scripts, setScripts, getScripts] = useGetState<YakScript[]>([]);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [indeterminate, setIndeterminate] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [executing, setExecuting] = useState(false);
    const [token, setToken] = useState<string>(randomString(40));
    const [percent, setPercent] = useState(0.0);

    // 处理性能问题
    const containerRef = useRef();
    const wrapperRef = useRef();
    const [list] = useVirtualList(getScripts(), {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 50, overscan: 20,
    })
    const [vlistHeigth, setVListHeight] = useState(600);

    useEffect(() => {
        const totalYakScript = scripts.length;
        if (totalYakScript <= 0 || selected.length <= 0) {
            setIndeterminate(false)
            return
        }

        if (selected.length > 0) {
            if (selected.length > scripts.length) {
                setIndeterminate(true)
            } else if (selected.length === scripts.length) {
                setIndeterminate(false)
            } else {
                setIndeterminate(scripts.length > selected.length)
            }
        }
    }, [selected, scripts])

    const search = useMemoizedFn(() => {
        setLoading(true)
        queryYakScriptList(
            pluginType,
            (data, total) => {
                setTotal(total || 0)
                setScripts(data)
            }, () => setTimeout(() => setLoading(false), 300),
            limit, keyword,
            (pluginType === "yak" ? {
                IsBatch: true
            } : {
                ExcludeNucleiWorkflow: true,
            }) as any,
        )
    })

    useEffect(() => {
        setSelected([]);
        if (!pluginType) return;
        search()
    }, [pluginType])

    const selectYakScript = useMemoizedFn((y: YakScript) => {
        if (!selected.includes(y.ScriptName)) {
            setSelected([...selected, y.ScriptName])
        }
    });

    const unselectYakScript = useMemoizedFn((y: YakScript) => {
        setSelected(selected.filter(i => i !== y.ScriptName))
    })

    const renderListItem = useMemoizedFn((y: YakScript) => {
        return <YakScriptWithCheckboxLine
            selected={selected.includes(y.ScriptName)} plugin={y} onSelected={selectYakScript}
            onUnselected={unselectYakScript}
        />
    });

    const run = useMemoizedFn((t: TargetRequest) => {
        setPercent(0)
        StartExecBatchYakScript(t, selected, token).then(() => {
            setExecuting(true)
        }).catch(e => {
            failed(`启动批量执行插件失败：${e}`)
        })
    });
    const cancel = useMemoizedFn(() => {
        CancelBatchYakScript(token).then()
    });

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {
            try {
                if (data.ProgressMessage) {
                    setPercent(data.ProgressPercent)
                    return
                }
            } catch (e) {
                console.info(e)
            }

        })
        ipcRenderer.on(`${token}-error`, async (e, data) => {
            failed(`批量执行插件遇到问题: ${data}`)
        })
        ipcRenderer.on(`${token}-end`, async (e) => {
            setTimeout(() => setExecuting(false), 300)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "row"}}>
        <div style={{width: 400, height: "100%"}}>
            {/*<AutoSpin*/}
            {/*    spinning={loading}*/}
            {/*>*/}
            <AutoCard
                size={"small"}
                bordered={false}
                title={<Space>
                    <SelectOne label={"插件"} formItemStyle={{marginBottom: 0}} size={"small"} data={[
                        {text: "YAK 插件", value: "yak"},
                        {text: "YAML POC", value: "nuclei"},
                    ]} value={pluginType} setValue={setPluginType}/>
                </Space>}
                bodyStyle={{
                    paddingLeft: 4,
                    paddingRight: 4,
                    overflow: "hidden", display: "flex", flexDirection: "column",
                }}
                extra={<Space>
                    <Popover title={"额外设置"} trigger={["click"]} content={<div>
                        <Form size={"small"} onSubmitCapture={e => {
                            e.preventDefault()

                            search()
                        }}>
                            <InputInteger
                                label={"插件展示数量"} value={limit} setValue={setLimit}
                                formItemStyle={{marginBottom: 4}}
                            />
                            <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                                <Button type="primary" htmlType="submit">刷新</Button>
                            </Form.Item>
                        </Form>
                    </div>}>
                        <Button size={"small"} icon={<SettingOutlined/>} type={"link"}/>
                    </Popover>
                    <Popover title={"搜索插件关键字"} trigger={["click"]} content={<div>
                        <Form size={"small"} onSubmitCapture={e => {
                            e.preventDefault()

                            search()
                        }}>
                            <InputItem
                                label={""}
                                extraFormItemProps={{style: {marginBottom: 4}, colon: false}}
                                value={keyword}
                                setValue={setKeyword}
                            />
                            <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                                <Button type="primary" htmlType="submit">搜索</Button>
                            </Form.Item>
                        </Form>
                    </div>}>
                        <Button size={"small"} type={!!keyword ? "primary" : "link"} icon={<SearchOutlined/>}/>
                    </Popover>
                    <Checkbox indeterminate={indeterminate} onChange={(r) => {
                        if (r.target.checked) {
                            const newSelected = [...scripts.map(i => i.ScriptName), ...selected];
                            setSelected(newSelected.filter((e, index) => newSelected.indexOf(e) === index));
                        } else {
                            setSelected([]);
                        }
                    }} checked={scripts.length === selected.length}>
                        全选
                    </Checkbox>
                </Space>}
            >
                <div style={{flex: "1", overflow: "hidden"}}>
                    <ReactResizeDetector
                        onResize={(width, height) => {
                            if (!width || !height) {
                                return
                            }
                            setVListHeight(height)
                        }}
                        handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={50}
                    />
                    <div ref={containerRef as any} style={{height: vlistHeigth, overflow: "auto"}}>
                        <div ref={wrapperRef as any}>
                            {list.map(i => renderListItem(i.data))}
                        </div>
                    </div>
                </div>
            </AutoCard>
            {/*</AutoSpin>*/}
        </div>
        <div style={{marginLeft: 12, flex: 1, backgroundColor: "#fff"}}>
            <AutoCard
                title={<Space>
                    {"已选插件 / 当页插件 / 插件总量"}
                    <Tag>{`${selected.length} / ${scripts.length} / ${total}`}</Tag>
                </Space>}
                size={"small"} bordered={false}
                extra={<Space>
                    {(percent > 0 || executing) && <div style={{width: 200}}>
                        <Progress status={executing ? "active" : undefined} percent={
                            parseInt((percent * 100).toFixed(0))
                        }/>
                    </div>}
                </Space>}
                bodyStyle={{display: "flex", flexDirection: "column"}}
            >
                <ExecSelectedPlugins selected={selected} onSubmit={run} onCancel={cancel} loading={executing}/>
                <Divider style={{margin: 4}}/>
                <div style={{flex: '1'}}>
                    <AutoCard style={{padding: 4}} bodyStyle={{padding: 4}} bordered={false}>
                        <BatchExecutorResultUI token={token}/>
                    </AutoCard>
                </div>
            </AutoCard>
        </div>
    </div>
};

export interface YakScriptWithCheckboxLineProp {
    plugin: YakScript
    selected: boolean,
    onSelected: (i: YakScript) => any
    onUnselected: (i: YakScript) => any
}

export const YakScriptWithCheckboxLine: React.FC<YakScriptWithCheckboxLineProp> = (props) => {
    const {plugin} = props;
    const script = plugin;

    return <Card
        key={plugin.ScriptName} style={{marginBottom: 6}} size={"small"}
        bodyStyle={{paddingLeft: 12, paddingTop: 8, paddingBottom: 8, paddingRight: 12}}
        hoverable={true}
    >
        <div style={{width: "100%", display: "flex", flexDirection: "row"}}>
            <Checkbox style={{marginBottom: 0}} checked={props.selected} onChange={r => {
                if (r.target.checked) {
                    props.onSelected(plugin)
                } else {
                    props.onUnselected(plugin)
                }
            }}>
                <Space>
                    <OneLine maxWidth={270} overflow={"hidden"}>{plugin.ScriptName}</OneLine>
                    {script.Help && <Button
                        size={"small"} type={"link"} onClick={() => {
                        showModal({
                            width: "40%",
                            title: "Help", content: <>
                                {script.Help}
                            </>
                        })
                    }}
                        icon={<QuestionCircleOutlined/>}/>}
                </Space>
            </Checkbox>
            <div style={{flex: 1, textAlign: "right"}}>
                {script.Author && <Tooltip title={script.Author}>
                    <Button size={"small"} type={"link"} icon={<UserOutlined/>}/>
                </Tooltip>}
            </div>
        </div>
    </Card>
};

interface ExecSelectedPluginsProp {
    selected: string[]
    onSubmit: (target: TargetRequest) => any
    loading?: boolean
    onCancel: () => any
}

interface TargetRequest {
    target: string
    targetFile: string
    allowFuzz: boolean
    concurrent: number
    totalTimeout: number
}

const ExecSelectedPlugins: React.FC<ExecSelectedPluginsProp> = React.memo((props) => {
    const [multiline, setMultiline] = useState(false);
    const [target, setTarget] = useState<TargetRequest>({
        allowFuzz: true, target: "", targetFile: "",
        concurrent: 5, totalTimeout: 1800,
    });
    const {selected} = props;

    return <div style={{marginTop: 20}}>
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            layout={"horizontal"}
            onSubmitCapture={e => {
                e.preventDefault()

                props.onSubmit(target)
            }}
        >
            <InputItem textareaRow={5} textarea={multiline} help={<Space>
                <SelectOne data={[
                    {value: false, text: "单行"},
                    {value: true, text: "多行"},
                ]} size={"small"} formItemStyle={{marginBottom: 10}} value={multiline} setValue={setMultiline}/>
                {target.targetFile &&
                <Form.Item style={{marginBottom: 10}}>
                    <Tag color={"geekblue"}>
                        <Space>
                            目标文件：<CopyableField text={target.targetFile} width={100} tooltip={true}/>
                        </Space>
                    </Tag>
                </Form.Item>}
            </Space>} value={target.target} label={"输入目标"}
                       setValue={targetRaw => setTarget({...target, target: targetRaw})}/>

            <Form.Item colon={false} label={" "}>
                <Space>
                    <Button type="primary" htmlType="submit"
                            disabled={props.loading ? false : selected.length === 0}
                            loading={props.loading}> 执行任务 </Button>
                    {props.loading && <Button
                        type="primary" danger={true}
                        disabled={props.loading ? false : selected.length === 0}
                        onClick={props.onCancel}
                    > 停止执行该任务 </Button>}
                    <Popover title={"额外配置"} content={<div style={{width: 340}}>
                        <Form
                            layout={"horizontal"} size={"small"}
                            onSubmitCapture={e => e.preventDefault()}
                        >
                            <InputInteger label={"设置并发"} value={target.concurrent}
                                          setValue={c => setTarget({...target, concurrent: c})}
                                          formItemStyle={{marginBottom: 4}}
                            />
                            <InputInteger label={"总超时时间"} value={target.totalTimeout}
                                          setValue={t => setTarget({...target, totalTimeout: t})}
                                          formItemStyle={{marginBottom: 4}}
                            />
                            <SwitchItem
                                label={"允许 Fuzz 语法"} value={target.allowFuzz}
                                setValue={e => setTarget({...target, allowFuzz: e})}
                                formItemStyle={{marginBottom: 4}}
                            />
                            <InputFileNameItem
                                label={"上传目标文件"} filename={target.targetFile} accept={["text/plain"]}
                                setFileName={e => setTarget({...target, targetFile: e})}
                            />
                        </Form>
                    </div>} trigger={["click"]}>
                        <Button type="link"> 额外配置 </Button>
                    </Popover>
                </Space>
            </Form.Item>
        </Form>
    </div>
});

interface BatchExecutorResultUIProp {
    token: string
}

interface BatchTask {
    PoC: YakScript
    Target: string
    ExtraParam: { Key: string, Value: string }[]
    TaskId: string
    Results: ExecBatchYakScriptResult[]
    CreatedAt: number
}

const BatchExecutorResultUI: React.FC<BatchExecutorResultUIProp> = (props) => {
    const [total, setTotal] = useState(0);
    const [finished, setFinished] = useState(0);
    const [activeTask, setActiveTask] = useState<BatchTask[]>([]);
    const allTasksMap = useCreation<Map<string, BatchTask>>(() => {
        return new Map<string, BatchTask>()
    }, [])
    const [allTasks, setAllTasks] = useState<BatchTask[]>([]);

    useEffect(() => {
        const update = () => {
            const result: BatchTask[] = [];
            allTasksMap.forEach(value => {
                result.push(value)
            })
            setAllTasks(result);
        }
        update()
        const id = setInterval(update, 3000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        const activeTask = new Map<string, ExecBatchYakScriptResult[]>();
        ipcRenderer.on(`${props.token}-data`, async (e, data: ExecBatchYakScriptResult) => {
            // 处理进度信息
            if (data.ProgressMessage) {
                setTotal(data.ProgressTotal || 0)
                setFinished(data.ProgressCount || 0)
                return
            }

            // 处理其他任务信息
            const taskId: string = data.TaskId || "";
            if (taskId === "") {
                return
            }

            // 缓存内容
            let result = activeTask.get(taskId);
            if (!result) {
                result = []
            }
            result.push(data)
            activeTask.set(taskId, result)

            // 设置状态
            if (data.Status === "end") {
                activeTask.delete(taskId)
                return
            }

            // 看一下输出结果
            if (data.Result && data.Result.IsMessage) {
                console.info(new Buffer(data.Result.Message).toString())
            }
        })

        let cached = "";
        const syncActiveTask = () => {
            if (activeTask.size <= 0) {
                setActiveTask([]);
                return
            }
            const result: BatchTask[] = [];
            const tasks: string[] = [];
            activeTask.forEach(value => {
                if (value.length <= 0) {
                    return
                }

                const first = value[0];
                const task = {
                    Target: first.Target || "",
                    ExtraParam: first.ExtraParams || [],
                    PoC: first.PoC,
                    TaskId: first.TaskId,
                    CreatedAt: first.Timestamp,
                } as BatchTask;
                task.Results = value;
                result.push(task)
                tasks.push(`${value.length}` + task.TaskId)
            })

            const tasksRaw = tasks.sort().join("|")
            if (tasksRaw !== cached) {
                cached = tasksRaw
                setActiveTask(result)
                result.forEach((value) => {
                    allTasksMap.set(value.TaskId, value)
                })
            }
        }

        let id = setInterval(syncActiveTask, 1000);
        return () => {
            clearInterval(id);
        }
    }, [props.token])
    return <div style={{height: "100%", overflow: "auto"}}>
        <Tabs>
            <Tabs.TabPane tab={"执行中的任务"} key={"executing"}>
                <List<BatchTask>
                    pagination={false}
                    dataSource={activeTask.sort((a, b) => a.TaskId.localeCompare(b.TaskId))}
                    renderItem={(task: BatchTask) => {
                        const res = task.Results[task.Results.length - 1];
                        return (
                            <Card
                                bordered={false}
                                style={{marginBottom: 8, width: "100%"}}
                                size={"small"}
                                title={<Space>
                                    {task.Target + " / " + task.PoC.ScriptName}
                                    <Timer fromTimestamp={task.CreatedAt}/>
                                </Space>}>
                                <div style={{width: "100%"}}>
                                    <ExecResultsViewer
                                        results={task.Results.map(i => i.Result).filter(i => !!i) as ExecResult[]}
                                        oneLine={true}
                                    />
                                </div>
                            </Card>
                        )
                    }}
                />
            </Tabs.TabPane>
            <Tabs.TabPane tab={`历史任务列表[${allTasks.length}]`} key={"results"} forceRender={true}>
                <BatchTaskViewer tasks={allTasks}/>
            </Tabs.TabPane>
        </Tabs>
    </div>
};

interface TimerProp {
    fromTimestamp: number
    color?: any
}

const Timer: React.FC<TimerProp> = React.memo((props) => {
    const [duration, setDuration] = useState<number>();

    useEffect(() => {
        const updateTime = () => {
            const durationNow = moment().diff(moment.unix(props.fromTimestamp));
            const seconds = parseInt(`${durationNow / 1000}`);
            setDuration(seconds)
        }
        updateTime()
        let id = setInterval(() => {
            updateTime()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [props.fromTimestamp])

    if (!duration) {
        return <></>
    }
    return <Tag color={props.color || "green"}>已运行{duration}秒</Tag>
});


interface BatchTaskViewerProp {
    tasks: BatchTask[]
}

const BatchTaskViewer: React.FC<BatchTaskViewerProp> = React.memo((props) => {
    const containerRef = useRef();
    const listRef = useRef();
    const [height, setHeight] = useState(300);
    const [list, scrollTo] = useVirtualList<BatchTask>(props.tasks, {
        containerTarget: containerRef,
        wrapperTarget: listRef,
        itemHeight: 50,
        overscan: 5,
    })

    return <AutoCard bodyStyle={{padding: 0}} style={{height: "100%"}}>
        <ReactResizeDetector
            onResize={(width, height) => {
                if (!width || !height) {
                    return
                }
                setHeight(height)
            }}
            handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={50}
        />
        <div ref={containerRef as Ref<any>} style={{height: height, overflow: "auto"}}>
            <div ref={listRef as Ref<any>}>
                {list.map(i => {
                    return <Card style={{height: 50}} bodyStyle={{padding: 4}} bordered={false}>
                        {i.data.TaskId}
                    </Card>
                })}
            </div>
        </div>
    </AutoCard>
});