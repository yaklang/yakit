import type React from 'react'
import { ChromeBrowserColorful, EdgeBrowserColorful } from '@yakit-libs/yakit-ui-icons/colorful'

export const isEdgeBrowserClient = (client?: string) => /edge/i.test(client || '')

export const BrowserClientIcon: React.FC<{ client?: string; size?: number }> = ({ client, size = 18 }) =>
  isEdgeBrowserClient(client) ? <EdgeBrowserColorful size={size} /> : <ChromeBrowserColorful size={size} />
