import React, {ReactElement, useEffect, useRef, useState} from "react"
import {monaco} from "react-monaco-editor"
import ReactDOM from "react-dom"
import {editor} from "monaco-editor"
import {IMonacoEditor, NewHTTPPacketEditor, NewHTTPPacketEditorProp} from "@/utils/editors"

export interface NewEditorSelectRangeProps extends NewHTTPPacketEditorProp {
    // 编辑器点击弹窗的唯一Id
    selectId?: string
    // 点击弹窗内容
    selectNode?: (v) => ReactElement
    // 编辑器选中弹窗的唯一Id
    rangeId?: string
    // 选中弹窗内容
    rangeNode?: (v) => ReactElement
    // 超出多少行将弹窗隐藏(默认三行)
    overLine?: number
}
export const NewEditorSelectRange: React.FC<NewEditorSelectRangeProps> = (props) => {
    const {selectId, selectNode, rangeId, rangeNode, overLine = 3, onEditor, ...otherProps} = props
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const downPosY = useRef<number>()
    const upPosY = useRef<number>()
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
                domNode.onwheel = (e)=> e.stopPropagation();
                selectNode && ReactDOM.render(selectNode(closeFizzSelectWidget), domNode)
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
                domNode.onwheel = (e)=> e.stopPropagation();
                rangeNode && ReactDOM.render(rangeNode(closeFizzRangeWidget), domNode)
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
                        if (posy < downPosY.current - overHeight || posy > upPosY.current + overHeight) {
                            closeFizzRangeWidget()
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            }
        })

        // 失去焦点时触发
        reqEditor.onDidBlurEditorWidget(() => {
            // closeFizzSelectWidget()
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
            const {leftButton, rightButton, posy} = e.event
            if (leftButton) {
                upPosY.current = posy
                const selection = reqEditor.getSelection()
                if (selection) {
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
            }
            if (rightButton) {
                closeFizzRangeWidget()
                closeFizzSelectWidget()
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
