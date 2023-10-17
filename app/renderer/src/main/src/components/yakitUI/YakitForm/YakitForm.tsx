import {Upload, Form, Spin} from "antd"
import React, {ReactNode, useEffect, useState} from "react"
import {YakitFormDraggerProps} from "./YakitFormType.d"
import styles from "./YakitForm.module.scss"
import classNames from "classnames"
import {YakitInput} from "../YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {failed} from "@/utils/notification"

const {Dragger} = Upload

const {ipcRenderer} = window.require("electron")

/**
 * @description:YakitFormDragger  form表单的文件拖拽  文件夹不支持拖拽
 * @augments YakitFormDraggerProps 继承antd的 DraggerProps 默认属性
 */
export const YakitFormDragger: React.FC<YakitFormDraggerProps> = React.memo((props) => {
    const {
        formItemProps = {},
        InputProps = {},
        size,
        help,
        fileName,
        setFileName,
        setContent,
        formItemClassName,
        showDefHelp = true,
        selectType = "file",
        renderType = "input",
        textareaProps = {}
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [name, setName] = useState<string>("")
    const [fileNumber, setFileNumber] = useState<number>(0)
    const getContent = useMemoizedFn((path: string, fileType: string) => {
        if (!path) {
            failed("请输入路径")
            return
        }
        const index = path.lastIndexOf(".")

        if (selectType === "file" && index === -1) {
            failed("请输入正确的路径")
            return
        }

        if (props.accept && !props.accept.split(",").includes(fileType)) {
            failed(`仅支持${props.accept}格式的文件`)
            return
        }
        // 设置名字
        if (setFileName) {
            setFileName(path)
        }
        if (setContent) {
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
                        placeholder='请输入绝对路径'
                        value={fileName || name}
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
                            if (selectType === "file" && index === -1) {
                                failed("请输入正确的路径")
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
                            if (selectType === "file" && index === -1) {
                                failed("请输入正确的路径")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (textareaProps.onBlur) textareaProps.onBlur(e)
                        }}
                    />
                )

            default:
                return (
                    <YakitInput
                        placeholder='请输入绝对路径'
                        size={size}
                        value={fileName || name}
                        {...InputProps}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (setFileName) setFileName(e.target.value)
                            if (InputProps.onChange) InputProps.onChange(e)
                            e.stopPropagation()
                        }}
                        onPressEnter={(e) => {
                            e.stopPropagation()
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1) {
                                failed("请输入正确的路径")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (InputProps.onPressEnter) InputProps.onPressEnter(e)
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                            if (InputProps.onFocus) InputProps.onFocus(e)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (InputProps.onClick) InputProps.onClick(e)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (!name) return
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1) {
                                failed("请输入正确的路径")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (InputProps.onBlur) InputProps.onBlur(e)
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
                    {(help && help) || (showDefHelp && <>{helpNode}</>) || <></>}
                </div>
            </Spin>
        )
    })
    /**
     * @description 选择文件夹
     */
    const onUploadFolder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory"]
            })
            .then((data: any) => {
                if (data.filePaths.length) {
                    const absolutePath = data.filePaths[0].replace(/\\/g, "\\")
                    // 设置名字
                    if (setFileName) setFileName(absolutePath)
                    // 获取该文件夹下的 文件路径数,只看一级
                    ipcRenderer.invoke("get-folder-under-files", {
                        folderPath: absolutePath
                    })
                }
            })
    })
    useEffect(() => {
        if (fileName) {
            ipcRenderer.invoke("get-folder-under-files", {
                folderPath: fileName
            })
        }
        ipcRenderer.on(`send-folder-under-files`, onSetFileNumber)
        return () => {
            ipcRenderer.removeListener(`send-folder-under-files`, onSetFileNumber)
        }
    }, [])
    const onSetFileNumber = useMemoizedFn((_, files: any) => {
        setFileNumber(files.length)
    })
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
            {(selectType === "file" && (
                <Dragger
                    {...props}
                    className={classNames(styles["yakit-dragger"], props.className)}
                    beforeUpload={(f: any) => {
                        getContent(f?.path, f?.type)
                        return false
                    }}
                >
                    {renderContent(
                        <span>
                            可将文件拖入框内或点击此处
                            <span className={styles["dragger-help-active"]}>上传文件</span>
                        </span>
                    )}
                </Dragger>
            )) || (
                <>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                点击此处
                                <span className={styles["dragger-help-active"]} onClick={() => onUploadFolder()}>
                                    上传文件夹
                                </span>
                            </span>
                            <span>
                                识别到<span className={styles["dragger-help-number"]}>{fileNumber}</span>个文件路径
                            </span>
                        </div>
                    )}
                </>
            )}
        </Form.Item>
    )
})
