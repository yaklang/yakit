import React, {useEffect, useRef, useState} from "react"
import {ShellType, WebShellDetail} from "@/pages/webShell/models"
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {CVXterm} from "@/components/CVXterm"
import { TERMINAL_INPUT_KEY, YakitCVXterm } from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import { useMemoizedFn } from "ahooks"
import {failed} from "@/utils/notification";

interface WebShellDetailOptProps {
    id: string
    webshellInfo: WebShellDetail
}

const {ipcRenderer} = window.require("electron")


export const WebShellDetailOpt: React.FC<WebShellDetailOptProps> = (props) => {
    // console.log("WebShellDetailOpt", props)
    const xtermRef = useRef<any>(null)
    const [inputValue, setInputValue] = useState('');
    const [baseInfo, setBaseInfo] = useState('');
    /** 日志输出 */
    const writeToConsole = (i: string) => {
        if (xtermRef?.current && xtermRef.current?.terminal) {
            xtermRef.current.terminal.write(i)
        }
    }

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        
        // setInterval(()=>{
        // writeToConsole("123")
        // },2000)
    }, [xtermRef])

    useEffect(() => {
        const id = props.webshellInfo.Id
        // 定义一个异步函数来获取基本信息
        ipcRenderer.invoke("GetBasicInfo", {Id: id}).then((r) => {
            console.log(r)
            setBaseInfo(new Buffer(r.Data, "utf8").toString())
        }).catch((e) => {
            failed(`FeaturePing failed: ${e}`)
        })
    }, [props.webshellInfo.Id]);

    return (
        <div style={{width: "100%", height: "100%"}}>
            <YakitTabs className='scan-port-tabs no-theme-tabs' tabBarStyle={{marginBottom: 5}}>
                <YakitTabs.YakitTabPane tab={"基本信息"} key={"basicInfo"}>
                    {baseInfo}
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"虚拟终端"} key={"vcmd"}>
                    <YakitCVXterm
                            ref={xtermRef}
                            options={{
                                convertEol: true,
                                rows: 12
                            }}
                            isWrite={false}
                            onData={(data)=>{
                                console.log("onData---",data);
                                if(data.replace(/[\x7F]/g, '').length>0){
                                    writeToConsole(data)
                                    // 处理用户输入的数据
                                    setInputValue(prevInput => prevInput + data);
                                }
                            }}
                            onKey={(e) => {
                                const {key} = e
                                const {keyCode} = e.domEvent
                                console.log("onKey---",key,keyCode);
                                // 删除
                                if(keyCode === TERMINAL_INPUT_KEY.BACK && xtermRef?.current){
                                    setInputValue(prevInput => prevInput.replace(/.$/, "").replace(/[\x7F]/g, ''))
                                    // 发送 backspace 字符
                                    xtermRef.current.terminal.write('\b \b')
                                    return
                                }
                                // 回车
                                if(keyCode === TERMINAL_INPUT_KEY.ENTER && xtermRef?.current){
                                    console.log("gg",inputValue);
                                    // 此处调用接口
                                    xtermRef.current.terminal.write('\n')
                                    setInputValue("")
                                    return
                                }
                                
                            }}
                        />
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
