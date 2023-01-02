import React, {useEffect, useRef} from "react";
import {AutoCard} from "@/components/AutoCard";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {ExecResult} from "@/pages/invoker/schema";
import {Uint8ArrayToString} from "@/utils/str";
import {writeXTerm, xtermFit} from "@/utils/xtermUtils";
import {XTerm} from "xterm-for-react";

export interface EngineConsoleProp {

}

const {ipcRenderer} = window.require("electron");

export const EngineConsole: React.FC<EngineConsoleProp> = (props) => {
    const xtermRef = useRef<any>(null);

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            try {
                writeXTerm(xtermRef, Uint8ArrayToString(data.Raw) + "\r\n")
            } catch (e) {
                console.info(e)
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[AttachCombinedOutput] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[AttachCombinedOutput] finished")
        })

        ipcRenderer.invoke("AttachCombinedOutput", {}, token).then(() => {
            info(`启动输出监控成功: ${"111"}`)
        })

        return () => {
            ipcRenderer.invoke("cancel-AttachCombinedOutput", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [xtermRef])

    return <AutoCard size={"small"} hoverable={false} bodyStyle={{padding: 0}}>
        <XTerm
            ref={xtermRef}
            options={{
                convertEol: true, rows: 12, cols: 104,
                theme: {
                    foreground: "#536870",
                    background: "#E8E9E8",
                    cursor: "#536870",

                    black: "#002831",
                    brightBlack: "#001e27",

                    red: "#d11c24",
                    brightRed: "#bd3613",

                    green: "#738a05",
                    brightGreen: "#475b62",

                    yellow: "#a57706",
                    brightYellow: "#536870",

                    blue: "#2176c7",
                    brightBlue: "#708284",

                    magenta: "#c61c6f",
                    brightMagenta: "#5956ba",

                    cyan: "#259286",
                    brightCyan: "#819090",

                    white: "#eae3cb",
                    brightWhite: "#fcf4dc"
                }
            }}
            onResize={(r) => {
                xtermFit(xtermRef, 120, 18)
            }}
        />
    </AutoCard>
};