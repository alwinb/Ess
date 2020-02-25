// A simple REPL (_read-eval-print-loop_) in the browser. 
// The document is a list of input/output pairs.  
// The last item in the document is an input element.  
// On enter we eval and append a new input/output pair.

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

	function _append (input, output, encoding) {
		var div = document.createElement ('DIV')
		if (encoding === 'html') {
			div.innerHTML = '\t<pre class="input"></pre>\n\t<div></div>\n'
			div.childNodes[3].innerHTML = output
    }
		else {
			div.innerHTML = output instanceof Error
        ? '\t<pre class="input"></pre>\n\t<pre class="output error"></pre>\n'
        : '\t<pre class="input"></pre>\n\t<pre class="output"></pre>\n'
			div.childNodes[3].appendChild (document.createTextNode (output))
    }
		div.childNodes[1].appendChild (document.createTextNode (input))
		elem.insertBefore (div, prompt)
  }

	function _keydown (evt) {
		if (typeof keymap[evt.keyCode] === 'function') {
			evt.preventDefault ()
			keymap[evt.keyCode] ()
    }
  }

	function _init () {
		elem.innerHTML = '<div class="prompt"><input/></div>'
		prompt = elem.childNodes[0]
		ta = prompt.childNodes[0]
		ta.onkeydown = _keydown
		elem.onclick = focus
  }

}