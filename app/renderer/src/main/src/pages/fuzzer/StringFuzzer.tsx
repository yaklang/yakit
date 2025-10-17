import React, {useEffect, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {List} from "antd"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {FUZZER_LABEL_LIST_NUMBER} from "./HTTPFuzzerEditorMenu"
import {v4 as uuidv4} from "uuid"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {IMonacoEditor} from "@/utils/editors"
import styles from "./StringFuzzer.module.scss"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")
export interface QueryFuzzerLabelResponseProps {
    Id: number
    Label: string
    Description: string
    DescriptionUi?: string
    DefaultDescription: string
    Hash: string
}

interface FuzztagArgumentType {
    Name: string
    DefaultValue: string
    Description: string
    IsOptional: boolean
    IsList: boolean
    Separators: string[]
}
interface FuzztagInfo {
    Name: string
    Description: string
    VerboseName: string
    Examples: string[]
    ArgumentTypes: FuzztagArgumentType[]
}
interface GetAllFuzztagInfoResponse {
    Data: FuzztagInfo[]
}
interface Range {
    Code: string
    StartLine: number
    StartColumn: number
    EndLine: number
    EndColumn: number
}
interface GenerateFuzztagRequest {
    Name: string
    Type: "insert" | "wrap"
    Range: Range
}
interface StringFuzzerProps {
    insertCallback?: (s: string) => void
    close?: () => void
}

export const StringFuzzer: React.FC<StringFuzzerProps> = (props) => {
    const {insertCallback, close} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
    const [templateEditor, setTemplateEditor] = useState<IMonacoEditor>()
    const [template, setTemplate] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const [random, _] = useState(randomString(20))
    const token = `client-string-fuzzer-${random}`
    const [fuzztagList, setFuzztagList] = useState<FuzztagInfo[]>([])
    const [renderList, setRenderList] = useState<FuzztagInfo[]>([])
    const [searchVal, setSearchVal] = useState<string>("")

    const onSubmit = useMemoizedFn(() => {
        if (!template) {
            yakitNotify("warning", t("StringFuzzer.fuzz_template_empty"))
            return
        }
        setLoading(true)
        ipcRenderer.invoke("string-fuzzer", {template, token})
    })

    useEffect(() => {
        if (!random) return
        ipcRenderer.on(token, (e, data: {error: any; data: {Results: string[]}}) => {
            if (data.error) {
                yakitNotify("error", data.error?.details || data.error?.detail || t("YakitNotification.unknown_error"))
                return
            }
            const {Results} = data.data
            showYakitDrawer({
                title: t("StringFuzzer.payload_test_result"),
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
                                        return <YakitTag>{t("StringFuzzer.total")}{r}</YakitTag>
                                    },
                                    size: "small"
                                }}
                                bordered={true}
                                renderItem={(e) => {
                                    return (
                                        <List.Item>
                                            <span
                                                className='content-ellipsis'
                                                style={{color: "var(--Colors-Use-Neutral-Text-1-Title)"}}
                                            >
                                                {e}
                                            </span>
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
            yakitNotify("warning", t("StringFuzzer.fuzz_template_empty"))
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
                            Description: `${t("StringFuzzer.tag")}${count + 1}`,
                            DefaultDescription: `${uuidv4()}`
                        }
                    ]
                })
                .then(() => {
                    setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: count + 1}))
                    close && close()
                    yakitNotify("success", t("StringFuzzer.tag_add_success"))
                })
                .catch((err) => {
                    yakitNotify("error", err + "")
                })
        })
    })

    useEffect(() => {
        ipcRenderer
            .invoke("GetAllFuzztagInfo", {Key: ""})
            .then((res: GetAllFuzztagInfoResponse) => {
                setFuzztagList(res.Data || [])
                setRenderList(res.Data || [])
            })
            .catch((err) => {
                yakitNotify("error", err + "")
            })
    }, [])

    useDebounceEffect(
        () => {
            const list = fuzztagList.filter((item) =>
                (item.Name + item.VerboseName + item.Description)
                    .toLocaleLowerCase()
                    .includes(searchVal.toLocaleLowerCase())
            )
            setRenderList(list)
        },
        [searchVal],
        {wait: 300}
    )

    const generateFuzztag = (type: "insert" | "wrap", tagItem: FuzztagInfo) => {
        const range = getSelection(type)
        if (range === undefined) return
        const params: GenerateFuzztagRequest = {
            Type: type,
            Name: tagItem.Name,
            Range: range
        }
        ipcRenderer
            .invoke("GenerateFuzztag", params)
            .then((res) => {
                if (res.Status.Ok) {
                    setTemplate(res.Result)
                }
            })
            .catch((err) => {
                yakitNotify("error", err + "")
            })
    }
    const getSelection = (type) => {
        const model = templateEditor?.getModel()
        if (model) {
            const selection = templateEditor?.getSelection()
            if (selection && !selection.isEmpty()) {
                return {
                    Code: template,
                    StartLine: selection.startLineNumber,
                    StartColumn: selection.startColumn,
                    EndLine: selection.endLineNumber,
                    EndColumn: selection.endColumn
                }
            } else {
                // 如果没有选中内容
                const position = templateEditor?.getPosition()
                if (position) {
                    if (type === "wrap") {
                        return {
                            Code: template,
                            StartLine: position.lineNumber,
                            StartColumn: 1,
                            EndLine: position.lineNumber,
                            EndColumn: position.column
                        }
                    } else {
                        return {
                            Code: template,
                            StartLine: position.lineNumber,
                            StartColumn: position.column,
                            EndLine: position.lineNumber,
                            EndColumn: position.column
                        }
                    }
                }
            }
        }
    }

    return (
        <YakitSpin spinning={loading}>
            <div className={styles["stringFuzzer"]}>
                <div className={styles["stringFuzzer-left"]}>
                    <div className={styles["stringFuzzer-search"]}>
                        <YakitInput
                            allowClear
                            prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                        ></YakitInput>
                    </div>
                    <div className={styles["stringFuzzer-list"]}>
                        {renderList.length > 0 ? (
                            <>
                                {renderList.map((item) => (
                                    <YakitPopover
                                        placement='rightTop'
                                        overlayClassName={styles["stringFuzzer-popover"]}
                                        content={
                                            <div className={styles["stringFuzzer-popover-cont"]}>
                                                <div className={styles["stringFuzzer-popover-cont-name"]}>
                                                    {item.VerboseName}
                                                </div>
                                                <div className={styles["stringFuzzer-popover-cont-Egname"]}>
                                                    {item.Name}
                                                </div>
                                                <div className={styles["stringFuzzer-popover-cont-desc"]}>
                                                    {t("StringFuzzer.description", {colon: true})}{item.Description}
                                                </div>
                                                <div className={styles["stringFuzzer-popover-cont-example"]}>
                                                    {t("StringFuzzer.example")}{item.Examples.join(", ")}
                                                </div>
                                                {item.ArgumentTypes.length > 0 && (
                                                    <>
                                                        <div>{t("StringFuzzer.parameter_type_info")}</div>
                                                        <table border={1} width='100%' cellPadding={8}>
                                                            <tr>
                                                                <th>{t("StringFuzzer.parameter_name")}</th>
                                                                <th>{t("StringFuzzer.default_value")}</th>
                                                                <th>{t("StringFuzzer.description", {colon: false})}</th>
                                                                <th>{t("StringFuzzer.optional_parameter")}</th>
                                                                <th>{t("StringFuzzer.array_parameter")}</th>
                                                                <th>{t("StringFuzzer.delimiter")}</th>
                                                            </tr>
                                                            {item.ArgumentTypes.map((argItem) => (
                                                                <tr key={argItem.Name}>
                                                                    <td>{argItem.Name}</td>
                                                                    <td>{argItem.DefaultValue}</td>
                                                                    <td>{argItem.Description}</td>
                                                                    <td>{argItem.IsOptional + ""}</td>
                                                                    <td>{argItem.IsList + ""}</td>
                                                                    <td>{argItem.Separators}</td>
                                                                </tr>
                                                            ))}
                                                        </table>
                                                    </>
                                                )}
                                            </div>
                                        }
                                        key={item.VerboseName}
                                    >
                                        <div className={styles["stringFuzzer-list-item"]}>
                                            <div className={styles["stringFuzzer-list-item-name"]}>
                                                {item.VerboseName}
                                            </div>
                                            <div className={styles["stringFuzzer-list-item-btns"]}>
                                                <span
                                                    className={styles["list-opt-btn"]}
                                                    onClick={() => generateFuzztag("wrap", item)}
                                                >
                                                    {t("StringFuzzer.nesting")}
                                                </span>
                                                <span
                                                    className={styles["list-opt-btn"]}
                                                    onClick={() => generateFuzztag("insert", item)}
                                                >
                                                    {t("StringFuzzer.insert")}
                                                </span>
                                            </div>
                                        </div>
                                    </YakitPopover>
                                ))}
                            </>
                        ) : (
                            <YakitEmpty></YakitEmpty>
                        )}
                    </div>
                </div>
                <div className={styles["stringFuzzer-right"]}>
                    <div className={styles["stringFuzzer-right-editor"]}>
                        <YakitEditor
                            type={"http"}
                            value={template}
                            readOnly={false}
                            setValue={setTemplate}
                            editorDidMount={(editor, monaco) => {
                                setTemplateEditor(editor)
                            }}
                        />
                    </div>
                    <div className={styles["stringFuzzer-right-btns"]}>
                        <YakitButton type='outline2' onClick={onSubmit}>
                            {t("StringFuzzer.viewGeneratedPayload")}
                        </YakitButton>
                        {insertCallback && (
                            <YakitButton
                                type={"primary"}
                                onClick={() => {
                                    insertCallback(template)
                                }}
                            >
                                {t("StringFuzzer.insertTagPosition")}
                            </YakitButton>
                        )}
                        <YakitPopconfirm
                            title={t("StringFuzzer.confirmResetDictionary")}
                            onConfirm={() => {
                                setTemplate("")
                            }}
                            placement='top'
                        >
                            <YakitButton type='outline2'>{t("YakitButton.reset")}</YakitButton>
                        </YakitPopconfirm>
                        <YakitButton type='outline2' onClick={addToCommonTag}>
                            {t("StringFuzzer.addToFavoriteTags")}
                        </YakitButton>
                    </div>
                </div>
            </div>
        </YakitSpin>
    )
}
