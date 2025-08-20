import i18n from "i18next"
import {initReactI18next} from "react-i18next"
import HttpBackend from "i18next-http-backend"

i18n.use(HttpBackend) // 懒加载
    .use(initReactI18next)
    .init({
        lng: "zh", // 默认语言
        fallbackLng: "en",
        ns: [],
        defaultNS: "", // 默认命名空间
        interpolation: {escapeValue: false},
        backend: {
            loadPath: "/locales/{{lng}}/{{ns}}.json" // 加载路径
        },
        react: {
            useSuspense: true
        }
    })

export default i18n
