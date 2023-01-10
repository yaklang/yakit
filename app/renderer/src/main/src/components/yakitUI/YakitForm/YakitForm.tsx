import {Upload, Form, Spin} from "antd"
import React, {useState} from "react"
import {YakitFormDraggerProps} from "./YakitFormType.d"
import styles from "./YakitForm.module.scss"
import classNames from "classnames"
import {YakitInput} from "../YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {failed} from "@/utils/notification"

const {Dragger} = Upload

const {ipcRenderer} = window.require("electron")

/**
 * @description:YakitFormDragger  form表单的文件拖拽
 * @augments YakitFormDraggerProps 继承antd的 DraggerProps 默认属性
 */
export const YakitFormDragger: React.FC<YakitFormDraggerProps> = (props) => {
    const {
        formItemProps = {},
        size,
        help,
        fileName,
        setFileName,
        setContent,
        formItemClassName,
        showDefHelp = true
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [name, setName] = useState<string>("")
    const getContent = useMemoizedFn((path: string) => {
        if (!path) {
            failed("请输入路径")
            return
        }
        const index = path.lastIndexOf(".")

        if (index === -1) {
            failed("请输入正确的路径")
            return
        }

        const type = path.substring(index + 1, path.length)
        if (type.toLocaleLowerCase() !== "json") {
            failed("仅支持.json结尾的文件")
            return
        }
        setUploadLoading(true)
        ipcRenderer
            .invoke("fetch-file-content", path)
            .then((res) => {
                if (setContent) {
                    setContent(res)
                }
            })
            .catch((err) => {
                failed("数据获取失败：" + err)
                if (setContent) {
                    setContent("")
                }
            })
            .finally(() => setTimeout(() => setUploadLoading(false), 200))
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
            <Dragger
                {...props}
                className={classNames(styles["yakit-dragger"], props.className)}
                beforeUpload={(f: any) => {
                    // 设置名字
                    if (setFileName) {
                        setFileName(f?.path)
                    }
                    getContent(f?.path)
                    return false
                }}
            >
                <Spin spinning={uploadLoading}>
                    <YakitInput
                        placeholder='请输入绝对路径'
                        size={size}
                        value={fileName || name}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (setFileName) setFileName(e.target.value)
                        }}
                        onPressEnter={(e) => {
                            e.stopPropagation()
                            getContent(name)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (name) getContent(name)
                        }}
                    />
                    <div
                        className={classNames(styles["dragger-help-middle"], {
                            [styles["dragger-help-small"]]: size === "small",
                            [styles["dragger-help-large"]]: size === "large"
                        })}
                    >
                        {(help && help) ||
                            (showDefHelp && (
                                <>
                                    <span>
                                        可将文件拖入框内或
                                        <span className={styles["dragger-help-active"]}>点击此处</span>
                                        上传
                                    </span>
                                    {/* 上传文件夹，显示文件夹下面的文件路径总数  暂不支持 */}
                                    {/* <span>
                                    识别到<span className={styles["dragger-help-number"]}>3</span>个文件路径
                                </span> */}
                                </>
                            )) || <></>}
                    </div>
                </Spin>
            </Dragger>
        </Form.Item>
    )
}
