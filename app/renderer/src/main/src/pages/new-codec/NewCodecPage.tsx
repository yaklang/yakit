import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {EngineConsole} from "@/pages/engineConsole/EngineConsole";
import {failed, info, success, yakitNotify} from "@/utils/notification";
import {Button, Form, Popconfirm, Progress, Space, Tag} from "antd";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {randomString} from "@/utils/randomUtil";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput";
import {InputInteger, InputItem, SwitchItem} from "@/utils/inputUtil";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";
import {DefaultPluginResultUI} from "@/pages/invoker/ExecYakScript";
import {ExecResult} from "@/pages/invoker/schema";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {useGetState} from "ahooks";
import styles from "@/pages/screenRecorder/ScreenRecorderPage.module.scss";
import {ChromeFrameSvgIcon, ChromeSvgIcon} from "@/assets/newIcon";
import {ArrowsAltOutlined, CheckOutlined} from "@ant-design/icons";
import {openExternalWebsite} from "@/utils/openWebsite";
import "./style.css"
import {YakCodeEditor} from "@/utils/editors";

export interface NewCodecPageProp {

}


const {ipcRenderer} = window.require("electron");
export const NewCodecPage: React.FC<NewCodecPageProp> = (props) => {

    const [text, setText] = useState("")
    const [result, setResult] = useState("")
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

    return <div className="container">
        <div className="left">
            Left
        </div>
        <div className="center">
            Center
        </div>
        <div className="right">
            <div className="top">
                <YakCodeEditor
                    noTitle={true}
                    language={"html"}
                    originValue={Buffer.from(text, "utf8")} hideSearch={true}
                    onChange={i => setText(Uint8ArrayToString(i, "utf8"))}
                    refreshTrigger={refreshTrigger}
                    noHex={true}
                    noHeader={true}
                />
            </div>
            <div className="bottom">
                <YakCodeEditor
                    noTitle={true}
                    language={"html"}
                    readOnly={true}
                    originValue={Buffer.from(result, "utf8")}
                    hideSearch={true}
                    noHex={true}
                    noHeader={true}
                />
            </div>
        </div>
    </div>
};

