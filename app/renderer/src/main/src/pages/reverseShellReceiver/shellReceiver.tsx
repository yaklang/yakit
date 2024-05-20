import React, {useEffect, useRef, useState} from "react"
import {Divider, Form, Popconfirm, Tag, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useVirtualList} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./shellReceiver.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {DocumentDuplicateSvgIcon, RemoveIcon, SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlineExitIcon, OutlineSearchIcon, OutlineStorageIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDocumentduplicateIcon} from "@/assets/icon/solid"
import {CVXterm} from "@/components/CVXterm"
import {TERMINAL_INPUT_KEY} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {InputInteger, InputItem} from "@/utils/inputUtil"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
const {ipcRenderer} = window.require("electron")

export interface ShellReceiverLeftListProps {
    fold: boolean
    setFold: (v: boolean) => void
    type: "Reverse" | "MSFVenom"
    setType: (v: "Reverse" | "MSFVenom") => void
    setShowDetail: (v: boolean) => void
}

export const ShellReceiverLeftList: React.FC<ShellReceiverLeftListProps> = (props) => {
    const {fold, setFold, type, setType, setShowDetail} = props
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

    const showDetail = useMemoizedFn(() => {
        setShowDetail(true)
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
                                setShowDetail(false)
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
                        <div className={styles["item-box"]} key={ele.index} onClick={() => showDetail()}>
                            <div className={styles["text"]}>Row: {ele.data}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export interface ShellReceiverMiddleItemProps {
    setShowDetail: (v: boolean) => void
}

export const ShellReceiverMiddleItem: React.FC<ShellReceiverMiddleItemProps> = (props) => {
    const {setShowDetail} = props

    const onSave = useMemoizedFn(() => {})

    return (
        <div className={styles["shell-receiver-middle-item"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>Bash read line</div>
                <div className={styles["extra"]}>
                    {/* <Tooltip title={"保存"}>
                        <div className={styles["extra-icon"]} onClick={onSave}>
                            <OutlineStorageIcon />
                        </div>
                    </Tooltip> */}
                    {/* <Divider type={"vertical"} style={{margin: "6px 0px 0px"}} /> */}
                    <div
                        className={styles["extra-icon"]}
                        onClick={() => {
                            setShowDetail(false)
                        }}
                    >
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

export interface ShellReceiverRightRunProps {
    fold: boolean
    setFold: (v: boolean) => void
}

export const ShellReceiverRightRun: React.FC<ShellReceiverRightRunProps> = (props) => {
    const {fold, setFold} = props
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
                <div className={styles["title"]}>
                    {!fold && (
                        <Tooltip title='展开代码生成器'>
                            <SideBarOpenIcon
                                className={styles["fold-icon"]}
                                onClick={() => {
                                    setFold(true)
                                }}
                            />
                        </Tooltip>
                    )}
                    <div className={styles["text"]}>正在监听:</div>
                    <Tag style={{borderRadius: 4}} color='blue'>
                        本地端口:192.168.3.115.8085 &lt;== 远程端口:192.168.3.115.28735
                    </Tag>
                </div>
                <div className={styles["extra"]}>
                    <div className={styles["extra-show"]}>
                        <span className={styles["extra-text"]}>客户端回显:</span>
                        <YakitSwitch checked={echoBack} onChange={setEchoBack} />
                    </div>
                    <YakitPopconfirm
                        title={"确定关闭该端口吗？"}
                        onConfirm={() => {
                            // removeListenPort(addr)
                        }}
                    >
                        <YakitButton danger={true} type={"primary"}>
                            断开
                            <OutlineExitIcon />
                        </YakitButton>
                    </YakitPopconfirm>
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

interface MonitorFormProps {
    host: string
    port: number
}

export interface ShellReceiverProps {}
export const ShellReceiver: React.FC<ShellReceiverProps> = (props) => {
    const [fold, setFold] = useState<boolean>(true)
    const [type, setType] = useState<"Reverse" | "MSFVenom">("Reverse")
    const [isShowDetail, setShowDetail] = useState<boolean>(false)
    const [isShowStart, setShowStart] = useState<boolean>(true)

    const [addrs, setAddrs] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const [form] = Form.useForm()

    const onStartMonitor = useMemoizedFn((value: MonitorFormProps) => {
        const {host,port} = value
        const addr = `${host}:${port}`;
        if (!addr.includes(":")) {
            failed(`无法启动端口监听程序，端口格式不合理: [${addr}]`)
            return
        }
        if (!host || !port) {
            failed(`无法解析主机/端口`)
            return;
        }
        if (addrs.includes(addr)) {
            failed("该地址已经被占用: " + addr)
            return;
        }
        setLoading(true)
        ipcRenderer.invoke("listening-port", host, port).then(() => {
            success("监听端口成功")
        }).catch((e: any) => {
            failed(`ERROR: ${JSON.stringify(e)}`)
        }).finally(() => {
            // waitingSyncAddr()
            setTimeout(() => setLoading(false), 300)
        })
        console.log("onStartMonitor---", value)
    })
    return (
        <>
            {isShowStart ? (
                <div className={styles["begin-monitor"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>开启端口监听</div>
                        <div className={styles["sub-title"]}>
                            反弹 Shell 接收工具，可以在服务器上开启一个端口，进行监听，并进行交互。
                        </div>
                    </div>
                    <div className={styles["main"]}>
                        <Form
                            form={form}
                            onFinish={onStartMonitor}
                            labelCol={{span: 8}}
                            wrapperCol={{span: 8}} //这样设置是为了让输入框居中
                        >
                            <Form.Item
                                rules={[{required: true, message: "该项为必填"}]}
                                label={"监听的主机"}
                                name={"host"}
                            >
                                <YakitAutoComplete
                                    placeholder={"请输入监听的主机"}
                                    options={["0.0.0.0", "127.0.0.1", "192.168.1.235"].map((i) => {
                                        return {value: i, label: i}
                                    })}
                                />
                            </Form.Item>
                            <Form.Item rules={[{required: true, message: "该项为必填"}]} label={"端口"} name={"port"}>
                                <YakitInputNumber min={1} max={65535} placeholder='请输入端口' />
                            </Form.Item>
                            <Form.Item label=" " colon={false}>
                                <YakitButton htmlType='submit' size='large'>
                                    启动监听
                                </YakitButton>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            ) : (
                <div className={styles["shell-receiver"]}>
                    {fold && (
                        <>
                            <ShellReceiverLeftList
                                fold={fold}
                                setFold={setFold}
                                type={type}
                                setType={setType}
                                setShowDetail={setShowDetail}
                            />
                            {isShowDetail && <ShellReceiverMiddleItem setShowDetail={setShowDetail} />}
                        </>
                    )}
                    <ShellReceiverRightRun fold={fold} setFold={setFold} />
                </div>
            )}
        </>
    )
}
