/**
 * Preserve binary exports as bytes. Decoding a Uint8Array into a JavaScript
 * string is lossy for invalid UTF-8: TextDecoder replaces those bytes with
 * U+FFFD and the main process then writes ef bf bd instead of the source byte.
 */
export const normalizeFileExportData = (data?: Uint8Array | string): Uint8Array | string => data ?? ''
