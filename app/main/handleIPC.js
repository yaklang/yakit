const handleIPCError = (e) => {
    return `${e.name ? e.name + ": " : ""}${e.message} `
    // return {name: e.name, message: e.message, extra: {...e}}
}

module.exports = {
    handleIPCError
}
