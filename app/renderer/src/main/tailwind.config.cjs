/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.tsx", "./src/**/*.ts"],
    darkMode: "class",
    theme: {
        extend: {}
    },
    plugins: [require("@tailwindcss/typography")]
}
