import React from 'react';
import {ShellType, WebShellDetail} from "@/pages/webShell/models";
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable";
import YakitTabs from '@/components/yakitUI/YakitTabs/YakitTabs';

interface WebShellDetailOptProps {
    id: string
    webshellInfo: WebShellDetail
}

export const WebShellDetailOpt: React.FC<WebShellDetailOptProps> = (props) => {
    console.log("WebShellDetailOpt", props)

    return (
        <div style={{width: "100%", height: "100%"}}>
            <YakitTabs className='scan-port-tabs no-theme-tabs' tabBarStyle={{marginBottom: 5}}>
                <YakitTabs.YakitTabPane tab={"基本信息"} key={"basicInfo"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"虚拟终端"} key={"vcmd"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"文件管理"} key={"fileOpt"}>
                    <WebShellURLTreeAndTable Id={props.webshellInfo.Id} shellType={props.webshellInfo.ShellType as ShellType}/>
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"数据库管理"} key={"databaseOpt"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
                </YakitTabs.YakitTabPane>
            </YakitTabs>
        </div>
    )
}
