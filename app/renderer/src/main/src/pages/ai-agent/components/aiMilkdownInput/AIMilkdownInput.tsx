import React, { useEffect, useImperativeHandle } from 'react'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'
import { $remark, callCommand, getMarkdown } from '@milkdown/kit/utils'
import { AIMilkdownInputBaseProps, AIMilkdownInputProps } from './type'
import { defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { useNodeViewFactory, usePluginViewFactory } from '@prosemirror-adapter/react'
import { $view } from '@milkdown/kit/utils'
import { Ctx } from '@milkdown/kit/ctx'
import { codeBlockSchema, commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import classNames from 'classnames'
import styles from './AIMilkdownInput.module.scss'
import { gapCursorPlugin } from '@milkdown/kit/plugin/cursor'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { placeholderConfig, placeholderPlugin } from '@/components/MilkdownEditor/Placeholder'
import { AICustomMention, aiMentionFactory, AIMilkdownMention } from './aiMilkdownMention/AIMilkdownMention'
import {
  aiMentionCommand,
  AIMentionCommandParams,
  aiMentionCustomPlugin,
  aiMentionCustomSchema,
} from './aiMilkdownMention/aiMentionPlugin'
import directive from 'remark-directive'
import { useMemoizedFn } from 'ahooks'
import { aiCustomPlugin } from './customPlugin'
import { customShiftEnterPlugin } from '@/components/MilkdownEditor/utils/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import { AICustomCode } from './aiCustomCode/AICustomCode'

const remarkDirective = $remark(`remark-directive`, () => directive)

export const AIMilkdownInputBase: React.FC<AIMilkdownInputBaseProps> = React.memo(
  React.forwardRef((props, ref) => {
    const { readonly, defaultValue, onUpdateContent, onUpdateEditor, classNameWrapper, onMemfitExtra, filterMode } =
      props
    const { t, i18n } = useI18nNamespaces(['aiAgent'])
    const nodeViewFactory = useNodeViewFactory()
    const pluginViewFactory = usePluginViewFactory()
    useImperativeHandle(
      ref,
      () => ({
        setMention: (v: AIMentionCommandParams) => {
          onSetMention(v)
        },
      }),
      [],
    )
    const { get, loading } = useEditor(
      (root) => {
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
                component: () => <AIMilkdownMention onMemfitExtra={onMemfitExtra} filterMode={filterMode} />,
              }),
            })
          },
        ].flat()
        const codePlugin = [
          $view(codeBlockSchema.node, () => {
            return nodeViewFactory({
              component: () => <AICustomCode />,
            })
          }),
        ].flat()
        const placeholder = [
          placeholderConfig,
          placeholderPlugin,
          (ctx: Ctx) => () => {
            ctx.update(placeholderConfig.key, (prev) => ({
              ...prev,
              text: t('AIMilkdownInput.placeholder'),
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
              })
              ctx.set(defaultValueCtx, defaultValue || '')

              const listener = ctx.get(listenerCtx)
              listener.markdownUpdated((ctx, nextMarkdown, prevMarkdown) => {
                const isSave = nextMarkdown !== prevMarkdown
                if (isSave) {
                  onUpdateContent && onUpdateContent(nextMarkdown)
                }
              })
            })
            .use(remarkDirective)
            /** customShiftEnterPlugin 方法的注册顺序要先于commonmark，不然会失效，导致Shift-Enter尾部换行塌陷 */
            .use(customShiftEnterPlugin)
            .use(commonmark)
            .use(gfm)
            .use(gapCursorPlugin)
            .use(history)
            .use(clipboard)
            // placeholder
            .use(placeholder)
            // listener
            .use(listener)
            // mention 提及@
            .use(mentionPlugin)
            // ```codePlugin```
            .use(codePlugin)
            // 自定义
            .use(customPlugin)
        )
      },
      [readonly, defaultValue, i18n.language],
    )
    useEffect(() => {
      if (loading) return
      const editor = get()
      if (editor) {
        onUpdateEditor?.(editor)
      }
      const handlePaste = (e: Event) => {
        const clipboardEvent = e as ClipboardEvent
        const clipboardData = clipboardEvent.clipboardData
        if (clipboardData?.types.includes('Files')) {
          clipboardEvent.preventDefault()
        }
      }
      editor?.action((ctx) => {
        // 简单阻止所有文件粘贴
        ctx.get(editorViewCtx).dom.addEventListener('paste', handlePaste)
      })
      return () => {
        editor?.action((ctx) => {
          const dom = ctx.get(editorViewCtx)?.dom
          if (dom) {
            dom.removeEventListener('paste', handlePaste)
          }
        })
      }
    }, [loading, get])
    useEffect(() => {
      return () => {
        const value = get()?.action(getMarkdown()) || ''
        onUpdateContent && onUpdateContent(value)
      }
    }, [])

    const onSetMention = useMemoizedFn((params: AIMentionCommandParams) => {
      get()?.action(callCommand<AIMentionCommandParams>(aiMentionCommand.key, params))
    })
    return (
      <div className={classNames(styles['ai-milkdown-input'], classNameWrapper)}>
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
