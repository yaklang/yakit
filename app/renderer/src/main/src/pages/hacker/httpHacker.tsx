import React, {useState, useEffect} from "react"
import {Tabs} from "antd"
import {MITMPage} from "../mitm/MITMPage"
import {HTTPHistory} from "../../components/HTTPHistory"
import {showDrawer} from "../../utils/showModal"
import {HackerPlugin} from "./HackerPlugin"
import ReactDOM from "react-dom"

export interface HTTPHackerProp {}

const {ipcRenderer} = window.require("electron")

const HTTPHacker: React.FC<HTTPHackerProp> = (props) => {
    const [activeTab, setActiveTag] = useState("mitm")

    useEffect(() => {
        ipcRenderer.on("fetch-send-to-packet-hack", (e, res: any) => {
            const {request, ishttps, response} = res || {}
            if (request && ishttps !== undefined) {
                let m = showDrawer({
                    width: "80%",
                    content: <HackerPlugin request={request} isHTTPS={ishttps} response={response}></HackerPlugin>
                })
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-packet-hack")
        }
    }, [])
    useEffect(() => {
        ipcRenderer.on("fetch-positioning-http-history", (e, res) => {
            if (res.activeTab) setActiveTag(res.activeTab)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-positioning-http-history")
        }
    }, [])
    return (
        <div style={{margin: 0, height: "100%"}}>
            <MITMPage />
        </div>
    )
}

export default HTTPHacker
