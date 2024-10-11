import React, {forwardRef, memo, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {TextareaForImage, PluginImageTextareaProps} from "./PluginImageTextareaType"
import {failed} from "@/utils/notification"
import {FileItem} from "fs"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePhotographIcon, OutlineXIcon} from "@/assets/icon/outline"
import {Image as AntdImage, Input, Upload} from "antd"
import {SolidPaperairplaneIcon} from "@/assets/icon/solid"
import cloneDeep from "lodash/cloneDeep"
import {httpDeleteOSSResource, httpUploadImgBase64} from "@/apiUtils/http"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import classNames from "classnames"
import styles from "./PluginImageTextarea.module.scss"

const ImgMaxSize = 1 * 1024 * 1024

export const PluginImageTextarea: React.FC<PluginImageTextareaProps> = memo(
    forwardRef((props, ref) => {
        const {type = "comment", onSubmit} = props

        useImperativeHandle(
            ref,
            () => ({
                setQuotationInfo: setQuotationInfo,
                getData: getData
            }),
            []
        )

        const getData = useMemoizedFn(() => {
            return {
                value: value,
                imgs: cloneDeep(imgs)
            }
        })

        const onReply = useMemoizedFn(() => {})

        /** ----------  引用相关功能 Start ---------- */
        const quotationInfo = useRef<{name: string; content: string}>()
        const [quotaionContent, setQuotationContent] = useState<string>("")
        const setQuotationInfo = useMemoizedFn((info: {name: string; content: string}) => {})
        const handleDelQuotation = useMemoizedFn(() => {
            quotationInfo.current = undefined
            setQuotationContent("")
        })
        /** ---------- 引用相关功能 End ---------- */

        /** ----------  编辑内容相关 Start ---------- */
        // 文本内容相关
        const textAreaRef = useRef<TextAreaRef>(null)
        const [value, setValue] = useState<string>("")
        const contentLength = useMemo(() => {
            return value.length
        }, [value])

        /** ---------- 编辑内容相关 End ---------- */

        /** ----------  编辑图片相关 Start ---------- */
        const [imgLoading, setImgLoading] = useState<boolean>(false)
        const [imgs, setImgs] = useState<TextareaForImage[]>([])
        const imgsLength = useMemo(() => {
            return imgs.length
        }, [imgs])

        // 生成图片信息
        const generateImageInfo = useMemoizedFn((image: FileItem) => {
            if (imgsLength >= 6) {
                failed("最多上传6张图片")
                return
            }
            if (!image) {
                return
            }
            if (imgLoading) {
                failed("图片正在上传中, 请稍候在操作...")
                return
            }

            if (image.size > ImgMaxSize) {
                failed("图片大小不能超过1M")
                return
            }

            setImgLoading(true)
            const render = new FileReader()
            render.onload = (e) => {
                if (!e || !e.target) {
                    failed("无法识别图片，请重试")
                    setTimeout(() => {
                        setImgLoading(false)
                    }, 100)
                    return
                }
                let base64 = e.target.result || ""
                const img = new Image()
                img.onload = () => {
                    const {width, height} = img
                    httpUploadImgBase64({
                        base64: base64 as string,
                        imgInfo: {filename: image.name || "image.png", contentType: image.type || "image/png"}
                    })
                        .then((res) => {
                            setImgs((arr) => arr.concat([{url: res, width, height}]))
                        })
                        .finally(() => {
                            setTimeout(() => {
                                setImgLoading(false)
                            }, 100)
                        })
                }
                img.src = URL.createObjectURL(image)
            }
            render.readAsDataURL(image)
        })
        // 监听粘贴图片
        const handlePaste = useMemoizedFn((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const pasteItems = e.clipboardData?.items || []
            for (let i = 0; i < pasteItems.length; i++) {
                const item = pasteItems[i]
                if (item.kind === "file" && item.type.indexOf("image") !== -1) {
                    e.preventDefault()
                    e.stopPropagation()
                    const image = item.getAsFile() as FileItem
                    generateImageInfo(image)
                }
            }
        })

        // 预览
        const [preview, setPreview] = useState<boolean>(false)
        const current = useRef<number>(0)
        const handlePreview = useMemoizedFn((index: number) => {
            if (preview) return
            current.current = index
            setPreview(true)
        })

        const [delImgs, setDelImgs] = useState<string[]>([])
        // 删除图片
        const handleDelImg = useMemoizedFn((index: number) => {
            const info = imgs[index]
            const findIndex = delImgs.findIndex((item) => item === info.url)
            if (findIndex !== -1) return

            setDelImgs((pre) => pre.concat([info.url]))
            const [name, path] = info.url.split("/").reverse()
            if (!name || !path) {
                failed(`删除图片出现异常，异常值: ${info.url}`)
                setDelImgs((pre) => pre.filter((item) => item !== info.url))
                return
            }
            const fileName = `${path}/${name}`
            httpDeleteOSSResource({file_name: [fileName]})
                .then(() => {
                    setDelImgs((pre) => pre.filter((item) => item !== info.url))
                    setImgs((pre) => pre.filter((item) => item.url !== info.url))
                })
                .catch(() => {
                    setDelImgs((pre) => pre.filter((item) => item !== info.url))
                })
        })
        /** ----------  编辑图片相关 End ---------- */

        /** ----------  操作相关 Start ---------- */
        const [textareaFocus, setTextareaFocus] = useState<boolean>(false)

        // 文本区域聚焦状态
        const handleFocus = useMemoizedFn(() => {
            setTextareaFocus(true)
            textAreaRef.current!.focus({cursor: "end"})
        })
        // 文本区域失焦状态
        const handleBlur = useMemoizedFn(() => {
            setTextareaFocus(false)
        })

        // 文本区域聚焦后光标设置到文本内容最后
        const handleTextareaFocus = useMemoizedFn(() => {
            textAreaRef.current!.focus({cursor: "end"})
        })
        /** ---------- 操作相关 End ---------- */

        return (
            <div
                className={classNames(styles["plugin-image-textarea"], {
                    [styles["plugin-image-textarea-focus"]]: textareaFocus
                })}
                onClick={handleTextareaFocus}
            >
                {(true || !!quotaionContent) && (
                    <div className={styles["plugin-image-textarea-quotation"]}>
                        <div className={styles["del-btn"]} onClick={handleDelQuotation}>
                            <OutlineXIcon />
                        </div>
                        <div className={styles["divider-style"]}></div>
                        <div className={classNames(styles["content-style"], "yakit-content-single-ellipsis")}>
                            {"回复 桔子 : 这里是审核不通过的雨爱你说这那个 v 石膏板"} {/* || quotaionContent} */}
                        </div>
                    </div>
                )}

                <Input.TextArea
                    ref={textAreaRef}
                    className={styles["plugin-image-textarea-body"]}
                    bordered={false}
                    autoSize={{minRows: 1, maxRows: 3}}
                    placeholder='说点什么...(tip: 可以粘贴图片了)'
                    maxLength={150}
                    onPaste={handlePaste}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChange={(e) => setValue(e.target.value)}
                />

                {imgsLength > 0 && (
                    <div className={styles["plugin-image-textarea-imgs"]}>
                        {imgs.map((item, index) => {
                            const isLoading = delImgs.findIndex((el) => el === item.url) !== -1
                            return (
                                <div
                                    className={classNames(styles["img-opt"], {
                                        [styles["img-opt-loading"]]: isLoading
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                    }}
                                >
                                    <AntdImage
                                        key={item.url}
                                        src={item.url}
                                        className={styles["img-style"]}
                                        preview={false}
                                    />
                                    <div className={styles["mask-spin"]}>
                                        <YakitSpin spinning={true} tip='' wrapperClassName={styles["spin-style"]} />
                                    </div>
                                    <div
                                        className={styles["mask-box"]}
                                        onClick={() => {
                                            handlePreview(index)
                                        }}
                                    >
                                        预览
                                    </div>
                                    <div
                                        className={styles["img-close"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelImg(index)
                                        }}
                                    >
                                        <OutlineXIcon />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className={styles["plugin-image-textarea-footer-operate"]}>
                    <Upload
                        accept='image/jpeg,image/png,image/jpg,image/gif'
                        multiple={false}
                        disabled={imgLoading}
                        showUploadList={false}
                        beforeUpload={(file: any) => {
                            if ("image/jpeg,image/png,image/jpg,image/gif".indexOf(file.type) === -1) {
                                failed("仅支持上传图片格式为：image/jpeg,image/png,image/jpg,image/gif")
                                return false
                            }
                            if (file) {
                                generateImageInfo(file)
                            }
                            return false
                        }}
                    >
                        <YakitButton
                            disabled={imgsLength >= 6}
                            loading={imgLoading}
                            icon={<OutlinePhotographIcon />}
                            type='text2'
                        />
                    </Upload>

                    <div className={styles["right-footer"]}>
                        <div className={styles["content-length"]}>{contentLength}/150</div>
                        {type === "comment" && (
                            <YakitButton onClick={onReply}>
                                <SolidPaperairplaneIcon />
                                回复
                            </YakitButton>
                        )}
                    </div>
                </div>

                {/* 图片预览 */}
                <div style={{display: "none"}}>
                    <AntdImage.PreviewGroup
                        preview={{
                            visible: preview,
                            onVisibleChange: (show) => {
                                setPreview(show)
                            },
                            current: current.current
                        }}
                    >
                        {imgs.map((item) => {
                            return <AntdImage src={item.url} />
                        })}
                    </AntdImage.PreviewGroup>
                </div>
            </div>
        )
    })
)
