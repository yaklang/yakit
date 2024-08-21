/** @name 必传参的异步方法 */
export type APIFunc<T, D> = (params: T, hiddenError?: boolean) => Promise<D>
/** @name 选传参的异步方法 */
export type APIOptionalFunc<T, D> = (params?: T, hiddenError?: boolean) => Promise<D>
/** @name 无参的异步方法 */
export type APINoRequestFunc<D> = (hiddenError?: boolean) => Promise<D>
