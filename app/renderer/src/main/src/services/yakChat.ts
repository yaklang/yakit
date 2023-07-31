import axios, {AxiosProgressEvent, GenericAbortSignal, type AxiosResponse} from "axios"

const service = axios.create({
    // baseURL: "https://u91298-91ae-7b4e898b.neimeng.seetacloud.com:6443/"
    baseURL: "http://8.140.192.177:6006/"
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
    intell_type: string
    token: string
    history: {role: string; content: string}[]
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
}

function http({prompt, intell_type, token, history, signal, onDownloadProgress}: YakChatOptions) {
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
            intell_type: intell_type,
            user_token: token,
            history: history
        },
        signal: signal,
        // 浏览器专属
        onDownloadProgress: onDownloadProgress
    })
}

export const chatCS = ({prompt, intell_type, token, history, signal, onDownloadProgress}: YakChatOptions) => {
    return http({prompt, intell_type, token, history, signal, onDownloadProgress})
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
