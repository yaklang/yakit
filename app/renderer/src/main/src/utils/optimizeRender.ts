import {SetStateAction} from "react"

/**
 * @name 对于超大内容字符串的拆分定时赋值
 * @description 拆分段长度 1000 * 1024， mei 1000ms 赋值一次
 */
export function asynSettingState(value: string, setValue: React.Dispatch<SetStateAction<string>>): NodeJS.Timeout {
    const contents = value || ""
    const strs: string[] = []
    const maxLength = Math.ceil(contents.length / 1000 / 1024)
    for (let i = 0; i < maxLength; i++) {
        strs.push(contents.slice(i * 1000 * 1024, (i + 1) * 1000 * 1024))
    }

    let number = 0
    const content = strs[number]
    setValue(content)
    number += 1
    let timer = setInterval(() => {
        if (number === strs.length) {
            clearInterval(timer)
            return
        }
        const content = strs[number]
        setValue((old) => old + content)
        number += 1
    }, 1000)

    return timer
}
