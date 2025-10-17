import {CompateData} from "@/components/HTTPFlowTable/HTTPFlowTable"
import { randomString } from "@/utils/randomUtil"
import {create} from "zustand"
const {ipcRenderer} = window.require("electron")

export enum CompareTypeEnum {
    default,
    Left,
    Right
}

export type compareParams = {
    info: CompateData, 
    type: CompareTypeEnum
}

interface HttpFlowStoreProps {
    compareState: CompareTypeEnum
    compareLeft: CompateData
    compareRight: CompateData
    token: string
    flag: string
    dataMap: Map<string, {type: number, [key: string]: any}>
    setCompareState: (num: number) => void
    setCompareLeft: (compareLeft: CompateData) => void
    setCompareRight: (compareRight: CompateData) => void
    setAddComparePage: (params: compareParams) => void
    resetCompareData: () => void
}

export const useHttpFlowStore = create<HttpFlowStoreProps>((set, get) => ({
    token : '',
    flag: '',
    compareState: 0, // 用于记录发送代码对比
    compareLeft: {content: "", language: "http"},
    compareRight: {content: "", language: "http"},
    dataMap: new Map(),
    setCompareState: (num: number) => {
        set({compareState: num})
    },
    setCompareLeft: (compareLeft: CompateData) => {
        if (compareLeft.content) {
            const params = {info: compareLeft, type: 1}
            const comState = get().compareState === 0 ? 1 : 0
            set({compareState: comState})
            // ipcRenderer.invoke("add-data-compare", params)
            get().setAddComparePage(params)
        }
        set({compareLeft})
    },
    setCompareRight: (compareRight: CompateData) => {
        if (compareRight.content) {
            const params = {info: compareRight, type: 2}
            const comState = get().compareState === 0 ? 2 : 0
            set({compareState: comState})
            // ipcRenderer.invoke("add-data-compare", params)
            get().setAddComparePage(params)
        }
        set({compareRight})
    },
    setAddComparePage: ({ type, info }) => {
        const { token, flag, dataMap } = get();
        const infoType = ["", "left", "right"][+type];

        if (token) {
            const newInfo = {
                ...dataMap.get(token),
                type: +type,
                [infoType]: info
            }
            
            set({
                dataMap: new Map(dataMap).set(token, newInfo),
            })

            ipcRenderer.invoke("forward-data-compare", {
                token: token,
                info: newInfo,
            });

            if(flag !== infoType){
                set({
                    token: "",
                    flag: ""
                })
                
            }
            if(infoType === 'right'){
                ipcRenderer.invoke("forward-switch-compare-page", {
                    token,
                    info: newInfo,
                })
            }
        } else {
            const newToken = `compare-${randomString(50)}`;
            const newInfo = {
                type: +type,
                [infoType]: info
            };
            
            ipcRenderer.invoke("forward-main-container-add-compare", {
                openFlag: infoType === 'right'
            });

            set({
                dataMap: new Map(dataMap).set(newToken, newInfo),
                flag: infoType,
                token: newToken
            });
        }
    },
    resetCompareData: () => {
        set({
            token: '',
            flag: '',
            dataMap: new Map(),
        })
    }
}))
