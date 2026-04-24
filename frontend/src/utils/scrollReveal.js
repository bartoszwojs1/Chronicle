// IntersectionObserver wrapper — adds .in-view to any .reveal element
// when it scrolls into the viewport.  Falls back to showing everything
// after 4s so no one gets stuck with invisible content.

export function initScrollReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view')
          io.unobserve(e.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )

  function observeAll() {
    document.querySelectorAll('.reveal:not(.in-view)').forEach((el) => io.observe(el))
  }
  observeAll()

  // Re-scan a few times for lazy-loaded chunks
  let scans = 0
  const rescan = setInterval(() => {
    observeAll()
    if (++scans > 8) clearInterval(rescan)
  }, 250)

  // Safety net
  const safety = setTimeout(() => {
    document.querySelectorAll('.reveal:not(.in-view)').forEach((el) =>
      el.classList.add('in-view')
    )
  }, 4000)

  return () => {
    clearInterval(rescan)
    clearTimeout(safety)
    io.disconnect()
  }
}
