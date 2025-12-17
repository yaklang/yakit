import i18n from "i18next"
import {initReactI18next} from "react-i18next"
import HttpBackend from "i18next-http-backend"

i18n.use(HttpBackend)
    .use(initReactI18next)
    .init({
        lng: "zh",
        fallbackLng: "en",
        ns: ["yakitUi", "yakitRoute", "layout", "customizeMenu", "home", "history", "webFuzzer", "aiAgent"], // 这几个需要预加载
        defaultNS: "",
        interpolation: {
            escapeValue: false
        },
        backend: {loadPath: "./locales/{{lng}}/{{ns}}.json"},
        react: {useSuspense: true}
    })

export default i18n
