const { assertTrustedAppSender } = require('../security')

module.exports = function registerRecommendedSkills({ ipcMain, getClient }) {
  for (const method of [
    'GetAIReActRecommendedSkills',
    'UpdateAIReActRecommendedSkill',
    'ResetAIReActRecommendedSkill',
  ]) {
    ipcMain.handle(method, (event, params = {}) => {
      assertTrustedAppSender(event, method)
      if (method !== 'GetAIReActRecommendedSkills' && (typeof params.Name !== 'string' || !params.Name.trim()))
        throw new Error('Invalid recommended skill name')
      if (method === 'UpdateAIReActRecommendedSkill' && typeof params.Content !== 'string')
        throw new Error('Invalid recommended skill content')
      const client = getClient()
      if (typeof client[method] !== 'function') throw new Error('Recommended skills are not supported by this engine')
      return new Promise((resolve, reject) =>
        client[method](params, (error, data) => (error ? reject(error) : resolve(data))),
      )
    })
  }
}
