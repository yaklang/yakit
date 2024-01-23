import { ScriptsProps } from "@/components/yakChat/chatCS"
import axios, {AxiosProgressEvent, GenericAbortSignal, type AxiosResponse} from "axios"

const service = axios.create({
    // baseURL: "https://u91298-91ae-7b4e898b.neimeng.seetacloud.com:6443/"
    baseURL: "http://e23k678378.yicp.fun:25950/" 
    //"http://e23k678378.yicp.fun:25950/" 

    // "http://8.140.192.177:6006/"
})

service.interceptors.request.use(
    (config) => {
        return config
    },
    (error) => {
        return Promise.reject(error.response)
    }
)

service.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
        if (response.status === 200) return response

        throw new Error(response.status.toString())
    },
    (error) => {
        return Promise.reject(error)
    }
)

interface YakChatOptions {
    prompt: string
    is_bing: boolean
    token: string
    history: {role: string; content: string}[]
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
}

interface YakChatPluginOptions {
    prompt: string
    is_bing: boolean
    token: string
    plugin_scope:number
    scripts:ScriptsProps[]
}

function http({prompt, is_bing, token, history, signal, onDownloadProgress}: YakChatOptions) {
    return service({
        url: "chat-process",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        data: {
            prompt: prompt,
            exp_length: 3,
            attribute: "precise",
            is_bing,
            user_token: token,
            history: history
        },
        signal: signal,
        // 浏览器专属
        onDownloadProgress: onDownloadProgress
    })
}

export const chatCS = ({prompt, is_bing, token, history, signal, onDownloadProgress}: YakChatOptions) => {
    return http({prompt, is_bing, token, history, signal, onDownloadProgress})
}

function httpPlugin({prompt, is_bing, token,plugin_scope, scripts}:YakChatPluginOptions){
    console.log("请求",{
        prompt,
        user_token: token,
        plugin_scope,
        is_bing,
        scripts,
        history:[]
    });
    
    return service({
        url: "chat-plugin",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        data: {
            prompt,
            user_token: token,
            plugin_scope,
            is_bing,
            scripts,
            history:[]
        },
        // 浏览器专属
        // onDownloadProgress: onDownloadProgress
    })
}

export const chatCSPlugin = ({prompt, is_bing, token,plugin_scope, scripts}:YakChatPluginOptions) => {
    return httpPlugin({prompt, is_bing, token,plugin_scope,scripts,})
}

export const chatGrade = (params: {uid: string; grade: "good" | "bad"}) => {
    return service({
        url: "chat-grade",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        data: {...params}
    })
}

export const getPromptList = (params) => {
    return service({
        url: "prompt-list",
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        params: {...params}
    })
}
