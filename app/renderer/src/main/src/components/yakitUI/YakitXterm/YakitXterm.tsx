import * as React from 'react'
import PropTypes from 'prop-types'

import 'xterm/css/xterm.css'

// We are using these as types.
// eslint-disable-next-line no-unused-vars
import { Terminal, ITerminalOptions, ITerminalAddon } from '@xterm/xterm'

interface IProps {
	/**
	 * Class name to add to the terminal container.
	 */
	className?: string

	/**
	 * Options to initialize the terminal with.
	 */
	options?: ITerminalOptions

	/**
	 * An array of XTerm addons to load along with the terminal.
	 */
	addons?: Array<ITerminalAddon>

	/**
	 * Adds an event listener for when a binary event fires. This is used to
	 * enable non UTF-8 conformant binary messages to be sent to the backend.
	 * Currently this is only used for a certain type of mouse reports that
	 * happen to be not UTF-8 compatible.
	 * The event value is a JS string, pass it to the underlying pty as
	 * binary data, e.g. `pty.write(Buffer.from(data, 'binary'))`.
	 */
	onBinary?(data: string): void

	/**
	 * Adds an event listener for the cursor moves.
	 */
	onCursorMove?(): void

	/**
	 * Adds an event listener for when a data event fires. This happens for
	 * example when the user types or pastes into the terminal. The event value
	 * is whatever `string` results, in a typical setup, this should be passed
	 * on to the backing pty.
	 */
	onData?(data: string): void

	/**
	 * Adds an event listener for when a key is pressed. The event value contains the
	 * string that will be sent in the data event as well as the DOM event that
	 * triggered it.
	 */
	onKey?(event: { key: string; domEvent: KeyboardEvent }): void

	/**
	 * Adds an event listener for when a line feed is added.
	 */
	onLineFeed?(): void

	/**
	 * Adds an event listener for when a scroll occurs. The event value is the
	 * new position of the viewport.
	 * @returns an `IDisposable` to stop listening.
	 */
	onScroll?(newPosition: number): void

	/**
	 * Adds an event listener for when a selection change occurs.
	 */
	onSelectionChange?(): void

	/**
	 * Adds an event listener for when rows are rendered. The event value
	 * contains the start row and end rows of the rendered area (ranges from `0`
	 * to `Terminal.rows - 1`).
	 */
	onRender?(event: { start: number; end: number }): void

	/**
	 * Adds an event listener for when the terminal is resized. The event value
	 * contains the new size.
	 */
	onResize?(event: { cols: number; rows: number }): void

	/**
	 * Adds an event listener for when an OSC 0 or OSC 2 title change occurs.
	 * The event value is the new title.
	 */
	onTitleChange?(newTitle: string): void

	/**
	 * Attaches a custom key event handler which is run before keys are
	 * processed, giving consumers of xterm.js ultimate control as to what keys
	 * should be processed by the terminal and what keys should not.
	 *
	 * @param event The custom KeyboardEvent handler to attach.
	 * This is a function that takes a KeyboardEvent, allowing consumers to stop
	 * propagation and/or prevent the default action. The function returns
	 * whether the event should be processed by xterm.js.
	 */
	customKeyEventHandler?(event: KeyboardEvent): boolean
}

export default class YakitXterm extends React.Component<IProps> {
	/**
	 * The ref for the containing element.
	 */
	terminalRef: React.RefObject<HTMLDivElement>

	/**
	 * XTerm.js Terminal object.
	 */
	terminal!: Terminal // This is assigned in the setupTerminal() which is called from the constructor

	static propTypes = {
		className: PropTypes.string,
		options: PropTypes.object,
		addons: PropTypes.array,
		onBinary: PropTypes.func,
		onCursorMove: PropTypes.func,
		onData: PropTypes.func,
		onKey: PropTypes.func,
		onLineFeed: PropTypes.func,
		onScroll: PropTypes.func,
		onSelectionChange: PropTypes.func,
		onRender: PropTypes.func,
		onResize: PropTypes.func,
		onTitleChange: PropTypes.func,
		customKeyEventHandler: PropTypes.func,
	}

	constructor(props: IProps) {
		super(props)

		this.terminalRef = React.createRef()

		// Bind Methods
		this.onData = this.onData.bind(this)
		this.onCursorMove = this.onCursorMove.bind(this)
		this.onKey = this.onKey.bind(this)
		this.onBinary = this.onBinary.bind(this)
		this.onLineFeed = this.onLineFeed.bind(this)
		this.onScroll = this.onScroll.bind(this)
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.onRender = this.onRender.bind(this)
		this.onResize = this.onResize.bind(this)
		this.onTitleChange = this.onTitleChange.bind(this)

		this.setupTerminal()
	}

	setupTerminal() {
		// Setup the XTerm terminal.
		this.terminal = new Terminal(this.props.options)

		// Load addons if the prop exists.
		if (this.props.addons) {
			this.props.addons.forEach((addon) => {
				this.terminal.loadAddon(addon)
			})
		}

		// Create Listeners
		this.terminal.onBinary(this.onBinary)
		this.terminal.onCursorMove(this.onCursorMove)
		this.terminal.onData(this.onData)
		this.terminal.onKey(this.onKey)
		this.terminal.onLineFeed(this.onLineFeed)
		this.terminal.onScroll(this.onScroll)
		this.terminal.onSelectionChange(this.onSelectionChange)
		this.terminal.onRender(this.onRender)
		this.terminal.onResize(this.onResize)
		this.terminal.onTitleChange(this.onTitleChange)

		// Add Custom Key Event Handler
		if (this.props.customKeyEventHandler) {
			this.terminal.attachCustomKeyEventHandler(this.props.customKeyEventHandler)
		}
	}

	componentDidMount() {
		if (this.terminalRef.current) {
			// Creates the terminal within the container element.
			this.terminal.open(this.terminalRef.current)
		}
	}

	componentWillUnmount() {
		// When the component unmounts dispose of the terminal and all of its listeners.
		this.terminal.dispose()
	}

	private onBinary(data: string) {
		if (this.props.onBinary) this.props.onBinary(data)
	}

	private onCursorMove() {
		if (this.props.onCursorMove) this.props.onCursorMove()
	}

	private onData(data: string) {
		if (this.props.onData) this.props.onData(data)
	}

	private onKey(event: { key: string; domEvent: KeyboardEvent }) {
		if (this.props.onKey) this.props.onKey(event)
	}

	private onLineFeed() {
		if (this.props.onLineFeed) this.props.onLineFeed()
	}

	private onScroll(newPosition: number) {
		if (this.props.onScroll) this.props.onScroll(newPosition)
	}

	private onSelectionChange() {
		if (this.props.onSelectionChange) this.props.onSelectionChange()
	}

	private onRender(event: { start: number; end: number }) {
		if (this.props.onRender) this.props.onRender(event)
	}

	private onResize(event: { cols: number; rows: number }) {
		if (this.props.onResize) this.props.onResize(event)
	}

	private onTitleChange(newTitle: string) {
		if (this.props.onTitleChange) this.props.onTitleChange(newTitle)
	}

	render() {
		return <div className={this.props.className} ref={this.terminalRef} />
	}
}