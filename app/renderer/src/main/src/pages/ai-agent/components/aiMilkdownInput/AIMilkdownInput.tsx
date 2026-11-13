import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import React, { useEffect, useImperativeHandle } from 'react'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'
import { $remark, callCommand, getMarkdown } from '@milkdown/kit/utils'
import type { AIMilkdownInputBaseProps, AIMilkdownInputProps } from './type'
import { defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, parserCtx, rootCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { useNodeViewFactory, usePluginViewFactory } from '@prosemirror-adapter/react'
import { $view } from '@milkdown/kit/utils'
import { type Ctx } from '@milkdown/kit/ctx'
import { codeBlockSchema, commonmark, imageSchema } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import classNames from 'classnames'
import '@/components/MilkdownEditor/css/index.scss'
import styles from './AIMilkdownInput.module.scss'
import { gapCursorPlugin } from '@milkdown/kit/plugin/cursor'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { placeholderConfig, placeholderPlugin } from '@/components/MilkdownEditor/Placeholder'
import { AICustomMention, aiMentionFactory, AIMilkdownMention } from './aiMilkdownMention/AIMilkdownMention'
import { aiMentionCustomPlugin, aiMentionCustomSchema } from './aiMilkdownMention/aiMentionPlugin'
import type { AIMentionCommandParams } from './aiMilkdownMention/aiMentionPlugin'
import { IMAGE_ATTACHMENT_TITLE, insertAIMention } from './utils'
import { AIMilkdownModeSlash, aiModeSlashFactory } from './aiMilkdownModeSlash/AIMilkdownModeSlash'
import directive from 'remark-directive'
import { useMemoizedFn } from 'ahooks'
import { aiCustomPlugin } from './customPlugin'
import { customShiftEnterPlugin } from '@/components/MilkdownEditor/utils/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { upload, uploadConfig } from '@milkdown/kit/plugin/upload'
import { type Node } from '@milkdown/kit/prose/model'
import { AICustomFile } from './aiCustomFile/AICustomFile'
import { yakitNotify } from '@/utils/notification'
import useSessionId from '@/pages/ai-re-act/hooks/useSessionId'
import { MAX_ATTACHMENTS_PER_BATCH } from '../../template/type'

import { AICustomCode } from './aiCustomCode/AICustomCode'
import { showByRightContext } from '@/components/yakitUI/YakitMenu/showByRightContext'
import { AICustomResourceReference } from './aiMilkdownResourceReference/AICustomResourceReference'
import {
  aiResourceReferenceCustomPlugin,
  aiResourceReferenceCustomSchema,
} from './aiMilkdownResourceReference/aiResourceReferencePlugin'
import { AICustomCodeRef } from './aiCodeBlock/AICodeBlock'
import {
  aiCodeBlockCommand,
  aiCodeBlockCustomPlugin,
  aiCodeBlockCustomSchema,
  type AICodeBlockCommandParams,
} from './aiCodeBlock/aiCustomCodeBlockPlugin'

const remarkDirective = $remark(`remark-directive`, () => directive)

export const AIMilkdownInputBase: React.FC<AIMilkdownInputBaseProps> = React.memo(
  React.forwardRef((props, ref) => {
    const {
      readonly,
      defaultValue,
      onUpdateContent,
      onUpdateEditor,
      classNameWrapper,
      onMemfitExtra,
      filterMode,
      chatDataStoreKey,
    } = props
    const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
    const nodeViewFactory = useNodeViewFactory()
    const pluginViewFactory = usePluginViewFactory()

    const { getSession } = useSessionId()
    const { activeChat } = useAIAgentStore()
    const sessionIdRef = React.useRef<string>(activeChat?.SessionID || '') // 作为当前对话得文件路径
    useEffect(() => {
      sessionIdRef.current = activeChat?.SessionID || ''
    }, [activeChat?.SessionID])
    const chatDataStoreKeyRef = React.useRef(chatDataStoreKey)
    chatDataStoreKeyRef.current = chatDataStoreKey

    useImperativeHandle(
      ref,
      () => ({
        setMention: (v: AIMentionCommandParams) => {
          onSetMention(v)
        },
        setCodeRef: (v: AICodeBlockCommandParams) => {
          onSetCodeRef(v)
        },
        getSessionId: () => sessionIdRef.current,
      }),
      [],
    )
    const getMaterials = useMemoizedFn(() => ({ materials: props.materials, focusMode: props.focusMode }))
    const onModeChangeComplete = useMemoizedFn(() => props.onModeChangeComplete?.())
    const { get, loading } = useEditor(
      (root) => {
        const uploadPlugins = [
          upload,
          $view(imageSchema.node, () =>
            nodeViewFactory({
              component: () => (
                <AICustomFile sessionId={sessionIdRef.current} chatDataStoreKey={chatDataStoreKeyRef.current} />
              ),
            }),
          ),
          (ctx: Ctx) => () => {
            ctx.update(uploadConfig.key, (prev) => ({
              ...prev,
              uploader: async (files, schema) => {
                const images: File[] = []
                for (let i = 0; i < files.length; i++) {
                  const file = files.item(i)
                  if (!file) {
                    continue
                  }
                  // You can handle whatever the file type you want, we handle image here.
                  if (!file.type.includes('image')) {
                    continue
                  }
                  if (file.size > 1 * 1024 * 1024) {
                    yakitNotify('error', '图片大小不能超过1M')
                    continue
                  }
                  images.push(file)
                }

                if (images.length > MAX_ATTACHMENTS_PER_BATCH) {
                  yakitNotify(
                    'warning',
                    t('AIAddMaterialsPopover.attachmentLimitExceeded', {
                      count: images.length,
                      max: MAX_ATTACHMENTS_PER_BATCH,
                    }),
                  )
                  return []
                }

                const nodes: Node[] = await Promise.all(
                  images.map((image) => {
                    const src = URL.createObjectURL(image)
                    return schema.nodes.image.createAndFill({
                      src,
                      alt: image.name,
                      title: IMAGE_ATTACHMENT_TITLE,
                    }) as unknown as Node
                  }),
                )
                const session = getSession(sessionIdRef.current)
                sessionIdRef.current = session
                return nodes
              },
            }))
          },
        ].flat()
        const mentionPlugin = [
          ...aiMentionCustomPlugin(),
          aiMentionFactory,
          $view(aiMentionCustomSchema.node, () =>
            nodeViewFactory({
              component: () => <AICustomMention />,
            }),
          ),
          (ctx: Ctx) => () => {
            ctx.set(aiMentionFactory.key, {
              view: pluginViewFactory({
                component: () => (
                  <AIMilkdownMention
                    onMemfitExtra={onMemfitExtra}
                    filterMode={filterMode}
                    getMaterials={getMaterials}
                  />
                ),
              }),
            })
          },
        ].flat()
        const modeSlashPlugin = readonly
          ? []
          : [
              aiModeSlashFactory,
              (ctx: Ctx) => () => {
                ctx.set(aiModeSlashFactory.key, {
                  view: pluginViewFactory({
                    component: () => <AIMilkdownModeSlash onModeChangeComplete={onModeChangeComplete} />,
                  }),
                })
              },
            ].flat()
        const codeBlockPlugin = [
          ...aiCodeBlockCustomPlugin(),
          $view(aiCodeBlockCustomSchema.node, () =>
            nodeViewFactory({
              component: () => <AICustomCodeRef />,
            }),
          ),
        ].flat()
        const resourceReferencePlugins = [
          ...aiResourceReferenceCustomPlugin(),
          $view(aiResourceReferenceCustomSchema.node, () => nodeViewFactory({ component: AICustomResourceReference })),
        ].flat()
        const codePlugin = [
          $view(codeBlockSchema.node, () => {
            return nodeViewFactory({
              component: () => <AICustomCode />,
            })
          }),
        ].flat()
        const placeholderPrompt = t('AIMilkdownInput.placeholderPrompt')
        const placeholderHint = t('AIMilkdownInput.placeholderHint')
        const placeholder = [
          placeholderConfig,
          placeholderPlugin,
          (ctx: Ctx) => () => {
            ctx.update(placeholderConfig.key, (prev) => ({
              ...prev,
              mode: 'doc' as const,
              render: (view) => {
                const { ownerDocument } = view.dom
                const row = ownerDocument.createElement('span')
                row.className = styles['placeholder']
                row.setAttribute('aria-hidden', 'true')

                const prompt = ownerDocument.createElement('span')
                prompt.textContent = placeholderPrompt
                const mention = ownerDocument.createElement('span')
                mention.className = styles['placeholder-mention']
                mention.textContent = '@'
                const hint = ownerDocument.createElement('span')
                hint.className = styles['placeholder-hint']
                hint.textContent = placeholderHint

                row.append(prompt, mention, hint)
                return row
              },
            }))
          },
        ]

        const customPlugin = [...aiCustomPlugin()]

        return (
          Editor.make()
            .config((ctx) => {
              ctx.set(rootCtx, root)
              // 配置为只读
              ctx.set(editorViewOptionsCtx, {
                editable: () => !readonly,
                attributes: { 'aria-placeholder': `${placeholderPrompt} @ ${placeholderHint}` },
              })
              ctx.set(defaultValueCtx, defaultValue || '')

              const listener = ctx.get(listenerCtx)
              listener.markdownUpdated((_ctx, nextMarkdown, prevMarkdown) => {
                const isSave = nextMarkdown !== prevMarkdown
                if (isSave) {
                  onUpdateContent && onUpdateContent(nextMarkdown)
                }
              })
            })
            .use(remarkDirective)
            /* customShiftEnterPlugin 方法的注册顺序要先于commonmark，不然会失效，导致Shift-Enter尾部换行塌陷 */
            .use(customShiftEnterPlugin)
            .use(commonmark)
            .use(gfm)
            .use(gapCursorPlugin)
            .use(history)
            .use(clipboard)
            // placeholder
            .use(placeholder)
            // uploadPlugins
            .use(uploadPlugins)
            // listener
            .use(listener)
            // mention 提及@
            .use(mentionPlugin)
            // 模式选择 /
            .use(modeSlashPlugin)
            // HTTP 流量与漏洞风险引用
            .use(resourceReferencePlugins)
            // ```codePlugin```
            .use(codePlugin)
            // code block 代码块
            .use(codeBlockPlugin)
            // 自定义
            .use(customPlugin)
        )
      },
      [readonly, defaultValue, i18nRefresh],
    )
    useEffect(() => {
      if (loading) return
      const editor = get()
      if (editor) {
        onUpdateEditor?.(editor)
      }
    }, [loading, get])
    useEffect(() => {
      return () => {
        const value = get()?.action(getMarkdown()) || ''
        onUpdateContent && onUpdateContent(value)
      }
    }, [])

    const onSetMention = useMemoizedFn((params: AIMentionCommandParams) => {
      const editor = get()
      if (editor) insertAIMention(editor, params)
    })
    const onSetCodeRef = useMemoizedFn((params: AICodeBlockCommandParams) => {
      get()?.action(callCommand<AICodeBlockCommandParams>(aiCodeBlockCommand.key, params))
    })
    const onContextMenu = useMemoizedFn((e) => {
      e.stopPropagation()
      showByRightContext(
        {
          data: [{ label: '转为纯文本后按 Markdown 解析', key: 'pasteMarkdown' }],
          onClick: ({ key }) => {
            if (key === 'pasteMarkdown') {
              handlePasteMarkdown()
            }
          },
        },
        e.clientX,
        e.clientY,
      )
    })
    const handlePasteMarkdown = useMemoizedFn(async () => {
      const editor = get()
      if (!editor) return

      let text = ''
      try {
        text = await navigator.clipboard.readText()
      } catch (e) {
        yakitNotify('error', '读取剪贴板失败')
        return
      }

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const parser = ctx.get(parserCtx)
        const doc = parser(text)
        view.dispatch(view.state.tr.replaceSelectionWith(doc))
      })
    })
    return (
      <div className={classNames(styles['ai-milkdown-input'], classNameWrapper)} onContextMenu={onContextMenu}>
        <Milkdown />
      </div>
    )
  }),
)

export const AIMilkdownInput: React.FC<AIMilkdownInputProps> = React.memo(
  React.forwardRef((props, ref) => {
    return (
      <MilkdownProvider>
        <ProsemirrorAdapterProvider>
          <AIMilkdownInputBase {...props} ref={ref} />
        </ProsemirrorAdapterProvider>
      </MilkdownProvider>
    )
  }),
)
