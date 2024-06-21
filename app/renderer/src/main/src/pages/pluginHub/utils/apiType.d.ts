export type APIFunc<T, D> = (params: T, hiddenError?: boolean) => Promise<D>
export type APIOptionalFunc<T, D> = (params?: T, hiddenError?: boolean) => Promise<D>
