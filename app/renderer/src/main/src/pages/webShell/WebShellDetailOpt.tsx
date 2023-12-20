import React, {useEffect, useRef} from "react"
import {ShellType, WebShellDetail} from "@/pages/webShell/models"
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {CVXterm} from "@/components/CVXterm"

interface WebShellDetailOptProps {
    id: string
    webshellInfo: WebShellDetail
}

export const WebShellDetailOpt: React.FC<WebShellDetailOptProps> = (props) => {
    // console.log("WebShellDetailOpt", props)
    const xtermRef = useRef<any>(null)
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
    return (
        <div style={{width: "100%", height: "100%"}}>
            <YakitTabs className='scan-port-tabs no-theme-tabs' tabBarStyle={{marginBottom: 5}}>
                <YakitTabs.YakitTabPane tab={"基本信息"} key={"basicInfo"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"虚拟终端"} key={"vcmd"}>
                    <CVXterm
                        ref={xtermRef}
                        options={{
                            convertEol: true
                        }}
                        onData={(data)=>{
                            console.log("onData---",data);
                        }}
                        onKey={(e) => {
                            const {key} = e
                            const {keyCode} = e.domEvent
                            console.log("onKey---",key,keyCode);
                            
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
