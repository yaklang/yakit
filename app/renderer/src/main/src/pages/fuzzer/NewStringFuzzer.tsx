import React, {useEffect, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {List} from "antd"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {FUZZER_LABEL_LIST_NUMBER} from "./HTTPFuzzerEditorMenu"
import {v4 as uuidv4} from "uuid"
import styles from "./NewStringFuzzer.module.scss"

const {ipcRenderer} = window.require("electron")

interface NewStringFuzzerProp {
    insertCallback?: (s: string) => void
    close?: () => void
}
export const NewStringFuzzer: React.FC<NewStringFuzzerProp> = (props) => {
    const {insertCallback, close} = props
    const [template, setTemplate] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const [random, _] = useState(randomString(20))
    const token = `client-string-fuzzer-${random}`

    const onSubmit = useMemoizedFn(() => {
        if (!template) {
            yakitNotify("warning", "Fuzz模版为空")
            return
        }
        setLoading(true)
        ipcRenderer.invoke("string-fuzzer", {template, token})
    })

    useEffect(() => {
        if (!random) return
        ipcRenderer.on(token, (e, data: {error: any; data: {Results: string[]}}) => {
            if (data.error) {
                yakitNotify("error", data.error?.details || data.error?.detail || "未知错误")
                return
            }
            const {Results} = data.data
            showYakitDrawer({
                title: "Payload 测试结果",
                content: (
                    <div style={{height: "100%", overflow: "auto"}}>
                        <div style={{height: "80%"}}>
                            <List
                                className='yakit-list yakit-list-bordered'
                                size={"small"}
                                dataSource={Results}
                                pagination={{
                                    pageSize: 15,
                                    showTotal: (r) => {
                                        return <YakitTag>总量:{r}</YakitTag>
                                    },
                                    size: "small"
                                }}
                                bordered={true}
                                renderItem={(e) => {
                                    return (
                                        <List.Item>
                                            <span className='content-ellipsis'>{e}</span>
                                            <CopyComponents copyText={e} />
                                        </List.Item>
                                    )
                                }}
                            ></List>
                        </div>
                    </div>
                ),
                width: "35%",
                mask: true
            })
            setLoading(false)
        })
        return () => {
            ipcRenderer.removeAllListeners(token)
        }
    }, [random])

    const addToCommonTag = useMemoizedFn(() => {
        if (!template) {
            yakitNotify("warning", "Fuzz模版为空")
            return
        }
        getRemoteValue(FUZZER_LABEL_LIST_NUMBER).then((data) => {
            if (!data) {
                return
            }
            const count: number = JSON.parse(data).number
            ipcRenderer
                .invoke("SaveFuzzerLabel", {
                    Data: [
                        {
                            Label: template,
                            Description: `标签${count + 1}`,
                            DefaultDescription: `${uuidv4()}`
                        }
                    ]
                })
                .then(() => {
                    setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: count + 1}))
                    close && close()
                    yakitNotify("success", "标签添加成功")
                })
                .catch((err) => {
                    yakitNotify("error", err + "")
                })
        })
    })

    return (
        <YakitSpin spinning={loading}>
            <div className={styles["stringFuzzer"]}>
                <div className={styles["stringFuzzer-left"]}>
                    <div className={styles["stringFuzzer-search"]}>
                        <YakitInput
                            allowClear
                            prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                            onChange={(e) => {}}
                        ></YakitInput>
                    </div>
                    <div className={styles["stringFuzzer-list"]}>
                        <YakitPopover
                            placement='rightTop'
                            overlayClassName={styles["stringFuzzer-popover"]}
                            content={
                                <div>
                                    <div>123</div>
                                </div>
                            }
                        >
                            <div className={styles["stringFuzzer-list-item"]}>
                                <div className={styles["stringFuzzer-list-item-name"]}>啊啊啊啊啊啊啊啊啊啊</div>
                                <div className={styles["stringFuzzer-list-item-btns"]}>
                                    <span className={styles["list-opt-btn"]}>嵌入</span>
                                    <span className={styles["list-opt-btn"]}>插入</span>
                                </div>
                            </div>
                        </YakitPopover>
                    </div>
                </div>
                <div className={styles["stringFuzzer-right"]}>
                    <div className={styles["stringFuzzer-right-editor"]}>
                        <YakitEditor
                            type={"http"}
                            value={template}
                            readOnly={false}
                            setValue={setTemplate}
                            onCursorDetail={(position) => {
                                console.log("position", position)
                            }}
                            onSelectedText={(selectedText) => {
                                console.log("selectedText", selectedText)
                            }}
                        />
                    </div>
                    <div className={styles["stringFuzzer-right-btns"]}>
                        <YakitButton type='outline2' onClick={onSubmit}>
                            查看生成后的 Payload
                        </YakitButton>
                        {insertCallback && (
                            <YakitButton
                                type={"primary"}
                                onClick={() => {
                                    insertCallback(template)
                                }}
                            >
                                插入标签所在位置
                            </YakitButton>
                        )}
                        <YakitPopconfirm
                            title={"确认要重置你的 Payload 吗？"}
                            onConfirm={() => {
                                setTemplate("")
                            }}
                            placement='top'
                        >
                            <YakitButton type='outline2'>重置</YakitButton>
                        </YakitPopconfirm>
                        <YakitButton type='outline2' onClick={addToCommonTag}>
                            添加到常用标签
                        </YakitButton>
                    </div>
                </div>
            </div>
        </YakitSpin>
    )
}
