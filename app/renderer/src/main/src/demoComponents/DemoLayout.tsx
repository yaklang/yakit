import React, {useState} from "react"
import {DemoItemSelectMultiForString, DemoItemSelectOne} from "./itemSelect/ItemSelect"
import {DemoItemSwitch} from "./itemSwitch/ItemSwitch"
import {DemoItemCheckBox, DemoItemRadio, DemoItemRadioButton} from "./itemRadioAndCheckbox/RadioAndCheckbox"
import {
    DemoItemAutoComplete,
    DemoItemInput,
    DemoItemInputDraggerPath,
    DemoItemInputFloat,
    DemoItemInputInteger,
    DemoItemTextArea
} from "./itemInput/ItemInput"
import {DemoVirtualTable} from "./virtualTable/VirtualTable"

import {v4 as uuidv4} from "uuid"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
interface InfoProps {
    id: number
    name: string
    time: number
    content: string
}

const apiFetchList: () => Promise<{
    data: InfoProps[]
    pagemeta: {limit: number; page: number; total: number; total_page: number}
}> = () => {
    return new Promise((resolve, reject) => {
        try {
            const obj: {data: InfoProps[]; pagemeta: {limit: number; page: number; total: number; total_page: number}} =
                {
                    data: [1, 2, 3, 4, 5].map((item) => {
                        const id = Math.floor(Math.random() * 1000)
                        const name = uuidv4()
                        const obj: InfoProps = {
                            id: id,
                            name: name,
                            time: new Date().getTime(),
                            content: name
                        }
                        return obj
                    }),
                    pagemeta: {limit: 20, page: 1, total: 10000, total_page: 500}
                }
            setTimeout(() => {
                resolve(obj)
            }, 1000)
        } catch (error) {
            reject("error")
        }
    })
}

export const DemoLayout: React.FC<any> = (p) => {
    const {t} = useI18nNamespaces(["utils"])
    const [oneSelect, setOneSelect] = useState<number>()
    const [multiSelect, setMultiSelect] = useState<string>()

    const [switchValue, setSwitchValue] = useState<boolean>(false)

    const [radios, setRadios] = useState<string>("1")
    const [radiosButton, setRadiosButton] = useState<string>("1")
    const [checkboxs, setCheckboxs] = useState<string[]>([])

    const [inputs, setInputs] = useState<string>("")
    const [textareas, setTextareas] = useState<string>("")
    const [autoCompletes, setAutoCompletes] = useState<string>("")
    const [integers, setIntegers] = useState<number>(0)
    const [floats, setFloats] = useState<number>(0.01)
    const [path, setPath] = useState<string>("")

    const [isStop, setIsStop] = useState<boolean>(false)
    const [triggerClear, setTriggetClear] = useState<boolean>(false)
    const loadMore: (info?: InfoProps) => Promise<{data: InfoProps[]}> = useMemoizedFn((info) => {
        return new Promise((resolve, reject) => {
            apiFetchList()
                .then((res) => {
                    resolve({data: res.data})
                })
                .catch((e) => {
                    reject(e)
                })
        })
    })

    return (
        <div style={{width: "100%", height: "100%", overflow: "hidden", display: "flex"}}>
            <div
                style={{
                    paddingLeft: 20,
                    width: "40%",
                    height: "100%",
                    borderRight: "1px solid #000",
                    overflow: "hidden auto"
                }}
            >
                <DemoItemSelectOne
                    value={oneSelect}
                    setValue={setOneSelect}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.singleSelect")}
                    help={t("DemoLayout.help")}
                    placeholder={t("DemoLayout.pleaseSelect")}
                    data={[
                        {label: "1", value: 1},
                        {label: "2", value: 2},
                        {label: "3", value: 3},
                        {label: "4", value: 4}
                    ]}
                />
                <DemoItemSelectMultiForString
                    value={multiSelect}
                    setValue={setMultiSelect}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.multiSelect")}
                    help={t("DemoLayout.help")}
                    placeholder={t("DemoLayout.pleaseSelect")}
                    allowClear={true}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemSwitch
                    value={switchValue}
                    setValue={setSwitchValue}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.switch")}
                    help={t("DemoLayout.help")}
                />
                <DemoItemRadio
                    value={radios}
                    setValue={setRadios}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.radioGroup")}
                    help={t("DemoLayout.help")}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemRadioButton
                    value={radiosButton}
                    setValue={setRadiosButton}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.radioButtonGroup")}
                    help={t("DemoLayout.help")}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemCheckBox
                    value={checkboxs}
                    setValue={setCheckboxs}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.checkbox")}
                    help={t("DemoLayout.help")}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemInput
                    value={inputs}
                    setValue={setInputs}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.input")}
                    help={t("DemoLayout.help")}
                    required={true}
                    placeholder={t("DemoLayout.placeholder")}
                />
                <DemoItemTextArea
                    value={textareas}
                    setValue={setTextareas}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.textarea")}
                    help={t("DemoLayout.help")}
                    placeholder={t("DemoLayout.placeholder")}
                    allowClear={true}
                    autoSize={{minRows: 1, maxRows: 3}}
                />
                <DemoItemAutoComplete
                    value={autoCompletes}
                    setValue={setAutoCompletes}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.autoComplete")}
                    help={t("DemoLayout.help")}
                    placeholder={t("DemoLayout.placeholder")}
                    allowClear={true}
                    autoComplete={[t("DemoLayout.extra1"), t("DemoLayout.extra2"), t("DemoLayout.extra3"), t("DemoLayout.extra4")]}
                />
                <DemoItemInputInteger
                    value={integers}
                    setValue={setIntegers}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.integer")}
                    help={t("DemoLayout.help")}
                    min={0}
                    max={10}
                />
                <DemoItemInputFloat
                    value={floats}
                    setValue={setFloats}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.float")}
                    help={t("DemoLayout.help")}
                    min={0}
                    max={10}
                    precision={2}
                />
                <DemoItemInputDraggerPath
                    value={path}
                    setValue={setPath}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.inputFile")}
                    help={t("DemoLayout.help")}
                />
                <DemoItemInputDraggerPath
                    value={path}
                    setValue={setPath}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.textareaFile")}
                    help={t("DemoLayout.help")}
                    renderType='textarea'
                />
                <DemoItemInputDraggerPath
                    value={path}
                    setValue={setPath}
                    formItemStyle={{width: "80%"}}
                    label={t("DemoLayout.textareaFolder")}
                    help={t("DemoLayout.help")}
                    selectType='folder'
                    renderType='textarea'
                />
            </div>
            <div style={{width: "60%", height: "100%", display: "flex", flexDirection: "column"}}>
                <div style={{width: "100%", height: 450, overflow: "hidden", display: "flex", flexDirection: "column"}}>
                    <div style={{display: "flex", gap: 10}}>
                        <YakitButton onClick={() => setTriggetClear(!triggerClear)}>{t("DemoLayout.clearData")}</YakitButton>
                        <YakitButton onClick={() => setIsStop(!isStop)}>{isStop ? t("DemoLayout.startUpdate") : t("DemoLayout.stopUpdate")}</YakitButton>
                    </div>
                    <DemoVirtualTable
                        isTopLoadMore={true}
                        isStop={isStop}
                        triggerClear={triggerClear}
                        wait={2000}
                        rowKey='name'
                        loadMore={loadMore}
                        columns={[
                            {
                                key: "id",
                                headerTitle: "ID",
                                width: 80
                            },
                            {
                                key: "name",
                                headerTitle: t("DemoLayout.name")
                            },
                            {
                                key: "time",
                                headerTitle: t("DemoLayout.time")
                            },
                            {
                                key: "content",
                                headerTitle: t("DemoLayout.content")
                            },
                            {
                                key: "op",
                                headerTitle: t("DemoLayout.action"),
                                width: 100,
                                colRender: (info) => {
                                    return <YakitButton type='text'>{t("DemoLayout.details")}</YakitButton>
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}
