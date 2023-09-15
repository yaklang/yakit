import React from 'react';
import {ShellType, WebShellDetail} from "@/pages/webShell/models";
import { Tabs } from 'antd';
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable";


interface WebShellDetailOptProps {
    id: string
    webshellInfo: WebShellDetail
}

export const WebShellDetailOpt: React.FC<WebShellDetailOptProps> = (props) => {
    console.log("WebShellDetailOpt", props)

    return (
        <div style={{width: "100%", height: "100%"}}>
            <Tabs className='scan-port-tabs no-theme-tabs' tabBarStyle={{marginBottom: 5}}>
                <Tabs.TabPane tab={"基本信息"} key={"basicInfo"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"文件管理"} key={"fileOpt"}>
                    <WebShellURLTreeAndTable Id={props.webshellInfo.Id} shellType={props.webshellInfo.ShellType as ShellType}/>
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}
