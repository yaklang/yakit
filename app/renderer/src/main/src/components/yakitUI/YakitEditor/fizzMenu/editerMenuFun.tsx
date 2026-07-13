import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import { monaco } from 'react-monaco-editor'
import { editor as newEditor } from 'monaco-editor'
import { createRoot } from 'react-dom/client'
import { QueryFuzzerLabelResponseProps } from '@/pages/fuzzer/StringFuzzer'
import {
  CountDirectionProps,
  HTTPFuzzerClickEditorMenu,
  HTTPFuzzerRangeEditorMenu,
  HTTPFuzzerRangeReadOnlyEditorMenu,
} from '@/pages/fuzzer/HTTPFuzzerEditorMenu'
import { insertFileFuzzTag, insertTemporaryFileFuzzTag } from '@/pages/fuzzer/InsertFileFuzzTag'
import { monacoEditorWrite } from '@/pages/fuzzer/fuzzerTemplates'
import { onInsertYakFuzzer, showDictsAndSelect } from '@/pages/fuzzer/HTTPFuzzerPage'
import emiter from '@/utils/eventBus/eventBus'
import { EditorDetailInfoProps } from '@/pages/fuzzer/HTTPFuzzerEditorMenu'
import { YakParamProps } from '@/pages/plugins/pluginsType'
import { YakitIMonacoEditor } from '../YakitEditorType'

const { ipcRenderer } = window.require('electron')

export interface EditerMenuFunParams {
  editor: YakitIMonacoEditor
  selectNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => React.ReactElement
  rangeNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => React.ReactElement
  readOnly: boolean
  value?: string
  overLine: number
  getShowActionBar: () => boolean
  execAutoDecodeCallback?: () => void
  /** 编辑器信息 ref（长宽等） */
  editorInfoRef: React.MutableRefObject<any>
  /** 定时消失的定时器 */
  fizzSelectTimeoutIdRef: React.MutableRefObject<NodeJS.Timeout | undefined>
  fizzRangeTimeoutIdRef: React.MutableRefObject<NodeJS.Timeout | undefined>
  /** 鼠标位置记录 refs */
  downPosYRef: React.MutableRefObject<number | undefined>
  upPosYRef: React.MutableRefObject<number | undefined>
  onScrollTopRef: React.MutableRefObject<number | undefined>
}

/**
 * 编辑器内点击/选中浮层菜单
 *
 * 包含：
 * 1. 点击菜单（插入标签）
 * 2. 选中菜单（编/解码）
 * 3. 鼠标移动/点击/滚动事件绑定
 * 4. 浮层位置计算与显示/隐藏
 */
export const editerMenuFun = (params: EditerMenuFunParams) => {
  const {
    editor,
    selectNode,
    rangeNode,
    readOnly,
    value,
    overLine,
    getShowActionBar,
    execAutoDecodeCallback,
    editorInfoRef,
    fizzSelectTimeoutIdRef,
    fizzRangeTimeoutIdRef,
    downPosYRef,
    upPosYRef,
    onScrollTopRef,
  } = params

  // 编辑器点击弹窗的唯一Id
  const selectId: string = `monaco.fizz.select.widget-${uuidv4()}`
  // 编辑器选中弹窗的唯一Id
  const rangeId: string = `monaco.fizz.range.widget-${uuidv4()}`

  // 插入标签
  const insertLabelFun = (v: QueryFuzzerLabelResponseProps) => {
    if (v.Label) {
      editor && editor.trigger('keyboard', 'type', { text: v.Label })
    } else if (v.DefaultDescription === '插入文件-fixed') {
      editor && insertFileFuzzTag((i) => monacoEditorWrite(editor, i), 'file:line')
    } else if (v.DefaultDescription === '插入字典-fixed') {
      editor &&
        showDictsAndSelect((i) => {
          monacoEditorWrite(editor, i, editor.getSelection())
        })
    } else if (v.DefaultDescription === '插入临时字典-fixed') {
      editor && insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
    }
  }

  const toOpenAiChat = (scriptName: string, params?: YakParamProps[]) => {
    if (scriptName === 'aiplugin-Get*plug-in') {
      emiter.emit('onOpenFuzzerModal', JSON.stringify({ scriptName, isAiPlugin: 'isGetPlugin' }))
      closeFizzRangeWidget()
      return
    }

    if (editor) {
      const selectedText = editor.getModel()?.getValueInRange(editor.getSelection() as any) || value
      emiter.emit(
        'onOpenFuzzerModal',
        JSON.stringify({ text: selectedText, scriptName, isAiPlugin: true, params, isExec: false }),
      )
      closeFizzRangeWidget()
    }
  }

  // 关闭点击的菜单
  const closeFizzSelectWidget = () => {
    fizzSelectWidget.isOpen = false
    fizzSelectTimeoutIdRef.current && clearTimeout(fizzSelectTimeoutIdRef.current)
    editor.removeContentWidget(fizzSelectWidget)
  }
  // 关闭选中的菜单
  const closeFizzRangeWidget = () => {
    fizzRangeWidget.isOpen = false
    fizzRangeTimeoutIdRef.current && clearTimeout(fizzRangeTimeoutIdRef.current)
    editor.removeContentWidget(fizzRangeWidget)
  }

  // 编辑器点击显示的菜单
  const fizzSelectWidget = {
    isOpen: false,
    getId: function () {
      return selectId
    },
    getDomNode: function () {
      // 将TSX转换为DOM节点
      const domNode = document.createElement('div')
      // 解决弹窗内鼠标滑轮无法滚动的问题
      domNode.onwheel = (e) => e.stopPropagation()
      if (selectNode) {
        createRoot(domNode).render(selectNode(closeFizzSelectWidget, editorInfoRef.current))
      } else {
        createRoot(domNode).render(
          <HTTPFuzzerClickEditorMenu
            editorInfo={editorInfoRef.current}
            close={() => closeFizzSelectWidget()}
            fizzSelectTimeoutId={fizzSelectTimeoutIdRef}
            toOpenAiChat={toOpenAiChat}
            insert={(v: QueryFuzzerLabelResponseProps) => {
              insertLabelFun(v)
              closeFizzSelectWidget()
            }}
            addLabel={() => {
              closeFizzSelectWidget()
              onInsertYakFuzzer(editor)
            }}
          />,
        )
      }
      return domNode
    },
    getPosition: function () {
      const currentPos = editor.getPosition()
      return {
        position: {
          lineNumber: currentPos?.lineNumber || 0,
          column: currentPos?.column || 0,
        },
        preference: [1, 2],
      }
    },
    update: function () {
      // 更新小部件的位置
      this.getPosition()
      editor.layoutContentWidget(this)
    },
  }

  // 编辑器选中显示的菜单
  const fizzRangeWidget = {
    isOpen: false,
    getId: function () {
      return rangeId
    },
    getDomNode: function () {
      // 将TSX转换为DOM节点
      const domNode = document.createElement('div')
      // 解决弹窗内鼠标滑轮无法滚动的问题
      domNode.onwheel = (e) => e.stopPropagation()
      if (rangeNode) {
        createRoot(domNode).render(rangeNode(closeFizzRangeWidget, editorInfoRef.current))
      } else {
        readOnly
          ? createRoot(domNode).render(
              <HTTPFuzzerRangeReadOnlyEditorMenu
                editorInfo={editorInfoRef.current}
                rangeValue={(editor && editor.getModel()?.getValueInRange(editor.getSelection() as any)) || ''}
                close={() => closeFizzRangeWidget()}
                fizzRangeTimeoutId={fizzRangeTimeoutIdRef}
                execAutoDecodeCallback={execAutoDecodeCallback}
              />,
            )
          : createRoot(domNode).render(
              <HTTPFuzzerRangeEditorMenu
                editorInfo={editorInfoRef.current}
                close={() => closeFizzRangeWidget()}
                insert={(fun: any) => {
                  if (editor) {
                    const selectedText = editor.getModel()?.getValueInRange(editor.getSelection() as any) || ''
                    if (selectedText.length > 0) {
                      ipcRenderer.invoke('QueryFuzzerLabel').then((data: { Data: QueryFuzzerLabelResponseProps[] }) => {
                        const { Data } = data
                        let newSelectedText: string = selectedText
                        if (Array.isArray(Data) && Data.length > 0) {
                          // 选中项是否存在于标签中
                          let isHave: boolean = Data.map((item) => item.Label).includes(selectedText)
                          if (isHave) {
                            newSelectedText = selectedText.replace(/{{|}}/g, '')
                          }
                        }
                        const text: string = fun(newSelectedText)
                        //   editor.trigger("keyboard", "type", {text})// 选择范围大会卡死
                        monacoEditorWrite(editor, text)
                      })
                    }
                  }
                }}
                replace={(text: string) => {
                  if (editor) {
                    editor.trigger('keyboard', 'paste', { text })
                    closeFizzRangeWidget()
                  }
                }}
                toOpenAiChat={toOpenAiChat}
                rangeValue={(editor && editor.getModel()?.getValueInRange(editor.getSelection() as any)) || ''}
                fizzRangeTimeoutId={fizzRangeTimeoutIdRef}
                hTTPFuzzerClickEditorMenuProps={
                  readOnly
                    ? undefined
                    : {
                        editorInfo: editorInfoRef.current,
                        close: () => closeFizzRangeWidget(),
                        insert: (v: QueryFuzzerLabelResponseProps) => {
                          insertLabelFun(v)
                          closeFizzRangeWidget()
                        },
                        addLabel: () => {
                          closeFizzRangeWidget()
                          onInsertYakFuzzer(editor)
                        },
                      }
                }
              />,
            )
      }
      return domNode
    },
    getPosition: function () {
      const currentPos = editor.getPosition()

      return {
        position: {
          lineNumber: currentPos?.lineNumber || 0,
          column: currentPos?.column || 0,
        },
        preference: [2, 1],
      }
    },
    update: function () {
      // 更新小部件的位置
      this.getPosition()
      editor.layoutContentWidget(this)
    },
  }

  // 编辑器更新 关闭之前展示
  closeFizzSelectWidget()
  closeFizzRangeWidget()

  editor?.getModel()?.pushEOL(newEditor.EndOfLineSequence.CRLF)
  editor.onMouseMove((e) => {
    try {
      // const pos = e.target.position
      // if (pos?.lineNumber) {
      //     const lineOffset = pos.lineNumber - (editor.getPosition()?.lineNumber || 0)
      //     // 超出范围移除菜单
      //     if (lineOffset > 2 || lineOffset < -2) {
      //         // console.log("移出两行内");
      //         closeFizzSelectWidget()
      //         closeFizzRangeWidget()
      //     }
      // }

      const { target, event } = e
      const { posy } = event
      const detail =
        target.type === newEditor.MouseTargetType.CONTENT_WIDGET ||
        target.type === newEditor.MouseTargetType.OVERLAY_WIDGET
          ? target.detail
          : undefined
      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
      if (detail !== selectId && detail !== rangeId && downPosYRef.current && upPosYRef.current) {
        const overHeight = overLine * lineHeight
        if (fizzSelectWidget.isOpen) {
          if (posy < upPosYRef.current - overHeight || posy > upPosYRef.current + overHeight) {
            closeFizzSelectWidget()
          }
        } else if (fizzRangeWidget.isOpen) {
          // 从上到下的选择范围
          if (
            downPosYRef.current < upPosYRef.current &&
            (posy < downPosYRef.current - overHeight || posy > upPosYRef.current + overHeight)
          ) {
            closeFizzRangeWidget()
          }
          // 从下到上的选择范围
          else if (
            downPosYRef.current > upPosYRef.current &&
            (posy < upPosYRef.current - overHeight || posy > downPosYRef.current + overHeight)
          ) {
            closeFizzRangeWidget()
          }
        }
      }
    } catch (e) {}
  })

  // 移出编辑器时触发
  // editor.onMouseLeave(() => {
  //     closeFizzSelectWidget()
  //     closeFizzRangeWidget()
  // })

  editor.onMouseDown((e) => {
    const { leftButton, posy } = e.event
    // 当两者都没有打开时
    if (leftButton && !fizzSelectWidget.isOpen && !fizzRangeWidget.isOpen) {
      // 记录posy位置
      downPosYRef.current = posy
    }
  })

  editor.onMouseUp((e) => {
    // @ts-ignore
    const { leftButton, rightButton, posy, editorPos } = e.event
    // 获取编辑器所处x，y轴,并获取其长宽
    const { x, y } = editorPos

    // 计算焦点的坐标位置
    let a: monaco.Position | null = editor.getPosition()
    if (!a) return
    const position = editor.getScrolledVisiblePosition(a)
    if (position) {
      // 获取焦点在编辑器中所处位置，height为每行所占高度（随字体大小改变）
      const { top, left, height } = position

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
        const editorContainer = editor.getDomNode()
        if (editorContainer) {
          const editorContainerInfo = editorContainer.getBoundingClientRect()
          const { top, bottom, left, right } = editorContainerInfo
          // 通过判断编辑器长宽限制是否显示 (宽度小于250或者长度小于200则不展示)
          const isShowByLimit = right - left > 250 && bottom - top > 200
          // 判断焦点位置
          const isTopHalf = focusY < (top + bottom) / 2
          const isLeftHalf = focusX < (left + right) / 2
          // 行高
          // const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)

          let countDirection: CountDirectionProps = {}
          if (isTopHalf) {
            // 鼠标位于编辑器上半部分
            countDirection.y = 'top'
          } else {
            // 鼠标位于编辑器下半部分
            countDirection.y = 'bottom'
          }
          if (Math.abs(focusX - (left + right) / 2) < 50) {
            // 鼠标位于编辑器中间部分
            countDirection.x = 'middle'
          } else if (isLeftHalf) {
            // 鼠标位于编辑器左半部分
            countDirection.x = 'left'
          } else {
            // 鼠标位于编辑器右半部分
            countDirection.x = 'right'
          }

          editorInfoRef.current = {
            direction: countDirection,
            top,
            bottom,
            left,
            right,
            focusX,
            focusY,
            lineHeight: height,
            scrollTop: onScrollTopRef.current,
          }

          upPosYRef.current = posy
          const selection = editor.getSelection()
          if (selection && isShowByLimit) {
            const selectedText = editor.getModel()?.getValueInRange(selection) || ''
            if (fizzSelectWidget.isOpen && selectedText.length === 0) {
              // 更新点击菜单小部件的位置
              fizzSelectWidget.update()
            } else if (fizzRangeWidget.isOpen && selectedText.length !== 0) {
              fizzRangeWidget.update()
            } else if (selectedText.length === 0) {
              if (!readOnly && getShowActionBar()) {
                closeFizzRangeWidget()
                // 展示点击的菜单
                selectId && editor.addContentWidget(fizzSelectWidget)
                fizzSelectWidget.isOpen = true
              }
            } else {
              closeFizzSelectWidget()
              if (getShowActionBar()) {
                // 展示选中的菜单
                rangeId && editor.addContentWidget(fizzRangeWidget)
                fizzRangeWidget.isOpen = true
              }
            }
          } else {
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
  editor.onDidScrollChange((e) => {
    const { scrollTop } = e
    onScrollTopRef.current = scrollTop
  })

  // 监听光标移动
  editor.onDidChangeCursorPosition((e) => {
    closeFizzRangeWidget()
    closeFizzSelectWidget()
    // const { position } = e;
    // console.log('当前光标位置：', position);
  })
}
