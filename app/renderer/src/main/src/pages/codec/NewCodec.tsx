import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider, Tooltip, Upload} from "antd"
import {useMemoizedFn, useThrottleFn, useUpdateEffect, useDebounceEffect, useSize} from "ahooks"
import styles from "./NewCodec.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDragsortIcon, SolidPlayIcon, SolidStarIcon} from "@/assets/icon/solid"
import {ExclamationIcon, SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {
    OutlineArrowBigUpIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineBanIcon,
    OutlineClockIcon,
    OutlineDocumentduplicateIcon,
    OutlineDotshorizontalIcon,
    OutlineImportIcon,
    OutlinePauseIcon,
    OutlinePlayIcon,
    OutlineSearchIcon,
    OutlineStarIcon,
    OutlineStorageIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {
    DragDropContext,
    Droppable,
    Draggable,
    BeforeCapture,
    DropResult,
    ResponderProvided,
    DragStart,
    DragUpdate,
    DraggableProvided
} from "@hello-pangea/dnd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {v4 as uuidv4} from "uuid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {NewCodecCheckUI, NewCodecEditor, NewCodecInputUI, NewCodecSelectUI, NewCodecTextAreaUI} from "./NewCodecUIStore"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {EnterOutlined} from "@ant-design/icons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {pluginTypeToName} from "../plugins/builtInData"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import HexEditor from "react-hex-editor"
import {HexEditorHandle} from "react-hex-editor/dist/types"
import {setClipboardText} from "@/utils/clipboard"
const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

const SaveCodecMethods = "SaveCodecMethods"

export interface CodecResponseProps {
    Result: string
    RawResult: Uint8Array
    ResultVerbose: string
    IsFalseAppearance: boolean
}

interface NewCodecRightEditorBoxProps {
    isExpand: boolean
    setExpand: (v: boolean) => void
    inputEditor: string
    outputResponse?: CodecResponseProps
    setInputEditor: (v: string) => void
    runLoading: boolean
}
// codec右边编辑器
export const NewCodecRightEditorBox: React.FC<NewCodecRightEditorBoxProps> = (props) => {
    const {isExpand, setExpand, outputResponse, inputEditor, setInputEditor, runLoading} = props
    const [noInputWordwrap, setNoInputWordwrap] = useState<boolean>(false)
    const [noOutputWordwrap, setNoOutputWordwrap] = useState<boolean>(false)
    const [inputMenuOpen, setInputMenuOpen] = useState<boolean>(false)
    const [outputMenuOpen, setOutputMenuOpen] = useState<boolean>(false)
    const [outputShowType, setOutputShowType] = useState<"editor" | "hex">("editor")
    // hex
    const [showData, setShowData] = useState<Uint8Array>(new Buffer([]))
    const [nonce, setNonce] = useState<number>(0)

    const editorBoxRef = useRef<HTMLDivElement>(null)
    const uploadRef = useRef<HTMLDivElement>(null)
    const HexEditorRef = useRef<HexEditorHandle>(null)
    const size = useSize(editorBoxRef)

    const handleSetValue = React.useCallback(
        (offset, value) => {
            showData[offset] = value
            setShowData(showData)
            setNonce((v) => v + 1)
        },
        [showData]
    )

    useUpdateEffect(() => {
        if (outputResponse?.RawResult) {
            setShowData(outputResponse?.RawResult)
        }
    }, [outputResponse?.RawResult])

    const Expand = () => (
        <div
            className={styles["expand-box"]}
            onClick={() => {
                setExpand && setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )

    const judgeStringSize = useMemoizedFn((str: string) => {
        // 将字符串转换为字节数
        const bytes = new Blob([str]).size
        // 将字节数转换为KB
        const kilobytes = bytes / 1024
        // 如果字符串大小大于500KB，则截取到500KB大小
        if (kilobytes > 500) {
            // 计算截取的字符数
            const charactersToKeep = Math.floor((500 * 1024) / 2) // 一个字符占用2字节
            // 截取字符串
            const truncatedString = str.substring(0, charactersToKeep)
            return {
                hidden: true,
                value: truncatedString
            }
        } else {
            // 字符串大小不大于500KB，返回原始字符串
            return {
                hidden: false,
                value: str
            }
        }
    })

    const inputObj = useMemo(() => {
        return judgeStringSize(inputEditor)
    }, [inputEditor])

    const outPutObj = useMemo(() => {
        return judgeStringSize(outputResponse?.Result || "")
    }, [outputResponse?.Result])

    // 导入
    const onImport = useMemoizedFn((path: string) => {
        ipcRenderer
            .invoke("importCodecByPath", path)
            .then((r: string) => {
                setInputEditor(r)
            })
            .catch((e) => {
                failed(`import Codec failed ${e}`)
            })
            .finally(() => {})
    })

    // 清空
    const onClear = useMemoizedFn(() => {
        setInputEditor("")
    })

    // 保存
    const onSave = useMemoizedFn(() => {
        if (!outputResponse?.RawResult) {
            warn("暂无保存内容")
            return
        }
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory"]
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength) {
                    const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, "\\")).join(",")
                    ipcRenderer
                        .invoke("SaveCodecOutputToTxt", {
                            data: Buffer.from(outputResponse.RawResult),
                            outputDir: absolutePath,
                            fileName: `Output-${new Date().getTime()}.txt`
                        })
                        .then((r) => {
                            if (r?.ok) {
                                success("保存成功")
                                r?.outputDir && openABSFileLocated(r.outputDir)
                            }
                        })
                        .catch((e) => {
                            failed(`Save Codec failed ${e}`)
                        })
                        .finally(() => {})
                }
            })
    })

    // 替换
    const onReplace = useMemoizedFn(() => {
        setInputEditor(outputResponse?.Result || "")
    })

    // 复制
    const onCopy = useMemoizedFn(() => {
        setClipboardText(outputResponse?.Result || "")
    })

    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".")
        return file_name.slice(file_index, file_name.length)
    }

    const inputMenuData = useMemo(() => {
        return [
            {
                key: "import",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineImportIcon />
                        <div className={styles["menu-name"]}>导入</div>
                    </div>
                )
            },
            {
                key: "wordwrap",
                label: (
                    <div className={classNames(styles["extra-menu"], styles["menu-menu-size"])}>
                        <EnterOutlined />
                        <div className={styles["menu-name"]}>{noInputWordwrap ? "自动换行" : "不自动换行"}</div>
                    </div>
                )
            }
        ]
    }, [noInputWordwrap])

    const outputMenuData = useMemo(() => {
        return [
            {
                key: "save",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineStorageIcon />
                        <div className={styles["menu-name"]}>保存</div>
                    </div>
                )
            },
            {
                key: "replace",
                label: (
                    <div className={classNames(styles["extra-menu"], styles["menu-menu-stroke"])}>
                        <OutlineArrowBigUpIcon />
                        <div className={styles["menu-name"]}>将Output替换至Input</div>
                    </div>
                )
            },
            {
                key: "copy",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineDocumentduplicateIcon />
                        <div className={styles["menu-name"]}>复制</div>
                    </div>
                )
            },
            {
                key: "wordwrap",
                label: (
                    <div className={classNames(styles["extra-menu"], styles["menu-menu-size"])}>
                        <EnterOutlined />
                        <div className={styles["menu-name"]}>{noOutputWordwrap ? "自动换行" : "不自动换行"}</div>
                    </div>
                )
            }
        ]
    }, [noOutputWordwrap])

    return (
        <div className={styles["new-codec-editor-box"]} ref={editorBoxRef}>
            <YakitResizeBox
                isVer={true}
                isShowDefaultLineStyle={false}
                lineDirection='bottom'
                lineStyle={{backgroundColor: "#f0f1f3", height: 4}}
                firstNodeStyle={{padding: 0}}
                secondNodeStyle={{padding: 0}}
                firstNode={
                    <div className={classNames(styles["input-box"], styles["editor-box"])}>
                        <div className={styles["header"]}>
                            <div className={styles["title"]}>
                                <span className={styles["text"]}>Input</span>
                                {inputObj.hidden && (
                                    <Tooltip title={size && size.width > 450 ? null : "超大输入"}>
                                        <YakitTag style={{marginLeft: 8}} color='danger'>
                                            <div className={styles["tag-box"]}>
                                                <ExclamationIcon className={styles["icon-style"]} />
                                                {size && size.width > 450 && <span>超大输入</span>}
                                            </div>
                                        </YakitTag>
                                    </Tooltip>
                                )}
                            </div>
                            <div className={styles["extra"]}>
                                <Tooltip title={"导入"}>
                                    <Upload
                                        className={classNames(styles["upload-box"], {
                                            [styles["upload-box-hidden"]]: size && size.width <= 300
                                        })}
                                        multiple={false}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(f) => {
                                            // @ts-ignore
                                            const path: string = f?.path || ""
                                            if (path.length > 0) {
                                                onImport(path)
                                            }
                                            return false
                                        }}
                                    >
                                        <div className={styles["extra-icon"]} ref={uploadRef}>
                                            <OutlineImportIcon />
                                        </div>
                                    </Upload>
                                </Tooltip>
                                {size && size.width > 300 && (
                                    <Tooltip title={"不自动换行"}>
                                        <YakitButton
                                            size={"small"}
                                            type={noInputWordwrap ? "text" : "primary"}
                                            icon={<EnterOutlined />}
                                            onClick={() => {
                                                setNoInputWordwrap(!noInputWordwrap)
                                            }}
                                        />
                                    </Tooltip>
                                )}

                                {size && size.width <= 300 && (
                                    <YakitDropdownMenu
                                        menu={{
                                            data: inputMenuData as YakitMenuItemProps[],
                                            onClick: ({key}) => {
                                                setInputMenuOpen(false)
                                                switch (key) {
                                                    case "import":
                                                        uploadRef.current && uploadRef.current.click()
                                                        break
                                                    case "wordwrap":
                                                        setNoInputWordwrap(!noInputWordwrap)
                                                        break
                                                    default:
                                                        break
                                                }
                                            }
                                        }}
                                        dropdown={{
                                            overlayClassName: styles["codec-input-menu"],
                                            trigger: ["click"],
                                            placement: "bottomRight",
                                            onVisibleChange: (v) => {
                                                setInputMenuOpen(v)
                                            },
                                            visible: inputMenuOpen
                                        }}
                                    >
                                        <div className={styles["extra-icon"]}>
                                            <OutlineDotshorizontalIcon />
                                        </div>
                                    </YakitDropdownMenu>
                                )}
                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                <div className={styles["clear"]} onClick={onClear}>
                                    清空
                                </div>
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakitEditor
                                type='plaintext'
                                value={inputObj.value}
                                setValue={(content: string) => {
                                    setInputEditor(content)
                                }}
                                noWordWrap={noInputWordwrap}
                                // loading={loading}
                            />
                        </div>
                    </div>
                }
                secondNode={
                    <div className={classNames(styles["output-box"], styles["editor-box"])}>
                        <YakitSpin spinning={runLoading}>
                            <div className={styles["header"]}>
                                <div className={styles["title"]}>
                                    <span className={styles["text"]}>Output</span>
                                    {outputResponse && (
                                        <YakitCheckableTag
                                            style={{marginLeft: 8, marginRight: 0}}
                                            checked={outputShowType === "hex"}
                                            onChange={(checked) => {
                                                if (checked) {
                                                    setOutputShowType("hex")
                                                } else {
                                                    setOutputShowType("editor")
                                                }
                                            }}
                                        >
                                            hex原文
                                        </YakitCheckableTag>
                                    )}
                                    {outPutObj.hidden && (
                                        <Tooltip
                                            title={size && size.width > 450 ? null : "超大输出，请点击保存下载文件查看"}
                                        >
                                            <YakitTag style={{marginLeft: 8}} color='danger'>
                                                <div className={styles["tag-box"]}>
                                                    <ExclamationIcon className={styles["icon-style"]} />
                                                    {size && size.width > 450 && (
                                                        <span>超大输出，请点击保存下载文件查看</span>
                                                    )}
                                                </div>
                                            </YakitTag>
                                        </Tooltip>
                                    )}
                                    {outputResponse?.IsFalseAppearance && (
                                        <YakitTag style={{marginLeft: 8}} color='danger'>
                                            数据失真
                                        </YakitTag>
                                    )}
                                </div>
                                <div className={styles["extra"]}>
                                    {outputShowType === "editor" && (
                                        <>
                                            {size && size.width > 300 ? (
                                                <>
                                                    <Tooltip title={"保存"}>
                                                        <div className={styles["extra-icon"]} onClick={onSave}>
                                                            <OutlineStorageIcon />
                                                        </div>
                                                    </Tooltip>
                                                    <Tooltip title={"将Output替换至Input"}>
                                                        <div className={styles["extra-icon"]} onClick={onReplace}>
                                                            <OutlineArrowBigUpIcon />
                                                        </div>
                                                    </Tooltip>
                                                    <Tooltip title={"复制"}>
                                                        <div className={styles["extra-icon"]} onClick={onCopy}>
                                                            <OutlineDocumentduplicateIcon />
                                                        </div>
                                                    </Tooltip>
                                                    <Tooltip title={"不自动换行"}>
                                                        <YakitButton
                                                            size={"small"}
                                                            type={noOutputWordwrap ? "text" : "primary"}
                                                            icon={<EnterOutlined />}
                                                            onClick={() => {
                                                                setNoOutputWordwrap(!noOutputWordwrap)
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </>
                                            ) : (
                                                <YakitDropdownMenu
                                                    menu={{
                                                        data: outputMenuData as YakitMenuItemProps[],
                                                        onClick: ({key}) => {
                                                            setOutputMenuOpen(false)
                                                            switch (key) {
                                                                case "save":
                                                                    onSave()
                                                                    break
                                                                case "replace":
                                                                    onReplace()
                                                                    break
                                                                case "copy":
                                                                    onCopy()
                                                                    break
                                                                case "wordwrap":
                                                                    setNoOutputWordwrap(!noOutputWordwrap)
                                                                    break
                                                                default:
                                                                    break
                                                            }
                                                        }
                                                    }}
                                                    dropdown={{
                                                        overlayClassName: styles["codec-output-menu"],
                                                        trigger: ["click"],
                                                        placement: "bottomRight",
                                                        onVisibleChange: (v) => {
                                                            setOutputMenuOpen(v)
                                                        },
                                                        visible: outputMenuOpen
                                                    }}
                                                >
                                                    <div className={styles["extra-icon"]}>
                                                        <OutlineDotshorizontalIcon />
                                                    </div>
                                                </YakitDropdownMenu>
                                            )}
                                        </>
                                    )}
                                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                    {Expand()}
                                </div>
                            </div>
                            <>
                                {outputShowType === "editor" ? (
                                    <div className={styles["editor"]}>
                                        <YakitEditor
                                            readOnly={true}
                                            type='plaintext'
                                            value={outPutObj.value}
                                            noWordWrap={noOutputWordwrap}
                                            // loading={loading}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles["hex-editor"]}>
                                        <HexEditor
                                            readOnly={true}
                                            ref={HexEditorRef}
                                            asciiWidth={18}
                                            data={showData}
                                            nonce={nonce}
                                            setValue={handleSetValue}
                                            overscanCount={0x03}
                                            showAscii={true}
                                            showColumnLabels={true}
                                            showRowLabels={true}
                                            highlightColumn={true}
                                        />
                                    </div>
                                )}
                            </>
                        </YakitSpin>
                    </div>
                }
            />
        </div>
    )
}

interface ValueByUIProps {
    index: number
    type: string
    val: any
}

interface NewCodecMiddleTypeItemProps {
    data: RightItemsProps
    outerKey: string
    rightItems: RightItemsProps[]
    setRightItems: (v: RightItemsProps[]) => void
    provided: DraggableProvided
}

export const NewCodecMiddleTypeItem: React.FC<NewCodecMiddleTypeItemProps> = (props) => {
    const {data, outerKey, rightItems, setRightItems, provided} = props

    const {title, node} = data
    const [itemStatus, setItemStatus] = useState<"run" | "suspend" | "shield">()

    useEffect(() => {
        const itemArr = rightItems.filter((item) => item.key === outerKey)
        if (itemArr.length > 0) {
            setItemStatus(itemArr[0].status || "run")
        }
    }, [rightItems, outerKey])
    // 屏蔽
    const onShieldFun = useMemoizedFn(() => {
        const newRightItems = rightItems.map((item) => {
            if (item.key === outerKey) {
                item.status = itemStatus === "shield" ? "run" : "shield"
                return item
            }
            return item
        })
        setRightItems(newRightItems)
    })

    // 中止
    const onSuspendFun = useMemoizedFn(() => {
        const newRightItems = rightItems.map((item) => {
            if (item.key === outerKey) {
                item.status = itemStatus === "suspend" ? "run" : "suspend"
                return item
            }
            return item
        })
        setRightItems(newRightItems)
    })

    // 删除
    const onDeleteFun = useMemoizedFn(() => {
        const newRightItems = rightItems.filter((item) => item.key !== outerKey)
        setRightItems(newRightItems)
    })

    // 更改控件值
    const setValueByUI = useMemoizedFn((obj: ValueByUIProps) => {
        const {val, index, type} = obj
        const itemArr = rightItems.filter((item) => item.key === outerKey)
        const newNode = itemArr[0]?.node
        if (Array.isArray(newNode)) {
            if (newNode[index].type !== "flex") {
                if (newNode[index].type === "inputSelect") {
                    // 联合控件 - Input/Select
                    const initNode = newNode as RightItemsTypeProps[]
                    initNode[index][type].value = val
                    const newRightItems = rightItems.map((item) => {
                        if (item.key === outerKey) {
                            item.node = initNode
                            return item
                        }
                        return item
                    })
                    setRightItems(newRightItems)
                } else {
                    const initNode = newNode as RightItemsTypeNoUniteProps[]
                    initNode[index].value = val
                    const newRightItems = rightItems.map((item) => {
                        if (item.key === outerKey) {
                            item.node = initNode
                            return item
                        }
                        return item
                    })
                    setRightItems(newRightItems)
                }
            }
        }
    })

    // 控件
    const onShowUI = useMemoizedFn((item: RightItemsTypeProps, index: number, direction?: "left" | "right") => {
        const params = {
            index,
            type: item.type
        }
        switch (item.type) {
            case "input":
                // 输入框模块
                return (
                    <NewCodecInputUI
                        title={item.title}
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        defaultValue={item.defaultValue}
                        value={item.value}
                        onChange={(e) => setValueByUI({...params, val: e.target.value})}
                        direction={direction}
                    />
                )
            case "text":
                // 文本域模块
                return (
                    <NewCodecTextAreaUI
                        title={item.title}
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        defaultValue={item.defaultValue}
                        value={item.value}
                        onChange={(e) => setValueByUI({...params, val: e.target.value})}
                    />
                )
            case "checkbox":
                // 多选框模块
                return (
                    <NewCodecCheckUI
                        disabled={itemStatus === "shield" || item.disabled}
                        options={item.checkArr}
                        value={item.value}
                        onChange={(checkedValues: CheckboxValueType[]) => setValueByUI({...params, val: checkedValues})}
                    />
                )
            case "select":
                // 下拉框模块
                return (
                    <NewCodecSelectUI
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        title={item.title}
                        showSearch={item.showSearch}
                        options={item.selectArr}
                        value={item.value}
                        isPlugin={item.isPlugin}
                        onSelect={(val) => setValueByUI({...params, val})}
                        directionBox={direction}
                    />
                )
            case "editor":
                // 编辑器模块
                return (
                    <NewCodecEditor
                        disabled={itemStatus === "shield" || item.disabled}
                        title={item.title}
                        require={item.require}
                        value={item.value}
                        onChange={(val) => setValueByUI({...params, val})}
                    />
                )
            default:
                return <></>
        }
    })
    return (
        <div
            className={classNames(styles["new-codec-middle-type-item"], {
                // 运行
                [styles["type-item-run"]]: itemStatus === "run",
                // 中止
                [styles["type-item-suspend"]]: itemStatus === "suspend",
                // 屏蔽
                [styles["type-item-shield"]]: itemStatus === "shield"
            })}
        >
            <div className={styles["type-header"]} {...provided.dragHandleProps}>
                <div className={styles["type-title"]}>
                    <div className={styles["drag-icon"]}>
                        <SolidDragsortIcon />
                    </div>
                    <div
                        className={classNames(styles["text"], {
                            [styles["text-default"]]: itemStatus !== "shield",
                            [styles["text-active"]]: itemStatus === "shield"
                        })}
                    >
                        {title}
                    </div>
                </div>
                <div className={styles["type-extra"]}>
                    <Tooltip title={itemStatus !== "shield" ? "禁用" : "启用"}>
                        <div
                            className={classNames(styles["extra-icon"], {
                                [styles["extra-icon-default"]]: itemStatus !== "shield",
                                [styles["extra-icon-active"]]: itemStatus === "shield"
                            })}
                            onClick={onShieldFun}
                        >
                            <OutlineBanIcon />
                        </div>
                    </Tooltip>
                    <Tooltip title={itemStatus !== "suspend" ? "开启断点" : "关闭断点"}>
                        <div
                            className={classNames(styles["extra-icon"], {
                                [styles["extra-icon-default"]]: itemStatus !== "suspend",
                                [styles["extra-icon-active"]]: itemStatus === "suspend"
                            })}
                            onClick={onSuspendFun}
                        >
                            {itemStatus !== "suspend" ? <OutlinePauseIcon /> : <OutlinePlayIcon />}
                        </div>
                    </Tooltip>
                    <div className={styles["close-icon"]} onClick={onDeleteFun}>
                        <OutlineXIcon />
                    </div>
                </div>
            </div>
            {node?.map((item, index) => {
                switch (item.type) {
                    case "flex":
                        // 左右布局
                        return (
                            <div
                                style={{display: "flex", flexDirection: "row", gap: 8, marginTop: 8}}
                                key={`${data.key}-${index}`}
                            >
                                <div style={{flex: item.leftFlex || 3}}>
                                    {/* 左 */}
                                    {onShowUI(item.leftNode, index)}
                                </div>
                                <div style={{flex: item.rightFlex || 2}}>
                                    {/* 右 */}
                                    {onShowUI(item.rightNode, index)}
                                </div>
                            </div>
                        )
                    case "inputSelect":
                        return (
                            <div
                                style={{display: "flex", flexDirection: "row", marginTop: 8}}
                                key={`${data.key}-${index}`}
                            >
                                <div style={{flex: 3}}>
                                    {/* 左 */}
                                    {onShowUI(item.input, index, "left")}
                                </div>
                                <div style={{flex: 2, borderLeft: "1px solid #EAECF3"}}>
                                    {/* 右 */}
                                    {onShowUI(item.select, index, "right")}
                                </div>
                            </div>
                        )
                    case "checkbox":
                        return (
                            <div
                                key={`${data.key}-${index}`}
                                style={{display: "inline-block", marginTop: 8, marginRight: 8}}
                            >
                                {onShowUI(item, index)}
                            </div>
                        )
                    default:
                        return (
                            <div key={`${data.key}-${index}`} style={{marginTop: 8}}>
                                {onShowUI(item, index)}
                            </div>
                        )
                }
            })}
        </div>
    )
}

interface CodecRunListHistoryStoreProps {
    popoverVisible: boolean
    setPopoverVisible: (v: boolean) => void
    onSelect: (v: SaveObjProps) => void
}

export const CodecRunListHistoryStore: React.FC<CodecRunListHistoryStoreProps> = React.memo((props) => {
    const {popoverVisible, setPopoverVisible, onSelect} = props
    const [mitmSaveData, setMitmSaveData] = useState<CustomizeCodecFlowProps[]>([])
    useEffect(() => {
        onMitmSaveFilter()
    }, [popoverVisible])
    const onMitmSaveFilter = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetAllCodecFlow")
            .then((data: {Flows: CustomizeCodecFlowProps[]}) => {
                setMitmSaveData(data.Flows)
            })
            .catch((e) => {
                failed(`GetAllCodecFlow failed ${e}`)
            })
    })

    const removeItem = useMemoizedFn((FlowName, DeleteAll = false) => {
        ipcRenderer
            .invoke("DeleteCodecFlow", {FlowName, DeleteAll})
            .then(() => {
                info("删除成功")
                onMitmSaveFilter()
            })
            .catch((e) => {
                failed(`DeleteCodecFlow failed ${e}`)
            })
    })

    const onSelectItem = useMemoizedFn((item: CustomizeCodecFlowProps) => {
        const {WorkFlowUI} = item
        try {
            onSelect(JSON.parse(WorkFlowUI))
            setPopoverVisible(false)
        } catch (error) {}
    })
    return (
        <div className={styles["codec-run-list-history-store"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>历史存储</div>
                {mitmSaveData.length !== 0 && (
                    <YakitButton
                        type='text'
                        colors='danger'
                        onClick={() => {
                            removeItem("", true)
                        }}
                    >
                        清空
                    </YakitButton>
                )}
            </div>

            {mitmSaveData.length > 0 ? (
                <div className={styles["list"]}>
                    {mitmSaveData.map((item, index) => (
                        <div
                            key={item.FlowName}
                            className={classNames(styles["list-item"], {
                                [styles["list-item-border"]]: index !== mitmSaveData.length - 1,
                                [styles["list-item-border-top"]]: index === 0
                            })}
                            onClick={() => {
                                onSelectItem(item)
                            }}
                        >
                            <div className={styles["name"]}>{item.FlowName}</div>
                            <div
                                className={styles["opt"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeItem(item.FlowName)
                                }}
                            >
                                <OutlineTrashIcon />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={classNames(styles["no-data"])}>暂无数据</div>
            )}
        </div>
    )
})

interface SaveObjProps {
    historyName: string
    rightItems: RightItemsProps[]
}

interface ExecParamItemProps {
    Key: string
    Value: any
}

export interface CodecWorkProps {
    CodecType: string
    Params: ExecParamItemProps[]
    // 后面的可选参数为兼容老接口的残留(可不用)
    Script?: string
    PluginName?: string
}

interface CustomizeCodecFlowProps {
    FlowName: string
    WorkFlow: CodecWorkProps[]
    WorkFlowUI: string
}

interface NewCodecMiddleRunListProps {
    id: string
    fold: boolean
    setFold: (v: boolean) => void
    rightItems: RightItemsProps[]
    setRightItems: (v: RightItemsProps[]) => void
    inputEditor: string
    setOutputResponse: (v: CodecResponseProps) => void
    isClickToRunList: React.MutableRefObject<boolean>
    setRunLoading: (v: boolean) => void
}

interface CheckFailProps {
    key: string
    index: number
    message: string
}

const getMiddleItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = "translate(0px" + transform.substring(index, transform.length)
    }
    return {
        ...draggableStyle,
        transform
    }
}

const CodecAutoRun = "CodecAutoRun"
// codec中间可执行列表
export const NewCodecMiddleRunList: React.FC<NewCodecMiddleRunListProps> = (props) => {
    const {
        id,
        fold,
        setFold,
        rightItems,
        setRightItems,
        inputEditor,
        setOutputResponse,
        isClickToRunList,
        setRunLoading
    } = props

    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
    const [filterName, setFilterName] = useState<string>()
    const [cacheModal, setCacheModal] = useState<boolean>(false)
    // 是否自动执行
    const [autoRun, setAutoRun] = useState<boolean>(false)
    useDebounceEffect(
        () => {
            if (autoRun && rightItems.length > 0 && inputEditor.length > 0) {
                runCodec()
            }
        },
        [autoRun, rightItems, inputEditor],
        {leading: true, wait: 500}
    )
    useEffect(() => {
        getRemoteValue(CodecAutoRun).then((data) => {
            if (data) {
                try {
                    const {autoRun} = JSON.parse(data)
                    setAutoRun(autoRun)
                } catch (error) {}
            }
        })
    }, [])
    useUpdateEffect(() => {
        // 缓存勾选项
        setRemoteValue(
            CodecAutoRun,
            JSON.stringify({
                autoRun
            })
        )
    }, [autoRun])

    // 检查元素是否有滚动条
    const isScrollbar = useMemoizedFn((element: HTMLElement) => {
        return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth
    })
    useUpdateEffect(() => {
        const runScrollToRef = document.getElementById(`codec-middle-run-scroll-${id}`)
        if (runScrollToRef && isClickToRunList.current) {
            isClickToRunList.current = false
            if (isScrollbar(runScrollToRef)) {
                // 滚动条触底
                runScrollToRef.scrollTop = runScrollToRef.scrollHeight - runScrollToRef.clientHeight - 16
            }
        }
    }, [rightItems, isClickToRunList])

    // 历史选取项
    const onMenuSelect = useMemoizedFn((v: SaveObjProps) => {
        setRightItems(v.rightItems)
    })

    const onSaveFun = useMemoizedFn(() => {
        if (typeof filterName !== "string" || filterName.length === 0) {
            warn("请输入名字")
            return
        }
        const saveObj: SaveObjProps = {
            historyName: filterName,
            rightItems
        }

        let saveCodecParams: CustomizeCodecFlowProps = {
            FlowName: filterName,
            // 后端所需内容
            WorkFlow: [],
            // 前端用于恢复界面所需内容
            WorkFlowUI: JSON.stringify(saveObj)
        }
        rightItems.forEach((item) => {
            let obj: CodecWorkProps = {
                CodecType: item.codecType,
                Params: []
            }
            if (Array.isArray(item.node)) {
                const node = item.node as RightItemsTypeProps[]
                node.forEach((itemIn) => {
                    if (itemIn.type === "inputSelect") {
                        const {input, select} = itemIn
                        obj.Params.push({
                            Key: input.name,
                            Value: input.value || ""
                        })
                        obj.Params.push({
                            Key: select.name,
                            Value: select.value || ""
                        })
                    } else if (itemIn.type === "checkbox") {
                        const {name, value = []} = itemIn
                        obj.Params.push({
                            Key: name,
                            Value: value.includes(name)
                        })
                    } else {
                        const {name, value = ""} = itemIn
                        obj.Params.push({
                            Key: name,
                            Value: value
                        })
                    }
                })
            }
            saveCodecParams.WorkFlow.push(obj)
        })

        ipcRenderer
            .invoke("SaveCodecFlow", saveCodecParams)
            .then(() => {
                info("存储成功")
                setFilterName(undefined)
                setCacheModal(false)
            })
            .catch((e) => {
                failed(`SaveCodecFlow failed ${e}`)
            })
    })

    // 保存至历史
    const onSaveCodecRunListHistory = useMemoizedFn(() => {
        if (rightItems.length === 0) {
            warn("请从左侧列表拖入要使用的 Codec 工具")
            return
        }
        setCacheModal(true)
    })

    // 执行函数
    const runCodecFun = useMemoizedFn((runItems: RightItemsProps[]) => {
        let newCodecParams: {Text: string; WorkFlow: CodecWorkProps[]} = {
            Text: inputEditor,
            WorkFlow: []
        }
        runItems.forEach((item) => {
            let obj: CodecWorkProps = {
                CodecType: item.codecType,
                Params: []
            }
            if (Array.isArray(item.node)) {
                const node = item.node as RightItemsTypeProps[]
                node.forEach((itemIn) => {
                    if (itemIn.type === "inputSelect") {
                        const {input, select} = itemIn
                        obj.Params.push({
                            Key: input.name,
                            Value: input.value || ""
                        })
                        obj.Params.push({
                            Key: select.name,
                            Value: select.value || ""
                        })
                    } else if (itemIn.type === "checkbox") {
                        const {name, value = []} = itemIn
                        obj.Params.push({
                            Key: name,
                            Value: value.includes(name)
                        })
                    } else {
                        const {name, value = ""} = itemIn
                        obj.Params.push({
                            Key: name,
                            Value: value
                        })
                    }
                })
            }
            newCodecParams.WorkFlow.push(obj)
        })
        setRunLoading(true)

        ipcRenderer
            .invoke("NewCodec", newCodecParams)
            .then((data: CodecResponseProps) => {
                // 执行完成后 更改Output值
                setOutputResponse(data)
            })
            .catch((e) => {
                failed(`newCodec failed ${e}`)
            })
            .finally(() => {
                setRunLoading(false)
            })
    })

    // 执行校验
    const runCodec = useMemoizedFn(() => {
        // 筛选掉跳过项
        const rightItemsSkip = rightItems.filter((item) => item.status !== "shield")
        // 获取中止项及其前面内容
        const rightItemsStop: RightItemsProps[] = []
        rightItemsSkip.some((item) => {
            rightItemsStop.push(item)
            return item.status === "suspend"
        })
        // 校验不通过项
        const checkFail: CheckFailProps[] = []
        // 根据条件校验是否满足(例如：必选/正则)
        rightItemsStop.forEach((item) => {
            const {key, title} = item
            if (Array.isArray(item.node)) {
                item.node.forEach((itemIn, indexIn) => {
                    if (itemIn.type === "input" || itemIn.type === "text") {
                        const rightItem = itemIn as RightItemsInputProps
                        const {require, value, regex} = rightItem
                        // 校验是否必填
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:为必填项`
                            })
                        }
                        // 校验正则
                        if (regex && value) {
                            const regexp = new RegExp(regex)
                            if (!regexp.test(value)) {
                                checkFail.push({
                                    key,
                                    index: indexIn,
                                    message: `${title}-${rightItem.title}-${regexp}:校验不通过`
                                })
                            }
                        }
                    } else if (itemIn.type === "checkbox") {
                        // checkbox无需校验 如若没有则数据转换时为false
                    } else if (itemIn.type === "select") {
                        const rightItem = itemIn as RightItemsSelectProps
                        const {require, value} = rightItem
                        // 校验是否必填
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:为必填项`
                            })
                        }
                    } else if (itemIn.type === "editor") {
                        const rightItem = itemIn as RightItemsEditorProps
                        const {require, value} = rightItem
                        // 校验是否必填
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:为必填项`
                            })
                        }
                    } else if (itemIn.type === "inputSelect") {
                        const rightItem = itemIn as RightItemsInputSelectProps
                        const inputItem = rightItem.input
                        const selectItem = rightItem.select
                        const {require, value, regex} = inputItem
                        // 校验input是否必填
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${inputItem.title}:为必填项`
                            })
                        }
                        // 校验input正则
                        if (regex && value) {
                            const regexp = new RegExp(regex)
                            if (!regexp.test(value)) {
                                checkFail.push({
                                    key,
                                    index: indexIn,
                                    message: `${title}-${inputItem.title}-${regexp}:校验不通过`
                                })
                            }
                        }
                        // 校验select是否必填
                        if (selectItem.require && !selectItem.value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${selectItem.title}:为必填项`
                            })
                        }
                    } else if (itemIn.type === "flex") {
                        // 此处为布局预留
                    }
                })
            }
        })
        if (checkFail.length > 0) {
            // 提示
            warn(checkFail[0].message)
        } else {
            // 执行函数
            runCodecFun(rightItemsStop)
        }
    })

    // 清空
    const onClear = useMemoizedFn(() => {
        setRightItems([])
    })

    return (
        <div className={styles["new-codec-run-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    {!fold && (
                        <Tooltip placement='right' title='展开Codec分类'>
                            <SideBarOpenIcon
                                className={styles["fold-icon"]}
                                onClick={() => {
                                    setFold(true)
                                }}
                            />
                        </Tooltip>
                    )}
                    <span>编解码顺序</span>
                    <span className={styles["count"]}>{rightItems.length}</span>
                </div>
                <div className={styles["extra"]}>
                    <Tooltip title={"保存"}>
                        <div className={styles["extra-icon"]} onClick={onSaveCodecRunListHistory}>
                            <OutlineStorageIcon />
                        </div>
                    </Tooltip>
                    <YakitPopover
                        overlayClassName={styles["http-history-table-drop-down-popover"]}
                        content={
                            <CodecRunListHistoryStore
                                onSelect={(v) => onMenuSelect(v)}
                                popoverVisible={popoverVisible}
                                setPopoverVisible={setPopoverVisible}
                            />
                        }
                        trigger='click'
                        placement='bottomRight'
                        onVisibleChange={setPopoverVisible}
                        visible={popoverVisible}
                    >
                        <Tooltip title={"历史存储"}>
                            <div className={styles["extra-icon"]}>
                                <OutlineClockIcon />
                            </div>
                        </Tooltip>
                    </YakitPopover>
                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                    <div className={styles["clear"]} onClick={onClear}>
                        清空
                    </div>
                </div>
            </div>
            <div className={styles["run-list"]}>
                {/* 右边拖放目标 */}
                <Droppable droppableId='right' direction='vertical'>
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            id={`codec-middle-run-scroll-${id}`}
                            {...provided.droppableProps}
                            style={
                                rightItems.length > 0
                                    ? {height: "100%", overflow: "auto"}
                                    : {height: "100%", overflow: "hidden"}
                            }
                        >
                            {rightItems.length > 0 ? (
                                <>
                                    {rightItems.map((item, index) => (
                                        <Draggable
                                            key={`run-${item.key}`}
                                            draggableId={`run-${item.key}`}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        ...getMiddleItemStyle(
                                                            snapshot.isDragging,
                                                            provided.draggableProps.style
                                                        )
                                                    }}
                                                >
                                                    <NewCodecMiddleTypeItem
                                                        key={`run-${item.key}`}
                                                        data={item}
                                                        outerKey={item.key}
                                                        rightItems={rightItems}
                                                        setRightItems={setRightItems}
                                                        provided={provided}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    <div style={{height: 16}}></div>
                                </>
                            ) : (
                                <div className={styles["no-data"]}>
                                    <YakitEmpty title='请从左侧列表拖入要使用的 Codec 工具' />
                                </div>
                            )}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
            <div className={styles["run-box"]}>
                <YakitCheckbox
                    disabled={rightItems.length === 0 || inputEditor.length === 0}
                    checked={autoRun}
                    onChange={(e) => setAutoRun(e.target.checked)}
                >
                    自动执行
                </YakitCheckbox>
                <YakitButton
                    disabled={rightItems.length === 0 || inputEditor.length === 0}
                    size='max'
                    className={styles["run-box-btn"]}
                    icon={<SolidPlayIcon />}
                    onClick={runCodec}
                >
                    立即执行
                </YakitButton>
            </div>
            <YakitModal
                visible={cacheModal}
                bodyStyle={{padding: 0}}
                title='保存编解码顺序'
                width={400}
                footer={null}
                onCancel={() => {
                    setFilterName("")
                    setCacheModal(false)
                }}
            >
                <div className={styles["codec-save-modal"]}>
                    <YakitInput.TextArea
                        value={filterName}
                        placeholder='请为编解码顺序取个名字...'
                        showCount
                        maxLength={50}
                        onChange={(e) => {
                            setFilterName(e.target.value)
                        }}
                    />
                    <div className={styles["btn-box"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setFilterName("")
                                setCacheModal(false)
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={onSaveFun}>
                            保存
                        </YakitButton>
                    </div>
                </div>
            </YakitModal>
        </div>
    )
}

interface NewCodecLeftDragListItemProps {
    node: CodecMethod[]
    collectList: string[]
    getCollectData: (v: string[]) => void
    onClickToRunList: (v: CodecMethod) => void
    parentItem?: LeftDataProps
}

let lastIsDragging = false
const getLeftItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    // console.log("transform---",transform,isDragging);
    if (isDragging) {
        // 使用正则表达式匹配 translate 函数中的两个参数
        const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
        if (match) {
            lastIsDragging = true
            // 提取匹配到的两个值，并将它们转换为数字
            const [value1, value2] = match.slice(1).map(Number)
            // 判断值是否小于 0
            if (value1 < 0) {
                // 修改值为 0
                const modifiedString = transform.replace(
                    /translate\((-?\d+)px, (-?\d+)px\)/,
                    `translate(0px, ${value2}px)`
                )
                transform = modifiedString
            }
        } else {
            if (!lastIsDragging) {
                // 解决拖拽送松开时,样式溢出（屏蔽异常样式）
                transform = `translate(0px, 0px)`
            }
        }
    } else {
        lastIsDragging = false
    }
    return {
        ...draggableStyle,
        transform
    }
}

// 左边拖拽源
export const NewCodecLeftDragListItem: React.FC<NewCodecLeftDragListItemProps> = (props) => {
    const {node, collectList, parentItem, getCollectData, onClickToRunList} = props

    const dragListItemDom = useMemoizedFn((item: CodecMethod) => (
        <YakitPopover
            // visible={true}
            placement='right'
            overlayClassName={styles["drag-list-item-popover"]}
            content={
                <div className={styles["popover-content"]}>
                    <div className={styles["title"]}>{item.CodecName}</div>
                    <div className={styles["content"]}>{item.Desc}</div>
                </div>
            }
        >
            <div className={styles["drag-list-item"]} onClick={() => onClickToRunList(item)}>
                <div className={styles["title"]}>
                    <div className={styles["drag-icon"]}>
                        <SolidDragsortIcon />
                    </div>
                    <span className={styles["text"]}>{item.CodecName}</span>
                </div>
                <div className={styles["extra"]}>
                    {collectList.includes(item.CodecName) ? (
                        <div
                            className={classNames(styles["star-icon"], styles["star-icon-active"])}
                            onClick={(e) => {
                                e.stopPropagation()
                                const list = collectList.filter((itemIn) => itemIn !== item.CodecName)
                                getCollectData(list)
                                setRemoteValue(SaveCodecMethods, JSON.stringify(list))
                            }}
                        >
                            <SolidStarIcon />
                        </div>
                    ) : (
                        <div
                            className={classNames(styles["star-icon"], styles["star-icon-default"])}
                            onClick={(e) => {
                                e.stopPropagation()
                                getCollectData([...collectList, item.CodecName])
                                setRemoteValue(SaveCodecMethods, JSON.stringify([...collectList, item.CodecName]))
                            }}
                        >
                            <OutlineStarIcon />
                        </div>
                    )}
                </div>
            </div>
        </YakitPopover>
    ))

    return (
        <Droppable
            droppableId='left'
            direction='vertical'
            isDropDisabled={true}
            renderClone={(provided, snapshot, rubric) => {
                const item: CodecMethod[] =
                    node.filter(
                        (item) => `${parentItem?.title || "search"}-${item.CodecName}` === rubric.draggableId
                    ) || []
                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                            ...getLeftItemStyle(snapshot.isDragging, provided.draggableProps.style)
                        }}
                    >
                        <>
                            {item.length > 0 && (
                                <div className={styles["drag-list-item-clone"]}>
                                    <div className={styles["title"]}>
                                        <div className={styles["drag-icon"]}>
                                            <SolidDragsortIcon />
                                        </div>
                                        <span className={styles["text"]}>{item[0].CodecName}</span>
                                    </div>
                                    <div className={styles["extra"]}>
                                        {collectList.includes(item[0].CodecName) ? (
                                            <div
                                                className={classNames(styles["star-icon"], styles["star-icon-active"])}
                                            >
                                                <SolidStarIcon />
                                            </div>
                                        ) : (
                                            <div
                                                className={classNames(styles["star-icon"], styles["star-icon-default"])}
                                            >
                                                <OutlineStarIcon />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    </div>
                )
            }}
        >
            {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                    {node.map((item, index) => {
                        return (
                            <Draggable
                                key={`${parentItem?.title || "search"}-${item.CodecName}`}
                                draggableId={`${parentItem?.title || "search"}-${item.CodecName}`}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                            ...getLeftItemStyle(snapshot.isDragging, provided.draggableProps.style)
                                        }}
                                    >
                                        {dragListItemDom(item)}
                                    </div>
                                )}
                            </Draggable>
                        )
                    })}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}

interface NewCodecLeftDragListProps {
    fold: boolean
    setFold: (v: boolean) => void
    leftData: LeftDataProps[]
    leftCollectData: LeftDataProps[]
    collectList: string[]
    leftSearchData: CodecMethod[]
    isShowSearchList: boolean
    getCollectData: (v: string[]) => void
    onClickToRunList: (v: CodecMethod) => void
    searchValue?: string
    setSearchValue?: (v: string) => void
}

interface LeftDataProps {
    title: string
    node: CodecMethod[]
}

// codec左边拖拽列表
export const NewCodecLeftDragList: React.FC<NewCodecLeftDragListProps> = (props) => {
    const {
        fold,
        setFold,
        leftData,
        leftCollectData,
        collectList,
        searchValue,
        leftSearchData,
        setSearchValue,
        isShowSearchList,
        getCollectData,
        onClickToRunList
    } = props
    const [activeKey, setActiveKey] = useState<string[]>([])

    return (
        <div
            className={classNames(styles["new-codec-drag-list"], {
                [styles["new-codec-drag-list-show"]]: fold,
                [styles["new-codec-drag-list-hidden"]]: !fold
            })}
        >
            <div className={styles["header"]}>
                <div className={styles["title"]}>Codec 分类</div>
                <div className={classNames(styles["extra"], styles["fold-icon"])}>
                    <Tooltip placement='top' title='收起Codec分类'>
                        <SideBarCloseIcon
                            className={styles["fold-icon"]}
                            onClick={() => {
                                setFold(false)
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["search"]}>
                <YakitInput
                    prefix={
                        <div className={styles["prefix"]}>
                            <OutlineSearchIcon />
                        </div>
                    }
                    style={{width: "100%"}}
                    placeholder='请输入关键词搜索'
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue && setSearchValue(e.target.value)
                    }}
                />
            </div>
            <div className={styles["left-drag-list"]}>
                <YakitSpin spinning={false}>
                    {/* 左边列表 */}
                    <>
                        {isShowSearchList ? (
                            <div className={styles["left-drag-list-collapse"]}>
                                <NewCodecLeftDragListItem
                                    node={leftSearchData}
                                    collectList={collectList}
                                    getCollectData={getCollectData}
                                    onClickToRunList={onClickToRunList}
                                />
                                <div className={styles["to-end"]}>已经到底啦～</div>
                            </div>
                        ) : (
                            <YakitCollapse
                                expandIcon={() => <></>}
                                accordion={true}
                                activeKey={activeKey}
                                onChange={(key) => {
                                    const arr = key as string[]
                                    setActiveKey(arr)
                                }}
                                className={styles["left-drag-list-collapse"]}
                            >
                                {[...leftCollectData, ...leftData].map((item, index) => {
                                    return (
                                        <YakitPanel
                                            header={
                                                (activeKey || []).includes(item.title) ? (
                                                    <div className={styles["panel-active-title"]}>{item.title}</div>
                                                ) : (
                                                    item.title
                                                )
                                            }
                                            key={item.title}
                                            extra={
                                                item.title === "我收藏的工具" ? (
                                                    <>
                                                        {/* <div className={classNames(styles['star-icon'],styles['star-icon-default'])} onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}>
                                                    <OutlineStarIcon/>
                                                </div> */}
                                                        <div
                                                            style={{color: "#FFD583"}}
                                                            className={classNames(
                                                                styles["star-icon"],
                                                                styles["star-icon-active"]
                                                            )}
                                                            // onClick={(e) => {
                                                            //     e.stopPropagation()
                                                            // }}
                                                        >
                                                            <SolidStarIcon />
                                                        </div>
                                                    </>
                                                ) : null
                                            }
                                        >
                                            {item.node.length > 0 && (
                                                <NewCodecLeftDragListItem
                                                    node={item.node}
                                                    parentItem={item}
                                                    collectList={collectList}
                                                    getCollectData={getCollectData}
                                                    onClickToRunList={onClickToRunList}
                                                />
                                            )}
                                        </YakitPanel>
                                    )
                                })}
                                <div className={styles["to-end"]}>已经到底啦～</div>
                            </YakitCollapse>
                        )}
                    </>
                </YakitSpin>
            </div>
        </div>
    )
}
// 输入框
interface RightItemsInputProps {
    // 标题
    title?: string
    // 参数名
    name: string
    // 是否必传
    require?: boolean
    // 是否禁用
    disabled?: boolean
    // 默认值
    defaultValue?: string
    // 值
    value?: string
    // 正则校验
    regex?: string
    // 控件类型
    type: "input" | "text"
}

// 多选框
interface RightItemsCheckProps {
    // 可选值
    checkArr: {label: string; value: string}[]
    // 参数名
    name: string
    // 选中值
    value?: string[]
    // 控件类型
    type: "checkbox"
    // 是否禁用
    disabled?: boolean
    // 是否必传
    require?: boolean
}

// 下拉选择框
interface RightItemsSelectProps {
    // 标题
    title?: string
    // 参数名
    name: string
    // 可选值
    selectArr: {label: string; value: string}[]
    // 选中值
    value?: string
    // 是否禁用
    disabled?: boolean
    // 是否必传
    require?: boolean
    // 是否可以搜索
    showSearch?: boolean
    // 控件类型
    type: "select"
    // 是否启用社区插件查询
    isPlugin?: boolean
}

// 编辑器
interface RightItemsEditorProps {
    // 标题
    title?: string
    // 参数名
    name: string
    // 是否禁用
    disabled?: boolean
    // 是否必传
    require?: boolean
    // 编辑器值
    value?: string
    // 控件类型
    type: "editor"
}

// 联合控件 - Input/Select
interface RightItemsInputSelectProps {
    input: RightItemsInputProps
    select: RightItemsSelectProps
    // 控件类型
    type: "inputSelect"
}

// 除去联合控件
type RightItemsTypeNoUniteProps =
    | RightItemsInputProps
    | RightItemsCheckProps
    | RightItemsSelectProps
    | RightItemsEditorProps

// 所有控件
type RightItemsTypeProps = RightItemsTypeNoUniteProps | RightItemsInputSelectProps

// 左右布局
interface RightItemsFlexProps {
    // 左右占据宽度的比值(默认3:2)
    leftFlex?: number
    rightFlex?: number
    // 左右内容
    leftNode: RightItemsTypeProps
    rightNode: RightItemsTypeProps
    // 控件类型
    type: "flex"
}
interface RightItemsProps {
    title: string
    codecType: string
    key: string
    node?: (RightItemsTypeProps | RightItemsFlexProps)[]
    // 屏蔽/中止
    status?: "shield" | "suspend" | "run"
}
const initialRightItems: RightItemsProps[] = [
    // {
    //     title: "Item A",
    //     codecType:"55",
    //     key:"QQ",
    //     node: [
    //         {
    //             leftNode: {name:"DD",type: "input", title: "IV"},
    //             rightNode: {name:"BB",selectArr: [{label:"B",value:"B"}, {label:"K",value:"K"},{label:"M",value:"M"}], type: "select"},
    //             type: "flex"
    //         },
    //     ]
    // },
]
export interface CodecParam {
    Name: string
    Type: string
    Options: string[]
    Required: boolean
    DefaultValue: string
    Desc: string
    Regex: string
    Label: string
    Connector: CodecParam
}
export interface CodecMethod {
    Tag: string
    CodecName: string
    CodecMethod: string
    Desc: string
    Params: CodecParam[]
}
export interface CodecMethods {
    Methods: CodecMethod[]
}
export interface NewCodecProps {
    id: string
}
export const NewCodec: React.FC<NewCodecProps> = (props) => {
    const {id} = props
    // codec分类展开收起
    const [fold, setFold] = useState<boolean>(true)
    // 是否全部展开
    const [isExpand, setExpand] = useState<boolean>(false)
    const [rightItems, setRightItems] = useState<RightItemsProps[]>(initialRightItems)
    const [leftData, setLeftData] = useState<LeftDataProps[]>([])
    // 我的收藏
    const [leftCollectData, setLeftCollectData] = useState<LeftDataProps[]>([])
    const [collectList, setCollectList] = useState<string[]>([])

    const [leftSearchData, setLeftSearchData] = useState<CodecMethod[]>([])
    const [searchValue, setSearchValue] = useState<string>()
    // 是否显示搜索列表
    const [isShowSearchList, setShowSearchList] = useState<boolean>(false)
    const cacheCodecRef = useRef<CodecMethod[]>([])
    // Input/Output编辑器内容
    const [inputEditor, setInputEditor] = useState<string>("")
    const [outputResponse, setOutputResponse] = useState<CodecResponseProps>()
    // 是否正在执行
    const [runLoading, setRunLoading] = useState<boolean>(false)
    // 是否为点击添加至执行列表
    const isClickToRunList = useRef<boolean>(false)

    // 计算编码值总和
    const differentiate = useMemoizedFn((str: string) => {
        let sum = 0
        for (let i = 0; i < str.length; i++) {
            sum += str.charCodeAt(i)
        }
        return sum
    })

    // 构造页面左边列表数据
    const initLeftData = useMemoizedFn((Methods: CodecMethod[]) => {
        // 分类的类名
        let tagList: string[] = []
        let data: LeftDataProps[] = []
        // 固定顺序
        const NewMethods = Methods.sort((a, b) => differentiate(a.CodecName) - differentiate(b.CodecName))
        NewMethods.forEach((item) => {
            if (tagList.includes(item.Tag)) {
                const newData = data.map((itemIn) => {
                    const {title, node} = itemIn
                    if (itemIn.title === item.Tag) {
                        return {
                            title,
                            node: [...node, item]
                        }
                    }
                    return itemIn
                })
                data = newData
            } else {
                data.push({
                    title: item.Tag,
                    node: [item]
                })
                tagList.push(item.Tag)
            }
        })

        // 找到 title 为 "其他" 的项的索引
        const index = data.findIndex((item) => item.title === "其他")
        // 如果找到了，则将该项移动到数组尾部
        if (index !== -1) {
            const otherItem = data.splice(index, 1)[0]
            data.push(otherItem)
        }
        // console.log("initLeftData---", data, Methods)
        setLeftData(data)
    })

    // 获取codec收藏列表
    const getCollectData = useMemoizedFn((star?: string[]) => {
        const setStar = (starList: string[]) => {
            const filterCodec = cacheCodecRef.current.filter((item) => starList.includes(item.CodecName))
            /* 此处需要收藏的工具有顺序 则需要根据starList排列filterCodec */
            filterCodec.sort((a, b) => {
                const indexA = starList.indexOf(a.CodecName)
                const indexB = starList.indexOf(b.CodecName)
                return indexA - indexB
            })
            setCollectList(starList)
            if (filterCodec.length > 0) {
                setLeftCollectData([
                    {
                        title: "我收藏的工具",
                        node: filterCodec
                    }
                ])
            } else {
                setLeftCollectData([])
            }
        }
        if (star) {
            setStar(star)
        } else {
            getRemoteValue(SaveCodecMethods).then((res) => {
                // 如果存在收藏
                if (res) {
                    try {
                        const cacheList: string[] = JSON.parse(res)
                        setStar(cacheList)
                    } catch (error) {}
                } else {
                    setLeftCollectData([])
                    setCollectList([])
                }
            })
        }
    })

    // 获取codec列表
    const getLeftData = useMemoizedFn(() => {
        ipcRenderer.invoke("GetAllCodecMethods").then((res: CodecMethods) => {
            const {Methods} = res
            cacheCodecRef.current = Methods
            getCollectData()
            initLeftData(Methods)
        })
    })

    useDebounceEffect(
        () => {
            if (searchValue && searchValue.length) {
                const filterCodec = cacheCodecRef.current.filter((item) =>
                    item.CodecName.toLocaleLowerCase().includes(searchValue.toLocaleLowerCase())
                )
                setLeftSearchData(filterCodec)
                setShowSearchList(true)
            } else {
                setShowSearchList(false)
                getLeftData()
            }
        },
        [searchValue],
        {leading: true, wait: 500}
    )

    const initNode = useMemoizedFn((codecItem: CodecMethod) => {
        return codecItem.Params.map((item) => {
            try {
                const {Type, Options, Label, Name, Required, DefaultValue, Regex, Desc} = item
                switch (Type) {
                    case "select":
                        return {
                            type: "select",
                            selectArr: Options.map((item) => ({label: item, value: item})),
                            title: Label,
                            name: Name,
                            require: Required,
                            value: DefaultValue || undefined
                        } as RightItemsSelectProps
                    case "text":
                    case "input":
                        return {
                            type: Type,
                            title: Label,
                            name: Name,
                            require: Required,
                            regex: Regex
                        } as RightItemsInputProps
                    case "checkbox":
                        let checkArr = [{label: Label, value: Name}]
                        return {
                            type: "checkbox",
                            name: Name,
                            checkArr,
                            require: Required
                        } as RightItemsCheckProps
                    case "monaco":
                        return {
                            type: "editor",
                            title: Label,
                            name: Name,
                            require: Required,
                            value: pluginTypeToName["codec"]?.content
                        } as RightItemsEditorProps
                    case "search":
                        // search控件的selectArr来源于接口请求
                        return {
                            type: "select",
                            selectArr: [],
                            title: Label,
                            name: Name,
                            require: Required,
                            isPlugin: true,
                            showSearch: true
                        } as RightItemsSelectProps
                    // 联合控件 - Input/Select
                    case "inputSelect":
                        return {
                            type: "inputSelect",
                            input: {
                                type: "input",
                                title: Label,
                                name: Name,
                                require: Required,
                                regex: Regex
                            },
                            select: {
                                type: "select",
                                selectArr: item.Connector.Options.map((item) => ({label: item, value: item})),
                                title: item.Connector.Label,
                                name: item.Connector.Name,
                                require: item.Connector.Required,
                                value: item.Connector.DefaultValue || undefined
                            }
                        } as RightItemsInputSelectProps
                    default:
                        return {
                            title: "未识别数据",
                            require: false,
                            type: "input"
                        } as RightItemsInputProps
                }
            } catch (error) {
                return {
                    title: "未识别数据",
                    require: false,
                    type: "input"
                } as RightItemsInputProps
            }
        })
    })

    /**
     * @description: 点击后添加至运行列表
     */
    const onClickToRunList = useMemoizedFn((item: CodecMethod) => {
        const node = initNode(item)
        const newRightItems: RightItemsProps[] = JSON.parse(JSON.stringify(rightItems))
        newRightItems.push({title: item.CodecName, codecType: item.CodecMethod, key: uuidv4(), node})
        setRightItems(newRightItems)
        isClickToRunList.current = true
    })

    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        const {source, destination, draggableId} = result
        // console.log("onDragEnd", result)

        // 左边向右边拖拽
        if (source.droppableId === "left" && destination && destination.droppableId === "right") {
            const firstDashIndex = draggableId.indexOf("-")
            // 组来源或者搜索来源
            const sourceType = draggableId.substring(0, firstDashIndex)
            // 获取拖拽项
            const CodecName = draggableId.substring(firstDashIndex + 1)
            const codecArr = cacheCodecRef.current.filter((item) => item.CodecName === CodecName)
            if (codecArr.length > 0) {
                const codecItem = codecArr[0]
                const node = initNode(codecItem)
                const newRightItems: RightItemsProps[] = JSON.parse(JSON.stringify(rightItems))
                newRightItems.splice(destination.index, 0, {
                    title: codecItem.CodecName,
                    codecType: codecItem.CodecMethod,
                    key: uuidv4(),
                    node
                })
                setRightItems(newRightItems)
            }
        }

        // 右边内部排序
        if (source.droppableId === "right" && destination && destination.droppableId === "right") {
            const newRightItems: RightItemsProps[] = JSON.parse(JSON.stringify(rightItems))
            const [removed] = newRightItems.splice(source.index, 1)
            newRightItems.splice(destination.index, 0, removed)
            setRightItems([...newRightItems])
        }
    })

    /**
     * @description: 计算移动的范围是否在目标范围类
     */
    const onDragUpdate = useThrottleFn(
        (result: DragUpdate, provided: ResponderProvided) => {
            const {index, droppableId} = result.source
            const {combine, destination, draggableId} = result
        },
        {wait: 200}
    ).run

    const onBeforeCapture = useMemoizedFn((result: BeforeCapture) => {})

    const onDragStart = useMemoizedFn((result: DragStart) => {
        if (!result.source) return
        // console.log("onDragStart---", result)
    })

    return (
        <div className={styles["new-codec"]}>
            {!isExpand && (
                <DragDropContext
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                    onDragUpdate={onDragUpdate}
                    onBeforeCapture={onBeforeCapture}
                >
                    <NewCodecLeftDragList
                        fold={fold}
                        setFold={setFold}
                        leftData={leftData}
                        leftCollectData={leftCollectData}
                        collectList={collectList}
                        leftSearchData={leftSearchData}
                        isShowSearchList={isShowSearchList}
                        searchValue={searchValue}
                        setSearchValue={setSearchValue}
                        getCollectData={getCollectData}
                        onClickToRunList={onClickToRunList}
                    />
                    <NewCodecMiddleRunList
                        id={id}
                        fold={fold}
                        setFold={setFold}
                        rightItems={rightItems}
                        setRightItems={setRightItems}
                        inputEditor={inputEditor}
                        setOutputResponse={setOutputResponse}
                        isClickToRunList={isClickToRunList}
                        setRunLoading={setRunLoading}
                    />
                </DragDropContext>
            )}
            <NewCodecRightEditorBox
                isExpand={isExpand}
                setExpand={setExpand}
                inputEditor={inputEditor}
                setInputEditor={setInputEditor}
                outputResponse={outputResponse}
                runLoading={runLoading}
            />
        </div>
    )
}
