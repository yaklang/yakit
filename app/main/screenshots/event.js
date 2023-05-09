module.exports = class Event {
    defaultPrevented = false

    preventDefault() {
        this.defaultPrevented = true
    }
}
