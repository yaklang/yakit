import React, {useEffect, useRef} from "react"
import {ShellType, WebShellDetail} from "@/pages/webShell/models"
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {CVXterm} from "@/components/CVXterm"
import { TERMINAL_INPUT_KEY, YakitCVXterm } from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import { useMemoizedFn } from "ahooks"

interface WebShellDetailOptProps {
    id: string
    webshellInfo: WebShellDetail
}

export const WebShellDetailOpt: React.FC<WebShellDetailOptProps> = (props) => {
    // console.log("WebShellDetailOpt", props)
    const xtermRef = useRef<any>(null)
    const xtermStringRef = useRef<string>("")
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

    const removeLastCharacter = useMemoizedFn((str) => {
        if (str.length > 0) {
          return str.slice(0, -1);  // 使用负索引来移除最后一位字符
        } else {
          return str;
        }
      })

    return (
        <div style={{width: "100%", height: "100%"}}>
            <YakitTabs className='scan-port-tabs no-theme-tabs' tabBarStyle={{marginBottom: 5}}>
                <YakitTabs.YakitTabPane tab={"基本信息"} key={"basicInfo"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
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
                                if(data.length>0){
                                    writeToConsole(data)
                                    xtermStringRef.current += data
                                }
                            }}
                            onKey={(e) => {
                                const {key} = e
                                const {keyCode} = e.domEvent
                                console.log("onKey---",key,keyCode);
                                // 删除
                                if(keyCode === TERMINAL_INPUT_KEY.BACK && xtermRef?.current){
                                    // 发送 backspace 字符
                                    xtermRef.current.terminal.write('\b \b')
                                    xtermStringRef.current = removeLastCharacter(xtermStringRef.current)
                                    return
                                }
                                // 回车
                                if(keyCode === TERMINAL_INPUT_KEY.ENTER && xtermRef?.current){
                                    console.log("gg",xtermStringRef.current);
                                    // 此处调用接口
                                    xtermRef.current.terminal.write('\n')
                                    xtermStringRef.current = ""
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
