const { clipboard, ClipboardItem, nativeImage } = require('electron')

const readClipboardImage = async () => {
  if (typeof clipboard.readImage === 'function') return clipboard.readImage()

  const items = await clipboard.read()
  for (const item of items) {
    const type =
      item.types.find((value) => value === 'image/png') || item.types.find((value) => value.startsWith('image/'))
    if (type) {
      const blob = await item.getType(type)
      return nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()))
    }
  }
  return nativeImage.createEmpty()
}

const writeClipboardImage = async (buffer) => {
  const image = nativeImage.createFromBuffer(Buffer.from(buffer))
  if (typeof clipboard.writeImage === 'function') {
    clipboard.writeImage(image)
    return
  }
  const data = new Blob([image.toPNG()], { type: 'image/png' })
  await clipboard.write([new ClipboardItem({ 'image/png': data })])
}

module.exports = { readClipboardImage, writeClipboardImage }
