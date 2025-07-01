import {Route} from "antd/lib/breadcrumb/Breadcrumb"
import {ProjectDescription} from "./softwareSettings/ProjectManage"

export interface coordinateProps {
    screenX: number
    screenY: number
    clientX: number
    clientY: number
    pageX: number
    pageY: number
}
export const coordinate: coordinateProps = {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0
}
interface UserPlatformTypeProps {
    github: {name: string; img: string}
    wechat: {name: string; img: string}
    qq: {name: string; img: string}
    company: {name: string; img: string}
}
export const UserPlatformType: UserPlatformTypeProps = {
    github: {name: "githubName", img: "githubHeadImg"},
    wechat: {name: "wechatName", img: "wechatHeadImg"},
    qq: {name: "qqName", img: "qqHeadImg"},
    company: {name: "companyName", img: "companyHeadImg"}
}

interface info {
    [key: string]: {status: boolean; info: string}
}
export let SimpleCloseInfo: info = {}
export const setSimpleInfo = (key: string, status: boolean, info: string) => {
    SimpleCloseInfo[key] = {
        status,
        info
    }
}

export const delSimpleInfo = (key: string) => {
    if (SimpleCloseInfo[key]) {
        delete SimpleCloseInfo[key]
    }
}

export let NowProjectDescription: ProjectDescription | undefined = undefined
export const setNowProjectDescription = (v: ProjectDescription | undefined) => {
    NowProjectDescription = v
}

//-------------------- echarts start ----------------------
interface logChartsColorProps {
    name: string
    color: string
    rgbaColor: string
    rgbaObj?: {r: number; g: number; b: number; a: number} | null
    colorVariable: string
}

const getColorByVariable = (colorVariable) => {
    const root = document.documentElement
    const color = getComputedStyle(root).getPropertyValue(colorVariable).trim()
    const rgbaColor = hexToRGB(color)
    const rgbaColorObj = parseRGB(rgbaColor)
    return color
}

const hexToRGB = (hex) => {
    // 移除前导的 '#'
    hex = hex.replace(/^#/, "")

    // 处理3位的hex颜色代码
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((char) => char + char)
            .join("")
    }

    // 解析红、绿、蓝的值
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)

    // 返回rgba颜色值
    return `rgba(${r}, ${g}, ${b})`
}
const parseRGB = (color) => {
    const result = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/.exec(color)
    return result
        ? {
              r: parseInt(result[1]),
              g: parseInt(result[2]),
              b: parseInt(result[3]),
              a: result[4] ? parseFloat(result[4]) : 1 // 如果是rgba，提取alpha通道值
          }
        : null
}
export const chartsColorList: logChartsColorProps[] = [
    {
        name: "purple",
        color: "--Colors-Use-Purple-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Purple-Bg"
    },
    {
        name: "bluePurple",
        color: "--Colors-Use-Magenta-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Magenta-Bg"
    },
    {
        name: "blue",
        color: "--Colors-Use-Blue-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Blue-Bg"
    },
    {
        name: "lakeBlue",
        color: "--Colors-Use-Lake-blue-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Lake-blue-Bg"
    },
    {
        name: "cyan",
        color: "--Colors-Use-Cyan-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Cyan-Bg"
    },
    {
        name: "green",
        color: "--Colors-Use-Green-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Green-Bg"
    },
    {
        name: "red",
        color: "--Colors-Use-Red-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Red-Bg"
    },
    {
        name: "orange",
        color: "--Colors-Use-Orange-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Orange-Bg"
    },
    {
        name: "yellow",
        color: "--Colors-Use-Yellow-Bg",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Yellow-Bg"
    },
    {
        name: "grey",
        color: "--Colors-Use-Neutral-Disable",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Neutral-Disable"
    },
    {
        name: "text",
        color: "--Colors-Use-Neutral-Text-1-Title",
        rgbaColor: "",
        colorVariable: "--Colors-Use-Neutral-Text-1-Title"
    }
]

export const setChartsColorList = () => {
    chartsColorList.forEach((ele) => {
        const color = getColorByVariable(ele.colorVariable)
        const rgbaColor = hexToRGB(color)
        const rgbaObj = parseRGB(rgbaColor)
        ele.color = color
        ele.rgbaColor = rgbaColor
        ele.rgbaObj = rgbaObj
    })
}

//-------------------- echarts end-------------------------
