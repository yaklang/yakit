import mitt from "mitt"
import {MitmEventProps} from "./events/mitm"
import {WebFuzzerEventProps} from "./events/webFuzzer"
import {SimpleDetectEventProps} from "./events/simpleDetect";
import {EditorEventProps} from "./events/editor";

type Contrast<T extends object, E extends object> = [keyof T & keyof E] extends [never] ? never : string
type OneToArr<T extends object, E extends object[]> = E extends [infer X extends object, ...infer Y extends object[]]
    ? [Contrast<T, X>] extends [never]
        ? OneToArr<T, Y>
        : string
    : number
type ArrContrast<E extends object[]> = E extends [infer X extends object, ...infer Y extends object[]]
    ? OneToArr<X, Y> extends number
        ? ArrContrast<Y>
        : string
    : number
type Exchange<T> = T extends number ? boolean : never
type Joins<T extends object[]> = T extends [infer H extends object, ...infer U extends object[]] ? H & Joins<U> : {}

/**
 * @name 事件总线的信号源定义
 * @description 事件信号的定义规则
 * - 各页面的事件信号定义变量命名: `${页面名(英文)}EventProps`
 *
 * - 页面内事件信号的发送值，如不附加值则建议TS定义为选填，
 *   首选类型建议为string(注: 复杂的类型可能导致各页面信号定义交叉类型时出现never类型)
 *
 * - 建议不要在map方法内的组件设置事件监听，如果需要设置，请自行解决如何区别不同页面同事件监听的问题
 */
type Events = [MitmEventProps, WebFuzzerEventProps,SimpleDetectEventProps,EditorEventProps]

type CheckVal = Exchange<ArrContrast<Events>>
// !!! 该变量声明不能改动
// 如果编辑器对该变量报错，则说明声明的信号有重名情况，请自行检查重名的位置
let checkVal: CheckVal = true

const emiter = mitt<Joins<Events>>()

export default emiter
