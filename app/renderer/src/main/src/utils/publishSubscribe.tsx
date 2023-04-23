/**
 * @description 处理菜单是否关闭
 */

// import {useState} from "react"

// type CallbackProps = Function
// type EmitProps = Record<string, CallbackProps>

// const useSubscribe = () => {
//     const [globalEvent, setGlobalEvent] = useState<EmitProps[]>([])

//     const onSubscribe = (type: string, handler: CallbackProps) => {
//         if (!(handler instanceof Function)) throw new Error("handler type error")
//         if (!globalEvent[type]) {
//             globalEvent[type] = []
//         }
//         if (globalEvent[type]?.length > 0) return
//         globalEvent[type].push(handler)
//         setGlobalEvent(globalEvent)
//     }
//     const onPublish = (type, params) => {
//         if (globalEvent[type]) {
//             globalEvent[type].forEach((handler, index) => {
//                 handler(params)
//             })
//             setGlobalEvent(globalEvent)
//         }
//     }

//     const onUnsubscribe = (type, handler) => {
//         if (globalEvent[type]) {
//             globalEvent[type].splice(globalEvent[type].indexOf(handler) >>> 0, 1)
//             setGlobalEvent(globalEvent)
//         }
//     }

//     return [
//         globalEvent,
//         {
//             onSubscribe,
//             onPublish,
//             onUnsubscribe
//         }
//     ]
// }

const globalEvent = {}

export const onUseSubscribe = (type, handler) => {
    if (!(handler instanceof Function)) throw new Error("handler type error")
    if (!globalEvent[type]) {
        globalEvent[type] = []
    }
    if (globalEvent[type]?.length > 0) return
    globalEvent[type].push(handler)
}

export const onUsePublish = (type, params) => {
    if (globalEvent[type]) {
        globalEvent[type].forEach((handler, index) => {
            handler(params)
        })
    }
}

export const onUseUnsubscribe = (type, handler) => {
    if (globalEvent[type]) {
        globalEvent[type].splice(globalEvent[type].indexOf(handler) >>> 0, 1)
    }
}
