import React, { useEffect, useRef, useState } from "react"
import { FuzzerResponse } from "@/pages/fuzzer/HTTPFuzzerPage"
import { showModal } from "@/utils/showModal"
import { YakEditor } from "@/utils/editors"
import { StringToUint8Array, Uint8ArrayToString } from "@/utils/str"
import { useDebounceEffect, useGetState, useMap } from "ahooks"
import { editor } from "monaco-editor"
import { Alert, Button, Divider, Popconfirm, Space, Tag, Typography } from "antd"
import { AutoCard } from "@/components/AutoCard"
import { failed, info, yakitFailed } from "@/utils/notification"
import { randomString } from "@/utils/randomUtil"
import { ExecResult } from "@/pages/invoker/schema"
import { ResizeBox } from "@/components/ResizeBox"
import { saveABSFileToOpen } from "@/utils/openWebsite"
import { SelectOne } from "@/utils/inputUtil"
import { showYakitModal } from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import { YakitRadioButtons } from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { RegexpInput } from "@/pages/mitm/MITMRule/MITMRuleFromModal"
import styles from "./extractor.module.scss"
import { YakitPopconfirm } from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import { YakitSpin } from "@/components/yakitUI/YakitSpin/YakitSpin"

const { Text } = Typography

export interface WebFuzzerResponseExtractorProp {
    responses: FuzzerResponse[]
    sendPayloadsType: string
}

const { ipcRenderer } = window.require("electron")

export const WebFuzzerResponseExtractor: React.FC<WebFuzzerResponseExtractorProp> = (props) => {
    const { responses, sendPayloadsType, } = props
    const sampleResponse = responses[0]
    const [editor, setEditor] = useGetState<editor.IStandaloneCodeEditor>()
    const [selected, setSelected] = useGetState<string>("")
    const [_responseStr, setResponseStr, getResponseStr] = useGetState<string>("")
    const [mode, setMode] = useState<"regexp" | "regexp-between">("regexp-between")

    const [loading, setLoading] = useState<boolean>(false)

    // 用户匹配数据前后缀提取正则
    const [prefix, setPrefix] = useState("")
    const [suffix, setSuffix] = useState("")

    // 用户选择的数据转换成的正则
    const [matchedRegexp, setMatchedRegexp] = useState<string>("")

    // 存放提取出来的数据
    const [extracted, setExtracted] = useState<string[]>([])

    // stream token
    const [_token, setToken, getToken] = useGetState(randomString(40))

    useEffect(() => {
        if (!editor) {
            return
        }
        const model = editor.getModel()
        if (!model) {
            return
        }

        const setSelectedFunc = () => {
            try {
                const selection = editor.getSelection()
                if (!selection) {
                    return
                }

                setResponseStr(model.getValue())
                // 这里能获取到选择到的内容
                setSelected(model.getValueInRange(selection))
            } catch (e) {
                console.info("提取选择数据错误")
                console.info(e)
            }
        }
        setSelectedFunc()
        const id = setInterval(setSelectedFunc, 500)
        return () => {
            clearInterval(id)
        }
    }, [editor])

    useDebounceEffect(
        () => {
            if (!selected) {
                setPrefix("")
                setSuffix("")
                return
            }

            ipcRenderer
                .invoke("GenerateExtractRule", {
                    Data: StringToUint8Array(getResponseStr()),
                    Selected: StringToUint8Array(selected)
                })
                .then((e: { PrefixRegexp: string; SuffixRegexp: string; SelectedRegexp: string }) => {
                    setPrefix(e.PrefixRegexp)
                    setSuffix(e.SuffixRegexp)
                    setMatchedRegexp(e.SelectedRegexp)
                })
                .catch((e) => {
                    failed(`无法生成数据提取规则: ${e}`)
                })
        },
        [selected],
        { wait: 500 }
    )
    const [extractedMap, { setAll }] = useMap<string, string>()
    useEffect(() => {
        if (!_token) {
            return
        }
        const token = getToken()
        const extractedCache: string[] = []
        let extractedCountLastUpdated = 0
        let extractedMap = new Map<string, string>()
        ipcRenderer.on(`${token}-data`, async (e, data: { Extracted: Uint8Array; Token: string }) => {
            const item = extractedMap.get(data.Token)
            if (item) {
                extractedMap.set(data.Token, item + "," + Uint8ArrayToString(data.Extracted))
            } else {
                extractedMap.set(data.Token, Uint8ArrayToString(data.Extracted))
            }

            extractedCache.push(Uint8ArrayToString(data.Extracted))
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            setTimeout(() => {
                setLoading(false)
            }, 200)
            failed(`[ExtractData] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setAll(extractedMap)
            setTimeout(() => {
                setLoading(false)
            }, 200)
            info("[ExtractData] finished")
        })

        const extractedDataCacheId = setInterval(() => {
            if (extractedCache.length <= 0) {
                return
            }

            if (extractedCache.length != extractedCountLastUpdated) {
                setExtracted([...extractedCache])
                extractedCountLastUpdated = extractedCache.length
            }
        }, 500)
        return () => {
            clearInterval(extractedDataCacheId)

            ipcRenderer.invoke("cancel-ExtractData", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [_token])

    return (
        <Space style={{ width: "100%", padding: 24 }} direction={"vertical"}>
            <YakitSpin spinning={loading}>
                <AutoCard
                    size={"small"}
                    title={
                        <Space>
                            <div>自动生成提取规则</div>
                            <YakitRadioButtons
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                size='small'
                                options={[
                                    {
                                        label: "前后缀正则提取",
                                        value: "regexp-between"
                                    },
                                    {
                                        label: "单正则提取",
                                        value: "regexp"
                                    }
                                ]}
                                buttonStyle='solid'
                            />
                        </Space>
                    }
                    extra={
                        <Space>
                            <YakitTag>共{responses.length}个响应</YakitTag>
                            <YakitButton
                                type={"primary"}
                                size={"small"}
                                onClick={() => {
                                    setLoading(true)
                                    responses.forEach((i, number) => {
                                        ipcRenderer
                                            .invoke(
                                                "ExtractData",
                                                {
                                                    Mode: mode,
                                                    PrefixRegexp: prefix,
                                                    SuffixRegexp: suffix,
                                                    MatchRegexp: matchedRegexp,
                                                    Data: i.ResponseRaw,
                                                    Token: i.UUID
                                                },
                                                getToken()
                                            )
                                            .finally(() => {
                                                if (number === responses.length - 1) {
                                                    ipcRenderer.invoke("ExtractData", { End: true }, getToken())
                                                }
                                            })
                                    })
                                }}
                            >
                                提取数据
                            </YakitButton>
                        </Space>
                    }
                >
                    {mode === "regexp-between" && (
                        <Space direction={"vertical"} style={{ width: "100%", justifyContent: "center" }}>
                            <div className={styles["space-item"]}>
                                <span>前缀(正则)：</span>
                                <div style={{ flex: 1, maxWidth: "90%" }}>
                                    <RegexpInput
                                        initialTagShow={true}
                                        regexp={prefix}
                                        onSure={setPrefix}
                                        onSave={() => { }}
                                    />
                                </div>
                            </div>
                            <div className={styles["space-item"]}>
                                <span>后缀(正则)：</span>
                                <div style={{ flex: 1, maxWidth: "90%" }}>
                                    <RegexpInput
                                        initialTagShow={true}
                                        regexp={suffix}
                                        onSure={setSuffix}
                                        onSave={() => { }}
                                    />
                                </div>
                            </div>
                            <Space>
                                {selected ? (
                                    <YakitTag
                                        copyText={selected}
                                        enableCopy={true}
                                        iconColor='var(--yakit-primary-5)'
                                    />
                                ) : (
                                    <YakitTag>未选中提取规则</YakitTag>
                                )}
                            </Space>
                        </Space>
                    )}
                    {mode === "regexp" && (
                        <Space direction={"vertical"} style={{ width: "100%" }}>
                            <div className={styles["space-item"]}>
                                <span>自动提取正则：</span>
                                <div style={{ flex: 1, maxWidth: "90%" }}>
                                    <RegexpInput
                                        initialTagShow={true}
                                        regexp={matchedRegexp}
                                        onSure={setMatchedRegexp}
                                        onSave={() => { }}
                                    />
                                </div>
                            </div>
                        </Space>
                    )}
                </AutoCard>
                <div style={{ height: 400 }}>
                    <ResizeBox
                        firstNode={
                            <YakEditor
                                editorDidMount={(e) => {
                                    setEditor(e)
                                }}
                                readOnly={true}
                                noMiniMap={true}
                                noLineNumber={true}
                                type={"html"}
                                value={Uint8ArrayToString(sampleResponse.ResponseRaw)}
                            />
                        }
                        secondRatio={"30%"}
                        secondNode={
                            <AutoCard
                                size={"small"}
                                bordered={false}
                                title={
                                    <Space>
                                        <YakitTag>
                                            已提/总量：
                                            {extracted.length}/{responses.length}
                                        </YakitTag>
                                    </Space>
                                }
                                extra={
                                    <>
                                        <YakitPopconfirm
                                            title={"确定要清除已提取数据？"}
                                            onConfirm={() => {
                                                setToken(randomString(46))
                                                setExtracted([])
                                            }}
                                        >
                                            <YakitButton size={"small"} type='outline1' colors="danger">
                                                清空
                                            </YakitButton>
                                        </YakitPopconfirm>
                                        <YakitButton
                                            size={"small"}
                                            type='text'
                                            onClick={() => {
                                                saveABSFileToOpen("webfuzzer-extract-data.txt", extracted.join("\n"))
                                            }}
                                            style={{ marginLeft: 6 }}
                                        >
                                            下载文件
                                        </YakitButton>
                                        {extractedMap.size > 0 && (
                                            <YakitButton
                                                size={"small"}
                                                type='text'
                                                onClick={() => {
                                                    ipcRenderer
                                                        .invoke("send-extracted-to-table", { type: sendPayloadsType, extractedMap })
                                                        .then(() => {
                                                            info("数据发送成功")
                                                        })
                                                        .catch((err) => {
                                                            yakitFailed("数据发送失败" + err)
                                                        })
                                                }}
                                            >
                                                在表中展示
                                            </YakitButton>
                                        )}
                                    </>
                                }
                                bodyStyle={{ margin: 0, padding: 0 }}
                            >
                                <YakEditor
                                    readOnly={true}
                                    noMiniMap={true}
                                    noLineNumber={true}
                                    triggerId={extracted}
                                    type={"html"}
                                    value={extracted.join("\n")}
                                />
                            </AutoCard>
                        }
                    />
                </div>
            </YakitSpin>
        </Space>
    )
}
