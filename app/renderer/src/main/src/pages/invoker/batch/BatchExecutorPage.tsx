import React, {Ref, useEffect, useRef, useState} from "react";
import {queryYakScriptList} from "../../yakitStore/network";
import {Button, Card, Checkbox, Col, Divider, Form, List, Popover, Progress, Row, Space, Switch, Tabs, Tag, Tooltip, Typography} from "antd";
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
import {useCreation, useGetState, useMemoizedFn, useVirtualList} from "ahooks";
import ReactResizeDetector from "react-resize-detector";
import {showDrawer, showModal} from "../../../utils/showModal";
import {randomString} from "../../../utils/randomUtil";
import {failed} from "../../../utils/notification";
import {ExecBatchYakScriptResult} from "./YakBatchExecutorLegacy";
import moment from "moment";
import {ExecResultLog, ExecResultMessage, ExecResultProgress, ExecResultsViewer} from "./ExecMessageViewer";
import { formatTimestamp } from "../../../utils/timeUtil";

import "./BatchExecutorPage.css"
import { CacheStatusCardProps } from "../../../hook/useHoldingIPCRStream";
import { writeExecResultXTerm } from "../../../utils/xtermUtils";
import { PluginResultUI, StatusCardInfoProps, StatusCardProps } from "../../yakitStore/viewers/base";

export interface BatchExecutorPageProp {

}

const {ipcRenderer} = window.require("electron");
const ExecuteTaskHistory='execute-task-history'
const {Text} = Typography

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

interface TaskHistoryProps{
    target: TargetRequest
    selected: string[]
    pluginType: "yak" | "nuclei"
    limit: number
    keyword: string
    time: string
} 

const StartExecBatchYakScript = (target: TargetRequest, names: string[], token: string) => {
    const params = {
        Target: target.target,
        TargetFile: target.targetFile,
        ScriptNames: names,
        Concurrent: target.concurrent || 5,
        TotalTimeoutSeconds: target.totalTimeout || 1800,
    };
    return ipcRenderer.invoke("ExecBatchYakScript", params, token)
};

const CancelBatchYakScript = (token: string) => {
    return ipcRenderer.invoke("cancel-ExecBatchYakScript", token)
}

export const BatchExecutorPage: React.FC<BatchExecutorPageProp> = (props) => {
    const [loading, setLoading] = useState(false);
    const [pluginType, setPluginType] = useState<"yak" | "nuclei">("yak");
    const [limit, setLimit] = useState(200);
    const [keyword, setKeyword] = useState("");
    const [scripts, setScripts, getScripts] = useGetState<YakScript[]>([]);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [indeterminate, setIndeterminate] = useState(false);
    const [checked, setChecked] = useState(false)
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

    // 执行任务历史列表
    const [taskHistory, setTaskHistory] = useState<TaskHistoryProps[]>([])

    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("get-value", ExecuteTaskHistory)
            .then((res: any) => {
                setTaskHistory(res ? JSON.parse(res) : [])
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    }, [])

    useEffect(() => {
        const totalYakScript = scripts.length;
        const filterArr = scripts.filter((item) => selected.indexOf(item.ScriptName) > -1)

        const IndeterminateFlag =
            (filterArr.length > 0 && filterArr.length < totalYakScript && selected.length !== 0) ||
            (filterArr.length === 0 && selected.length !== 0)
        const checkedFlag = filterArr.length === totalYakScript && selected.length !== 0

        setIndeterminate(IndeterminateFlag)
        setChecked(checkedFlag)
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
            key={y.ScriptName}
            selected={selected.includes(y.ScriptName)} plugin={y} onSelected={selectYakScript}
            onUnselected={unselectYakScript}
        />
    });

    const run = useMemoizedFn((t: TargetRequest) => {
        setPercent(0)

        //@ts-ignore
        const time = Date.parse(new Date()) / 1000
        const obj: TaskHistoryProps = {
            target: t,
            selected: selected,
            pluginType: pluginType,
            limit: limit,
            keyword: keyword || "",
            time: formatTimestamp(time)
        }
        const arr=[...taskHistory]
        if(taskHistory.length===10) arr.pop()
        arr.unshift(obj)
        setTaskHistory(arr)
        ipcRenderer.invoke("set-value", ExecuteTaskHistory, JSON.stringify(arr))

        const tokens=randomString(40)
        setToken(tokens)
        StartExecBatchYakScript(t, selected, tokens).then(() => {
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

    const executeHistory=useMemoizedFn((item: TaskHistoryProps)=>{
        setLoading(true)
        setLimit(item.limit)
        setKeyword(item.keyword)

        if(item.pluginType === pluginType) setTimeout(() => search(), 300); 
        else setPluginType(item.pluginType)

        setTimeout(() => {
            setSelected(item.selected)
            setLoading(false)
        }, 300);
    })

    return <div style={{width: "100%", height: "100%", display: "flex", overflowY: "hidden"}}>
        <div style={{width: 470, height: "100%"}}>
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
                    }} checked={checked}>
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
        <div style={{marginLeft: 12, flex: 1, backgroundColor: "#fff", overflow: "hidden"}}>
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
                bodyStyle={{display: "flex", flexDirection: "column", padding: '0 5px', overflow: "hidden"}}
            >
                <ExecSelectedPlugins
                    selected={selected}
                    onSubmit={run}
                    onCancel={cancel}
                    executing={executing}
                    loading={loading}
                    history={taskHistory}
                    executeHistory={executeHistory}
                />
                <Divider style={{margin: 4}}/>
                <div style={{flex: '1', overflow: "hidden"}}>
                    <AutoCard style={{padding: 4}} bodyStyle={{padding: 4, overflow: "hidden"}} bordered={false}>
                        <BatchExecutorResultUI token={token} executing={executing}/>
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
    executing?: boolean
    onCancel: () => any

    history: TaskHistoryProps[]
    executeHistory: (item: TaskHistoryProps) => any
}

interface TargetRequest {
    target: string
    targetFile: string
    allowFuzz: boolean
    concurrent: number
    totalTimeout: number
}

const ExecSelectedPlugins: React.FC<ExecSelectedPluginsProp> = React.memo((props) => {
    const [target, setTarget] = useState<TargetRequest>({
        allowFuzz: true, target: "", targetFile: "",
        concurrent: 5, totalTimeout: 1800,
    });
    const {loading, executing, selected, history, executeHistory} = props;

    return <div style={{marginTop: 20}}>
        <Form
            layout={"horizontal"}
            onSubmitCapture={e => {
                e.preventDefault()
                if(!target.target && !target.targetFile){
                    failed('请输入目标或上传目标文件夹绝对路径!')
                    return
                }

                props.onSubmit(target)
            }}
        >
            <InputItem 
                style={{marginBottom: 0}}
                width={'80%'}
                textareaRow={1} 
                textarea={true} 
                value={target.target} 
                label={"输入目标"}
                setValue={targetRaw => setTarget({...target, target: targetRaw})}
                suffixNode={
                    <div style={{display: 'inline-block', marginLeft: 5, marginBottom: 4}}>
                        {executing ? (
                            <Button
                                type='primary'
                                danger={true}
                                disabled={executing ? false : selected.length === 0}
                                onClick={props.onCancel}
                            >
                                {" "}
                                停止执行{" "}
                            </Button>
                        ) : (
                            <Button
                                type='primary'
                                htmlType='submit'
                                disabled={executing ? false : selected.length === 0}
                                loading={loading}
                            >
                                执行任务
                            </Button>
                        )}
                    </div>
                }
            />

            <div style={{paddingLeft: 70}}>
                <Space>
                    <Tag>并发: {target.concurrent}</Tag>
                    <Tag>总超时: {target.totalTimeout}</Tag>
                    {target.targetFile &&
                            <Tag color={"geekblue"}>
                                <Space>
                                    目标文件：<CopyableField text={target.targetFile} maxWidth={100} tooltip={true}/>
                                </Space>
                            </Tag>
                    }
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
                        <Button type="link" style={{padding: 4}}> 额外配置 </Button>
                    </Popover>
                    {history.length !== 0 && (
                            <Popover
                                title={"历史任务(选择后可回显目标与poc)"}
                                trigger={["click"]}
                                placement='bottom'
                                content={
                                    <div className='history-list-body'>
                                        {history.map((item) => {
                                            return (
                                                <div
                                                    className='list-opt'
                                                    key={item.time}
                                                    onClick={() => {
                                                        if(executing) return
                                                        executeHistory(item)
                                                        setTarget({...item.target})
                                                    }}
                                                >
                                                    {item.time}
                                                </div>
                                            )
                                        })}
                                    </div>
                                }
                            >
                                <Button type='link' style={{padding: 4}}>
                                    {" "}
                                    历史任务{" "}
                                </Button>
                            </Popover>
                        )}
                </Space>
            </div>
        </Form>
    </div>
});

interface BatchExecutorResultUIProp {
    token: string
    executing?: boolean
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
            if (taskId === "") return

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
            // if (data.Result && data.Result.IsMessage) {
            //     console.info(new Buffer(data.Result.Message).toString())
            // }
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
            ipcRenderer.removeAllListeners(`${props.token}-data`)
            allTasksMap.clear()
            setAllTasks([])
            clearInterval(id);
        }
    }, [props.token])

    return <div style={{height: "100%", overflow: "auto"}}>
        <Tabs className="exec-result-body">
            <Tabs.TabPane tab={"执行中的任务"} key={"executing"}>
                <List<BatchTask>
                    style={{height: '100%', overflow: "auto"}}
                    pagination={false}
                    dataSource={activeTask.sort((a, b) => a.TaskId.localeCompare(b.TaskId))}
                    rowKey={(item) => item.TaskId}
                    renderItem={(task: BatchTask) => {
                        const res = task.Results[task.Results.length - 1];
                        return (
                            <Card
                                bordered={false}
                                style={{marginBottom: 8, width: "100%"}}
                                size={"small"}
                                title={
                                    <Row gutter={8}>
                                        <Col span={20}>
                                        <Text ellipsis={{tooltip: true}}>{task.Target + " / " + task.PoC.ScriptName}</Text>
                                        </Col>
                                        <Col span={4}>
                                        <Timer fromTimestamp={task.CreatedAt} executing={!!props.executing}/>
                                        </Col>
                                    </Row>
                                }>
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

    executing?: boolean
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

    if(!props.executing) return <Tag style={{maxWidth: 103}} color={"red"}>已中断</Tag>
    return <Tag style={{maxWidth: 103}} color={props.color || "green"}>已运行{duration}秒</Tag>
});


interface BatchTaskViewerProp {
    tasks: BatchTask[]
}

const BatchTaskViewer: React.FC<BatchTaskViewerProp> = React.memo((props) => {
    const [tasks, setTasks, getTasks] = useGetState<BatchTask[]>([]);
    const [checked,setChecked] = useState<boolean>(false)

    const containerRef = useRef();
    const listRef = useRef();
    const [height, setHeight] = useState(300);
    const [list, scrollTo] = useVirtualList<BatchTask>(getTasks(), {
        containerTarget: containerRef,
        wrapperTarget: listRef,
        itemHeight: 40,
        overscan: 5,
    })

    const [xtermRef, setXtermRef, getXtermRef] = useGetState<any>(null)

    // 转换task内的result数据
    const convertTask = (task: BatchTask) => {
        // @ts-ignore
        const results: ExecResult[] = task.Results.filter((item) => !!item.Result).map((item) => item.Result)

        const messages: ExecResultMessage[] = []
        for (let item of results) {
            if (!item.IsMessage) continue

            try {
                const raw = item.Message
                const obj: ExecResultMessage = JSON.parse(Buffer.from(raw).toString("utf8"))
                messages.push(obj)
            } catch (e) {
                console.error(e)
            }
        }

        return messages
    }

    const statusTag = (task: BatchTask) => {
        const messages: ExecResultMessage[] = convertTask(task)

        const logs: ExecResultLog[] = messages
            .filter((e) => e.type === "log")
            .map((i) => i.content)
            .sort((a: any, b: any) => a.timestamp - b.timestamp) as ExecResultLog[]
        const haveResult = logs.filter((i) => ["json", "success"].includes((i?.level || "").toLowerCase())).length > 0

        return haveResult ? <Tag color={"red"}>HIT</Tag> : "-"
    }

    const details = (task: BatchTask) => {
        const infos: ExecResultMessage[] = convertTask(task)

        const messages: ExecResultMessage[] = []
        const featureMessages: ExecResultMessage[] = []
        const processKVPair: Map<string, number> = new Map<string, number>()
        const statusKVPair: Map<string, CacheStatusCardProps> = new Map<string, CacheStatusCardProps>()

        for (let item of infos) {
            try {
                // 处理 Process KVPair
                if (item.type === "progress") {
                    const processData = item.content as ExecResultProgress
                    if (processData && processData.id) {
                        processKVPair.set(
                            processData.id,
                            Math.max(processKVPair.get(processData.id) || 0, processData.progress)
                        )
                    }
                    return
                }

                // 处理 log feature-status-card-data
                const logData = item.content as ExecResultLog
                if (item.type === "log" && logData.level === "feature-status-card-data") {
                    try {
                        const obj = JSON.parse(logData.data)
                        const {id, data, tags} = obj
                        const {timestamp} = logData
                        const originData = statusKVPair.get(id)
                        if (originData && originData.Timestamp > timestamp) {
                            return
                        }
                        statusKVPair.set(id, {
                            Id: id,
                            Data: data,
                            Timestamp: timestamp,
                            Tags: Array.isArray(tags) ? tags : []
                        })
                    } catch (e) {}
                    return
                }

                if (item.type === "log" && logData.level === "feature-table-data") {
                    try {
                        featureMessages.unshift(item)
                    } catch (e) {}
                    return
                }

                messages.unshift(item)

                // 只缓存 100 条结果（日志类型 + 数据类型）
                if (messages.length > 100) {
                    messages.pop()
                }
            } catch (e) {}
        }

        let results = messages.filter((i) => i.type === "log").map((i) => i.content as ExecResultLog)

        let featureResults = featureMessages
            .filter((i) => i.type === "log")
            .map((i) => i.content as ExecResultLog)
            .filter((i) => i.data !== "null")

        const processes: ExecResultProgress[] = []
        processKVPair.forEach((value, id) => {
            processes.push({id: id, progress: value})
        })
        const cacheStatusKVPair: {[x: string]: StatusCardInfoProps} = {}
        const statusCards: StatusCardProps[] = []
        statusKVPair.forEach((value) => {
            const item = JSON.parse(JSON.stringify(value))
            item.Tag = item.Tags[0] || ""
            delete item.Tags
            statusCards.push(item)
        })
        statusCards.sort((a, b) => a.Id.localeCompare(b.Id))
        for (let item of statusCards) {
            if (item.Tag) {
                if (cacheStatusKVPair[item.Tag]) {
                    cacheStatusKVPair[item.Tag].info.push(item)
                } else {
                    cacheStatusKVPair[item.Tag] = {tag: item.Tag, info: [item]}
                }
            } else {
                cacheStatusKVPair[item.Id] = {tag: item.Id, info: [item]}
            }
        }

        return (
            <PluginResultUI
                loading={false}
                progress={processes.sort((a, b) => a.id.localeCompare(b.id))}
                results={results}
                feature={featureResults}
                statusCards={Object.values(cacheStatusKVPair)}
                onXtermRef={setXtermRef}
            ></PluginResultUI>
        )
    }

    useEffect(()=>{
        if(!checked) setTasks(props.tasks)
    }, [props.tasks])
    useEffect(()=>{
        if(checked){
            const filterTasks: BatchTask[] = getTasks()
                .filter(item => item.Results.length !== 0)
                .filter(item => 
                    (convertTask(item).filter((e) => e.type === "log")
                         .map((i) => i.content)
                         .sort((a: any, b: any) => a.timestamp - b.timestamp) as ExecResultLog[])
                         .filter((i) => ["json", "success"]
                         .includes((i?.level || "").toLowerCase())).length > 0
                )
            setTasks(filterTasks)
        }else{
            setTasks(props.tasks)
        }
    }, [checked])

    return <div style={{width: "100%", height: "100%",display: "flex", flexFlow: "column"}}>
        <div style={{height: 30, width: "100%", padding: "0 0 4px 5px"}}>
            <span style={{display: "inline-block", height: 22,marginRight: 5}}>展示命中项</span>
            <Switch checked={checked} onChange={checked => setChecked(checked)}></Switch>
        </div>
        <div style={{flex: 1, overflow: "hidden"}}>
            <AutoCard bodyStyle={{padding: 0, overflow: "hidden"}} style={{height: "100%"}}>
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
                        return <div className="history-list-task-opt" key={i.data.TaskId}>
                            <Text ellipsis={{tooltip: true}} copyable={true} style={{width: 300}}>{`${i.data.Target} / ${i.data.PoC.ScriptName}`}</Text>
                            <Divider type='vertical'/>
                            {statusTag(i.data)}
                            <Divider type='vertical'/>
                            <Tag color="green">{formatTimestamp(i.data.CreatedAt)}</Tag>
                            <Divider type='vertical'/>
                            <Button type="link" onClick={(e)=>{
                                let m = showDrawer({
                                    title: "poc详情",
                                    keyboard: false,
                                    width: "60%",
                                    onClose: ()=>{
                                        m.destroy()
                                    },
                                    content: (details(i.data))
                                })
                                setTimeout(() => {
                                    // @ts-ignore
                                    const execResults: ExecResult[] = i.data.Results.filter(
                                        (item) => !!item.Result
                                    ).map((item) => item.Result)
                                    for (let item of execResults) writeExecResultXTerm(getXtermRef(), item)
                                }, 500)
                            }}>详情</Button>
                        </div>
                    })}
                </div>
            </div>
            </AutoCard>
        </div>
    </div>
});