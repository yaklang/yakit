export const installDroppedFilePath = (fileConstructor: { prototype: object }, readPath?: (file: File) => string) => {
  if (!readPath || Object.prototype.hasOwnProperty.call(fileConstructor.prototype, 'path')) return
  Object.defineProperty(fileConstructor.prototype, 'path', {
    configurable: true,
    enumerable: true,
    get() {
      try {
        return readPath(this as File) || ''
      } catch {
        return ''
      }
    },
  })
}
