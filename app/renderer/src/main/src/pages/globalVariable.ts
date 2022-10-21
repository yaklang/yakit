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
    company: {name:"companyName",img:"companyHeadImg"},
}
