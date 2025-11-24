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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {handleOpenFileSystemDialog, OpenDialogOptions} from "@/utils/fileSystemDialog"

const {Dragger} = Upload

const {ipcRenderer} = window.require("electron")

/**是否符合接受的文件类型 */
export const isAcceptEligible = (path: string, accept?: string) => {
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
        help,
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
        fileExtensionIsExist = false,
        showExtraHelp = "",
        cacheFilePathKey,
        cacheFolderPathKey
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
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
            failed(t("YakitFormDragger.enterPath"))
            return
        }
        const index = path.lastIndexOf(".")
        if (fileExtensionIsExist || !!props.accept) {
            if (selectType === "file" && index === -1) {
                failed(t("YakitFormDragger.enterValidPath"))
                return
            }

            if (props.accept && !props.accept.split(",").includes(fileType)) {
                failed(t("YakitFormDragger.onlySupportFormat", {accept: props.accept}))
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
                    failed(t("YakitNotification.dataFetchFailed", {colon: true}) + err)
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
                        placeholder={
                            multiple ? t("YakitFormDragger.pathManualInput") : t("YakitFormDragger.pathManualEntry")
                        }
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
                            if (selectType === "file" && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                                failed(t("YakitFormDragger.enterValidPath"))
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed(t("YakitFormDragger.multiSelectNotSupported"))
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
                            if (selectType === "file" && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                                failed(t("YakitFormDragger.enterValidPath"))
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed(t("YakitFormDragger.multiSelectNotSupported"))
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
                        placeholder={
                            multiple ? t("YakitFormDragger.pathManualInput") : t("YakitFormDragger.pathManualEntry")
                        }
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
                                if (selectType === "file" && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                                    failed(t("YakitFormDragger.enterValidPath"))
                                    return
                                }
                                if (fileNumber > 1 && multiple === false) {
                                    failed(t("YakitFormDragger.multiSelectNotSupported"))
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
                            if (selectType === "file" && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                                failed(t("YakitFormDragger.enterValidPath"))
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed(t("YakitFormDragger.multiSelectNotSupported"))
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
                        placeholder={
                            multiple ? t("YakitFormDragger.pathManualInput") : t("YakitFormDragger.pathManualEntry")
                        }
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
                            if (selectType === "file" && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                                failed(t("YakitFormDragger.enterValidPath"))
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed(t("YakitFormDragger.multiSelectNotSupported"))
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
                            if (selectType === "file" && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                                failed(t("YakitFormDragger.enterValidPath"))
                                return
                            }
                            if (fileNumber > 1 && multiple === false) {
                                failed(t("YakitFormDragger.multiSelectNotSupported"))
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


    const cacheFilePathRef = useRef<string>("") 
    const cacheFolderPathRef = useRef<string>("") 
    // 获取缓存的文件路径
    useEffect(()=>{
        if (cacheFilePathKey) {
            getRemoteValue(cacheFilePathKey).then((value) => {
                if (value) {
                    cacheFilePathRef.current = value
                }
            })
        }
        if (cacheFolderPathKey) {
            getRemoteValue(cacheFolderPathKey).then((value) => {
                if (value) {
                    cacheFolderPathRef.current = value
                }
            })
        }
    },[])

    /**
     * @description 选择文件夹
     */
    const onUploadFolder = useMemoizedFn(() => {
        if (disabled) return
        const properties: OpenDialogOptions["properties"] = ["openDirectory"]
        if (multiple !== false) {
            properties.push("multiSelections")
        }
        let option: OpenDialogOptions = {
            title: t("YakitFormDragger.selectFolder"),
            properties
        }
        if(cacheFolderPathRef.current){
            option.defaultPath = cacheFolderPathRef.current
        }
        handleOpenFileSystemDialog(option)
            .then((data) => {
                const filesLength = data.filePaths.length
                if (filesLength) {
                    const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, "\\")).join(",")
                    if (cacheFolderPathKey && !multiple) {
                        cacheFolderPathRef.current = absolutePath
                        setRemoteValue(cacheFolderPathKey, absolutePath)
                    }
                    // 设置名字
                    if (setFileName) setFileName(absolutePath)
                }
            })
    })
    /**选择文件 */
    const onUploadFile = useMemoizedFn(() => {
        if (disabled) return
        const properties: OpenDialogOptions["properties"] = ["openFile"]
        if (multiple !== false) {
            properties.push("multiSelections")
        }
        let option: OpenDialogOptions = {
            title: t("YakitFormDragger.selectFile"),
            properties
        }
        if(cacheFilePathRef.current){
            option.defaultPath = cacheFilePathRef.current
        }
            handleOpenFileSystemDialog(option)
            .then((data) => {
                const filesLength = data.filePaths.length
                let acceptFlag = true
                if (filesLength) {
                    const absolutePath: string[] = []
                    data.filePaths.forEach((p) => {
                        const path = p.replace(/\\/g, "\\")
                        if (fileExtensionIsExist || !!props.accept) {
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
                        failed(t("YakitFormDragger.onlySupportFormat", {accept: props.accept}))
                    }
                    const result = absolutePath.join(",")
                    if (cacheFilePathKey && !multiple) {
                        cacheFilePathRef.current = result
                        setRemoteValue(cacheFilePathKey, result)
                    }
                    // 设置名字
                    if (setFileName) setFileName(result)
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
            yakitNotify("error", t("YakitFormDragger.multiSelectNotSupported"))
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
            yakitNotify("error", t("YakitFormDragger.autoFilteredData"))
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
            yakitNotify("error", t("YakitFormDragger.multiSelectNotSupported"))
            return
        }
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            if (fileExtensionIsExist || !!props.accept) {
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
            yakitNotify("error", t("YakitFormDragger.autoFilteredData"))
        }
        if (filesLength > isNoFit.length && setFileName) setFileName(paths.join(","))
    })
    /**拖拽文件/文件夹的路径回显 */
    const afterAllDrop = useMemoizedFn((e) => {
        const {files = []} = e.dataTransfer
        let paths: string[] = []
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
            yakitNotify("error", t("YakitFormDragger.multiSelectNotSupported"))
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
            yakitNotify("error", t("YakitFormDragger.filePathCountError"))
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
                                {help || t("YakitFormDragger.dragOrClickHere")}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    {uploadFileText || t("YakitFormDragger.uploadFile")}
                                </span>
                            </span>
                            {isShowPathNumber && (
                                <span>
                                    {t("YakitFormDragger.detected")}
                                    <span className={styles["dragger-help-number"]}>{fileNumber}</span>
                                    {t("YakitFormDragger.filesPath")}
                                </span>
                            )}
                            {showExtraHelp}
                        </div>
                    )}
                </FileDragger>
            )}
            {selectType === "folder" && (
                <FileDragger onDrop={afterFolderDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help || t("YakitFormDragger.dragOrClickHere")}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFolder()
                                    }}
                                >
                                    {uploadFolderText || t("YakitFormDragger.uploadFolder")}
                                </span>
                            </span>
                            {isShowPathNumber && (
                                <span>
                                    {t("YakitFormDragger.detected")}
                                    <span className={styles["dragger-help-number"]}>{fileNumber}</span>
                                    {t("YakitFormDragger.filesPath")}
                                </span>
                            )}
                            {showExtraHelp}
                        </div>
                    )}
                </FileDragger>
            )}
            {selectType === "all" && (
                <FileDragger onDrop={afterAllDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help || t("YakitFormDragger.dragOrClickHere")}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    {uploadFileText || t("YakitFormDragger.uploadFile")}
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
                                    {uploadFolderText || t("YakitFormDragger.uploadFolder")}
                                </span>
                            </span>

                            {isShowPathNumber && (
                                <span>
                                    {t("YakitFormDragger.detected")}
                                    <span className={styles["dragger-help-number"]}>{fileNumber}</span>
                                    {t("YakitFormDragger.filesPath")}
                                </span>
                            )}
                            {showExtraHelp}
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
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const renderContent = useMemoizedFn((helpNode: ReactNode) => {
        return (
            <YakitSpin spinning={uploadLoading}>
                <YakitInput.TextArea
                    placeholder={t("YakitFormDragger.pathManualInput")}
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
            yakitNotify("warning", t("YakitDraggerContent.file_too_large"))
            return
        }

        const path = item.path.replace(/\\/g, "\\")
        if (isAcceptEligible(path, props.accept || ".*")) {
            onGetContent(path)
        } else {
            yakitNotify("error", t("YakitDraggerContent.unsupported_file_type"))
        }
    })
    /**拖拽文件后的处理 */
    const afterFileDrop = useMemoizedFn((e) => {
        if (disabled) return
        const {files = []} = e.dataTransfer
        const filesLength = files.length
        if (filesLength > 1) {
            yakitNotify("error", t("YakitDraggerContent.multi_file_single_process"))
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
            handleOpenFileSystemDialog({title: t("YakitFormDragger.selectFile"), properties: ["openFile"]})
            .then((data) => {
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
                            yakitNotify("error", t("YakitDraggerContent.file_read_error") + err)
                        })
                } else if (filesLength > 1) {
                    yakitNotify("error", t("YakitDraggerContent.single_file_only"))
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
                failed(t("YakitDraggerContent.data_fetch_failed") + err)
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
                            {help ? help : showDefHelp ? t("YakitDraggerContent.drag_file_tip") : ""}
                            <span
                                className={classNames(styles["dragger-help-active"], {
                                    [styles["dragger-help-active-disabled"]]: disabled
                                })}
                                onClick={onUploadFile}
                            >
                                <OutlineUploadIcon className={styles["upload-icon"]} /> {t("YakitDraggerContent.click_here")}
                            </span>
                            {t("YakitButton.upload")}
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
            handleOpenFileSystemDialog({title: "请选择文件", properties: ["openFile"]})
            .then((data) => {
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
