const path = require('node:path')
const { writeThemeCss } = require('@yakit-libs/color/node')

const MAIN_COLOR = '#F17F30'
const outputs = [
  path.resolve(__dirname, '../public/theme.css'),
  path.resolve(__dirname, '../../../../main/handlers/openNewChildWindow/theme.css'),
]

for (const output of outputs) {
  const result = writeThemeCss({
    mainColor: MAIN_COLOR,
    output,
  })

  console.log(`${result.written ? 'generated' : 'unchanged'} ${path.relative(process.cwd(), result.output)}`)
}
