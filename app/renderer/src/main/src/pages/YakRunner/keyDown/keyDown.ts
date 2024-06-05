export const center: Map<string, {onlyid: string; callback: () => any}[]> = new Map()

export const set = (key: string, info: {onlyid: string; callback: () => any}) => {
    if (center.has(key)) {
        const item = center.get(key)
        item?.push(info)
    } else {
        center.set(key, [{...info}])
    }
}

export const get = (key: string) => {
    return center.get(key)
}

export const convert = (activeKey: string[]): string => {
    let sortKeys = activeKey.sort().join("-")
    return sortKeys
}

export const clear = () => {
    center.clear()
}

export const removeItem = (key: string) => {
    center.delete(key)
}
