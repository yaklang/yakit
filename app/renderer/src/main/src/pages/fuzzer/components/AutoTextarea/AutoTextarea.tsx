import { useMemoizedFn } from 'ahooks'
import React, { useLayoutEffect, useRef } from 'react'
import styles from './AutoTextarea.module.scss'
import classNames from 'classnames'

interface AutoTextareaProps {
  autoSizeOnMount?: boolean
  className?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  /** React 19 下 Form.Item 会把 ref 当普通 prop 注入，需解构避免覆盖内部 textareaRef */
  ref?: React.Ref<HTMLTextAreaElement>
}
export const AutoTextarea: React.FC<AutoTextareaProps> = React.memo((props) => {
  const { onChange, className = '', autoSizeOnMount = false, ref, ...restProps } = props
  const textareaRef = useRef<any>()
  const heightRef = useRef<number>(0)
  const onChangeText = useMemoizedFn(() => {
    const { scrollHeight } = textareaRef.current
    const height = scrollHeight > 70 ? 70 : scrollHeight
    if (heightRef.current !== height) {
      heightRef.current = height
      textareaRef.current.style.setProperty('--height', `${height}px`)
    }
  })

  useLayoutEffect(() => {
    autoSizeOnMount && onChangeText()
  }, [autoSizeOnMount])

  return (
    <textarea
      rows={1}
      ref={(node) => {
        textareaRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref && typeof ref === 'object')
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
      }}
      {...restProps}
      spellCheck={false}
      className={classNames(styles['auto-textarea'], className)}
      onChange={(e) => {
        e.stopPropagation()
        onChangeText()
        if (onChange) onChange(e)
      }}
    />
  )
})
