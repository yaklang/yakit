import React, {useEffect, useRef, useState} from "react"
import {
    Menu,
    Tabs,
    Popover,
    Button,
    Col,
    Divider,
    Form,
    Input,
    Modal,
    Popconfirm,
    Row,
    Space,
    Spin,
    Tag,
    Typography,
    Empty,
    List,
    Switch
} from "antd"
import {DownCircleTwoTone, UpCircleTwoTone, EditOutlined, DeleteOutlined} from "@ant-design/icons"
import {InputInteger} from "../../../utils/inputUtil"
import {YakScriptManagerPage, YakScriptOperator} from "../YakScriptManager"
import {randomString} from "../../../utils/randomUtil"
import {ExecResult, YakScript} from "../schema"
import {failed, info} from "../../../utils/notification"
import {ExecResultLog, ExecResultMessage, ExecResultsViewer} from "./ExecMessageViewer"
import {showModal} from "../../../utils/showModal"
import {YakEditor} from "../../../utils/editors"
import cloneDeep from "lodash/cloneDeep"
import {TabBarMenu, MenuInfoProps} from "../../../components/TabBarMenu"
import {useGetState, useMemoizedFn, useUpdate, useVirtualList} from "ahooks"
import {ExecBatchYakScriptParams, ExecBatchYakScriptResult, ExecBatchYakScriptTask} from "./YakBatchExecutorLegacy"
import {AutoSpin} from "../../../components/AutoSpin"
import debounce from "lodash/debounce"
import {queryYakScriptList} from "../../yakitStore/network"

import "./YakBatchExecutors.css"

const {ipcRenderer} = window.require("electron")
const CustomBugList = "custom-bug-list"
const {Item} = Menu
const {TabPane} = Tabs
const {Text} = Typography

interface BugInfoProps {
    key: string
    title: string
}

const BugList: BugInfoProps[] = [
    {key: "struts", title: "Struts"},
    {key: "thinkphp", title: "ThinkPHP"},
    {key: "tomcat,Tomcat", title: "Tomcat"},
    {key: "weblogic,Weblogic", title: "Weblogic"},
    {key: "spring", title: "Spring"},
    {key: "jenkins,Jenkins", title: "Jenkins"},
    {key: "iis,IIS", title: "IIS"},
    {key: "ElasticSearch", title: "ElasticSearch"},
    {key: "SeeyouOA,seeyou_oa,seeyouoa,seeyou,Seeyou,致远,Zhiyuan,zhiyuan", title: "致远 OA"},
    {key: "exchange", title: "Exchange"},
    {key: "tongdaoa,TongdaOa,TongDa,TongDaOA", title: "通达 OA"},
    {key: "phpmyadmin,PhpMyAdmin,PHPMyAdmin,Phpmyadmin", title: "PhpMyAdmin"},
    {key: "Nexus,nexus", title: "Nexus"},
    {key: "laravel,Laravel", title: "Laravel"},
    {key: "Jboss,JBoss,jboss", title: "JBoss"},
    {key: "ColdFusion,coldfusion", title: "ColdFusion"},
    {key: "activeMQ,ActiveMQ,activemq", title: "ActiveMQ"},
    {key: "wordpress", title: "Wordpress"}
]

const MenuList: MenuInfoProps[] = [
    {key: "all", title: "关闭所有Tabs"},
    {key: "route", title: "关闭同类Tabs"},
    {key: "other", title: "关闭其他Tabs"}
]

export interface YakBatchExecutorsProp {
    keyword: string
    verbose?: string
}

export const YakBatchExecutors: React.FC<YakBatchExecutorsProp> = (props) => {
    const [tabList, setTabList] = useState<BugInfoProps[]>([
        {
            key: "struts-0",
            title: "Struts-1"
        }
    ])
    const [currentTabKey, setCurrentTabKey] = useState("struts-0")
    const [listCount, setListCount] = useState<number>(2)
    const [collapsed, setCollapsed] = useState<boolean>(false)
    const [menuHeight, setMenuHeight] = useState<number>(400)
    // 自定义POC种类
    const [loading, setLoading] = useState<boolean>(false)
    const [extendList, setExtendList] = useState<BugInfoProps[]>([])
    // 编辑自定义POC种类弹框
    const [visible, setVisible] = useState<boolean>(false)
    const [pocParams, setPocParams] = useState<BugInfoProps>({key: "", title: ""})
    const [pocList, setPocList] = useState<{total: number; data: string[]}>({total: 0, data: []})
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [editInfo, setEditInfo] = useState<BugInfoProps>()

    const clearTab = (id: any, key: any) => {
        const kind = `${id}`.split("-")[0]
        let index
        for (let i in tabList) if (tabList[i].key === id) index = i
        switch (key) {
            case "all":
                setCurrentTabKey("")
                setTabList([])
                return
            case "route":
                const tabs = tabList.filter((item) => item.key.split("-")[0] !== kind)
                setCurrentTabKey(tabs.length !== 0 ? tabs[0].key : "")
                setTabList(tabs)
                break
            case "other":
                const tabInfo = cloneDeep(tabList[index])
                setCurrentTabKey(`${tabInfo.key}-0`)
                setTabList([tabInfo])
                break
        }
    }

    useEffect(() => {
        setMenuHeight(window.innerHeight - 350 >= 200 ? window.innerHeight - 350 : 200)
        let timer: any = null
        window.onresize = () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                setMenuHeight(window.innerHeight - 350 >= 200 ? window.innerHeight - 350 : 200)
            }, 100)
        }
        ipcRenderer.on("bug-test-hidden", (e: any, flag: any) => {
            setCollapsed(true)
        })
        return () => {
            ipcRenderer.removeAllListeners("bug-test-hidden")
        }
    }, [])

    const searchPoc = debounce(
        useMemoizedFn((keyword?: string, page?: number) => {
            setListLoading(true)
            if (keyword) {
                queryYakScriptList(
                    "nuclei",
                    (i: YakScript[], total) => {
                        setPocList({total: total || 0, data: i.map((info) => info.ScriptName)})
                    },
                    () => setTimeout(() => setListLoading(false), 300),
                    10,
                    page || 1,
                    keyword
                )
            } else {
                setPocList({total: 0, data: []})
            }
        }),
        500
    )
    const editPocKind = useMemoizedFn((info: BugInfoProps) => {
        setEditInfo(info)
        setPocParams({key: info.key, title: info.title})
        searchPoc(info.key)
    })
    const delPocKind = useMemoizedFn((index: number) => {
        if (extendList.length !== 0) {
            const arr = cloneDeep(extendList)
            arr.splice(index, 1)
            setExtendList(arr)
            saveExtendList(arr)
        }
    })
    const savePocKind = useMemoizedFn(() => {
        if (!editInfo && !pocParams.key && !pocParams.title) {
            setVisible(false)
            return
        }
        if (!pocParams.key || !pocParams.title) {
            failed("请填写标题和关键词后再次点击")
            return
        }

        let arr = cloneDeep(extendList)
        if (editInfo) {
            for (let i of arr) {
                if (i.key === editInfo.key && i.title === editInfo.title) {
                    i.key = pocParams.key
                    i.title = pocParams.title
                }
            }
        }
        if (!editInfo) arr = arr.concat([pocParams])

        setExtendList(arr)
        saveExtendList(arr)
        setVisible(false)
        clearModal()
    })
    const clearModal = useMemoizedFn(() => {
        setPocParams({key: "", title: ""})
        setEditInfo(undefined)
        setPocList({total: 0, data: []})
    })

    const saveExtendList = useMemoizedFn((arr) => {
        ipcRenderer.invoke("set-value", CustomBugList, JSON.stringify(arr))
    })
    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("get-value", CustomBugList)
            .then((res: any) => {
                setExtendList(res ? JSON.parse(res) : [])
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    }, [])

    return (
        <div style={{width: "100%", height: "100%"}}>
            <Tabs
                className={"bug-test-executor"}
                type='editable-card'
                hideAdd={true}
                size='small'
                renderTabBar={(props, TabBarDefault) => {
                    return TabBarMenu(props, TabBarDefault, MenuList, clearTab)
                }}
                tabBarExtraContent={{
                    left: (
                        <div style={{margin: "0 5px", fontSize: 20}}>
                            <Popover
                                placement='bottomLeft'
                                trigger='click'
                                visible={!collapsed}
                                content={
                                    <div style={{height: menuHeight}}>
                                        <div style={{height: menuHeight - 30}}>
                                            <AutoSpin spinning={loading}>
                                                <Menu
                                                    style={{height: "100%", overflow: "hidden auto"}}
                                                    mode='inline'
                                                    selectedKeys={[]}
                                                    onClick={({key}) => {
                                                        const title = BugList.concat(extendList).filter(
                                                            (item) => item.key === key
                                                        )[0].title
                                                        const tabInfo: BugInfoProps = {
                                                            key: `${key}-${listCount}`,
                                                            title: `${title}-${listCount}`
                                                        }
                                                        setCurrentTabKey(tabInfo.key)
                                                        setTabList(tabList.concat([tabInfo]))
                                                        setListCount(listCount + 1)
                                                    }}
                                                >
                                                    {BugList.concat(extendList).map((item, index) => (
                                                        <Item key={item.key} title={item.title}>
                                                            {item.title}
                                                        </Item>
                                                    ))}
                                                </Menu>
                                            </AutoSpin>
                                        </div>
                                        <div style={{textAlign: "center"}}>
                                            <Button
                                                style={{height: 30}}
                                                type='link'
                                                onClick={() => {
                                                    setVisible(true)
                                                }}
                                            >
                                                配置自定义类型
                                            </Button>
                                        </div>
                                    </div>
                                }
                                onVisibleChange={(value) => setCollapsed(!value)}
                            >
                                {collapsed ? (
                                    <UpCircleTwoTone
                                        onClick={() => {
                                            setCollapsed(false)
                                        }}
                                    />
                                ) : (
                                    <DownCircleTwoTone
                                        onClick={() => {
                                            setCollapsed(true)
                                        }}
                                    />
                                )}
                            </Popover>
                        </div>
                    )
                }}
                activeKey={currentTabKey}
                onChange={setCurrentTabKey}
                onEdit={(key: any, event: string) => {
                    switch (event) {
                        case "remove":
                            const tabs = cloneDeep(tabList)
                            for (let index in tabs)
                                if (tabs[index].key === key) {
                                    tabs.splice(index, 1)
                                    if (tabs.length !== 0) setCurrentTabKey(tabs[0].key)
                                    setTabList(tabs)
                                    return
                                }
                    }
                }}
            >
                {tabList.map((item, index) => {
                    return (
                        <TabPane tab={item.title} key={item.key}>
                            <BugTestExecutor keyword={item.key} verbose={item.title}></BugTestExecutor>
                        </TabPane>
                    )
                })}
            </Tabs>
            <Modal
                title='自定义POC种类'
                width={625}
                visible={visible}
                maskClosable={false}
                okText={editInfo ? "修改" : "新增"}
                cancelText='取消'
                onCancel={() => {
                    setVisible(false)
                    clearModal()
                }}
                onOk={savePocKind}
            >
                <div className='extend-info-body'>
                    <div className='left-body'>
                        <div style={{textAlign: "left"}}>
                            <Button className='add-btn' type='link' onClick={clearModal}>
                                新增
                            </Button>
                        </div>
                        <List
                            className='poc-list'
                            size='small'
                            dataSource={extendList}
                            rowKey={(row) => row.key}
                            renderItem={(item, index) => (
                                <List.Item style={{padding: 0}}>
                                    <div className='list-opt'>
                                        <Text style={{lineHeight: "32px", maxWidth: 165}} ellipsis={{tooltip: true}}>
                                            {item.title}
                                        </Text>
                                        <div>
                                            <Button
                                                style={{padding: "4px 0"}}
                                                type='link'
                                                icon={<EditOutlined />}
                                                onClick={() => editPocKind(item)}
                                            />
                                            <Button
                                                style={{padding: "4px 0"}}
                                                type='link'
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => delPocKind(index)}
                                            />
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </div>
                    <Divider type='vertical' style={{height: "auto"}} />
                    <div className='right-body'>
                        <Form labelCol={{span: 6}}>
                            <Form.Item label='标题'>
                                <Input
                                    placeholder='POC列表展示内容'
                                    value={pocParams.title}
                                    allowClear
                                    onChange={(e) => setPocParams({...pocParams, title: e.target.value})}
                                />
                            </Form.Item>
                            <Form.Item label='关键词'>
                                <Input
                                    placeholder='YAML POC标题的关键词'
                                    value={pocParams.key}
                                    allowClear
                                    onChange={(e) => {
                                        setPocParams({...pocParams, key: e.target.value})
                                        searchPoc(e.target.value)
                                    }}
                                />
                            </Form.Item>
                            <Form.Item style={{marginBottom: 0}}>
                                <List
                                    size='small'
                                    loading={listLoading}
                                    dataSource={pocList.data}
                                    pagination={
                                        pocList.total === 0
                                            ? false
                                            : {
                                                  size: "small",
                                                  total: pocList.total,
                                                  showTotal: (total) => <span>{`共${total}个`}</span>,
                                                  showSizeChanger: false,
                                                  onChange: (page) => searchPoc(pocParams.key, page)
                                              }
                                    }
                                    rowKey={(row) => row}
                                    renderItem={(item) => (
                                        <List.Item>
                                            <Text style={{maxWidth: 290}} ellipsis={{tooltip: true}}>
                                                {item}
                                            </Text>
                                        </List.Item>
                                    )}
                                ></List>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

/*
* message ExecBatchYakScriptRequest {
  string Target = 1;
  string Keyword = 2;
  int64 Limit = 3;
  int64 TotalTimeoutSeconds = 4;
  // 模块类型，默认为 nuclei
  string Type = 5;
  // 并发
  int64 Concurrent = 6;
}
* */

const BugTestExecutor: React.FC<YakBatchExecutorsProp> = (props) => {
    const update = useUpdate()

    const [listHeight, setListHeight] = useState<number>(500)
    const [params, setParams] = useState<ExecBatchYakScriptParams>({
        Concurrent: 5,
        Keyword: props.keyword.split("-")[0],
        Limit: 10000,
        Target: "",
        DisableNucleiWorkflow: true,
        ExcludedYakScript: [
            "[fingerprinthub-web-fingerprints]: FingerprintHub Technology Fingerprint",
            "[tech-detect]: Wappalyzer Technology Detection"
        ],
        TotalTimeoutSeconds: 180,
        Type: "nuclei"
    })
    const [totalLoading, setTotalLoading] = useState(true)
    const [tasks, setTasks, getTasks] = useGetState<ExecBatchYakScriptTask[]>([])
    const [filterTasks, setFilterTasks, getFilterTasks] = useGetState<ExecBatchYakScriptTask[]>([])
    const [error, setError] = useState("")
    const [token, setToken] = useState("")
    const [executing, setExecuting] = useState(false)
    const [checked, setChecked] = useState<boolean>(false)

    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const listRef = useRef(null)
    const filterContainerRef = useRef(null)
    const filterWrapperRef = useRef(null)

    const [list] = useVirtualList(getTasks(), {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 50,
        overscan: 5
    })
    const [filterList] = useVirtualList(getFilterTasks(), {
        containerTarget: filterContainerRef,
        wrapperTarget: filterWrapperRef,
        itemHeight: 50,
        overscan: 5
    })

    window.onresize = () => {
        let timer: any = null
        window.onresize = () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                if (!listRef || !listRef.current) return
                const list = listRef.current as unknown as HTMLDivElement
                setListHeight(list.clientHeight - 10)
            }, 50)
        }
    }

    useEffect(() => {
        setTimeout(() => {
            if (!listRef || !listRef.current) return
            const list = listRef.current as unknown as HTMLDivElement
            setListHeight(list.clientHeight - 10)
        }, 600)

        return () => {
            window.onresize = null
        }
    }, [])

    useEffect(() => {
        let timer = setTimeout(() => {
            update()
        }, 100)
        return () => {
            clearTimeout(timer)
        }
    }, [listHeight])

    useEffect(() => {
        setTotalLoading(true)
        setTimeout(() => setTotalLoading(false), 500)

        const token = randomString(40)
        setToken(token)
        setTasks([])
        setParams({...params, Keyword: props.keyword.split("-")[0], Target: ""})
        const tempTasks = new Map<string, ExecBatchYakScriptTask>()
        const updateTasks = () => {
            let items: ExecBatchYakScriptTask[] = []
            tempTasks.forEach((v, k) => {
                items.push(v)
            })
            setTasks(items.sort((a, b) => b.Id.localeCompare(a.Id)))
        }
        const dataChannel = `${token}-exec-batch-yak-script-data`
        const errorChannel = `${token}-exec-batch-yak-script-error`
        const endChannel = `${token}-exec-batch-yak-script-end`

        let updateTableTick = setInterval(updateTasks, 1000)
        ipcRenderer.on(dataChannel, async (e: any, data: ExecBatchYakScriptResult) => {
            if (data.ProgressMessage) {
                return
            }
            let element = tempTasks.get(data.Id)
            if (element === undefined) {
                tempTasks.set(data.Id, {
                    Id: data.Id,
                    PoC: data.PoC,
                    Results: [],
                    Status: data.Status,
                    progress: 0
                })
                // updateTasks()
                return
            } else {
                element.Status = data.Status

                if (!element.Ok) {
                    element.Ok = data.Ok || false
                }
                element.Reason = data.Reason

                if (data.Result) {
                    element.Results.push({...data.Result})
                }
                // updateTasks()
                return
            }
        })
        ipcRenderer.on(errorChannel, (e: any, error: any) => {
            setError(error)
        })
        ipcRenderer.on(endChannel, (e: any, data: any) => {
            info("模块加载完成 / 执行完毕")
            setExecuting(false)
            updateTasks()
        })
        ipcRenderer.invoke(
            "exec-batch-yak-script",
            {...params, Keyword: props.keyword.split("-")[0], Target: ""},
            token
        )
        setExecuting(true)

        return () => {
            clearInterval(updateTableTick)
            ipcRenderer.invoke("cancel-exec-batch-yak-script", token)
            ipcRenderer.removeAllListeners(dataChannel)
            ipcRenderer.removeAllListeners(errorChannel)
            ipcRenderer.removeAllListeners(endChannel)
        }
    }, [props.keyword])

    // 转换task内的result数据
    const convertTask = (task: ExecBatchYakScriptTask) => {
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

    useEffect(() => {
        if (checked) {
            const filters: ExecBatchYakScriptTask[] = getTasks()
                .filter((item) => item.Results.length !== 0)
                .filter(
                    (item) =>
                        (
                            convertTask(item)
                                .filter((e) => e.type === "log")
                                .map((i) => i.content)
                                .sort((a: any, b: any) => a.timestamp - b.timestamp) as ExecResultLog[]
                        ).filter((i) => ["json", "success"].includes((i?.level || "").toLowerCase())).length > 0
                )
            setFilterTasks(filters)
        } else {
            setFilterTasks([])
        }
    }, [checked])

    useEffect(() => {
        if (tasks) {
            const filters: ExecBatchYakScriptTask[] = getTasks()
                .filter((item) => item.Results.length !== 0)
                .filter(
                    (item) =>
                        (
                            convertTask(item)
                                .filter((e) => e.type === "log")
                                .map((i) => i.content)
                                .sort((a: any, b: any) => a.timestamp - b.timestamp) as ExecResultLog[]
                        ).filter((i) => ["json", "success"].includes((i?.level || "").toLowerCase())).length > 0
                )
            if (JSON.stringify(filterTasks) !== JSON.stringify(filters)) setFilterTasks(filters)
        }
    }, [tasks])

    if (totalLoading) {
        return (
            <div style={{textAlign: "center", width: "100%", marginTop: 100}}>
                <Spin>正在加载专用漏洞库</Spin>
            </div>
        )
    }

    return (
        <div className='bug-test-container'>
            <Row>
                <Col span={3}></Col>
                <Col span={18}>
                    <Form
                        style={{textAlign: "center"}}
                        onSubmitCapture={(e) => {
                            e.preventDefault()

                            if (tasks.length === 0) {
                                Modal.error({title: "模块还未加载，请点击右上角配置进行YAML POC更新"})
                                return
                            }

                            if (!params.Target) {
                                Modal.error({title: "检测目标不能为空"})
                                return
                            }
                            if (!params.Keyword) {
                                Modal.error({title: "无 PoC 关键字选择"})
                                return
                            }
                            if (!token) {
                                Modal.error({title: "BUG：无 Token 生成，请重新打开该页"})
                            }
                            ipcRenderer.invoke("exec-batch-yak-script", params, token)
                            setExecuting(true)
                            setChecked(false)
                        }}
                    >
                        <Space direction={"vertical"}>
                            <Space>
                                <span>输入想要检测的目标：</span>
                                <Form.Item style={{marginBottom: 0}}>
                                    <Input
                                        style={{width: 600, marginRight: 10}}
                                        value={params.Target}
                                        onChange={(e) => {
                                            setParams({...params, Target: e.target.value})
                                        }}
                                        placeholder='可接受输入为：URL / IP / 域名 / 主机:端口'
                                    />
                                    {!executing ? (
                                        <Button style={{width: 120}} type='primary' htmlType='submit'>
                                            开始检测
                                        </Button>
                                    ) : (
                                        <Popconfirm
                                            title={"确定要停止该漏洞检测？"}
                                            onConfirm={(e) => ipcRenderer.invoke("cancel-exec-batch-yak-script", token)}
                                        >
                                            <Button style={{width: 120}} danger={true}>
                                                强制停止
                                            </Button>
                                        </Popconfirm>
                                    )}
                                </Form.Item>
                            </Space>
                            <div style={{width: "100%", textAlign: "left", paddingLeft: 148}}>
                                <Space>
                                    <Tag>并发/线程: {params.Concurrent}</Tag>
                                    <Tag>总超时: {params.TotalTimeoutSeconds} sec</Tag>
                                    <Button
                                        type={"link"}
                                        style={{margin: 0, paddingLeft: 0}}
                                        onClick={(e) => {
                                            showModal({
                                                title: "设置批量检测额外参数",
                                                content: (
                                                    <>
                                                        <Form
                                                            onSubmitCapture={(e) => e.preventDefault()}
                                                            labelCol={{span: 7}}
                                                            wrapperCol={{span: 14}}
                                                        >
                                                            <InputInteger
                                                                label={"并发量(线程)"}
                                                                setValue={(Concurrent) =>
                                                                    setParams({...params, Concurrent})
                                                                }
                                                                defaultValue={params.Concurrent}
                                                            />
                                                            <InputInteger
                                                                label={"总超时时间/s"}
                                                                setValue={(TotalTimeoutSeconds) =>
                                                                    setParams({
                                                                        ...params,
                                                                        TotalTimeoutSeconds
                                                                    })
                                                                }
                                                                defaultValue={params.TotalTimeoutSeconds}
                                                            />
                                                        </Form>
                                                    </>
                                                )
                                            })
                                        }}
                                    >
                                        额外参数
                                    </Button>
                                </Space>
                            </div>
                        </Space>
                    </Form>
                </Col>
                <Col span={3} style={{position: "relative"}}>
                    <div style={{width: 140, position: "absolute", right: 2, bottom: 2}}>
                        <span style={{display: "inline-block", height: 22, marginRight: 5}}>只展示命中项</span>
                        <Switch checked={checked} onChange={(checked) => setChecked(checked)}></Switch>
                    </div>
                </Col>
            </Row>
            <Divider style={{margin: "10px 0"}} />
            <div ref={listRef} className='bug-test-list'>
                {tasks.length === 0 ? (
                    <div>
                        <Empty
                            style={{marginTop: 75}}
                            description={"模块还未加载，请点击右上角配置进行插件仓库更新"}
                        ></Empty>
                    </div>
                ) : checked ? (
                    <div ref={filterContainerRef} style={{height: listHeight, overflow: "auto"}}>
                        <div ref={filterWrapperRef}>
                            {filterList.map((ele) => (
                                <div className='list-item' key={ele.data.Id}>
                                    <Text ellipsis={{tooltip: true}} copyable={true} style={{width: 260}}>
                                        {ele.data.Id}
                                    </Text>
                                    <Divider type='vertical' />
                                    <div style={{width: 120, textAlign: "center"}}>
                                        {StatusToVerboseTag(ele.data.Status)}
                                    </div>
                                    <Divider type='vertical' />
                                    <div>
                                        <ExecResultsViewer results={ele.data.Results} oneLine={true} />
                                    </div>
                                    <Divider type='vertical' />
                                    <div style={{flexGrow: 1, textAlign: "right"}}>
                                        <Space>
                                            <Button
                                                type={"primary"}
                                                size={"small"}
                                                onClick={(e) => {
                                                    if (!ele.data.PoC) {
                                                        Modal.error({title: "没有模块信息"})
                                                        return
                                                    }
                                                    showModal({
                                                        title: `单体模块测试: ${ele.data.PoC.ScriptName}`,
                                                        width: "75%",
                                                        content: (
                                                            <>
                                                                <YakScriptOperator script={ele.data.PoC} target={params.Target} />
                                                            </>
                                                        )
                                                    })
                                                }}
                                            >
                                                复测
                                            </Button>
                                            <Button
                                                size={"small"}
                                                style={{marginRight: 8}}
                                                onClick={(e) => {
                                                    if (!ele.data.PoC) {
                                                        Modal.error({title: "没有模块信息"})
                                                        return
                                                    }
                                                    showModal({
                                                        title: `源码: ${ele.data.PoC.ScriptName}`,
                                                        width: "75%",
                                                        content: (
                                                            <>
                                                                <div style={{height: 400}}>
                                                                    <YakEditor
                                                                        readOnly={true}
                                                                        type={"yaml"}
                                                                        value={ele.data.PoC.Content}
                                                                    />
                                                                </div>
                                                            </>
                                                        )
                                                    })
                                                }}
                                            >
                                                源码
                                            </Button>
                                        </Space>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div ref={containerRef} style={{height: listHeight, overflow: "auto"}}>
                        <div ref={wrapperRef}>
                            {list.map((ele) => (
                                <div className='list-item' key={ele.data.Id}>
                                    <Text ellipsis={{tooltip: true}} copyable={true} style={{width: 260}}>
                                        {ele.data.Id}
                                    </Text>
                                    <Divider type='vertical' />
                                    <div style={{width: 120, textAlign: "center"}}>
                                        {StatusToVerboseTag(ele.data.Status)}
                                    </div>
                                    <Divider type='vertical' />
                                    <div>
                                        <ExecResultsViewer results={ele.data.Results} oneLine={true} />
                                    </div>
                                    <Divider type='vertical' />
                                    <div style={{flexGrow: 1, textAlign: "right"}}>
                                        <Space>
                                            <Button
                                                type={"primary"}
                                                size={"small"}
                                                onClick={(e) => {
                                                    if (!ele.data.PoC) {
                                                        Modal.error({title: "没有模块信息"})
                                                        return
                                                    }
                                                    showModal({
                                                        title: `单体模块测试: ${ele.data.PoC.ScriptName}`,
                                                        width: "75%",
                                                        content: (
                                                            <>
                                                                <YakScriptOperator script={ele.data.PoC} target={params.Target} />
                                                            </>
                                                        )
                                                    })
                                                }}
                                            >
                                                复测
                                            </Button>
                                            <Button
                                                size={"small"}
                                                style={{marginRight: 8}}
                                                onClick={(e) => {
                                                    if (!ele.data.PoC) {
                                                        Modal.error({title: "没有模块信息"})
                                                        return
                                                    }
                                                    showModal({
                                                        title: `源码: ${ele.data.PoC.ScriptName}`,
                                                        width: "75%",
                                                        content: (
                                                            <>
                                                                <div style={{height: 400}}>
                                                                    <YakEditor
                                                                        readOnly={true}
                                                                        type={"yaml"}
                                                                        value={ele.data.PoC.Content}
                                                                    />
                                                                </div>
                                                            </>
                                                        )
                                                    })
                                                }}
                                            >
                                                源码
                                            </Button>
                                        </Space>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export const StatusToVerboseTag = (status: string) => {
    switch (status.toLowerCase()) {
        case "waiting":
            return <Tag color={"geekblue"}>等待执行/Wait</Tag>
        case "data":
        case "executing":
        case "running":
            return <Tag color={"orange"}>正在执行/Running</Tag>
        case "end":
            return <Tag color={"green"}>执行结束/End</Tag>
        default:
            return <Tag color={"blue"}>{status}</Tag>
    }
}
