// 3D tilt + glow + shine for any element with the .lift class.
// Mutates the DOM directly — intentionally imperative to keep the React
// tree light and avoid re-renders on every mousemove.

export function initTilt() {
  const cards = document.querySelectorAll('.card.lift')
  cards.forEach(bindCard)

  // Lazy scan for cards that appear later (e.g. after suspense)
  let scans = 0
  const interval = setInterval(() => {
    document.querySelectorAll('.card.lift:not([data-tilt])').forEach(bindCard)
    if (++scans > 10) clearInterval(interval)
  }, 300)

  return () => clearInterval(interval)
}

function bindCard(card) {
  if (card.dataset.tilt) return
  card.dataset.tilt = '1'

  if (!card.querySelector(':scope > .card-glow')) {
    const glow = document.createElement('span')
    glow.className = 'card-glow'
    glow.setAttribute('aria-hidden', 'true')
    card.prepend(glow)
  }
  if (!card.querySelector(':scope > .card-shine')) {
    const shine = document.createElement('span')
    shine.className = 'card-shine'
    shine.setAttribute('aria-hidden', 'true')
    card.prepend(shine)
  }

  let raf = 0
  let tx = 0, ty = 0, mx = 50, my = 50
  let goalX = 0, goalY = 0, goalMX = 50, goalMY = 50

  function frame() {
    tx += (goalX - tx) * 0.18
    ty += (goalY - ty) * 0.18
    mx += (goalMX - mx) * 0.18
    my += (goalMY - my) * 0.18

    card.style.setProperty('--rx', ty.toFixed(2) + 'deg')
    card.style.setProperty('--ry', tx.toFixed(2) + 'deg')
    card.style.setProperty('--mx', mx.toFixed(2) + '%')
    card.style.setProperty('--my', my.toFixed(2) + '%')

    const moving =
      Math.abs(goalX - tx) > 0.02 ||
      Math.abs(goalY - ty) > 0.02 ||
      Math.abs(goalMX - mx) > 0.1 ||
      Math.abs(goalMY - my) > 0.1

    raf = moving ? requestAnimationFrame(frame) : 0
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame)
  }

  function onMove(e) {
    const r = card.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    goalX = (px - 0.5) * 6
    goalY = -(py - 0.5) * 6
    goalMX = px * 100
    goalMY = py * 100
    kick()
  }

  function onLeave() {
    goalX = 0
    goalY = 0
    goalMX = 50
    goalMY = 50
    kick()
  }

  card.addEventListener('mousemove', onMove)
  card.addEventListener('mouseleave', onLeave)
}
