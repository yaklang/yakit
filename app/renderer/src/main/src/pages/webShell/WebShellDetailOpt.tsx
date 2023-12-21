import React, {useEffect, useRef, useState} from "react"
import {ShellType, WebShellDetail} from "@/pages/webShell/models"
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {CVXterm} from "@/components/CVXterm"
import {TERMINAL_INPUT_KEY, YakitCVXterm} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {failed} from "@/utils/notification"
import {writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif";
import ReactResizeDetector from "react-resize-detector"
import path from 'path'
import {YakURL} from "@/pages/yakURLTree/data";


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
    const [linePath,setLinePath ] = useState<string>("")
    const [baseInfo, setBaseInfo] = useState<{ key: string; content: string }[]>([])
    const [activeKey, setActiveKey] = useState<string>("basicInfo")
    /** 日志输出 */

    useEffect(() => {
        if (!xtermRef) {
            return
        }

    }, [xtermRef])

    useUpdateEffect(() => {
        if (activeKey === "vcmd") {
            xtermClear(xtermRef)
            setInputValue(defaultXterm)
            writeXTerm(xtermRef, defaultXterm)
        }
    }, [activeKey])

    useEffect(() => {
        const id = props.webshellInfo.Id
        // 定义一个异步函数来获取基本信息
        ipcRenderer
            .invoke("GetBasicInfo", {Id: id})
            .then((r) => {
                try {
                    let obj: { status: string; msg: MsgProps } = JSON.parse(new Buffer(r.Data, "utf8").toString())
                    const {status, msg} = obj
                    if (status === "success") {
                        setDefaultPath(msg.currentPath)
                        const helloMsg = `Arch: ${msg.arch}
OS: ${msg.osInfo}
LocalIP: ${msg.localIp}
                            
${msg.currentPath}`
                        setDefaultXterm(helloMsg + ">")
                        const sortedKeys = Object.keys(obj.msg).sort((a, b) => obj.msg[a].length - obj.msg[b].length)
                        const resultString = sortedKeys.map((key) => ({
                            key,
                            content: obj.msg[key]
                        }))
                        setBaseInfo(resultString)
                    }
                } catch (error) {
                }
            })
            .catch((e) => {
                failed(`FeaturePing failed: ${e}`)
            })
    }, [props.webshellInfo.Id])

    const commandExec = useMemoizedFn((cmd: string) => {
        const id = props.webshellInfo.Id
        console.log("commandExec", cmd)
        // 去掉 cmd 字符串中的 defaultXterm 前缀
        if (cmd.startsWith(defaultXterm)) {
            cmd = cmd.replace(defaultXterm, "")
        }

        const p = linePath === "" ? path.normalize(defaultPath) : path.normalize(linePath)
        console.log("p", p)
        const url: YakURL = {
            FromRaw: "",
            Schema: "Behinder",
            User: "",
            Pass: "",
            Location: "",
            Path: "/",
            Query: [{Key: "op", Value: "cmd"}, {Key: "id", Value: "1"}, {Key: "cmd", Value: cmd},{Key: "path", Value: p}],
        }
        requestYakURLList({url, method: "POST"}).then((res) => {
            console.log(res); // 打印整个响应以供调试

            // 遍历响应中的 Resources 数组
            res.Resources.forEach((resource) => {
                // 遍历每个资源的 Extra 数组
                const cp = resource.Path
                setLinePath(cp)
                resource.Extra.forEach((item) => {
                    // 检查键是否匹配 'content'
                    if (item.Key === 'content') {

                        console.log(item.Value); // 打印找到的值
                        writeXTerm(xtermRef, item.Value)
                        writeXTerm(xtermRef, "\n")
                        writeXTerm(xtermRef, cp + ">")
                        setInputValue(cp + ">")
                        setDefaultXterm(cp + ">")
                    }
                });
            });
        }).catch((error) => {
            console.error("Failed to load data:", error); // 处理任何可能发生的错误
        });
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
                    <div
                        style={{overflow: "auto", height: "100%"}}
                    >
                        {baseInfo.map((item) => {
                            return (
                                <div style={{display: "flex", flexDirection: "row"}}>
                                    <div style={{marginRight: 10}}>{item.key}:</div>
                                    <div dangerouslySetInnerHTML={{__html: item.content}}/>
                                </div>
                            )
                        })}
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
                                convertEol: true,
                            }}
                            isWrite={false}
                            onData={(data) => {
                                // console.log("onData---",data);
                                if (data.replace(/[\x7F]/g, "").length > 0) {
                                    writeXTerm(xtermRef, data)
                                    // 处理用户输入的数据
                                    setInputValue((prevInput) => prevInput + data)
                                }
                            }}
                            onKey={(e) => {
                                const {key} = e
                                const {keyCode} = e.domEvent
                                // console.log("onKey---",key,keyCode);
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
                                    console.log("gg", inputValue);
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
