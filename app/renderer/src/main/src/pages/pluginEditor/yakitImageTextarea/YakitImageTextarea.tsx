import React, {forwardRef, memo, useEffect} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitImageTextareaProps} from "./YakitImageTextareaType"
import {yakitNotify} from "@/utils/notification"
import {FileItem} from "fs"

import classNames from "classnames"
import styles from "./YakitImageTextarea.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

const {ipcRenderer} = window.require("electron")

export const YakitImageTextarea: React.FC<YakitImageTextareaProps> = memo(
    forwardRef((props, ref) => {
        const {} = props

        const handleEnlargeImage = useMemoizedFn((base64: string | ArrayBuffer, width: number, height: number) => {
            console.log("11123123", base64, width, height)
        })

        const handlePaste = useMemoizedFn(async (e: ClipboardEvent) => {
            e.preventDefault()
            e.stopPropagation()

            const pasteItems = e.clipboardData?.items || []
            for (let i = 0; i < pasteItems.length; i++) {
                const item = pasteItems[i]

                if (item.kind === "string" && item.type === "text/plain") {
                    item.getAsString((str) => {
                        document.execCommand("insertHTML", true, str)
                    })
                } else if (item.kind === "file" && item.type.indexOf("image") !== -1) {
                    const image = item.getAsFile() as FileItem
                    console.log("image", image)

                    if (!image) return
                    if (image.size >= 3 * 1024 * 1024) {
                        yakitNotify("error", "图片大小不能超过3M")
                        continue
                    }

                    const render = new FileReader()
                    render.onload = (e) => {
                        if (!e || !e.target) return
                        let base64 = e.target.result || ""
                        const img = new Image()
                        img.onload = () => {
                            const {width, height} = img
                            const maxWidth = Math.floor((width * 100) / height)
                            const maxHeight = Math.floor((height * 100) / width)

                            let style = ""
                            if (maxWidth < 100 && maxHeight < 100) {
                                if (maxWidth > maxHeight) style = `width: ${maxWidth}px; height: ${100}px`
                                else style = `width: ${100}px; height: ${maxHeight}px`
                            }
                            if (maxWidth >= 100 && maxHeight < 100) style = `width: ${100}px; height: ${maxHeight}px`
                            if (maxWidth < 100 && maxHeight >= 100) style = `width: ${maxWidth}px; height: ${100}px`

                            document.execCommand("insertHTML", true, `<img src="${base64}" style="${style}" />`)
                        }
                        img.src = URL.createObjectURL(image)
                    }
                    render.readAsDataURL(image)
                }
            }
        })

        useEffect(() => {
            const textarea = document.getElementById("yakit-image-textarea")
            if (textarea) {
                textarea.addEventListener("paste", handlePaste)
                return () => {
                    textarea.removeEventListener("paste", handlePaste)
                }
            }
        }, [])

        const handleKeyUp = useMemoizedFn((e: React.KeyboardEvent<HTMLDivElement>) => {
            e.stopPropagation()
        })
        const handleKeydown = useMemoizedFn((e: React.KeyboardEvent<HTMLDivElement>) => {
            e.stopPropagation()
        })

        const splitText = useMemoizedFn(() => {
            const textRef = document.getElementById("yakit-image-textarea")
            if (!textRef) {
                yakitNotify("error", "获取文本框失败")
                return
            }

            let strs: string[] = []
            let imgs: any[] = []
            for (let i = 0; i < textRef.childNodes.length; i++) {
                const node = textRef.childNodes[i]
                console.log("node", [node])
                if (node.nodeName === "#text") {
                    strs.push((node as any).data)
                } else if (node.nodeName === "IMG") {
                    imgs.push((node as any).currentSrc)
                } else if (node.nodeName === "DIV") {
                }
            }
        })

        return (
            <>
                <div
                    id='yakit-image-textarea'
                    className={classNames(styles["yakit-image-textarea"])}
                    contentEditable={true}
                    placeholder='如为漏洞检测插件，请填写检测站或复现流程，并粘贴复现截图，便于进行审核。该内容只有审核可见...'
                    onKeyUp={handleKeyUp}
                    onKeyDown={handleKeydown}
                ></div>
                <YakitButton onClick={splitText}>123</YakitButton>
            </>
        )
    })
)
