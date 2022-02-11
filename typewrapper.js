// Emacs magic: -*- mode: js; mode: outshine -*-
// * UTILS
// ** Hyperscript
// reinventing the wheel, but it's easy and better than NPM dependencies
// h() takes a tagname, object of attributes and variadic child nodes
// returns a DOM node
const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    Object.entries(attrs).map(kv => el.setAttribute(...kv))
    children.map(x => el.appendChild(x))
    return el }

// ** DOM Tree-walker
// somewhat like Clojure's (prewalk)
// walks a dom tree applying f() to text nodes
// this isn't hugely general, but works for this
const preWalkDom = (f, node) => [...node.childNodes].map(
    // previously tested for TEXT
    x => (x?.nodeType === Node.TEXT_NODE) ?
	f(x) :
	preWalkDom(f, x))

// ** Async setTimeout
// Promisified sleep, useful for sequencing the various typing animations
const wait = async ms => (new Promise(_ => setTimeout(_, ms)))

// * Typewrapper
// ** STAGE 1: create DOM nodes around all the text
// wraps `string`s => `<span><ins/><del>string</del></span>`
const wrapString = (textNode) => {
    // replace string with an empty DOM tree
    const text = textNode.cloneNode(),
	  style='all: unset; text-decoration: inherit;',
	  ins = h('ins', {style}),
	  del = h('del', {style: style+'visibility:hidden;' }, text),
	  wrap = h('span', {style}, ins, del)
    textNode.replaceWith(wrap)
    return wrap; }

// ** STAGE 2: apply the typing effect
// stage 2 is separate because it's easier to debug
// this function moves characters one by one from the del to the ins
// <del> element is used to preserve the spacing of un-revealed content
const insertString = ms => async (ins, del) => {
    if (del.innerHTML.length === 0)
	return Promise.resolve

    // do the edits
    const [ch, ...str] = [...del.innerHTML]
    ins.innerHTML += ch
    del.innerHTML = str.join('')
    await wait(ch.match(/\s/) ? 0 : ms)

    return insertString(ms)(ins, del); }

// ** Main Function
const typewrapper = async (selector, opts) => {
  const el = document.querySelector(selector)
  // this returns the wrapper nodes it creates,
  // and we flatten that list
  const texts = preWalkDom(wrapString, el).flat(Infinity)

  // now it's safe to make the element visible
  el.style.visibility = 'visible'

  // for...of is used because it can await promises; map() can't
  for (let x of texts)
    await insertString(opts.typeSpeed)(...x.childNodes);
}

export default class Typewrapper {
  constructor(selector, opts) {
    typewrapper(selector, opts)
  }
}
