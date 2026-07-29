/// <reference types="react-scripts" />

declare module 'xterm/css/xterm.css'

/** 副作用导入的全局样式 */
declare module '*.css'
declare module '*.scss'

/** CSS Modules */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}
