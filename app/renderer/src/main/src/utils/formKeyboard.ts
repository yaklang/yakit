import type { KeyboardEvent } from 'react'

/** 在控件处理回车后阻止输入框隐式提交，保留文本域换行和按钮键盘操作。 */
export const preventImplicitFormSubmit = (event: KeyboardEvent<HTMLFormElement>) => {
  if (
    event.key === 'Enter' &&
    !event.nativeEvent.isComposing &&
    event.nativeEvent.keyCode !== 229 &&
    event.target instanceof HTMLInputElement &&
    !['button', 'submit', 'reset'].includes(event.target.type)
  ) {
    event.preventDefault()
  }
}
