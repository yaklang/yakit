import React, {useEffect, useRef, useState} from "react"
import {Divider, Tag, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useVirtualList} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./shellReceiver.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {DocumentDuplicateSvgIcon, RemoveIcon, SideBarCloseIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlineSearchIcon, OutlineStorageIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDocumentduplicateIcon} from "@/assets/icon/solid"
import {CVXterm} from "@/components/CVXterm"
import {TERMINAL_INPUT_KEY} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
const {ipcRenderer} = window.require("electron")

export interface ShellReceiverLeftListProps {
    fold: boolean
    setFold: (v: boolean) => void
    type: "Reverse" | "MSFVenom"
    setType: (v: "Reverse" | "MSFVenom") => void
}

export const ShellReceiverLeftList: React.FC<ShellReceiverLeftListProps> = (props) => {
    const {fold, setFold, type, setType} = props
    const [systemType, setSystemType] = useState<"Linux" | "Windows" | "Mac">("Windows")
    const [originalList, setOriginalList] = useState<any[]>(["1", "2", "3"])
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const [list] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 44,
        overscan: 10
    })
    return (
        <div className={styles["shell-receiver-left-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title-select-box"]}>
                    <div className={styles["title"]}>代码生成器</div>
                    <YakitRadioButtons
                        // size='small'
                        value={type}
                        onChange={(e) => {
                            setType(e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "Reverse",
                                label: "Reverse"
                            },
                            {
                                value: "MSFVenom",
                                label: "MSFVenom"
                            }
                        ]}
                    />
                </div>
                <div className={classNames(styles["extra"])}>
                    <Tooltip placement='top' title='收起代码生成器'>
                        <SideBarCloseIcon
                            className={styles["fold-icon"]}
                            onClick={() => {
                                setFold(false)
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["filter-box"]}>
                <div className={styles["select-box"]}>
                    <YakitSelect
                        value={systemType}
                        onSelect={(val) => {
                            setSystemType(val)
                        }}
                        placeholder='请选择...'
                    >
                        <YakitSelect value='Linux'>Linux</YakitSelect>
                        <YakitSelect value='Windows'>Windows</YakitSelect>
                        <YakitSelect value='Mac'>Mac</YakitSelect>
                    </YakitSelect>
                </div>
                <div className={styles["input-box"]}>
                    <YakitInput
                        prefix={
                            <div className={styles["prefix"]}>
                                <OutlineSearchIcon />
                            </div>
                        }
                        placeholder='请输入关键词搜索'
                    />
                </div>
            </div>
            <div ref={containerRef} className={styles["list-box"]}>
                <div ref={wrapperRef}>
                    {list.map((ele) => (
                        <div className={styles["item-box"]} key={ele.index}>
                            <div className={styles["text"]}>Row: {ele.data}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export interface ShellReceiverMiddleItemProps {}

export const ShellReceiverMiddleItem: React.FC<ShellReceiverMiddleItemProps> = (props) => {
    const {} = props

    const onSave = useMemoizedFn(() => {})

    return (
        <div className={styles["shell-receiver-middle-item"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>Bash read line</div>
                <div className={styles["extra"]}>
                    <Tooltip title={"保存"}>
                        <div className={styles["extra-icon"]} onClick={onSave}>
                            <OutlineStorageIcon />
                        </div>
                    </Tooltip>
                    <Divider type={"vertical"} style={{margin: "6px 0px 0px"}} />
                    <div className={styles["extra-icon"]} onClick={() => {}}>
                        <RemoveIcon />
                    </div>
                </div>
            </div>
            <div className={styles["content"]}>
                <YakitEditor
                    readOnly={true}
                    type='plaintext'
                    value={""}
                    noWordWrap={true}
                    noLineNumber={true}
                    // loading={loading}
                />
            </div>
            <div className={styles["footer"]}>
                <div className={styles["select-box"]}>
                    <div className={styles["select-item"]}>
                        <div className={styles["title"]}>Shell</div>
                        <YakitSelect
                            wrapperStyle={{width: 164}}
                            value={""}
                            onSelect={(val) => {
                                // setSystemType(val)
                            }}
                            placeholder='请选择...'
                        >
                            <YakitSelect value='pwsh'>pwsh</YakitSelect>
                        </YakitSelect>
                    </div>
                    <div className={styles["select-item"]}>
                        <div className={styles["title"]}>Encoding</div>
                        <YakitSelect
                            wrapperStyle={{width: 164}}
                            value={""}
                            onSelect={(val) => {
                                // setSystemType(val)
                            }}
                            placeholder='请选择...'
                        >
                            <YakitSelect value='None'>None</YakitSelect>
                        </YakitSelect>
                    </div>
                </div>
                <div className={styles["line"]}></div>
                <YakitButton icon={<SolidDocumentduplicateIcon />} size='max'>
                    Copy
                </YakitButton>
            </div>
        </div>
    )
}

export interface ShellReceiverRightRunProps {}

export const ShellReceiverRightRun: React.FC<ShellReceiverRightRunProps> = (props) => {
    const {} = props
    const [echoBack, setEchoBack, getEchoBack] = useGetState(true)
    const xtermRef = React.useRef<any>(null)
    const write = useMemoizedFn((s) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        const str = s.charCodeAt(0) === TERMINAL_INPUT_KEY.ENTER ? String.fromCharCode(10) : s
        if (getEchoBack()) {
            xtermRef.current.terminal.write(str)
        }
    })
    return (
        <div className={styles["shell-receiver-right-run"]}>
            <div className={styles["header"]}>
                <div className={styles['title']}>
                    <div className={styles['text']}>正在监听:</div>
                    <Tag color="blue">本地端口:192.168.3.115.8085 &lt;== 远程端口:192.168.3.115.28735</Tag>
                </div>
            </div>
            <div className={styles["content"]}>
                {/* <CVXterm
                    ref={xtermRef}
                    options={{
                        convertEol: true
                    }}
                    isWrite={getEchoBack()}
                    write={write}
                /> */}
            </div>
        </div>
    )
}

export interface ShellReceiverProps {}
export const ShellReceiver: React.FC<ShellReceiverProps> = (props) => {
    const [fold, setFold] = useState<boolean>(true)
    const [type, setType] = useState<"Reverse" | "MSFVenom">("Reverse")
    return (
        <div className={styles["shell-receiver"]}>
            {fold && (
                <>
                    <ShellReceiverLeftList fold={fold} setFold={setFold} type={type} setType={setType} />
                    <ShellReceiverMiddleItem />
                </>
            )}
            <ShellReceiverRightRun />
        </div>
    )
}
