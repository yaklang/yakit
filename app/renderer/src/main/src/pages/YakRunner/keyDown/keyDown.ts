export const keyboard: Map<string, {onlyid: string; callback: () => any}[]> = new Map()

export const setKeyboard = (key: string, info: {onlyid: string; callback: () => any}) => {
    if (keyboard.has(key)) {
        const item = keyboard.get(key)
        item?.push(info)
    } else {
        keyboard.set(key, [{...info}])
    }
}

export const getKeyboard = (key: string) => {
    return keyboard.get(key)
}

export const clearKeyboard = () => {
    keyboard.clear()
}

export const removeKeyboard = (key: string) => {
    keyboard.delete(key)
}
