import React, {forwardRef, memo, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {TextareaForImage, PluginImageTextareaProps} from "./PluginImageTextareaType"
import {failed} from "@/utils/notification"
import {FileItem} from "fs"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePhotographIcon, OutlineXIcon} from "@/assets/icon/outline"
import {Input, Upload} from "antd"
import {SolidPaperairplaneIcon} from "@/assets/icon/solid"
import cloneDeep from "lodash/cloneDeep"
import {httpDeleteOSSResource, httpUploadImgBase64} from "@/apiUtils/http"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {ImagePreviewList} from "@/pages/pluginHub/utilsUI/UtilsTemplate"

import classNames from "classnames"
import styles from "./PluginImageTextarea.module.scss"

export const ImgMaxSize = 1 * 1024 * 1024

export const PluginImageTextarea: React.FC<PluginImageTextareaProps> = memo(
    forwardRef((props, ref) => {
        const {className, loading, type = "comment", maxLength = 6, onSubmit, quotation, delQuotation} = props

        useImperativeHandle(
            ref,
            () => ({
                getData: getData,
                onClear: onClear
            }),
            []
        )

        const getData = useMemoizedFn(() => {
            if (imgLoading) {
                failed("图片正在上传中, 请稍候在操作...")
                return null
            }
            if (delLoading.current) {
                failed("图片正在删除中, 请稍候在操作...")
                return null
            }

            return {
                value: value,
                imgs: cloneDeep(imgs)
            }
        })
        const onClear = useMemoizedFn(() => {
            handleDelQuotation()
            setValue("")
            setImgs([])
        })

        const onReply = useMemoizedFn(() => {
            const data = getData()
            if (!data) return
            onSubmit && onSubmit(data)
        })

        /** ----------  引用相关功能 Start ---------- */
        const handleDelQuotation = useMemoizedFn(() => {
            delQuotation && delQuotation()
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
            if (imgsLength >= maxLength) {
                failed(`最多上传${maxLength}张图片`)
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
                        imgInfo: {filename: image.name || "image.png", contentType: image.type || "image/png"},
                        type: type === "comment" ? "comment" : "plugins"
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

        const delLoading = useRef<boolean>(false)
        const setDelLoading = useMemoizedFn((value: boolean) => {
            delLoading.current = value
        })
        // 删除图片资源
        const handleDelImgs: (url: string) => Promise<void> = useMemoizedFn((url) => {
            return new Promise((resolve, reject) => {
                const [name, path] = url.split("/").reverse()
                if (!name || !path) {
                    failed(`删除图片异常，异常值: ${url}`)
                    reject()
                    return
                }
                const fileName = `${path}/${name}`
                httpDeleteOSSResource({file_name: [fileName]})
                    .then(() => {
                        resolve()
                    })
                    .catch(reject)
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
                className={classNames(
                    styles["plugin-image-textarea"],
                    {
                        [styles["plugin-image-textarea-focus"]]: textareaFocus
                    },
                    className
                )}
                onClick={handleTextareaFocus}
            >
                {!!quotation && (
                    <div className={styles["plugin-image-textarea-quotation"]}>
                        <div className={styles["del-btn"]} onClick={handleDelQuotation}>
                            <OutlineXIcon />
                        </div>
                        <div className={styles["divider-style"]}></div>
                        <div className={styles["content-style"]}>
                            <div
                                className={classNames(styles["text-style"], "yakit-content-single-ellipsis")}
                                title={quotation.content}
                            >
                                {`回复 ${quotation.userName} : ${quotation.content}`}
                            </div>
                            {quotation.imgs && quotation.imgs.length > 0 && (
                                <div>{`[图片] * ${quotation.imgs?.length}`}</div>
                            )}
                        </div>
                    </div>
                )}

                <Input.TextArea
                    ref={textAreaRef}
                    className={styles["plugin-image-textarea-body"]}
                    value={value}
                    bordered={false}
                    autoSize={{minRows: 1, maxRows: 3}}
                    placeholder='说点什么...(tip: 可以粘贴图片了)'
                    spellCheck={false}
                    maxLength={150}
                    onPaste={handlePaste}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChange={(e) => setValue(e.target.value)}
                />

                {imgsLength > 0 && (
                    <ImagePreviewList
                        isDel={true}
                        imgs={imgs}
                        setImgs={setImgs}
                        setDelLoading={setDelLoading}
                        onDel={handleDelImgs}
                    />
                )}

                <div className={styles["plugin-image-textarea-footer-operate"]}>
                    <Upload
                        accept='image/jpeg,image/png,image/jpg,image/gif'
                        multiple={false}
                        disabled={imgLoading || imgsLength >= 6}
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
                            <YakitButton
                                loading={loading}
                                disabled={contentLength === 0 && imgsLength === 0}
                                onClick={onReply}
                            >
                                <SolidPaperairplaneIcon />
                                {!!quotation ? "回复" : "发布评论"}
                            </YakitButton>
                        )}
                    </div>
                </div>
            </div>
        )
    })
)
