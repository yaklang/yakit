const path = require('node:path')
const { writeThemeCss } = require('@yakit-libs/color/node')

const MAIN_COLOR = '#F17F30'
const output = path.resolve(__dirname, '../public/theme.css')

const result = writeThemeCss({
  mainColor: MAIN_COLOR,
  output,
})

console.log(`${result.written ? 'generated' : 'unchanged'} ${path.relative(process.cwd(), result.output)}`)
