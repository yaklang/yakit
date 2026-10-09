const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const sourceTemplate = path.resolve(__dirname, '../build/report-template.zip')
const requiredEntries = [
  'index.html',
  'js/init.js',
  'css/index.css',
  'modules/JQuery/jquery.js',
  'modules/echarts/echarts.js',
  'modules/marked/marked.min.js',
]

function verifyReportTemplate(file = sourceTemplate) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0)
    throw new Error('Report template missing or empty: ' + file)
  let zip
  try {
    zip = new AdmZip(file)
    if (!zip.test()) throw new Error('ZIP checksum verification failed')
  } catch (error) {
    throw new Error('Invalid report template ZIP: ' + file + ': ' + error.message)
  }
  for (const name of requiredEntries) {
    const entry = zip.getEntry(name)
    if (!entry || entry.isDirectory || entry.getData().length === 0)
      throw new Error('Report template entry missing or empty: ' + name + ' in ' + file)
  }
  return file
}

function verifyPackagedReportTemplate(archive) {
  return verifyReportTemplate(path.join(path.dirname(path.dirname(archive)), 'report', 'template.zip'))
}

module.exports = { sourceTemplate, verifyReportTemplate, verifyPackagedReportTemplate }
