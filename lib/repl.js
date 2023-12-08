const log = console.log.bind (console)

// A simple REPL (_read-eval-print-loop_) in the browser. 
// The document is a list of input/output pairs.  
// The last item in the document is an input element.  
// On enter we eval and append a new input/output pair.

function E (tag,...subs) {
  tag = tag.split ('.')
  const el = document.createElement (tag.shift ())
  el.classList.add (...tag)
  el.append (...subs)
  return el
}

function Repl (elem, eval_) {
	var history = [], hpos = -1 // Application state: history, and selected history item. 
		, elem, prompt, ta // References to the UI (DOM) elements.
		, keymap = { 3:enter, 13:enter, 38:up, 40:down }
    , self = this

  this.exec = exec
  this.clear = clear
  this.focus = focus
	_init ()

	function focus () {
		return ta.focus ()
  }

	function exec (input, _save) {
		if (_save !== false) 
			hpos = history.push (input) - 1 // Store history item
		var output = eval_ (input)
		if (output && output.type === 'html_raw')
			_append (input, output.value, 'html')
		else
			_append (input, output)
		var d = document, b = d.body
		window.pageYOffset = d.documentElement.scrollTop = b.scrollTop = b.clientHeight /* scroll into view */ 
    return self
  }

	function clear () {
		elem.innerHTML = ta.value = ''
		elem.appendChild (prompt)
		ta.focus ()
    return self
  }

	function up () {
		ta.value = (hpos >= 0) ? history [hpos--] : ''
  }

	function down () {
		ta.value = (hpos + 1 < history.length) ? history [++hpos] : ''
  }

	function enter () {
		var input = ta.value; ta.value = ''
		return exec (input)
  }

  // Private methods

	function _append (input, output, type) {
		if (type === 'html') {
      const div = E('div', E ('pre.input', input), E ('div.output'))
			div.children[1].innerHTML = String (output)
      elem.insertBefore (div, prompt)
    }
    else {
      const div = E('div', E ('pre.input', input), E ('div.output'))
      div.children[1].textContent = String (output)
      if (output instanceof Error) div.children[1].classList.add ('error')
      elem.insertBefore (div, prompt)
    }
  }

	function _keydown (evt) {
		if (typeof keymap[evt.keyCode] === 'function') {
			evt.preventDefault ()
			keymap[evt.keyCode] ()
    }
  }

	function _init () {
    elem.textContent = ''
    elem.append (E('div.prompt', E('input')))
		prompt = elem.children[0]
		ta = prompt.children[0]
		ta.onkeydown = _keydown
		elem.onclick = focus
  }

}