const path = require('node:path')
const { writeThemeCss } = require('@yakit-libs/color/node')

const result = writeThemeCss({
  mainColor: '#F17F30',
  output: path.resolve(__dirname, '../public/theme.css'),
})

console.log(`${result.written ? 'generated' : 'unchanged'} ${path.relative(process.cwd(), result.output)}`)
