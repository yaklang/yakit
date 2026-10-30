/** 固定私有域地址，进入 app 时自动设置 */
export const FIXED_PRIVATE_DOMAIN_BASE_URL = 'http://pentest.dev.ftss.jh'

export enum RemotePrivateDomainGV {
  eeHttpSetting = 'httpSetting',
  ceHttpSetting = 'httpSetting_Yakit',
  seHttpSetting = 'httpSetting_EnpriTraceAgent',
  ceIRifyHttpSetting = 'httpSetting_IRify',
  eeIRifyHttpSetting = 'httpSetting_IRify_ee',
  basHttpSetting = 'httpSetting_BAS',
  eeConfigBaseUrl = 'config_base_url',
  ceConfigBaseUrl = 'config_base_url_Yakit',
  seConfigBaseUrl = 'config_base_url_EnpriTraceAgent',
  ceIRifyConfigBaseUrl = 'config_base_url_IRify',
  eeIRifyConfigBaseUrl = 'config_base_url_IRify_ee',
  basConfigBaseUrl = 'config_base_url_BAS',
}
