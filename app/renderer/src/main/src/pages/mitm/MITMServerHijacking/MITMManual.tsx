import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {HTTPPacketEditor} from "@/utils/editors"
import {Divider} from "antd"
import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {allowHijackedResponseByRequest, MITMStatus} from "./MITMHijackedContent"
import styles from "./MITMServerHijacking.module.scss"
import * as monaco from "monaco-editor"
import classNames from "classnames"
import {useResponsive} from "ahooks"

const {ipcRenderer} = window.require("electron")

interface MITMManualHeardExtraProps {
    urlInfo: string
    ipInfo: string
    status: MITMStatus
    currentIsWebsocket: boolean
    currentIsForResponse: boolean
    hijackResponseType: "onlyOne" | "all" | "never"
    setHijackResponseType: (v: "onlyOne" | "all" | "never") => void
    onDiscardRequest: () => void
    onSubmitData: () => void
    width: number
}
export const MITMManualHeardExtra: React.FC<MITMManualHeardExtraProps> = React.memo((props) => {
    const {
        urlInfo,
        ipInfo,
        status,
        currentIsWebsocket,
        currentIsForResponse,
        hijackResponseType,
        setHijackResponseType,
        onDiscardRequest,
        onSubmitData,
        width
    } = props
    return (
        <div className={styles["autoForward-manual"]}>
            {width > 900 && (
                <ManualUrlInfo
                    urlInfo={urlInfo}
                    ipInfo={ipInfo}
                    status={status}
                    currentIsWebsocket={currentIsWebsocket}
                    currentIsForResponse={currentIsForResponse}
                />
            )}
            <div className={styles["autoForward-manual-right"]}>
                <div className={styles["manual-select"]}>
                    <div className={styles["manual-select-label"]}>劫持响应</div>
                    <YakitSelect
                        value={hijackResponseType}
                        wrapperStyle={{width: 88}}
                        size='small'
                        onSelect={setHijackResponseType}
                    >
                        <YakitSelect.Option value='onlyOne'>仅一次</YakitSelect.Option>
                        <YakitSelect.Option value='all'>永久</YakitSelect.Option>
                        <YakitSelect.Option value='never'>从不</YakitSelect.Option>
                    </YakitSelect>
                </div>
                <YakitButton
                    type='outline2'
                    disabled={status === "hijacking"}
                    className={styles["manual-discard-request"]}
                    onClick={() => onDiscardRequest()}
                >
                    丢弃请求
                </YakitButton>
                <YakitButton disabled={status === "hijacking"} onClick={() => onSubmitData()}>
                    提交数据
                </YakitButton>
            </div>
        </div>
    )
})

interface ManualUrlInfoProps {
    urlInfo: string
    ipInfo: string
    status: MITMStatus
    currentIsWebsocket: boolean
    currentIsForResponse: boolean
    className?: string
}
export const ManualUrlInfo: React.FC<ManualUrlInfoProps> = React.memo((props) => {
    const {urlInfo, ipInfo, status, currentIsWebsocket, currentIsForResponse, className} = props
    return (
        <div className={classNames(styles["autoForward-manual-urlInfo"], className)}>
            <div className={classNames(styles["manual-url-info"], "content-ellipsis")}>
                {status === "hijacking" ? "目标：监听中..." : `目标：${urlInfo}`}
            </div>
            {ipInfo && status !== "hijacking" && (
                <>
                    <Divider type='vertical' style={{margin: "0 8px", top: 0}} />
                    <span className={styles["manual-ip-info"]}>
                        {ipInfo} <CopyComponents copyText={ipInfo} />
                    </span>
                </>
            )}

            {currentIsWebsocket && status !== "hijacking" ? (
                <YakitTag
                    color='danger'
                    style={{
                        marginLeft: 8,
                        alignSelf: "center",
                        maxWidth: 140,
                        cursor: "pointer"
                    }}
                    size='small'
                >
                    Websocket {currentIsForResponse ? "响应" : "请求"}
                </YakitTag>
            ) : currentIsForResponse && status !== "hijacking" ? (
                <YakitTag
                    color='success'
                    style={{
                        marginLeft: 8,
                        alignSelf: "center",
                        maxWidth: 140,
                        cursor: "pointer"
                    }}
                    size='small'
                >
                    HTTP 响应
                </YakitTag>
            ) : (
                <YakitTag
                    color='success'
                    style={{
                        marginLeft: 8,
                        alignSelf: "center",
                        maxWidth: 140,
                        cursor: "pointer"
                    }}
                    size='small'
                >
                    HTTP 请求
                </YakitTag>
            )}
        </div>
    )
})
interface MITMManualEditorProps {
    currentPacket: Uint8Array
    setModifiedPacket: (u: Uint8Array) => void
    forResponse: boolean
    currentPacketId: number
    handleAutoForward: (v: "manual" | "log" | "passive") => void
    autoForward: "manual" | "log" | "passive"
    forward: () => void
    hijacking: () => void
    execFuzzer: (s: string) => void
    status: MITMStatus
}
export const MITMManualEditor: React.FC<MITMManualEditorProps> = React.memo((props) => {
    const {
        currentPacket,
        setModifiedPacket,
        forResponse,
        currentPacketId,
        handleAutoForward,
        autoForward,
        forward,
        hijacking,
        execFuzzer,
        status
    } = props
    // 操作系统类型
    const [system, setSystem] = useState<string>()

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])

    return (
        <HTTPPacketEditor
            originValue={currentPacket}
            noHeader={true}
            isResponse={new Buffer(currentPacket.subarray(0, 5)).toString("utf8").startsWith("HTTP/")}
            bordered={false}
            onChange={setModifiedPacket}
            noPacketModifier={true}
            readOnly={status === "hijacking"}
            refreshTrigger={(forResponse ? `rsp` : `req`) + `${currentPacketId}`}
            actions={[
                // {
                //     id: "send-to-scan-packet", label: "发送到数据包扫描器",
                //     run: e => {
                //         // console.info(mouseState)
                //         scanPacket(mouseState, false, "GET / HTTP/1.1\r\nHost: www.baidu.com", "")
                //     }, contextMenuGroupId: "Scanners",
                // },
                ...(forResponse
                    ? [
                          {
                              id: "trigger-auto-hijacked",
                              label: "切换为自动劫持模式",
                              keybindings: [
                                  monaco.KeyMod.Shift |
                                      (system === "Darwin" ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd) |
                                      monaco.KeyCode.KEY_T
                              ],
                              run: () => {
                                  handleAutoForward(autoForward === "manual" ? "log" : "manual")
                              },
                              contextMenuGroupId: "Actions"
                          },
                          {
                              id: "forward-response",
                              label: "放行该 HTTP Response",
                              run: function () {
                                  forward()
                                  // hijacking()
                                  // forwardResponse(getCurrentId()).finally(() => {
                                  //     setTimeout(() => setLoading(false), 300)
                                  // })
                              },
                              contextMenuGroupId: "Actions"
                          },
                          {
                              id: "drop-response",
                              label: "丢弃该 HTTP Response",
                              run: function () {
                                  hijacking()
                                  dropResponse(currentPacketId).finally(() => {
                                      // setTimeout(
                                      //     () => setLoading(false),
                                      //     300
                                      // )
                                  })
                              },
                              contextMenuGroupId: "Actions"
                          }
                      ]
                    : [
                          {
                              id: "trigger-auto-hijacked",
                              label: "切换为自动劫持模式",
                              keybindings: [
                                  monaco.KeyMod.Shift |
                                      (system === "Darwin" ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd) |
                                      monaco.KeyCode.KEY_T
                              ],
                              run: () => {
                                  handleAutoForward(autoForward === "manual" ? "log" : "manual")
                              },
                              contextMenuGroupId: "Actions"
                          },
                          {
                              id: "send-to-fuzzer",
                              label: "发送到 Web Fuzzer",
                              keybindings: [
                                  monaco.KeyMod.Shift |
                                      (system === "Darwin" ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd) |
                                      monaco.KeyCode.KEY_R
                              ],
                              run: function (StandaloneEditor: any) {
                                  execFuzzer(StandaloneEditor.getModel().getValue())
                              },
                              contextMenuGroupId: "Actions"
                          },
                          // {
                          //     id: "send-to-plugin",
                          //     label: "发送到 数据包扫描",
                          //     keybindings: [
                          //         monaco.KeyMod.Shift |
                          //         (system === "Darwin" ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd) |
                          //         monaco.KeyCode.KEY_E
                          //     ],
                          //     run: function (StandaloneEditor: any) {
                          //         if (!StandaloneEditor.getModel().getValue()) return
                          //         execPlugin(StandaloneEditor.getModel().getValue())
                          //     },
                          //     contextMenuGroupId: "Actions"
                          // },
                          {
                              id: "forward-response",
                              label: "放行该 HTTP Request",
                              keybindings: [
                                  monaco.KeyMod.Shift |
                                      (system === "Darwin" ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd) |
                                      monaco.KeyCode.KEY_F
                              ],
                              run: function () {
                                  forward()
                                  // hijacking()
                                  // forwardRequest(getCurrentId()).finally(() => {
                                  //     setTimeout(() => setLoading(false), 300)
                                  // })
                              },
                              contextMenuGroupId: "Actions"
                          },
                          {
                              id: "drop-response",
                              label: "丢弃该 HTTP Request",
                              run: function () {
                                  hijacking()
                                  dropRequest(currentPacketId).finally(() => {
                                      // setTimeout(
                                      //     () => setLoading(false),
                                      //     300
                                      // )
                                  })
                              },
                              contextMenuGroupId: "Actions"
                          },
                          {
                              id: "hijack-current-response",
                              label: "劫持该 Request 对应的响应",
                              run: function () {
                                  allowHijackedResponseByRequest(currentPacketId)
                              },
                              contextMenuGroupId: "Actions"
                          }
                      ])
            ]}
        />
    )
})

export const dropRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-request", id)
}

export const dropResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-response", id)
}
