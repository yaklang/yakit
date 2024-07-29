import React, {useEffect, useMemo, useRef, useState} from "react"
import {Input, InputRef, Image, Upload} from "antd"
import {LoadingOutlined} from "@ant-design/icons"
import styles from "./YakitTextArea.module.scss"
import classNames from "classnames"
import cloneDeep from "lodash/cloneDeep"
import {YakitButton} from "../YakitButton/YakitButton"
import {PaperAirplaneIcon, ResizerIcon} from "@/assets/newIcon"
import {CloseIcon} from "@/components/configNetwork/icon"
import {failed} from "@/utils/notification"
import {OutlinePhotographIcon} from "@/assets/icon/outline"
import {TextAreaProps} from "antd/lib/input"
const {ipcRenderer} = window.require("electron")

interface ImageShowProps {
    src: string
    visible: boolean
}

/**
 * @description YakitTextAreaImagesProps 的属性
 * @param {string} className
 * @param {string[]} images 显示的图片数据
 * @param {(v: string[]) => void} onDelete 删除图片后剩余图片数据的回调
 * @param {() => void} onOpen 放大图片的回调
 * @param {() => void} onClose 关闭放大图片的回调
 * @param {string | number} key 辅助key值
 * @param {number} size 展示图片大小 默认56
 */

interface YakitTextAreaImagesProps {
    className?: string
    images: string[]
    onDelete?: (v: string[]) => void
    onOpen?: () => void
    onClose?: () => void
    key?: string | number
    size?: number
}

export const YakitTextAreaImages: React.FC<YakitTextAreaImagesProps> = (props) => {
    const {className, images, onDelete, onOpen, onClose, key, size = 56} = props
    const [imageShow, setImageShow] = useState<ImageShowProps>({
        src: "",
        visible: false
    })
    return (
        <div className={classNames(styles["yakit-textArea-images"], className || "")}>
            {images.map((item, index) => {
                return (
                    <div
                        key={`${item}-${key || ""}`}
                        className={styles["upload-img-opt"]}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        style={{width: size, height: size}}
                    >
                        <Image src={item as any} className={styles["opt-pic"]} preview={false} />
                        <div
                            className={styles["mask-box"]}
                            onClick={() => {
                                onOpen && onOpen()
                                setImageShow({
                                    visible: true,
                                    src: item
                                })
                            }}
                        >
                            预览
                        </div>
                        {onDelete && (
                            <div
                                className={styles["close"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const arr: string[] = cloneDeep(images)
                                    arr.splice(index, 1)
                                    onDelete && onDelete(arr)
                                }}
                            >
                                <CloseIcon />
                            </div>
                        )}
                    </div>
                )
            })}
            <Image
                src={imageShow.src}
                style={{display: "none"}}
                preview={{
                    visible: imageShow.visible,
                    src: imageShow.src,
                    onVisibleChange: (value) => {
                        if (!value) {
                            onClose && onClose()
                            setImageShow({
                                visible: false,
                                src: ""
                            })
                        }
                    }
                }}
            />
        </div>
    )
}
/**
 * @description YakitTextAreaProps 的属性
 * @augments TextAreaProps 继承antd的TextAreaProps默认属性
 * @param {string} type 类型 默认文本域（text文本域、images图片文本域）
 * @param {"small" | "middle"} textAreaSize 控件尺寸
 * @param {string} wrapClassName
 * @param {string} value 输入框值
 * @param {(value:string) => void} setValue  更改输入框值
 * @param {boolean} isLimit 是否限制输入字数 默认限制
 * @param {number} limit 限制输入字数，默认150字
 * @param {boolean} loading 是否加载中
 * @param {string[]} files 显示图片列表
 * @param {(files: string[]) => void} setFiles 更改显示图片列表
 * @param {() => void} onSubmit 确认回调
 * @param {string} submitTxt 确认按钮文案
 * @param {number} rows TextArea行数 默认4行
 * @param {boolean} isAlwaysShow 是否常驻显示操作按钮（默认为聚焦显示）
 */

export interface YakitTextAreaProps extends TextAreaProps {
    type?: "text" | "images"
    textAreaSize?: "small" | "middle"
    wrapClassName?: string
    value: string
    setValue: (value: string) => void
    isLimit?: boolean
    limit?: number
    loading?: boolean
    files?: string[]
    setFiles?: (files: string[]) => void
    onSubmit?: () => void
    submitTxt?: string
    rows?: number
    isAlwaysShow?: boolean
}
export const YakitTextArea: React.FC<YakitTextAreaProps> = (props) => {
    const {
        type = "text",
        textAreaSize = "middle",
        wrapClassName,
        value,
        setValue,
        isLimit = true,
        limit = 150,
        loading,
        files = [],
        setFiles,
        onSubmit,
        submitTxt = "发布评论",
        rows = 4,
        isAlwaysShow,
        ...resProps
    } = props
    const [filesLoading, setFilesLoading] = useState<boolean>(false)
    const textAreRef = useRef<InputRef>(null)
    const [isFocused, setIsFocused] = useState<boolean>(false)
    // 是否允许其失焦
    const isAllowBlur = useRef<boolean>(true)
    const uploadFiles = (file) => {
        setFilesLoading(true)
        ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                setFiles && setFiles(files.concat(res.data))
            })
            .catch((err) => {
                fail("图片上传失败")
            })
            .finally(() => {
                setTimeout(() => setFilesLoading(false), 1)
            })
    }

    const disabled = useMemo(() => {
        if (value.length > limit && isLimit) {
            return true
        }
        if (value.length === 0 && files.length === 0) {
            return true
        }
        return false
    }, [value, limit, files, isLimit])

    // 是否展示底部元素
    const isShowdDom = useMemo(() => {
        if (files.length > 0 || value.length > 0 || isAlwaysShow || isFocused) {
            return true
        } else {
            return false
        }
    }, [isFocused, files, value])
    return (
        <div
            className={classNames(styles["yakit-textarea"], wrapClassName || "", {
                [styles["yakit-textarea-active"]]: isFocused
            })}
            onClick={() => {
                textAreRef.current!.focus({
                    cursor: "end"
                })
            }}
        >
            {/* 将原本padding: 12px;拆分为4个div的原因是为了解决控件闪烁 */}
            <div
                className={classNames({
                    [styles["padding-top-small"]]: textAreaSize === "small",
                    [styles["padding-top-middle"]]: textAreaSize === "middle"
                })}
                onMouseDown={(e) => {
                    e.preventDefault()
                }}
            ></div>
            <div
                className={classNames(styles["padding-left-right"], {
                    [styles["padding-left-right-small"]]: textAreaSize === "small",
                    [styles["padding-left-right-middle"]]: textAreaSize === "middle"
                })}
            >
                <div
                    className={styles["padding-left"]}
                    onMouseDown={(e) => {
                        e.preventDefault()
                    }}
                ></div>
                <div className={styles["input-upload"]}>
                    <div
                        className={styles["input-box"]}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        <Input.TextArea
                            {...resProps}
                            className={classNames(
                                styles["input-box-textArea"],
                                {
                                    [styles["input-box-textArea-small"]]: textAreaSize === "small"
                                },
                                resProps.className || ""
                            )}
                            onFocus={() => {
                                setIsFocused(true)
                            }}
                            onBlur={() => {
                                if (isAllowBlur.current) {
                                    setIsFocused(false)
                                } else {
                                    isAllowBlur.current = true
                                    textAreRef.current?.focus()
                                }
                            }}
                            value={value}
                            ref={textAreRef}
                            bordered={false}
                            rows={rows}
                            onChange={(e) => setValue(e.target.value)}
                        />
                        <ResizerIcon className={styles["textArea-resizer-icon"]} />
                    </div>
                    {isShowdDom && type === "images" && (
                        <div
                            style={{paddingTop: textAreaSize === "middle" ? 12 : 8}}
                            onMouseDown={(e) => {
                                e.preventDefault()
                            }}
                        >
                            <YakitTextAreaImages
                                images={files}
                                onDelete={setFiles}
                                onOpen={() => {
                                    isAllowBlur.current = false
                                }}
                                onClose={() => {
                                    isAllowBlur.current = true
                                }}
                            />
                        </div>
                    )}
                    {isShowdDom && type === "text" && (
                        <div
                            style={{paddingTop: textAreaSize === "middle" ? 12 : 8}}
                            onMouseDown={(e) => {
                                e.preventDefault()
                            }}
                        ></div>
                    )}
                    {isShowdDom && (
                        <div
                            className={classNames(styles["upload-box"], {
                                [styles["upload-box-text"]]: type === "text",
                                [styles["upload-box-images"]]: type === "images"
                            })}
                            onMouseDown={(e) => {
                                e.preventDefault()
                            }}
                        >
                            {type === "images" && (
                                <div
                                    className={styles["upload-box-left"]}
                                    onClick={() => {
                                        isAllowBlur.current = false
                                    }}
                                >
                                    <Upload
                                        accept='image/jpeg,image/png,image/jpg,image/gif'
                                        multiple={false}
                                        disabled={files.length >= 3}
                                        showUploadList={false}
                                        beforeUpload={(file: any) => {
                                            if (filesLoading) {
                                                return false
                                            }
                                            if (file.size / 1024 / 1024 > 10) {
                                                failed("图片大小不超过10M")
                                                return false
                                            }
                                            if (!"image/jpeg,image/png,image/jpg,image/gif".includes(file.type)) {
                                                failed("仅支持上传图片格式为：image/jpeg,image/png,image/jpg,image/gif")
                                                return false
                                            }
                                            if (file) {
                                                uploadFiles(file)
                                            }
                                            return true
                                        }}
                                    >
                                        {filesLoading ? (
                                            <LoadingOutlined size={28} />
                                        ) : (
                                            <YakitButton
                                                size='large'
                                                disabled={files.length >= 3}
                                                icon={<OutlinePhotographIcon />}
                                                type='text2'
                                            />
                                        )}
                                    </Upload>
                                </div>
                            )}
                            <div className={styles["upload-box-right"]}>
                                {isLimit && (
                                    <div className={styles["limit-count"]}>
                                        {value.length}/{limit}
                                    </div>
                                )}
                                <>
                                    {
                                        // 由于Button的disabled为true时会被阻止默认事件向上传递 因此disable样式由自己实现
                                        disabled ? (
                                            <div className={styles["disabled-btn"]}>
                                                <PaperAirplaneIcon />
                                                {submitTxt}
                                            </div>
                                        ) : (
                                            <YakitButton
                                                icon={<PaperAirplaneIcon />}
                                                loading={loading}
                                                onClick={() => {
                                                    onSubmit && onSubmit()
                                                }}
                                            >
                                                {submitTxt || "确认"}
                                            </YakitButton>
                                        )
                                    }
                                </>
                            </div>
                        </div>
                    )}
                </div>
                <div
                    className={styles["padding-right"]}
                    onMouseDown={(e) => {
                        e.preventDefault()
                    }}
                ></div>
            </div>

            <div
                className={classNames({
                    [styles["padding-bottom-small"]]: textAreaSize === "small",
                    [styles["padding-bottom-middle"]]: textAreaSize === "middle"
                })}
                onMouseDown={(e) => {
                    e.preventDefault()
                }}
            ></div>
        </div>
    )
}
