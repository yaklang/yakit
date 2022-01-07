import React, { useEffect, useRef, useState } from "react"
import {
    Tabs,
    Button,
    Menu,
    Dropdown,
    Col,
    Form,
    Modal,
    notification,
    Popconfirm,
    Row,
    Space,
    Spin,
    Tag,
    Typography,
    Input,
    List,
    Upload
} from "antd"
import { ExecHistoryTable } from "./YakExecutorHistoryTable"
import "./xtermjs-yak-executor.css"
import { IMonacoEditor, YakEditor } from "../../utils/editors"
import {
    FolderOpenOutlined,
    FolderAddOutlined,
    PlayCircleOutlined,
    PoweroffOutlined,
    DeleteOutlined,
    QuestionOutlined,
    ReloadOutlined
} from "@ant-design/icons"
import { YakScriptManagerPage } from "./YakScriptManager"
import { getRandomInt, randomString } from "../../utils/randomUtil"
import { showDrawer, showModal } from "../../utils/showModal"
import { failed, info } from "../../utils/notification"
import { ExecResult, YakScript, YakScriptParam } from "./schema"
import { YakScriptParamsSetter } from "./YakScriptParamsSetter"
import { YakExecutorParam } from "./YakExecutorParams"
import { SelectOne } from "../../utils/inputUtil"
import { monacoEditorClear, monacoEditorWrite } from "../fuzzer/fuzzerTemplates"
import { XTerm } from "xterm-for-react"
import { writeExecResultXTerm, writeXTerm, xtermClear, xtermFit } from "../../utils/xtermUtils"
import { AutoCard } from "../../components/AutoCard"
import { AutoSpin } from "../../components/AutoSpin"
import cloneDeep from "lodash/cloneDeep"
import { Terminal } from "./Terminal"
import { useMemoizedFn } from "ahooks"

import "./YakExecutor.css"

const { ipcRenderer } = window.require("electron")

const { TabPane } = Tabs
const { Item } = Form
const { Text } = Typography

const tabMenu: CustomMenuProps[] = [
    { key: "own", value: "关闭当前页" },
    { key: "other", value: "关闭其他页" },
    { key: "all", value: "关闭全部页" }
]
const fileMenu: CustomMenuProps[] = [
    { key: "rename", value: "重命名" },
    { key: "close", value: "关闭" },
    { key: "delete", value: "删除" }
]

export interface YakExecutorProp {}
interface tabCodeProps {
    tab: string
    code: string
    suffix: string
    isFile: boolean
    route?: string
}
interface CustomMenuProps {
    key: string
    value: string
    disabled?: boolean
}

export const YakExecutor: React.FC<YakExecutorProp> = (props) => {
    const [tabCodes, setTabCodes] = useState<tabCodeProps[]>([])
    const [unTitleCount, setUnTitleCount] = useState(1)
    const [activeKey, setActiveKey] = useState<string>("")

    const [hintShow, setHintShow] = useState<boolean>(false)
    const [hintFile, setHintFile] = useState<string>("")
    const [hintIndex, setHintIndex] = useState<number>(0)

    const [renameHint, setRenameHint] = useState<boolean>(false)

    const [renameIndex, setRenameIndex] = useState<number>(-1)
    const [renameFlag, setRenameFlag] = useState<boolean>(false)
    const [renameCache, setRenameCache] = useState<string>("")

    const [code, setCode] = useState("# input your yak code\nprintln(`Hello Yak World!`)")
    const [errors, setErrors] = useState<string[]>([])
    const [executing, setExecuting] = useState(false)
    const [params, setParams] = useState<{ Key: string; Value: any }[]>([])
    const [yakScript, setYakScript] = useState<YakScript>()
    const [outputEncoding, setOutputEncoding] = useState<"utf8" | "latin1">("utf8")
    const xtermRef = useRef(null)

    // trigger for updating
    const [triggerForUpdatingHistory, setTriggerForUpdatingHistory] = useState<any>(0)

    // 全局监听重命名事件是否被打断
    useEffect(() => {
        document.onmousedown = (e) => {
            // @ts-ignore
            if (e.path[0].id !== "rename-input" && renameFlag) {
                renameCode(renameIndex)
                setRenameFlag(false)
            }
        }
    }, [renameFlag])

    const autoSave = useMemoizedFn(() => {
        for (let tabInfo of tabCodes) {
            if (tabInfo.isFile) {
                ipcRenderer.invoke("write-file", {
                    route: tabInfo.route,
                    data: tabInfo.code
                })
            }
        }
    })
    // 打开文件
    const addCode = useMemoizedFn((file: any) => {
        for (let index in tabCodes) {
            const item = tabCodes[index]
            if (item.tab === file.name && item.route === file.path) {
                setActiveKey(index)
                return
            }
        }

        ipcRenderer.invoke("fetch-file-content", file.path).then((res) => {
            const tab: tabCodeProps = {
                tab: file.name,
                code: res,
                suffix: file.name.split(".").pop() === "yak" ? "yak" : "http",
                isFile: true,
                route: file.path
            }
            setTabCodes(tabCodes.concat(tab))
        })
        return false
    })
    // 新建文件
    const newCode = useMemoizedFn(() => {
        const tab: tabCodeProps = {
            tab: `Untitle-${unTitleCount}.yak`,
            code: "# input your yak code\nprintln(`Hello Yak World!`)",
            suffix: "yak",
            isFile: false
        }
        setActiveKey(`${tabCodes.length}`)
        setTabCodes(tabCodes.concat([tab]))
        setUnTitleCount(unTitleCount + 1)
    })
    //修改文件
    const modifyCode = useMemoizedFn((value: string, index: number) => {
        const tabs = cloneDeep(tabCodes)
        tabs[index].code = value
        setTabCodes(tabs)
    })
    // 保存文件
    const saveCode = useMemoizedFn((info: tabCodeProps, index: number) => {
        ipcRenderer.invoke("show-save-dialog", info.tab).then((res) => {
            if (res.canceled) return

            const path = res.filePath
            ipcRenderer
                .invoke("write-file", {
                    route: res.filePath,
                    data: info.code
                })
                .then(() => {
                    const name = path.split("/").pop()
                    const suffix = name.split(".").pop()
                    const tabs = cloneDeep(tabCodes)
                    tabs[index].tab = name
                    tabs[index].isFile = true
                    tabs[index].route = path
                    tabs[index].suffix = suffix === "yak" ? suffix : "http"
                    setTabCodes(tabs)
                })
        })
    })
    //关闭文件
    const closeCode = useMemoizedFn((index) => {
        setActiveKey(index)
        const tabInfo = tabCodes[index]
        if (!tabInfo.isFile) {
            setHintFile(tabInfo.tab)
            setHintIndex(index)
            setHintShow(true)
        }
    })
    // 删除文件
    const delCode = useMemoizedFn((index) => {
        const route = tabCodes[index].route
        ipcRenderer
            .invoke("delelte-code-file", route)
            .then((res) => {
                const arr = cloneDeep(tabCodes)
                arr.splice(index === undefined ? hintIndex : index, 1)
                setTabCodes(arr)
            })
            .catch((err) => {
                failed("文件删除失败！")
            })
    })
    // 关闭虚拟文件不保存
    const ownCloseCode = useMemoizedFn((index?: number) => {
        const arr = cloneDeep(tabCodes)
        arr.splice(index === undefined ? hintIndex : index, 1)
        setTabCodes(arr)
        setHintShow(false)
        if (arr.length >= 1) setActiveKey(`0`)
    })
    //重命名操作
    const renameCode = useMemoizedFn((index: number) => {
        const tabInfo = tabCodes[index]

        if (renameCache === tabInfo.tab) return
        if (!renameCache) return

        if (tabInfo.isFile) {
            const routes = tabInfo.route?.split("/")
            routes?.pop()
            ipcRenderer
                .invoke("is-exists-file", routes?.concat(renameCache).join("/"))
                .then((res) => {
                    const newRoute = routes?.concat(renameCache).join("/")
                    if (!tabInfo.route || !newRoute) return
                    renameFile(index, renameCache, tabInfo.route, newRoute)
                })
                .catch((err) => {
                    setRenameHint(true)
                })
        } else {
            const tabs = cloneDeep(tabCodes)
            const strs = renameCache.split(".")
            const suffix = strs[strs.length - 1]
            tabs[index].tab = renameCache
            if (strs.length === 1) {
                tabs[index].suffix = "http"
            } else {
                tabs[index].suffix = suffix ? suffix : "http"
            }
            setTabCodes(tabs)
        }
    })
    // 重命名文件
    const renameFile = useMemoizedFn(
        (index: number, rename: string, oldRoute: string, newRoute: string, callback?: () => void) => {
            ipcRenderer.invoke("rename-file", { old: oldRoute, new: newRoute }).then(() => {
                const suffix = rename.split(".").pop()
                const tabs = cloneDeep(tabCodes)
                tabs[index].tab = rename
                tabs[index].suffix = suffix === "yak" ? suffix : "http"
                tabs[index].route = newRoute
                setTabCodes(tabs)

                if (callback) callback()
            })
        }
    )

    const closeTab = (kind: string, index: string) => {
        const tabCodeInfo = tabCodes[index]

        switch (kind) {
            case "own":
                closeCode(index)
                return
            case "other":
                const code = cloneDeep(tabCodes[index])
                setTabCodes([code])
                setActiveKey(`0`)
                return
            case "all":
                setTabCodes([])
                return
            case "close":
                closeCode(index)
                return
            case "delete":
                delCode(index)
                return
            case "rename":
                setRenameIndex(+index)
                setRenameFlag(true)
                setRenameCache(tabCodeInfo.tab)
                return
        }
    }

    useEffect(() => {
        const tab: tabCodeProps = {
            tab: `Untitle-${unTitleCount}.yak`,
            code: "# input your yak code\nprintln(`Hello Yak World!`)",
            suffix: "yak",
            isFile: false
        }
        setActiveKey(`${tabCodes.length}`)
        setTabCodes([tab])
        setUnTitleCount(unTitleCount + 1)

        const time = setInterval(() => {
            autoSave()
        }, 2000)
        return () => {
            clearInterval(time)
        }
    }, [])

    useEffect(() => {
        if (xtermRef) {
            xtermFit(xtermRef, 100, 14)
        }
    })

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        // let buffer = "";
        ipcRenderer.on("client-yak-error", async (e: any, data) => {
            notification["error"]({ message: `FoundError: ${JSON.stringify(data)}` })
            if (typeof data === "object") {
                setErrors([...errors, `${JSON.stringify(data)}`])
            } else if (typeof data === "string") {
                setErrors([...errors, data])
            } else {
                setErrors([...errors, `${data}`])
            }
        })
        ipcRenderer.on("client-yak-end", () => {
            notification["info"]({ message: "Yak 代码执行完毕" })
            setTriggerForUpdatingHistory(getRandomInt(100000))
            setTimeout(() => {
                setExecuting(false)
            }, 300)
        })
        ipcRenderer.on("client-yak-data", async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                // alert(Buffer.from(data.Message).toString("utf8"))
            }
            if (data?.Raw) {
                writeExecResultXTerm(xtermRef, data, outputEncoding)
                // writeXTerm(xtermRef, Buffer.from(data.Raw).toString(outputEncoding).replaceAll("\n", "\r\n"))
                // monacoEditorWrite(currentOutputEditor, )
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("client-yak-data")
            ipcRenderer.removeAllListeners("client-yak-end")
            ipcRenderer.removeAllListeners("client-yak-error")
        }
    }, [xtermRef])

    const CustomMenu = (id: any, menus: Array<CustomMenuProps>, onClick: (key: string, id: string) => void) => {
        return (
            <Menu
                onClick={({ key }) => {
                    onClick(key, id)
                }}
            >
                {menus.map((item, index) => {
                    return (
                        <Menu.Item key={item.key} disabled={!!item.disabled}>
                            <div>{item.value}</div>
                        </Menu.Item>
                    )
                })}
            </Menu>
        )
    }

    const bars = (props: any, TabBarDefault: any) => {
        return (
            <TabBarDefault
                {...props}
                children={(barNode: React.ReactElement) => {
                    return (
                        <Dropdown overlay={CustomMenu(barNode.key, tabMenu, closeTab)} trigger={["contextMenu"]}>
                            {barNode}
                        </Dropdown>
                    )
                }}
            />
        )
    }

    return (
        <AutoCard
            className={"yak-executor-body"}
            title={"Yak Runner"}
            headStyle={{ minHeight: 0 }}
            bodyStyle={{ padding: 0 }}
        >
            <div
                style={{ width: "100%", height: "100%", display: "flex" }}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.keyCode === 78 && (e.ctrlKey || e.metaKey)) {
                        newCode()
                    }
                }}
            >
                <div style={{ width: "15%" }}>
                    <AutoCard
                        className={"executor-left-body"}
                        title={"近期文件"}
                        headStyle={{ minHeight: 0, fontSize: 14, fontWeight: 300, padding: "0 5px" }}
                        bodyStyle={{ padding: 0 }}
                        extra={
                            <>
                                <Upload
                                    multiple={false}
                                    maxCount={1}
                                    showUploadList={false}
                                    beforeUpload={(f: any) => addCode(f)}
                                >
                                    <FolderOpenOutlined className='file-list-icon' title='Open File' />
                                </Upload>
                                <FolderAddOutlined className='file-list-icon' title='New File' onClick={newCode} />
                            </>
                        }
                    >
                        <div className={"file-list"}>
                            {tabCodes.map((item, index) => {
                                fileMenu[2].disabled = !item.isFile
                                return (
                                    <Dropdown
                                        key={`${index}`}
                                        overlay={CustomMenu(`${index}`, fileMenu, closeTab)}
                                        trigger={["contextMenu"]}
                                    >
                                        <div
                                            className={`list-opt ${+activeKey === index ? "selected" : ""}`}
                                            style={{ top: `${index * 22}px` }}
                                            onClick={() => setActiveKey(`${index}`)}
                                        >
                                            <div>
                                                {renameFlag && renameIndex === index ? (
                                                    <div>
                                                        <Input
                                                            id='rename-input'
                                                            style={{ height: 20 }}
                                                            size='small'
                                                            value={renameCache}
                                                            onChange={(e) => setRenameCache(e.target.value)}
                                                        ></Input>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Text ellipsis={{ tooltip: item.tab }}>{item.tab}</Text>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Dropdown>
                                )
                            })}
                        </div>
                    </AutoCard>
                </div>
                <div style={{ width: "85%", height: "100%", border: "1px solid #f0f0f0" }}>
                    <div style={{ width: "100%", height: "70%" }}>
                        <Tabs
                            className={"right-body-tab"}
                            style={{ height: "100%" }}
                            type='editable-card'
                            activeKey={activeKey}
                            hideAdd={true}
                            onChange={(activeKey) => setActiveKey(activeKey)}
                            onEdit={(key, event: "add" | "remove") => {
                                switch (event) {
                                    case "remove":
                                        closeCode(key)
                                        return
                                    case "add":
                                        return
                                }
                            }}
                            renderTabBar={(props, TabBarDefault) => {
                                return bars(props, TabBarDefault)
                            }}
                            tabBarExtraContent={
                                <Space style={{ marginRight: 5 }}>
                                    <Button
                                        style={{ height: 30 }}
                                        type={"link"}
                                        size={"small"}
                                        disabled={tabCodes[+activeKey] && tabCodes[+activeKey].suffix !== "yak"}
                                        onClick={(e) => {
                                            let m = showDrawer({
                                                width: "60%",
                                                placement: "left",
                                                title: "选择你的 Yak 模块执行特定功能",
                                                content: (
                                                    <>
                                                        <YakScriptManagerPage
                                                            type={"yak"}
                                                            onLoadYakScript={(s) => {
                                                                const arr = cloneDeep(tabCodes)
                                                                const tab = arr[+activeKey]
                                                                tab.code = s.Content
                                                                info(`加载 Yak 模块：${s.ScriptName}`)
                                                                xtermClear(xtermRef)
                                                                setTabCodes(arr)
                                                                m.destroy()
                                                            }}
                                                        />
                                                    </>
                                                )
                                            })
                                        }}
                                    >
                                        Yak脚本模板
                                    </Button>

                                    {executing ? (
                                        <Button
                                            icon={<PoweroffOutlined />}
                                            type={"primary"}
                                            danger={true}
                                            size={"small"}
                                            style={{ width: 30, height: 30 }}
                                            onClick={() => ipcRenderer.invoke("cancel-yak")}
                                        ></Button>
                                    ) : (
                                        <Button
                                            icon={<PlayCircleOutlined />}
                                            type={"primary"}
                                            size={"small"}
                                            style={{ width: 30, height: 30 }}
                                            disabled={tabCodes[+activeKey] && tabCodes[+activeKey].suffix !== "yak"}
                                            onClick={() => {
                                                setErrors([])
                                                setExecuting(true)
                                                ipcRenderer.invoke("exec-yak", {
                                                    Script: tabCodes[+activeKey].code,
                                                    Params: params
                                                })
                                            }}
                                        ></Button>
                                    )}
                                </Space>
                            }
                        >
                            {tabCodes.map((item, index) => {
                                return (
                                    <TabPane tab={item.tab} key={`${index}`}>
                                        <div style={{ height: "100%" }}>
                                            <AutoSpin spinning={executing}>
                                                <div
                                                    style={{ height: "100%" }}
                                                    onKeyDown={(e) => {
                                                        if (e.keyCode === 83 && (e.ctrlKey || e.metaKey)) {
                                                            saveCode(item, index)
                                                        }
                                                    }}
                                                >
                                                    <YakEditor
                                                        type={item.suffix}
                                                        value={item.code}
                                                        setValue={(value) => {
                                                            modifyCode(value, index)
                                                        }}
                                                    />
                                                </div>
                                            </AutoSpin>
                                        </div>
                                    </TabPane>
                                )
                            })}
                        </Tabs>
                    </div>
                    <div style={{ width: "100%", height: "30%", overflow: "auto", borderTop: "1px solid #000" }}>
                        <Tabs
                            style={{ height: "100%" }}
                            className={"right-body-tab"}
                            size={"small"}
                            tabBarExtraContent={
                                <Space>
                                    <SelectOne
                                        formItemStyle={{ marginBottom: 0 }}
                                        value={outputEncoding}
                                        setValue={setOutputEncoding}
                                        size={"small"}
                                        data={[
                                            { text: "GBxxx编码", value: "latin1" },
                                            { text: "UTF-8编码", value: "utf8" }
                                        ]}
                                    />
                                    <Button
                                        size={"small"}
                                        icon={<DeleteOutlined />}
                                        danger={true}
                                        type={"link"}
                                        onClick={(e) => {
                                            xtermClear(xtermRef)
                                        }}
                                    />
                                </Space>
                            }
                        >
                            <TabPane tab={<div style={{ width: 50, textAlign: "center" }}>输出</div>} key={"output"}>
                                <XTerm
                                    ref={xtermRef}
                                    options={{
                                        convertEol: true
                                    }}
                                    onResize={(r) => xtermFit(xtermRef, r.cols, 14)}
                                />
                            </TabPane>
                            <TabPane
                                tab={
                                    <div style={{ width: 50, textAlign: "center" }} key={"terminal"}>
                                        终端(监修中)
                                    </div>
                                }
                                disabled
                            >
                                <Terminal />
                            </TabPane>
                        </Tabs>
                    </div>
                </div>

                <Modal
                    visible={hintShow}
                    title='Warning'
                    onCancel={() => setHintShow(false)}
                    footer={[
                        <Button key='back' onClick={() => {}}>
                            保存
                        </Button>,
                        <Button key='submit' type='primary' onClick={() => ownCloseCode()}>
                            不保存
                        </Button>,
                        <Button key='link' type='primary' onClick={() => setHintShow(false)}>
                            关闭
                        </Button>
                    ]}
                >
                    <p>{`是否要保存${hintFile}里面的内容吗？`}</p>
                </Modal>

                <Modal
                    visible={renameHint}
                    title='Warning'
                    onCancel={() => setHintShow(false)}
                    footer={[
                        <Button
                            key='back'
                            onClick={() => {
                                const oldRoute = tabCodes[renameIndex].route
                                const routes = oldRoute?.split("/")
                                routes?.pop()
                                const newRoute = routes?.concat(renameCache).join("/")
                                if (!oldRoute || !newRoute) return
                                renameFile(renameIndex, renameCache, oldRoute, newRoute, () => {
                                    setRenameHint(false)
                                })
                            }}
                        >
                            确定
                        </Button>,
                        <Button key='link' type='primary' onClick={() => setRenameHint(false)}>
                            取消
                        </Button>
                    ]}
                >
                    <p>{`是否要覆盖已存在的文件吗？`}</p>
                </Modal>
            </div>
        </AutoCard>
    )
}
