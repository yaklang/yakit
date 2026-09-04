export const families = ['outline', 'solid', 'colorful'] as const

const title = (family: (typeof families)[number]) => family[0].toUpperCase() + family.slice(1)

export const factoryId = (family: (typeof families)[number]) =>
  `/fixture/node_modules/@yakit-libs/yakit-ui-icons/dist/index-${family}.js`

export const entryId = (family: (typeof families)[number]) =>
  `/fixture/node_modules/@yakit-libs/yakit-ui-icons/dist/${family}/index.js`

export const publicName = (family: (typeof families)[number]) =>
  `${title(family)}Public${family === 'outline' ? 'Outlined' : family === 'solid' ? 'Solid' : 'Colorful'}`

export const displayName = (family: (typeof families)[number]) =>
  `${title(family)}Display${family === 'outline' ? 'Outlined' : family === 'solid' ? 'Solid' : 'Colorful'}`

export const unusedDisplayName = (family: (typeof families)[number]) =>
  `${title(family)}Unused${family === 'outline' ? 'Outlined' : family === 'solid' ? 'Solid' : 'Colorful'}`

export const factoryCode = (family: (typeof families)[number]) => `
import { c as makeIcon } from './createIcon-fixture.js'
const renderUsed = () => null,
  usedFactory = makeIcon(renderUsed, '${displayName(family)}'),
  renderUnused = () => null,
  unusedFactory = makeIcon(renderUnused, '${unusedDisplayName(family)}')
export { usedFactory as a, unusedFactory as b }
`

export const entryCode = (family: (typeof families)[number]) => `
import { a as usedLocal, b as unusedLocal } from '../index-${family}.js'
export { usedLocal as ${publicName(family)}, unusedLocal as ${title(family)}Unused${
  family === 'outline' ? 'Outlined' : family === 'solid' ? 'Solid' : 'Colorful'
} }
`

export const consumerCode = `
import { ${publicName('outline')} } from '@yakit-libs/yakit-ui-icons/outline'
import { ${publicName('solid')} } from '@yakit-libs/yakit-ui-icons/solid'
import { ${publicName('colorful')} } from '@yakit-libs/yakit-ui-icons/colorful'
void [${publicName('outline')}, ${publicName('solid')}, ${publicName('colorful')}]
`
