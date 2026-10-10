// Progressive enhancement: article text and navigation work without JavaScript.
const text = window.blogLanguage
for (const pre of document.querySelectorAll('.article-body pre')) {
  const code = pre.querySelector('code')
  if (!code) continue
  const block = document.createElement('div')
  block.className = 'code-block'
  const toolbar = document.createElement('div')
  toolbar.className = 'code-toolbar'
  const label = document.createElement('span')
  label.textContent = [...code.classList].find(name => name.startsWith('language-'))?.slice(9) || text.code
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'copy-code'
  button.textContent = text.copy
  button.setAttribute('aria-live', 'polite')
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent)
      button.textContent = text.copied
    } catch {
      button.textContent = text.selectCopy
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(code)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    setTimeout(() => { button.textContent = text.copy }, 2000)
  })
  toolbar.append(label, button)
  pre.before(block)
  block.append(toolbar, pre)
  pre.tabIndex = 0
  pre.setAttribute('aria-label', text.codeLabel)
  const hint = document.createElement('p')
  hint.className = 'code-scroll-hint'
  hint.textContent = text.codeScrollHint
  block.append(hint)
  const measure = () => block.classList.toggle('has-overflow', pre.scrollWidth > pre.clientWidth + 1)
  new ResizeObserver(measure).observe(pre)
  document.fonts.ready.then(measure)
}
const links = [...document.querySelectorAll('.toc-nav a')]
const headings = [...new Set(links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean))]
if (headings.length) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)
    if (!visible.length) return
    for (const link of links) {
      if (decodeURIComponent(link.hash.slice(1)) === visible[0].target.id) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    }
  }, {rootMargin: '-5% 0px -65% 0px'})
  headings.forEach(heading => observer.observe(heading))
}
for (const link of document.querySelectorAll('.mobile-toc a')) {
  link.addEventListener('click', event => {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))
    if (!target) return
    event.preventDefault()
    link.closest('details').open = false
    history.replaceState(null, '', link.hash)
    target.tabIndex = -1
    target.focus({preventScroll:true})
    target.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})
  })
}
