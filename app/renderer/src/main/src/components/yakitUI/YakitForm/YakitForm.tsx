import {Upload, Form, Spin, Divider, Tooltip} from "antd"
import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {
    FileDraggerProps,
    YakitDraggerContentProps,
    YakitDraggerProps,
    YakitFormDraggerContentProps,
    YakitFormDraggerContentPathProps,
    YakitFormDraggerProps,
    YakitDraggerContentPathProps
} from "./YakitFormType.d"
import styles from "./YakitForm.module.scss"
import classNames from "classnames"
import {YakitInput} from "../YakitInput/YakitInput"
import {useDebounceEffect, useInViewport, useMemoizedFn} from "ahooks"
import {failed, yakitNotify} from "@/utils/notification"
import {OutlineUploadIcon} from "@/assets/icon/outline"
import {YakitAutoComplete} from "../YakitAutoComplete/YakitAutoComplete"
import {UISettingSvgIcon} from "@/components/layout/icons"
import {YakitButton} from "../YakitButton/YakitButton"
import {YakitPopover} from "../YakitPopover/YakitPopover"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YakitSpin} from "../YakitSpin/YakitSpin"
import {YakitRadioButtons} from "../YakitRadioButtons/YakitRadioButtons"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"

const {Dragger} = Upload

const {ipcRenderer} = window.require("electron")

/**是否符合接受的文件类型 */
const isAcceptEligible = (path: string, accept?: string) => {
    const index = path.lastIndexOf(".")
    const fileType = path.substring(index, path.length)
    if (accept === ".*") {
        return index === -1 ? false : true
    }
    return accept ? accept.split(",").includes(fileType) : true
}

/**
 * @description:YakitFormDragger  form表单的文件拖拽  文件夹不支持拖拽
 * @augments YakitFormDraggerProps 继承antd的 DraggerProps 默认属性 和 YakitDraggerProps
 */
export const YakitFormDragger: React.FC<YakitFormDraggerProps> = React.memo((props) => {
    const {formItemProps = {}, size, formItemClassName, ...restProps} = props
    return (
        <Form.Item
            {...formItemProps}
            className={classNames(
                styles["form-label-middle"],
                {
                    [styles["form-label-small"]]: size === "small",
                    [styles["form-label-large"]]: size === "large"
                },
                formItemClassName
            )}
        >
            <YakitDragger size={size} {...restProps} />
        </Form.Item>
    )
})

/**
 * @description:YakitDragger  支持拖拽:文件/文件夹 文件路径只包括文件夹或者文件的第一级路径, 不包括文件夹下面的子文件路径数;
 * @description 如果需要显示文件中的内容，推荐使用组件:YakitDraggerContent
 * @augments YakitDraggerProps 
 * eg:  <YakitFormDraggerContent
        className={styles["plugin-execute-form-item"]}
        formItemProps={{
             name: "Input",
             label: "扫描目标",
             rules: [{required: true}]
        }}
        accept='.txt,.xlsx,.xls,.csv'
        textareaProps={{
            placeholder: "请输入扫描目标，多个目标用“英文逗号”或换行分隔"
        }}
        help='可将TXT、Excel文件拖入框内或'
        disabled={disabled}
    />
 */
export const YakitDragger: React.FC<YakitDraggerProps> = React.memo((props) => {
    const {
        size,
        inputProps = {},
        help = "可将文件拖入框内或点击此处",
        uploadFileText,
        uploadFolderText,
        value: fileName,
        onChange: setFileName,
        setContent,
        showDefHelp = true,
        selectType = "file",
        renderType = "input",
        textareaProps = {},
        autoCompleteProps = {},
        disabled,
        isShowPathNumber = true,
        multiple = true,
        fileExtensionIsExist = true
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [name, setName] = useState<string>(fileName || "")
    useDebounceEffect(
        () => {
            setName(fileName || "")
        },
        [fileName],
        {wait: 300}
    )

    /**文件处理 */
    const getContent = useMemoizedFn((path: string, fileType: string) => {
        if (!path) {
            failed("请输入路径")
            return
        }
        const index = path.lastIndexOf(".")
        if (fileExtensionIsExist) {
            if (selectType === "file" && index === -1) {
                failed("请输入正确的路径")
                return
            }

            if (props.accept && !props.accept.split(",").includes(fileType)) {
                failed(`仅支持${props.accept}格式的文件`)
                return
            }
        }
        // 设置名字
        if (setFileName) {
            setFileName(path)
        }
        if (selectType === "file" && setContent) {
            setUploadLoading(true)
            ipcRenderer
                .invoke("fetch-file-content", path)
                .then((res) => {
                    setContent(res)
                })
                .catch((err) => {
                    failed("数据获取失败：" + err)
                    setContent("")
                })
                .finally(() => setTimeout(() => setUploadLoading(false), 200))
        }
    })

    const renderContentValue = useMemoizedFn(() => {
        switch (renderType) {
            case "textarea":
                return (
                    <YakitInput.TextArea
                        placeholder={multiple ? "路径支持手动输入,输入多个请用逗号分隔" : "路径支持手动输入"}
                        value={fileName || name}
                        disabled={disabled}
                        {...textareaProps}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (setFileName) setFileName(e.target.value)
                            if (textareaProps.onChange) textareaProps.onChange(e)
                            e.stopPropagation()
                        }}
                        onPressEnter={(e) => {
                            e.stopPropagation()
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1 && fileExtensionIsExist) {
                                failed("请输入正确的路径")
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed("不支持多选")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (textareaProps.onPressEnter) textareaProps.onPressEnter(e)
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                            if (textareaProps.onFocus) textareaProps.onFocus(e)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (textareaProps.onClick) textareaProps.onClick(e)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (!name) return
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1 && fileExtensionIsExist) {
                                failed("请输入正确的路径")
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed("不支持多选")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (textareaProps.onBlur) textareaProps.onBlur(e)
                        }}
                    />
                )
            case "autoComplete":
                return (
                    <YakitAutoComplete
                        placeholder={multiple ? "路径支持手动输入,输入多个请用逗号分隔" : "路径支持手动输入"}
                        value={fileName || name}
                        disabled={disabled}
                        {...autoCompleteProps}
                        onChange={(value, option) => {
                            setName(value)
                            if (setFileName) setFileName(value)
                            if (autoCompleteProps.onChange) autoCompleteProps.onChange(value, option)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.stopPropagation()
                                const index = name.lastIndexOf(".")
                                if (selectType === "file" && index === -1 && fileExtensionIsExist) {
                                    failed("请输入正确的路径")
                                    return
                                }
                                if (fileNumber > 1 && multiple === false) {
                                    failed("不支持多选")
                                    return
                                }
                                const type = name.substring(index, name.length)
                                getContent(name, type)
                            }
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                            if (autoCompleteProps.onFocus) autoCompleteProps.onFocus(e)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (autoCompleteProps.onClick) autoCompleteProps.onClick(e)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (!name) return
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1 && fileExtensionIsExist) {
                                failed("请输入正确的路径")
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed("不支持多选")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (autoCompleteProps.onBlur) autoCompleteProps.onBlur(e)
                        }}
                    />
                )
            default:
                return (
                    <YakitInput
                        placeholder={multiple ? "路径支持手动输入,输入多个请用逗号分隔" : "路径支持手动输入"}
                        size={size}
                        value={fileName || name}
                        disabled={disabled}
                        {...inputProps}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (setFileName) setFileName(e.target.value)
                            if (inputProps.onChange) inputProps.onChange(e)
                            e.stopPropagation()
                        }}
                        onPressEnter={(e) => {
                            e.stopPropagation()
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1 && fileExtensionIsExist) {
                                failed("请输入正确的路径")
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed("不支持多选")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (inputProps.onPressEnter) inputProps.onPressEnter(e)
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                            if (inputProps.onFocus) inputProps.onFocus(e)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (inputProps.onClick) inputProps.onClick(e)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (!name) return
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1 && fileExtensionIsExist) {
                                failed("请输入正确的路径")
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed("不支持多选")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (inputProps.onBlur) inputProps.onBlur(e)
                        }}
                    />
                )
        }
    })

    const renderContent = useMemoizedFn((helpNode: ReactNode) => {
        return (
            <Spin spinning={uploadLoading}>
                {renderContentValue()}
                <div
                    className={classNames(styles["dragger-help-middle"], {
                        [styles["dragger-help-small"]]: size === "small",
                        [styles["dragger-help-large"]]: size === "large"
                    })}
                >
                    {(showDefHelp && <>{helpNode}</>) || <></>}
                </div>
            </Spin>
        )
    })
    /**
     * @description 选择文件夹
     */
    const onUploadFolder = useMemoizedFn(() => {
        if (disabled) return
        const properties = ["openDirectory"]
        if (multiple !== false) {
            properties.push("multiSelections")
        }
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength) {
                    const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, "\\")).join(",")
                    // 设置名字
                    if (setFileName) setFileName(absolutePath)
                }
            })
    })
    /**选择文件 */
    const onUploadFile = useMemoizedFn(() => {
        if (disabled) return
        const properties = ["openFile"]
        if (multiple !== false) {
            properties.push("multiSelections")
        }
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件",
                properties
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                let acceptFlag = true
                if (filesLength) {
                    const absolutePath: string[] = []
                    data.filePaths.forEach((p) => {
                        const path = p.replace(/\\/g, "\\")
                        if (fileExtensionIsExist) {
                            if (isAcceptEligible(path, props.accept || ".*")) {
                                absolutePath.push(path)
                            } else {
                                acceptFlag = false
                            }
                        } else {
                            absolutePath.push(path)
                        }
                    })

                    if (props.accept && !acceptFlag) {
                        failed(`仅支持${props.accept}格式的文件`)
                    }

                    // 设置名字
                    if (setFileName) setFileName(absolutePath.join(","))
                }
            })
    })
    /**拖拽文件夹后的路径回显文本处理 */
    const afterFolderDrop = useMemoizedFn((e) => {
        const {files = []} = e.dataTransfer
        let paths: string[] = []
        let isNoFit: string[] = []
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
            yakitNotify("error", "不支持多选")
            return
        }
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            const number = path.lastIndexOf(".")
            if (number !== -1) {
                isNoFit.push(path)
            } else {
                paths.push(path)
            }
        }
        if (isNoFit.length > 0) {
            yakitNotify("error", "已自动过滤不符合条件的数据")
        }
        if (filesLength > isNoFit.length && setFileName) setFileName(paths.join(","))
    })
    /**拖拽文件后的处理 */
    const afterFileDrop = useMemoizedFn((e) => {
        const {files = []} = e.dataTransfer
        let paths: string[] = []
        let isNoFit: string[] = []
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
            yakitNotify("error", "不支持多选")
            return
        }
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            if (fileExtensionIsExist) {
                if (isAcceptEligible(path, props.accept || ".*")) {
                    paths.push(path)
                } else {
                    isNoFit.push(path)
                }
            } else {
                paths.push(path)
            }
        }
        if (isNoFit.length > 0) {
            yakitNotify("error", "已自动过滤不符合条件的数据")
        }
        if (filesLength > isNoFit.length && setFileName) setFileName(paths.join(","))
    })
    /**拖拽文件/文件夹的路径回显 */
    const afterAllDrop = useMemoizedFn((e) => {
        const {files = []} = e.dataTransfer
        let paths: string[] = []
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
            yakitNotify("error", "不支持多选")
            return
        }
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            paths.push(path)
        }
        if (setFileName) setFileName(paths.join(","))
    })
    const fileNumber = useMemo(() => {
        let arr: string[] = []
        try {
            const path = fileName || name
            arr = path ? path.split(",") : []
        } catch (error) {
            yakitNotify("error", "文件路径数识别错误,请以逗号进行分割")
        }
        return arr.length
    }, [fileName, name])
    return (
        <>
            {selectType === "file" && (
                <FileDragger onDrop={afterFileDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    {uploadFileText||"上传文件"}
                                </span>
                            </span>
                            {isShowPathNumber && (
                                <span>
                                    识别到<span className={styles["dragger-help-number"]}>{fileNumber}</span>个文件路径
                                </span>
                            )}
                        </div>
                    )}
                </FileDragger>
            )}
            {selectType === "folder" && (
                <FileDragger onDrop={afterFolderDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFolder()
                                    }}
                                >
                                    {uploadFolderText||"上传文件夹"}
                                </span>
                            </span>
                            {isShowPathNumber && (
                                <span>
                                    识别到<span className={styles["dragger-help-number"]}>{fileNumber}</span>个文件路径
                                </span>
                            )}
                        </div>
                    )}
                </FileDragger>
            )}
            {selectType === "all" && (
                <FileDragger onDrop={afterAllDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    {uploadFileText||"上传文件"}
                                </span>
                                <Divider type='vertical' />
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFolder()
                                    }}
                                >
                                    {uploadFolderText||"上传文件夹"}
                                </span>
                            </span>

                            {isShowPathNumber && (
                                <span>
                                    识别到<span className={styles["dragger-help-number"]}>{fileNumber}</span>个文件路径
                                </span>
                            )}
                        </div>
                    )}
                </FileDragger>
            )}
        </>
    )
})
/**内容显示的是文件中的内容(超过限制大小10M则无法上传)，不显示路径；只支持选择文件 */
export const YakitDraggerContent: React.FC<YakitDraggerContentProps> = React.memo((props) => {
    const {
        value,
        disabled,
        size,
        textareaProps = {},
        onChange,
        help,
        showDefHelp,
        valueSeparator = ",",
        ...restProps
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const renderContent = useMemoizedFn((helpNode: ReactNode) => {
        return (
            <YakitSpin spinning={uploadLoading}>
                <YakitInput.TextArea
                    placeholder='路径支持手动输入,输入多个请用逗号分隔'
                    value={value}
                    disabled={disabled}
                    {...textareaProps}
                    onChange={(e) => {
                        if (onChange) onChange(e.target.value)
                        if (textareaProps.onChange) textareaProps.onChange(e)
                        e.stopPropagation()
                    }}
                    onPressEnter={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onPressEnter) textareaProps.onPressEnter(e)
                    }}
                    onFocus={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onFocus) textareaProps.onFocus(e)
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onClick) textareaProps.onClick(e)
                    }}
                    onBlur={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onBlur) textareaProps.onBlur(e)
                    }}
                />
                <div
                    className={classNames(styles["dragger-help-middle"], {
                        [styles["dragger-help-small"]]: size === "small",
                        [styles["dragger-help-large"]]: size === "large"
                    })}
                >
                    {helpNode}
                </div>
            </YakitSpin>
        )
    })

    /**默认10M之内，读取文件内容 */
    const onHandlerFile = useMemoizedFn((item: {size: number; path: string}) => {
        if (item.size / 1024 > 10 * 1024) {
            yakitNotify("warning", `文件过大，无法操作`)
            return
        }

        const path = item.path.replace(/\\/g, "\\")
        if (isAcceptEligible(path, props.accept || ".*")) {
            onGetContent(path)
        } else {
            yakitNotify("error", "文件类型不支持")
        }
    })
    /**拖拽文件后的处理 */
    const afterFileDrop = useMemoizedFn((e) => {
        if (disabled) return
        const {files = []} = e.dataTransfer
        const filesLength = files.length
        if (filesLength > 1) {
            yakitNotify("error", "多选的文件只会选择其中一个文件处理")
        }
        if (filesLength > 0) {
            const item = files[0]
            onHandlerFile(item)
        }
    })
    /**选择文件 */
    const onUploadFile = useMemoizedFn((e) => {
        e.stopPropagation()
        if (disabled) return
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件",
                properties: ["openFile"]
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength === 1) {
                    const path: string = data.filePaths[0].replace(/\\/g, "\\")
                    ipcRenderer
                        .invoke("fetch-file-info-by-path", path)
                        .then((fileInfo) => {
                            onHandlerFile({
                                size: fileInfo.size,
                                path
                            })
                        })
                        .catch((err) => {
                            yakitNotify("error", "文件数据读取异常:" + err)
                        })
                } else if (filesLength > 1) {
                    yakitNotify("error", "只支持单文件上传")
                }
            })
    })
    /**通过文件路径获取文件内容 */
    const onGetContent = useMemoizedFn((path: string) => {
        setUploadLoading(true)
        ipcRenderer
            .invoke("fetch-file-content", path)
            .then((res: string | {name: string; data: string[]}[]) => {
                if (Array.isArray(res)) {
                    // 表格文件读取出来的
                    let data: string[] = []
                    res.forEach((element) => {
                        data = data.concat(element.data)
                    })
                    const value = data.join(valueSeparator)
                    if (onChange) onChange(value)
                } else {
                    // 其他文件读取出来的
                    if (onChange) onChange(res)
                }
            })
            .catch((err) => {
                failed("数据获取失败：" + err)
            })
            .finally(() => setTimeout(() => setUploadLoading(false), 200))
    })
    return (
        <>
            <Dragger
                onDrop={afterFileDrop}
                {...restProps}
                disabled={disabled}
                showUploadList={false}
                directory={false}
                multiple={false}
                className={classNames(styles["yakit-dragger"], props.className)}
                beforeUpload={() => {
                    return false
                }}
            >
                {renderContent(
                    <div className={classNames(styles["form-item-help"], styles["form-item-content-help"])}>
                        <label>
                            {help ? help : showDefHelp ? "可将文件拖入框内或" : ""}
                            <span
                                className={classNames(styles["dragger-help-active"], {
                                    [styles["dragger-help-active-disabled"]]: disabled
                                })}
                                onClick={onUploadFile}
                            >
                                <OutlineUploadIcon className={styles["upload-icon"]} /> 点击此处
                            </span>
                            上传
                        </label>
                    </div>
                )}
            </Dragger>
        </>
    )
})

/**form表单item 内容显示的是文件中的内容，不显示路径；只支持选择文件 */
export const YakitFormDraggerContent: React.FC<YakitFormDraggerContentProps> = React.memo((props) => {
    const {formItemProps = {}, size, formItemClassName, ...restProps} = props
    return (
        <Form.Item
            {...formItemProps}
            className={classNames(
                styles["form-label-middle"],
                {
                    [styles["form-label-small"]]: size === "small",
                    [styles["form-label-large"]]: size === "large"
                },
                formItemClassName
            )}
        >
            <YakitDraggerContent {...restProps} size={size} />
        </Form.Item>
    )
})

/**内容显示的是文件中的内容(超过限制大小10M则无法上传)，不显示路径；只支持选择文件 */
export const YakitDraggerContentPath: React.FC<YakitDraggerContentPathProps> = React.memo((props) => {
    const {
        value,
        disabled,
        size,
        textareaProps = {},
        onChange,
        help,
        showDefHelp,
        valueSeparator = ",",
        textAreaType,
        onTextAreaType,
        ...restProps
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const renderContent = useMemoizedFn((helpNode: ReactNode) => {
        return (
            <YakitSpin spinning={uploadLoading}>
                <YakitInput.TextArea
                    placeholder='路径支持手动输入,输入多个请用逗号分隔'
                    value={value}
                    disabled={disabled}
                    {...textareaProps}
                    onChange={(e) => {
                        if (onChange) onChange(e.target.value)
                        if (textareaProps.onChange) textareaProps.onChange(e)
                        e.stopPropagation()
                    }}
                    onPressEnter={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onPressEnter) textareaProps.onPressEnter(e)
                    }}
                    onFocus={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onFocus) textareaProps.onFocus(e)
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onClick) textareaProps.onClick(e)
                    }}
                    onBlur={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onBlur) textareaProps.onBlur(e)
                    }}
                />
                <div
                    className={classNames(styles["dragger-help-middle"], {
                        [styles["dragger-help-small"]]: size === "small",
                        [styles["dragger-help-large"]]: size === "large"
                    })}
                >
                    {helpNode}
                </div>
            </YakitSpin>
        )
    })

    /**默认10M之内，读取文件内容 */
    const onHandlerFile = useMemoizedFn((item: {size: number; path: string}) => {
        const size = item.size
        const path = item.path.replace(/\\/g, "\\")
        if (isAcceptEligible(path, props.accept || ".*")) {
            onGetContent(size, path)
        } else {
            yakitNotify("error", "文件类型不支持")
        }
    })
    /**拖拽文件后的处理 */
    const afterFileDrop = useMemoizedFn((e) => {
        if (disabled) return
        const {files = []} = e.dataTransfer
        const filesLength = files.length
        if (filesLength > 1) {
            yakitNotify("error", "多选的文件只会选择其中一个文件处理")
        }
        if (filesLength > 0) {
            const item = files[0]
            onHandlerFile(item)
        }
    })
    /**选择文件 */
    const onUploadFile = useMemoizedFn((e) => {
        e.stopPropagation()
        if (disabled) return
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件",
                properties: ["openFile"]
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength === 1) {
                    const path: string = data.filePaths[0].replace(/\\/g, "\\")
                    ipcRenderer
                        .invoke("fetch-file-info-by-path", path)
                        .then((fileInfo) => {
                            onHandlerFile({
                                size: fileInfo.size,
                                path
                            })
                        })
                        .catch((err) => {
                            yakitNotify("error", "文件数据读取异常:" + err)
                        })
                } else if (filesLength > 1) {
                    yakitNotify("error", "只支持单文件上传")
                }
            })
    })
    /**通过文件路径获取文件内容 */
    const onGetContent = useMemoizedFn((size: number, path: string) => {
        if (size / 1024 > 10 * 1024) {
            onTextAreaType("path")
            if (onChange) onChange(path)
            return
        }
        onTextAreaType("content")
        setUploadLoading(true)
        ipcRenderer
            .invoke("fetch-file-content", path)
            .then((res: string | {name: string; data: string[]}[]) => {
                if (Array.isArray(res)) {
                    // 表格文件读取出来的
                    let data: string[] = []
                    res.forEach((element) => {
                        data = data.concat(element.data)
                    })
                    const value = data.join(valueSeparator)
                    if (onChange) onChange(value)
                } else {
                    // 其他文件读取出来的
                    if (onChange) onChange(res)
                }
            })
            .catch((err) => {
                failed("数据获取失败：" + err)
            })
            .finally(() => setTimeout(() => setUploadLoading(false), 200))
    })
    return (
        <>
            <Dragger
                onDrop={afterFileDrop}
                {...restProps}
                disabled={disabled}
                showUploadList={false}
                directory={false}
                multiple={false}
                className={classNames(styles["yakit-dragger"], props.className)}
                beforeUpload={() => {
                    return false
                }}
            >
                {renderContent(
                    <div className={classNames(styles["form-item-help"], styles["form-item-content-help"])}>
                        <label>
                            {help ? help : showDefHelp ? "可将文件拖入框内或" : ""}
                            <span
                                className={classNames(styles["dragger-help-active"], {
                                    [styles["dragger-help-active-disabled"]]: disabled
                                })}
                                onClick={onUploadFile}
                            >
                                <OutlineUploadIcon className={styles["upload-icon"]} /> 点击此处
                            </span>
                            上传
                        </label>
                        <div className={styles["divider-line"]}></div>
                        <YakitPopover
                            overlayClassName={styles["form-item-setting-dropdown"]}
                            placement='bottomLeft'
                            content={
                                <div onClick={(e) => e.stopPropagation()} style={{padding: "0 8px"}}>
                                    <div className={styles["content"]}>
                                        <div className={styles["text"]}>
                                            读取方式
                                            <Tooltip title='为避免读取大文件造成前端渲染失败，读取文件内容限制为10M，超过10M的文件请选择路径'>
                                                <QuestionMarkCircleIcon />
                                            </Tooltip>
                                            ：
                                        </div>
                                        <YakitRadioButtons
                                            size='small'
                                            value={textAreaType}
                                            onChange={(e) => {
                                                onTextAreaType(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "content",
                                                    label: "文件内容"
                                                },
                                                {
                                                    value: "path",
                                                    label: "路径"
                                                }
                                            ]}
                                        />
                                    </div>
                                </div>
                            }
                            trigger={"click"}
                            onVisibleChange={(visible) => {
                                if (visible) {
                                } else {
                                }
                            }}
                        >
                            <span className={styles["form-item-setting"]} onClick={(e) => e.stopPropagation()}>
                                <UISettingSvgIcon className={styles["form-item-setting-icon"]} />
                                设置
                            </span>
                        </YakitPopover>
                    </div>
                )}
            </Dragger>
        </>
    )
})

/**form表单item 内容显示的是文件中的内容或者路径（10M以上则显示路径）；只支持选择文件 */
export const YakitFormDraggerContentPath: React.FC<YakitFormDraggerContentPathProps> = React.memo((props) => {
    const {textAreaType, onTextAreaType, formItemProps = {}, size, formItemClassName, ...restProps} = props

    return (
        <Form.Item
            {...formItemProps}
            className={classNames(
                styles["form-label-middle"],
                {
                    [styles["form-label-small"]]: size === "small",
                    [styles["form-label-large"]]: size === "large"
                },
                formItemClassName
            )}
        >
            <YakitDraggerContentPath
                {...restProps}
                size={size}
                textAreaType={textAreaType}
                onTextAreaType={onTextAreaType}
            />
        </Form.Item>
    )
})

const FileDragger: React.FC<FileDraggerProps> = React.memo((props) => {
    const {disabled, multiple, onDrop, className, children} = props
    return (
        <div
            onDropCapture={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (disabled) return
                const {files = []} = e.dataTransfer
                const filesLength = files.length
                if (multiple === false && filesLength > 1) {
                    yakitNotify("error", "不允许多选")
                    return
                }
                if (onDrop) onDrop(e)
            }}
            className={classNames(styles["yakit-dragger"], className)}
        >
            {children}
        </div>
    )
})
