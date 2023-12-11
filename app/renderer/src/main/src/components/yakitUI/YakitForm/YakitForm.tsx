import {Upload, Form, Spin, Divider} from "antd"
import React, {ReactNode, useEffect, useMemo, useState} from "react"
import {YakitDraggerProps, YakitFormDraggerProps} from "./YakitFormType.d"
import styles from "./YakitForm.module.scss"
import classNames from "classnames"
import {YakitInput} from "../YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {failed, yakitNotify} from "@/utils/notification"

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
 * @description:YakitDragger  支持拖拽:文件/文件夹 文件路径只包括文件夹或者文件的第一级路径, 不包括文件夹下面的子文件路径数
 * @augments YakitDraggerProps 继承antd的 DraggerProps 默认属性
 */
export const YakitDragger: React.FC<YakitDraggerProps> = React.memo((props) => {
    const {
        size,
        InputProps = {},
        help,
        value: fileName,
        onChange: setFileName,
        setContent,
        showDefHelp = true,
        selectType = "file",
        renderType = "input",
        textareaProps = {},
        ...restProps
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [name, setName] = useState<string>("")
    /**文件处理 */
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
                        placeholder='路径支持手动输入,输入多个请用逗号分隔'
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
                        placeholder='路径支持手动输入,输入多个请用逗号分隔'
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
                properties: ["openDirectory", "multiSelections"]
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
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件",
                properties: ["openFile", "multiSelections"]
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength) {
                    const absolutePath: string[] = []
                    data.filePaths.forEach((p) => {
                        const path = p.replace(/\\/g, "\\")
                        if (isAcceptEligible(path, props.accept || ".*")) {
                            absolutePath.push(path)
                        }
                    })
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
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            if (isAcceptEligible(path, props.accept || ".*")) {
                paths.push(path)
            } else {
                isNoFit.push(path)
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
        for (let index = 0; index < files.length; index++) {
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
                <Dragger
                    {...restProps}
                    showUploadList={false}
                    directory={false}
                    multiple={true}
                    className={classNames(styles["yakit-dragger"], props.className)}
                    beforeUpload={() => {
                        return false
                    }}
                    onDrop={afterFileDrop}
                >
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                可将文件拖入框内或点击此处
                                <span
                                    className={styles["dragger-help-active"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    上传文件
                                </span>
                            </span>
                            <span>
                                识别到<span className={styles["dragger-help-number"]}>{fileNumber}</span>个文件路径
                            </span>
                        </div>
                    )}
                </Dragger>
            )}

            {selectType === "folder" && (
                <Dragger
                    {...restProps}
                    showUploadList={false}
                    directory
                    className={classNames(styles["yakit-dragger"], props.className)}
                    beforeUpload={() => {
                        return false
                    }}
                    onDrop={afterFolderDrop}
                >
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                点击此处
                                <span
                                    className={styles["dragger-help-active"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFolder()
                                    }}
                                >
                                    上传文件夹
                                </span>
                            </span>
                            <span>
                                识别到<span className={styles["dragger-help-number"]}>{fileNumber}</span>个文件路径
                            </span>
                        </div>
                    )}
                </Dragger>
            )}
            {selectType === "all" && (
                <Dragger
                    {...restProps}
                    showUploadList={false}
                    className={classNames(styles["yakit-dragger"], props.className)}
                    beforeUpload={() => {
                        return false
                    }}
                    onDrop={afterAllDrop}
                >
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                点击此处
                                <span
                                    className={styles["dragger-help-active"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    上传文件
                                </span>
                                <Divider type='vertical' />
                                <span
                                    className={styles["dragger-help-active"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFolder()
                                    }}
                                >
                                    上传文件夹
                                </span>
                            </span>
                            <span>
                                识别到<span className={styles["dragger-help-number"]}>{fileNumber}</span>个文件路径
                            </span>
                        </div>
                    )}
                </Dragger>
            )}
        </>
    )
})
