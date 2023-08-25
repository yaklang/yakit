import React, { CSSProperties, ReactNode } from "react"

/**
 * @description Csrd
 * @property {ReactNode} extra 头部extra
 * @property {ReactNode} title 
 * @property {boolean}  bordered 是否有边框 
 * @property {CSSProperties}  headStyle  
 * @property {CSSProperties}  bodyStyle  
 * @property {CSSProperties}  style  
 * @property {string}  className  
 * @property {string}  headClassName  
 * @property {string}  bodyClassName  
 */
export interface YakitCardProps {
    extra?: ReactNode
    title?: ReactNode
    bordered?: boolean
    headStyle?: CSSProperties
    bodyStyle?: CSSProperties
    style?: CSSProperties
    className?: string
    headClassName?: string
    bodyClassName?: string
    children?: ReactNode
}