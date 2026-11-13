import { getLocalFileLinkInfo } from '@/components/MilkdownEditor/CustomFile/utils'

export const loadAttachmentSizes = async (paths: string[]): Promise<Record<string, number | undefined>> => {
  const entries = await Promise.all(
    paths
      .filter((path) => !path.startsWith('blob:'))
      .map(async (path): Promise<[string, number | undefined]> => {
        try {
          const info = await getLocalFileLinkInfo(path, true)
          return [path, info.size]
        } catch {
          return [path, undefined]
        }
      }),
  )
  return Object.fromEntries(entries)
}
