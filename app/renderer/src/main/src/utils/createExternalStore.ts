import { useSyncExternalStore } from "react"

export interface ExternalStore<T> {
    subscribe: (listener: () => void) => () => void
    getSnapshot: () => T
    setSnapshot: (updater: (prev: T) => T) => void
}

/**
 * 通用 external store
 */
export function createExternalStore<T>(initialState: T): ExternalStore<T> {
    let state = initialState
    const listeners = new Set<() => void>()

    const subscribe = (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
    }

    const getSnapshot = () => state

    const setSnapshot = (updater: (prev: T) => T) => {
        state = updater(state)
        listeners.forEach((l) => l())
    }

    return { subscribe, getSnapshot, setSnapshot }
}

/**
 * 对应的 hook
 */
export function bindExternalStoreHook<T>(store: ExternalStore<T>) {
    return function useStore() {
        return useSyncExternalStore(store.subscribe, store.getSnapshot)
    }
}
