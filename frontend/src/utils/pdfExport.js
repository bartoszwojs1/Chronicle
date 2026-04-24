// PDF export — uses html2canvas + jsPDF, loaded on demand so they don't
// bloat the initial bundle.  Scale 1.5 gives crisp text without making
// the PDF filesize explode.

export async function exportPDF() {
  const html2canvas = (await import('html2canvas')).default
  const jsPDF = (await import('jspdf')).default

  const canvas = await html2canvas(document.getElementById('dashboard-root'), {
    scale: 1.5,
    useCORS: true,
    backgroundColor: '#050714',
  })

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [canvas.width / 1.5, canvas.height / 1.5],
  })

  pdf.addImage(
    canvas.toDataURL('image/jpeg', 0.85),
    'JPEG',
    0,
    0,
    canvas.width / 1.5,
    canvas.height / 1.5
  )
  pdf.save('chronicle-history.pdf')
}
