import React, {ReactElement, useEffect, useRef, useState} from "react"
import {monaco} from "react-monaco-editor"
import ReactDOM from "react-dom"
import {editor} from "monaco-editor"
import {IMonacoEditor, NewHTTPPacketEditor, NewHTTPPacketEditorProp} from "@/utils/editors"

export interface CountDirectionProps {
    x?: string
    y?: string
}

export interface EditorDetailInfoProps {
    direction: CountDirectionProps
    top: number
    bottom: number
    left: number
    right: number
    focusX: number
    focusY: number
    lineHeight: number
}

export interface NewEditorSelectRangeProps extends NewHTTPPacketEditorProp {
    // 编辑器点击弹窗的唯一Id
    selectId?: string
    // 点击弹窗内容
    selectNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement
    // 编辑器选中弹窗的唯一Id
    rangeId?: string
    // 选中弹窗内容
    rangeNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement
    // 超出多少行将弹窗隐藏(默认三行)
    overLine?: number
}
export const NewEditorSelectRange: React.FC<NewEditorSelectRangeProps> = (props) => {
    const {selectId, selectNode, rangeId, rangeNode, overLine = 3, onEditor, ...otherProps} = props
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const downPosY = useRef<number>()
    const upPosY = useRef<number>()
    // 编辑器信息(长宽等)
    const editorInfo = useRef<any>()
    useEffect(() => {
        if (reqEditor) {
            editerMenuFun(reqEditor)
        }
    }, [reqEditor])

    // 编辑器菜单
    const editerMenuFun = (reqEditor: IMonacoEditor) => {
        // 编辑器点击显示的菜单
        const fizzSelectWidget = {
            isOpen: false,
            getId: function () {
                return selectId || ""
            },
            getDomNode: function () {
                // 将TSX转换为DOM节点
                const domNode = document.createElement("div")
                // 解决弹窗内鼠标滑轮无法滚动的问题
                domNode.onwheel = (e) => e.stopPropagation()
                selectNode && ReactDOM.render(selectNode(closeFizzSelectWidget, editorInfo.current), domNode)
                return domNode
            },
            getPosition: function () {
                const currentPos = reqEditor.getPosition()
                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // 更新小部件的位置
                this.getPosition()
                reqEditor.layoutContentWidget(this)
            }
        }
        // 编辑器选中显示的菜单
        const fizzRangeWidget = {
            isOpen: false,
            getId: function () {
                return "monaco.fizz.range.widget"
            },
            getDomNode: function () {
                // 将TSX转换为DOM节点
                const domNode = document.createElement("div")
                // 解决弹窗内鼠标滑轮无法滚动的问题
                domNode.onwheel = (e) => e.stopPropagation()
                rangeNode && ReactDOM.render(rangeNode(closeFizzRangeWidget, editorInfo.current), domNode)
                return domNode
            },
            getPosition: function () {
                const currentPos = reqEditor.getPosition()

                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // 更新小部件的位置
                this.getPosition()
                reqEditor.layoutContentWidget(this)
            }
        }
        // 是否展示菜单
        // if (false) {
        //     closeFizzSelectWidget()
        //     return
        // }

        // 关闭点击的菜单
        const closeFizzSelectWidget = () => {
            fizzSelectWidget.isOpen = false
            reqEditor.removeContentWidget(fizzSelectWidget)
        }
        // 关闭选中的菜单
        const closeFizzRangeWidget = () => {
            fizzRangeWidget.isOpen = false
            reqEditor.removeContentWidget(fizzRangeWidget)
        }

        reqEditor?.getModel()?.pushEOL(editor.EndOfLineSequence.CRLF)
        reqEditor.onMouseMove((e) => {
            try {
                // const pos = e.target.position
                // if (pos?.lineNumber) {
                //     const lineOffset = pos.lineNumber - (reqEditor.getPosition()?.lineNumber || 0)
                //     // 超出范围移除菜单
                //     if (lineOffset > 2 || lineOffset < -2) {
                //         // console.log("移出两行内");
                //         closeFizzSelectWidget()
                //         closeFizzRangeWidget()
                //     }
                // }

                const {target, event} = e
                const {detail} = target
                const {posy} = event
                const lineHeight = reqEditor.getOption(monaco.editor.EditorOption.lineHeight)
                if (
                    detail !== "monaco.fizz.select.widget" &&
                    detail !== "monaco.fizz.range.widget" &&
                    downPosY.current &&
                    upPosY.current
                ) {
                    const overHeight = overLine * lineHeight
                    if (fizzSelectWidget.isOpen) {
                        if (posy < upPosY.current - overHeight || posy > upPosY.current + overHeight) {
                            closeFizzSelectWidget()
                        }
                    } else if (fizzRangeWidget.isOpen) {
                        // 从上到下的选择范围
                        if (
                            downPosY.current < upPosY.current &&
                            (posy < downPosY.current - overHeight || posy > upPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                        // 从下到上的选择范围
                        else if (
                            downPosY.current > upPosY.current &&
                            (posy < upPosY.current - overHeight || posy > downPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            }
        })

        // 移出编辑器时触发
        reqEditor.onMouseLeave(() => {
            closeFizzSelectWidget()
            closeFizzRangeWidget()
        })

        reqEditor.onMouseDown((e) => {
            const {leftButton, posy} = e.event
            // 当两者都没有打开时
            if (leftButton && !fizzSelectWidget.isOpen && !fizzRangeWidget.isOpen) {
                // 记录posy位置
                downPosY.current = posy
            }
        })

        reqEditor.onMouseUp((e) => {
            // @ts-ignore
            const {leftButton, rightButton, posx, posy, editorPos} = e.event
            // 获取编辑器所处x，y轴,并获取其长宽
            const {x, y} = editorPos
            const editorHeight = editorPos.height
            const editorWidth = editorPos.width

            // 计算焦点的坐标位置
            let a: any = reqEditor.getPosition()
            const position = reqEditor.getScrolledVisiblePosition(a)
            if (position) {
                // 获取焦点在编辑器中所处位置，height为每行所占高度（随字体大小改变）
                const {top, left, height} = position

                // 解决方法1
                // 获取焦点位置判断焦点所处于编辑器的位置（上下左右）从而决定弹出层显示方向
                // 问题  需要焦点位置进行计算 如何获取焦点位置？  目前仅找到行列号 无法定位到其具体坐标位置
                // console.log("焦点位置：", e, x, left, y, top, x + left, y + top)
                const focusX = x + left
                const focusY = y + top

                // 焦点与抬起坐标是否超出限制
                const isOver: boolean = overLine * height < Math.abs(focusY - posy)
                if (leftButton && !isOver) {
                    // 获取编辑器容器的相关信息并判断其处于编辑器的具体方位
                    const editorContainer = reqEditor.getDomNode()
                    if (editorContainer) {
                        const editorContainerInfo = editorContainer.getBoundingClientRect()
                        const {top, bottom, left, right} = editorContainerInfo
                        // 通过判断编辑器长宽限制是否显示 (宽度小于250或者长度小于200则不展示)
                        const isShowByLimit = ((right-left)>250)&&((bottom-top)>200)
                        // 判断焦点位置
                        const isTopHalf = focusY < (top + bottom) / 2
                        const isLeftHalf = focusX < (left + right) / 2
                        // 行高
                        // const lineHeight = reqEditor.getOption(monaco.editor.EditorOption.lineHeight)

                        let countDirection: CountDirectionProps = {}
                        if (isTopHalf) {
                            // 鼠标位于编辑器上半部分
                            countDirection.y = "top"
                        } else {
                            // 鼠标位于编辑器下半部分
                            countDirection.y = "bottom"
                        }
                        if (Math.abs(focusX - (left + right) / 2) < 50) {
                            // 鼠标位于编辑器中间部分
                            countDirection.x = "middle"
                        } else if (isLeftHalf) {
                            // 鼠标位于编辑器左半部分
                            countDirection.x = "left"
                        } else {
                            // 鼠标位于编辑器右半部分
                            countDirection.x = "right"
                        }
                        editorInfo.current = {
                            direction: countDirection,
                            top,
                            bottom,
                            left,
                            right,
                            focusX,
                            focusY,
                            lineHeight: height
                        }

                        upPosY.current = posy
                        const selection = reqEditor.getSelection()
                        if (selection&&isShowByLimit) {
                            const selectedText = reqEditor.getModel()?.getValueInRange(selection) || ""
                            if (fizzSelectWidget.isOpen && selectedText.length === 0) {
                                // 更新点击菜单小部件的位置
                                fizzSelectWidget.update()
                            } else if (fizzRangeWidget.isOpen && selectedText.length !== 0) {
                                fizzRangeWidget.update()
                            } else if (selectedText.length === 0) {
                                closeFizzRangeWidget()
                                // 展示点击的菜单
                                selectId && reqEditor.addContentWidget(fizzSelectWidget)
                                fizzSelectWidget.isOpen = true
                            } else {
                                closeFizzSelectWidget()
                                // 展示选中的菜单
                                rangeId && reqEditor.addContentWidget(fizzRangeWidget)
                                fizzRangeWidget.isOpen = true
                            }
                        }
                        else{
                            closeFizzRangeWidget()
                            closeFizzSelectWidget()
                        }
                    }
                }
                if (rightButton) {
                    closeFizzRangeWidget()
                    closeFizzSelectWidget()
                }
            }
        })
        // 监听光标移动
        reqEditor.onDidChangeCursorPosition((e) => {
            closeFizzRangeWidget()
            closeFizzSelectWidget()
            // const { position } = e;
            // console.log('当前光标位置：', position);
        })
    }
    return (
        <NewHTTPPacketEditor
            onEditor={(Editor: IMonacoEditor) => {
                setReqEditor(Editor)
                onEditor && onEditor(Editor)
            }}
            {...otherProps}
        />
    )
}
