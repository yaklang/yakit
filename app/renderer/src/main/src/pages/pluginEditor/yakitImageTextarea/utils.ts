import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {SetImageElementFunc, TextareaForImage} from "./YakitImageTextareaType"
import cloneDeep from "lodash/cloneDeep"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

/** 获取光标所在的 dom 对象 */
export const fetchCursorLineDom = () => {
    const selection = window.getSelection()
    if (!selection) return null
    const node = selection.anchorNode
    if (!node) return null
    return node
}
/** 判断光标所在行是什么行(换行占位|内容|图片) */
export const fetchCursorLineType = () => {
    const node = fetchCursorLineDom()
    if (!node) return null

    if (node.nodeType === Node.TEXT_NODE) {
        return "text"
    }
    if (node.nodeType === node.ELEMENT_NODE && node.nodeName === "DIV") {
        try {
            if (node.childNodes.length === 0) return null
            const child = node.childNodes[0]
            if (child.nodeType === node.ELEMENT_NODE && child.nodeName === "IMG") return "image"
            if (child.nodeType === node.ELEMENT_NODE && child.nodeName === "BR") return "br"
        } catch (error) {}
    }
    return null
}
/** 获取光标所处行的内容 */
export const fetchCursorLineContent = () => {
    const selection = window.getSelection()
    if (!selection) return [""]
    const node = selection.anchorNode
    if (!node) return [""]

    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ""
        const isStart = selection.anchorOffset <= selection.focusOffset
        const start = isStart ? selection.anchorOffset : selection.focusOffset
        const end = isStart ? selection.focusOffset : selection.anchorOffset
        return [text.slice(0, start), text.slice(end)]
    } else {
        return [""]
    }
}
/** 移动光标到传入元素,isStart: 光标是否放到开头 */
const MoveCursorToLine = (element: Node, isStart?: boolean) => {
    if (!element) return

    const range = document.createRange()
    const selection = window.getSelection()
    if (!selection) return

    range.selectNodeContents(element)
    range.collapse(!!isStart)
    selection.removeAllRanges()
    selection.addRange(range)
}

/**
 * 将传入元素放到指定元素的前后
 * @param element 要插入的元素
 * @param target 目标元素
 * @param isEnd 是否放到目标元素后面
 */
const insertFrontOrEnd = (element: Element, target: Element, isEnd?: boolean) => {
    let position: InsertPosition = isEnd ? "afterend" : "beforebegin"
    target.insertAdjacentElement(position, element)
}
/**
 * 将传入元素放到指定元素的前后
 * @param root 所有元素的父元素
 * @param element 要插入的元素
 * @param target 目标元素
 * @param isEnd 是否放到目标元素后面
 */
const insertFrontOrEndForFragment = (root: Element, element: DocumentFragment, target: Element, isEnd?: boolean) => {
    const targetDom = isEnd ? target.nextElementSibling : target
    if (!targetDom) return
    root.insertBefore(element, targetDom)
}
/** 移除选中图片时的样式类 */
const removeImageElementClass = (root: HTMLDivElement) => {
    const els = root.getElementsByClassName("image-actve")
    const elsArr = Array.from(els)
    elsArr.forEach((element) => {
        element.classList.remove("image-actve")
    })
}

/** 往传入元素后面插入一个换行内容的元素，并聚焦光标位置到换行内容上 */
const insertWrapAndCursor = (element: Element) => {
    const {line, text} = generateNewBR()
    if (!line || !text) return
    insertFrontOrEnd(line, element, true)
    MoveCursorToLine(text)
}

/** ---------- 生成换行元素 Start ---------- */
interface GenerateLineBreakBodyParams {
    root: HTMLDivElement
    imageRoot?: HTMLDivElement
    setImgDom?: SetImageElementFunc
}
/**
 * @name 在光标下方生成一行换行元素
 */
export const generateLineBreakBody = (params: GenerateLineBreakBodyParams) => {
    const {root, imageRoot, setImgDom} = params
    if (!!imageRoot) {
        // 图片换行
        insertWrapAndCursor(imageRoot)
        removeImageElementClass(root)
        if (setImgDom) setImgDom(null, null)
        return
    } else {
        // 换行所在行换行
        const type = fetchCursorLineType()
        if (!type) return

        if (type === "br") {
            const node = fetchCursorLineDom() as HTMLDivElement | null
            const parent = node?.parentNode as HTMLDivElement | undefined
            if (!parent) return
            insertWrapAndCursor(parent)
            return
        }
        if (type === "text") {
            const contents = fetchCursorLineContent()
            if (contents.length === 0 || contents.length === 1) return
            const start = contents[0]
            const end = contents[1]

            const node = fetchCursorLineDom() as HTMLDivElement | null
            const parent = node?.parentNode as HTMLDivElement | undefined
            if (!parent) return
            const line = parent.parentNode as HTMLDivElement | null
            if (!line) return
            // 原始行内容
            if (start) parent.textContent = start
            else parent.innerHTML = "<br>"
            // 新增换行内容
            const {line: wrapper, text} = end ? generateNewText(end) : generateNewBR()
            if (!wrapper || !text) return
            insertFrontOrEnd(wrapper, line, true)
            MoveCursorToLine(text, true)
            return
        }
    }
}
/** ---------- 生成换行元素 End ---------- */

/** ---------- 生成文本内容元素 Start ---------- */
interface GenerateTextBodyParams {
    strs: string[]
    root: HTMLDivElement
    previous: HTMLDivElement | null
    setImgDom?: SetImageElementFunc
}
/**
 * @name 根据传入的文本内容数组数据，生成一段或多段可编辑的文本元素
 * @description 传入的文本内容数组数据，最后一个子元素不能是空
 */
export const generateTextBody = (params: GenerateTextBodyParams) => {
    const {strs, root, previous, setImgDom} = params
    console.log("strs", strs)
    const filterArr = strs.filter((item) => !!item)
    // 全是换行的内容不进行增加
    if (filterArr.length === 0) return

    // 判断是否用文字内容覆盖图片
    let isImage: boolean = false
    if (!!previous) {
        isImage = previous.classList.contains("image-actve")
    }

    // 生成新的内容片段
    const newArr = document.createDocumentFragment()
    let lastLine: HTMLDivElement | null = null
    let lastText: Node | null = null
    for (let i = 0; i < strs.length; i++) {
        const {line: elWrapper, text: elText} = strs[i] ? generateNewText(strs[i]) : generateNewBR()
        if (!elWrapper || !elText) continue
        newArr.appendChild(elWrapper)
        if (i === strs.length - 1) {
            lastLine = elWrapper
            lastText = elText
        }
    }

    try {
        if (isImage) {
            // 如果是图片元素上生成文本
            if (!previous) return
            insertFrontOrEndForFragment(root, newArr, previous, true)
            // root.removeChild(previous)
            if (lastText) MoveCursorToLine(lastText)
            removeImageElementClass(root)
            if (setImgDom) setImgDom(null, null)
            return
        } else {
            // 非图片元素上生成文本内容
            const type = fetchCursorLineType()
            if (!type) return
            if (type === "br") {
                const node = fetchCursorLineDom() as HTMLDivElement | null
                if (!node) return
                const parent = node?.parentNode as HTMLDivElement | undefined
                if (!parent) return
                insertFrontOrEndForFragment(root, newArr, parent)
                root.removeChild(parent)
                if (lastText) MoveCursorToLine(lastText)
                return
            }
            if (type === "text") {
                const node = fetchCursorLineDom() as HTMLDivElement | null
                const parent = node?.parentNode as HTMLDivElement | undefined
                if (!parent) return
                const line = parent.parentNode as HTMLDivElement | null
                if (!line) return

                if (strs.length === 1) {
                    const selection = window.getSelection()
                    if (!selection) return
                    const range = selection.getRangeAt(0)
                    const textNode = document.createTextNode(strs[0])
                    range.deleteContents() // 删除当前选中的内容
                    range.insertNode(textNode) // 插入粘贴的文本
                    range.setStartAfter(textNode)
                    range.setEndAfter(textNode)
                    selection.removeAllRanges()
                    selection.addRange(range)
                } else {
                    const contents = fetchCursorLineContent()
                    if (contents.length === 0 || contents.length === 1) return
                    const start = contents[0]
                    const end = contents[1]

                    // 原始行内容
                    if (start) {
                        parent.textContent = start
                        insertFrontOrEndForFragment(root, newArr, line, true)
                    } else {
                        insertFrontOrEndForFragment(root, newArr, line)
                        root.removeChild(line)
                    }

                    const {line: wrapper, text} = end ? generateNewText(end) : generateNewBR()
                    if (!wrapper || !text) return
                    if (lastLine) insertFrontOrEnd(wrapper, lastLine, true)
                    MoveCursorToLine(text)
                }
                return
            }
        }
    } catch (error) {}
}
// 生成新元素-文本
const generateNewText = (content: string) => {
    try {
        const wrapperDiv = document.createElement("div")
        wrapperDiv.setAttribute("data-record-id", randomString(10))
        wrapperDiv.setAttribute("class", "yakit-image-textarea-line yakit-image-textarea-text")

        const newDiv = document.createElement("div")
        newDiv.textContent = content
        newDiv.setAttribute("contentEditable", "true")
        wrapperDiv.appendChild(newDiv)

        const text = newDiv.childNodes[0]
        return {line: wrapperDiv, text: text || null}
    } catch (error) {
        return {}
    }
}
// 生成新元素-换行
const generateNewBR = () => {
    try {
        const wrapperDiv = document.createElement("div")
        wrapperDiv.setAttribute("data-record-id", randomString(10))
        wrapperDiv.setAttribute("class", "yakit-image-textarea-line yakit-image-textarea-text")

        const newDiv = document.createElement("div")
        newDiv.innerHTML = "<br>"
        newDiv.setAttribute("contentEditable", "true")
        wrapperDiv.appendChild(newDiv)
        return {line: wrapperDiv, text: newDiv}
    } catch (error) {
        return {}
    }
}
/** ---------- 生成文本内容元素 End ---------- */

/** ---------- 生成图片内容元素 Start ---------- */
interface GenerateImgBodyParams {
    info: TextareaForImage
    root: HTMLDivElement
    /** 是否在图片聚焦时生成新图片元素 */
    imageFocus: HTMLDivElement | null
    setImgDom?: SetImageElementFunc
}
/**
 * @name 生成一个图片元素，不可编辑，通过点击第一次聚焦，聚焦后再次点击可方法查看
 */
export const generateImgBody = (params: GenerateImgBodyParams) => {
    const {root, imageFocus, setImgDom} = params
    let {line: wrapperImage, image} = generateNewImage(params)
    if (!wrapperImage || !image) return

    // 在图片聚焦上生成新图片元素
    if (!!imageFocus) {
        root.replaceChild(wrapperImage, imageFocus)
        if (setImgDom) setImgDom(null, null)
        insertWrapAndCursor(wrapperImage)
        return
    }

    const type = fetchCursorLineType()
    if (!type) return
    if (type === "br") {
        const node = fetchCursorLineDom() as HTMLDivElement | null
        if (!node) return
        const parent = node?.parentNode as HTMLDivElement | undefined
        if (!parent) return
        insertFrontOrEnd(wrapperImage, parent)
        MoveCursorToLine(node)
        return
    }
    if (type === "text") {
        const contents = fetchCursorLineContent()
        if (contents.length === 0 || contents.length === 1) return
        const start = contents[0]
        const end = contents[1]

        const node = fetchCursorLineDom() as HTMLDivElement | null
        const parent = node?.parentNode as HTMLDivElement | undefined
        if (!parent) return
        const line = parent.parentNode as HTMLDivElement | null
        if (!line) return

        // 把当行全部内容换成图片
        if (!start && !end) {
            root.replaceChild(wrapperImage, line)
            insertWrapAndCursor(wrapperImage)
            return
        }

        if (!start) {
            root.replaceChild(wrapperImage, line)
        } else {
            parent.textContent = start
            insertFrontOrEnd(wrapperImage, line, true)
        }
        const {line: textLine, text} = end ? generateNewText(end) : generateNewBR()
        if (!textLine || !text) return
        insertFrontOrEnd(textLine, wrapperImage, true)
        MoveCursorToLine(text, true)
        return
    }
}
// 生成新元素-图片
const generateNewImage = (params: GenerateImgBodyParams) => {
    const {info, root, setImgDom} = params
    const {base64, width, height} = info
    const isVer = width < height

    try {
        let wrapperDiv = document.createElement("div")
        wrapperDiv.setAttribute("data-record-id", randomString(10))
        wrapperDiv.setAttribute("data-image-width", `${width}`)
        wrapperDiv.setAttribute("data-image-height", `${height}`)
        wrapperDiv.setAttribute(
            "class",
            `${classNames("yakit-image-textarea-line", "yakit-image-textarea-image", {
                "vertical-image": isVer,
                "horizontal-image": !isVer
            })}`
        )

        const newDiv = document.createElement("div")
        newDiv.setAttribute("contentEditable", "false")
        newDiv.setAttribute("class", "image-body")
        newDiv.onclick = (e) => {
            removeImageElementClass(root)
            if (!newDiv.classList.contains("image-actve")) {
                newDiv.classList.add("image-actve")
            }
            if (setImgDom) setImgDom(newDiv, wrapperDiv)
        }
        wrapperDiv.appendChild(newDiv)

        const img = document.createElement("img")
        img.src = base64
        if (isVer) img.style.maxHeight = "100%"
        else img.style.maxWidth = "100%"
        newDiv.appendChild(img)

        return {line: wrapperDiv, image: newDiv}
    } catch (error) {
        return {}
    }
}
/** ---------- 生成图片内容元素 End ---------- */

export interface UploadBase64ImgInfo {
    base64: string
    type: string
}
/** @name 上传图片(base64) */
export const uploadBase64ImgToUrl: APIFunc<UploadBase64ImgInfo, string> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("upload-base64-img", request)
            .then((res) => {
                if (res?.code === 200 && res?.data) {
                    resolve(res.data)
                } else {
                    const message = res?.message || "未知错误"
                    if (!hiddenError) yakitNotify("error", "上传图片失败:" + message)
                    reject(message)
                }
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "上传图片失败:" + e)
                reject(e)
            })
    })
}
