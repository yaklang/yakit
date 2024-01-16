import React, {useEffect, useRef, useState} from "react"
import {ShellType, WebShellDetail} from "@/pages/webShell/models"
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {CVXterm} from "@/components/CVXterm"
import {TERMINAL_INPUT_KEY, YakitCVXterm} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {failed} from "@/utils/notification"
import {writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import {loadFromYakURLRaw, requestYakURLList} from "./yakURLTree/netif"
import ReactResizeDetector from "react-resize-detector"
import path from "path"
import {YakURL} from "@/pages/yakURLTree/data"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";

interface MsgProps {
    arch: string
    basicInfo: string
    currentPath: string
    driveList: string
    localIp: string
    osInfo: string
}

interface WebShellDetailOptProps {
    id: string
    webshellInfo: WebShellDetail
}

const {ipcRenderer} = window.require("electron")

export const WebShellDetailOpt: React.FC<WebShellDetailOptProps> = (props) => {
    // console.log("WebShellDetailOpt", props)
    const xtermRef = useRef<any>(null)
    const [inputValue, setInputValue] = useState<string>("")
    const [defaultPath, setDefaultPath] = useState<string>("")
    const [defaultXterm, setDefaultXterm] = useState<string>("")
    const [linePath, setLinePath] = useState<string>("")
    const [behidnerBaseInfo, setBehinderBaseInfo] = useState<string>("")
    const [godzillaBaseInfo, setGodzillaBaseInfo] = useState<string>("")
    const [activeKey, setActiveKey] = useState<string>("basicInfo")
    const [shellType, setShellType] = useState<"Behinder" | "Godzilla">("Behinder")
    /** 日志输出 */

    useEffect(() => {
        if (!xtermRef) {
            return
        }
    }, [xtermRef])

    useUpdateEffect(() => {
        if (activeKey === "vcmd" && inputValue.length === 0) {
            // xtermClear(xtermRef)
            setInputValue(defaultXterm)
            writeXTerm(xtermRef, defaultXterm)
        }
    }, [activeKey])

    // 定义排序函数
    const sortByPriority = (a, b) => {
        // 将此三项放在最前面
        const priorityValues = ["OsInfo", "OS", "CurrentDir"];
        const priorityA = priorityValues.indexOf(a.key);
        const priorityB = priorityValues.indexOf(b.key);
        return priorityB - priorityA;
    };

    useEffect(() => {
        const {Id, ShellType} = props.webshellInfo
        // 定义一个异步函数来获取基本信息
        ipcRenderer
            .invoke("GetBasicInfo", {Id})
            .then((r) => {
                try {
                    setShellType(ShellType)
                    if (ShellType === "Behinder") {
                        let obj: { status: string; msg: MsgProps } = JSON.parse(new Buffer(r.Data, "utf8").toString())
                        const {status, msg} = obj
                        if (status === "success") {
                            setDefaultPath(msg.currentPath)
                            const helloMsg = `Arch: ${msg.arch}
OS: ${msg.osInfo}
LocalIP: ${msg.localIp}
                            
${msg.currentPath}`
                            setDefaultXterm(helloMsg + ">")
                            const sortedKeys = Object.keys(obj.msg).sort(
                                (a, b) => obj.msg[a].length - obj.msg[b].length
                            )
                            const resultArr = sortedKeys.map((key) => ({
                                key,
                                content: obj.msg[key]
                            }))
                            let resultString: string = ""
                            resultArr.map((item) => {
                                resultString += item.key + ": " + item.content
                            })
                            setBehinderBaseInfo(resultString)
                        }
                    } else {
                        let obj = JSON.parse(new Buffer(r.Data, "utf8").toString())
                        setDefaultPath(obj.CurrentDir)
                        const helloMsg = `OS: ${obj.OS}        
${obj.CurrentDir}`

                        setDefaultXterm(helloMsg + ">")
                        const resultString = Object.entries(obj) // 直接获取键值对数组
                            .sort(([keyA, valueA], [keyB, valueB]) => sortByPriority(valueA, valueB))
                            .reduce((resultString, [key, content]) => {
                                return `${resultString}${key}: ${content}\n`;
                            }, '');

                        setGodzillaBaseInfo(resultString);
                    }
                } catch (error) {
                }
            })
            .catch((e) => {
                failed(`FeaturePing failed: ${e}`)
            })
    }, [props.webshellInfo])

    const commandExec = useMemoizedFn((cmd: string) => {
        // 去掉 cmd 字符串中的 defaultXterm 前缀
        if (cmd.startsWith(defaultXterm)) {
            cmd = cmd.replace(defaultXterm, "")
        }

        const p = linePath === "" ? path.normalize(defaultPath) : path.normalize(linePath)
        const url: YakURL = {
            FromRaw: "",
            Schema: props.webshellInfo.ShellType,
            User: "",
            Pass: "",
            Location: "",
            Path: "/",
            Query: [
                {Key: "op", Value: "cmd"},
                {Key: "id", Value: props.webshellInfo.Id},
                {Key: "cmd", Value: cmd},
                {Key: "path", Value: p}
            ]
        }
        requestYakURLList({url, method: "POST"})
            .then((res) => {
                // 遍历响应中的 Resources 数组
                res.Resources.forEach((resource) => {
                    // 遍历每个资源的 Extra 数组
                    const cp = resource.Path
                    setLinePath(cp)
                    resource.Extra.forEach((item) => {
                        // 检查键是否匹配 'content'
                        if (item.Key === "content") {
                            writeXTerm(xtermRef, item.Value)
                            writeXTerm(xtermRef, "\n")
                            writeXTerm(xtermRef, cp + ">")
                            setInputValue(cp + ">")
                            setDefaultXterm(cp + ">")
                        }
                    })
                })
            })
            .catch((error) => {
                console.error("Failed to load data:", error) // 处理任何可能发生的错误
            })
    })

    return (
        <div style={{width: "100%", height: "100%"}}>
            <YakitTabs
                activeKey={activeKey}
                onChange={(v) => setActiveKey(v)}
                className='scan-port-tabs no-theme-tabs'
                tabBarStyle={{marginBottom: 5}}
            >
                <YakitTabs.YakitTabPane tab={"基本信息"} key={"basicInfo"}>
                    <div style={{overflow: "auto", height: "100%"}}>
                        {shellType === "Behinder" ? (
                            <>

                                <YakitEditor
                                    type={"html"} value={behidnerBaseInfo} readOnly={true}
                                ></YakitEditor>
                            </>
                        ) : (
                            <>
                                <YakitEditor
                                    type={"html"} value={godzillaBaseInfo} readOnly={true}
                                ></YakitEditor>
                            </>
                        )}
                    </div>
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"虚拟终端"} key={"vcmd"}>
                    <div style={{height: "100%", width: "100%"}}>
                        <ReactResizeDetector
                            onResize={(width, height) => {
                                if (!width || !height) return
                                const row = Math.floor(height / 18.5)
                                const col = Math.floor(width / 10)
                                if (xtermRef) xtermFit(xtermRef, col, row)
                            }}
                            handleWidth={true}
                            handleHeight={true}
                            refreshMode={"debounce"}
                            refreshRate={50}
                        />
                        <YakitCVXterm
                            maxHeight={0}
                            ref={xtermRef}
                            options={{
                                convertEol: true
                            }}
                            isWrite={false}
                            onData={(data) => {
                                if (data.replace(/[\x7F]/g, "").length > 0) {
                                    writeXTerm(xtermRef, data)
                                    // 处理用户输入的数据
                                    setInputValue((prevInput) => prevInput + data)
                                }
                            }}
                            onKey={(e) => {
                                const {key} = e
                                const {keyCode} = e.domEvent
                                // 删除
                                if (keyCode === TERMINAL_INPUT_KEY.BACK && xtermRef?.current) {
                                    // 如只剩初始值则不删除
                                    if (inputValue === defaultXterm) {
                                        return
                                    }
                                    setInputValue((prevInput) => prevInput.replace(/.$/, "").replace(/[\x7F]/g, ""))
                                    // 发送 backspace 字符
                                    xtermRef.current.terminal.write("\b \b")
                                    return
                                }
                                // 回车
                                if (keyCode === TERMINAL_INPUT_KEY.ENTER && xtermRef?.current) {
                                    // 此处调用接口
                                    commandExec(inputValue)
                                    xtermRef.current.terminal.write("\n")
                                    setInputValue("")
                                    return
                                }
                            }}
                        />
                    </div>
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"文件管理"} key={"fileOpt"}>
                    <WebShellURLTreeAndTable
                        Id={props.webshellInfo.Id}
                        CurrentPath={defaultPath}
                        shellType={props.webshellInfo.ShellType as ShellType}
                    />
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"数据库管理"} key={"databaseOpt"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
                </YakitTabs.YakitTabPane>
            </YakitTabs>
        </div>
    )
}
