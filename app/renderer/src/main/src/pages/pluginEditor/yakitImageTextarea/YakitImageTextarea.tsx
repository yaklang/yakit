import React, {forwardRef, memo, useEffect, useImperativeHandle, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {
    CreateNewElementType,
    SetImageElementFunc,
    TextareaForImage,
    YakitImageTextareaInfoProps,
    YakitImageTextareaProps
} from "./YakitImageTextareaType"
import {failed, yakitNotify} from "@/utils/notification"
import {FileItem} from "fs"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePhotographIcon, OutlineXIcon} from "@/assets/icon/outline"
import {Upload} from "antd"
import {SolidPaperairplaneIcon} from "@/assets/icon/solid"
import {randomString} from "@/utils/randomUtil"
import {fetchCursorLineContent, generateImgBody, generateLineBreakBody, generateTextBody} from "./utils"
import cloneDeep from "lodash/cloneDeep"

import classNames from "classnames"
import "./YakitImageTextarea.scss"

export const YakitImageTextarea: React.FC<YakitImageTextareaProps> = memo(
    forwardRef((props, ref) => {
        const {} = props

        useImperativeHandle(
            ref,
            () => ({
                setQuotationInfo: setQuotationInfo
            }),
            []
        )

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
        const textAreaRef = useRef<HTMLDivElement>(null)
        const list = useRef<YakitImageTextareaInfoProps[]>([{type: "text", content: "", order: randomString(10)}])

        // 图片加载 loading
        const [imgLoading, setImgLoading] = useState<boolean>(false)
        const imgDom = useRef<HTMLDivElement | null>(null)
        const imgWrapperDom = useRef<HTMLDivElement | null>(null)
        const setImgActiveDom: SetImageElementFunc = useMemoizedFn((dom, wrapper) => {
            imgDom.current = dom
            imgWrapperDom.current = wrapper
        })
        // 生成图片信息
        const generateImageInfo: (image: FileItem) => Promise<TextareaForImage> = useMemoizedFn((image) => {
            return new Promise((resolve, reject) => {
                if (imgLoading) {
                    reject("")
                    return
                }
                if (!image) {
                    reject("")
                    return
                }
                if (image.size > 10 * 1024 * 1024) {
                    yakitNotify("error", "图片大小不能超过10M")
                    reject("")
                    return
                }

                setImgLoading(true)
                const render = new FileReader()
                render.onload = (e) => {
                    if (!e || !e.target) {
                        reject("")
                        return
                    }
                    let base64 = e.target.result || ""
                    const img = new Image()
                    img.onload = () => {
                        const {width, height} = img
                        resolve({base64: base64 as string, width, height})
                        setTimeout(() => {
                            setImgLoading(false)
                        }, 100)
                    }
                    img.src = URL.createObjectURL(image)
                }
                render.readAsDataURL(image)
            })
        })

        /**
         * 文本域右键粘贴时间
         * 用于识别文字内容和图片，从而进行不同处理
         */
        const handlePaste = useMemoizedFn(async (e: ClipboardEvent) => {
            e.preventDefault()
            e.stopPropagation()

            const pasteItems = e.clipboardData?.items || []
            for (let i = 0; i < pasteItems.length; i++) {
                const item = pasteItems[i]

                if (item.kind === "string" && item.type === "text/plain") {
                    // 粘贴文字内容
                    item.getAsString((str) => {
                        createElement("text", str.split("\n"))
                    })
                } else if (item.kind === "file" && item.type.indexOf("image") !== -1) {
                    // 粘贴图片
                    if (imgLoading) return
                    const image = item.getAsFile() as FileItem
                    try {
                        const imageInfo = await generateImageInfo(image)
                        createElement("image", imageInfo)
                    } catch (error) {}
                }
            }
        })

        useEffect(() => {
            const textarea = textAreaRef.current
            if (textarea) {
                textarea.addEventListener("paste", handlePaste)
                return () => {
                    textarea.removeEventListener("paste", handlePaste)
                }
            }
        }, [])

        /**
         * 监听键盘事件
         * 接管换行 Enter 按键功能
         */
        const handleKeydown = useMemoizedFn((e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.code === "Backspace") {
                const selection = window.getSelection()
                const nodes = selection?.anchorNode
                let coantgent = ""
                if (nodes && nodes.nodeType === 3) {
                    coantgent = (nodes as Text).data
                    let start = selection?.anchorOffset || 0
                    let end = selection?.focusOffset || 0
                    if (start === 0 && end === 0) return
                    let isflag = start > end
                }
                console.log("selection", selection)
            }
            if (e.code === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                createElement("div", [])
            }
        })

        /**
         * 创建一个新元素
         * @param type 创建元素类型
         * @param info 创建元素信息
         * @param isLoop 是否递归调用
         */
        const createElement = useMemoizedFn((type: CreateNewElementType, info: TextareaForImage | string[]) => {
            // 换行处理
            if (type === "div") {
                if (!textAreaRef.current) return
                generateLineBreakBody({
                    root: textAreaRef.current,
                    imageRoot: imgWrapperDom.current || undefined,
                    setImgDom: setImgActiveDom
                })
            }

            // 文字内容新生成处理
            if (type === "text") {
                if (!textAreaRef.current) return
                generateTextBody({
                    strs: info as string[],
                    root: textAreaRef.current,
                    previous: imgWrapperDom.current,
                    setImgDom: setImgActiveDom
                })
            }

            if (type === "image") {
                if (!textAreaRef.current) return
                generateImgBody({
                    info: info as TextareaForImage,
                    root: textAreaRef.current,
                    imageFocus: imgWrapperDom.current,
                    setImgDom: setImgActiveDom
                })
            }
        })
        /** ---------- 编辑内容相关 End ---------- */

        /** ----------  操作相关 Start ---------- */
        /** ---------- 操作相关 End ---------- */

        return (
            <div className={"yakit-image-textarea"}>
                {(true || !!quotaionContent) && (
                    <div className={"yakit-image-textarea-quotation"}>
                        <div className={"del-btn"} onClick={handleDelQuotation}>
                            <OutlineXIcon />
                        </div>
                        <div className={"divider-style"}></div>
                        <div className={classNames("content-style", "yakit-content-single-ellipsis")}>
                            {"回复 桔子 : 这里是审核不通过的雨爱你说这那个 v 石膏板" || quotaionContent}
                        </div>
                    </div>
                )}

                <div
                    ref={textAreaRef}
                    className={classNames("yakit-image-textarea-body", {"yakit-image-textarea-no-empty": true})}
                    suppressContentEditableWarning={true}
                    contentEditable={true}
                    spellCheck={false}
                    placeholder='如为漏洞检测插件，请填写检测站或复现流程，并粘贴复现截图，便于进行审核。该内容只有审核可见...'
                    onKeyDown={handleKeydown}
                >
                    <div
                        data-record-id={list.current[0]?.order || randomString(10)}
                        className={classNames("yakit-image-textarea-line", "yakit-image-textarea-text")}
                    >
                        <div contentEditable={true} suppressContentEditableWarning={true}>
                            <br></br>
                        </div>
                    </div>
                </div>

                <div className={"yakit-image-textarea-footer-operate"}>
                    <Upload
                        accept='image/jpeg,image/png,image/jpg,image/gif'
                        multiple={false}
                        disabled={imgLoading}
                        showUploadList={false}
                        beforeUpload={async (file: any) => {
                            if (imgLoading) return false
                            if (file.size / 1024 / 1024 > 10) {
                                failed("图片大小不超过10M")
                                return false
                            }
                            if ("image/jpeg,image/png,image/jpg,image/gif".indexOf(file.type) === -1) {
                                failed("仅支持上传图片格式为：image/jpeg,image/png,image/jpg,image/gif")
                                return false
                            }
                            if (file) {
                                try {
                                    const imageInfo = await generateImageInfo(file)
                                    createElement("image", imageInfo)
                                } catch (error) {}
                            }
                            return true
                        }}
                    >
                        <YakitButton disabled={false} icon={<OutlinePhotographIcon />} type='text2' />
                    </Upload>

                    <div className={"right-footer"}>
                        <div className={"content-length"}>{1}/150</div>
                        <YakitButton>
                            <SolidPaperairplaneIcon />
                            回复
                        </YakitButton>
                    </div>
                </div>
            </div>
        )
    })
)
