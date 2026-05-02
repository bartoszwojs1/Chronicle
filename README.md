<p align="center">
  <img src="docs/logo.svg" alt="Chronicle" width="140" height="140"/>
</p>

# Chronicle

> **Browser History Visualiser** — a glassmorphic dashboard that reads your Chrome history and turns it into insight.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)

---

## Overview

Chronicle connects directly to your local Chrome `History` SQLite database, aggregates visits, categorises domains, and renders everything in a real-time dashboard. It is designed as a **portfolio piece** demonstrating advanced React patterns, custom data visualisation, and polished UI craft.


---

## Features

| Feature | Detail |
|---------|--------|
| **Live sync** | Reads Chrome’s SQLite `History` DB on macOS via a local FastAPI backend |
| **7 activity widgets** | Daily trend, heatmap, category donut, top sites, productivity by hour, stat cards, session list |
| **Interactive filtering** | Click any category slice to filter the entire dashboard |
| **Custom SVG charts** | No charting library — every line, donut arc, and sparkline is hand-built SVG with path animations |
| **Canvas mesh gradient** | Animated multi-blob background rendered on `<canvas>` at 60 fps |
| **3D card tilt** | Mouse-driven CSS perspective tilt with dynamic glow + shine |
| **Scroll reveal** | IntersectionObserver-based entrance animations with staggered delays |
| **Theme toggle** | Full dark / light mode switch with OKLCH colour tokens |
| **PDF export** | One-click export of the entire dashboard via `html2canvas` + `jsPDF` |
| **Lazy sessions** | Session list is code-split and loaded on demand |

---

## Tech Stack

### Frontend
- **React 19** + **Vite 8**
- **Framer Motion** — layout animations, staggered reveals, AnimatePresence
- **date-fns** — lightweight date formatting
- **Lucide React** — chevrons for session expansion
- **html2canvas** + **jspdf** — on-demand PDF generation (lazy-loaded)

### Backend
- **FastAPI** — Python async API
- **SQLite** — direct read of Chrome’s `History` file
- **CORS enabled** — frontend talks to `localhost:8000`

### Design
- **Glassmorphism** — `backdrop-filter` with multi-layer borders and conic-gradient hover rings
- **OKLCH colour space** — perceptually uniform accent gradients (mint → cyan)
- **Geist** + **Instrument Serif** — modern sans + editorial serif pairing
- **Responsive** — 4 breakpoints: 1100px, 900px, 720px, 480px

---

## Architecture

```
browser-history-viz/
├── backend/
│   ├── main.py              # FastAPI entrypoint
│   └── history_parser.py    # SQLite queries + categorisation
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Composition root, global effects
│   │   ├── components/       # 11 presentational components
│   │   ├── hooks/            # useDashboardData, useClock
│   │   ├── utils/            # PDF export, card tilt, scroll reveal, seeded RNG
│   │   └── index.css         # 1100+ lines of design-system CSS
│   └── dist/                 # Vite production build
└── README.md
```


---

## Getting Started

### Prerequisites
- macOS (Chrome history path is hard-coded for `~/Library/Application Support/Google/Chrome/Default/History`)
- Node.js 20+
- Python 3.11+

### Backend
```bash
cd backend
pip install fastapi uvicorn
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # localhost:5173
npm run build        # production bundle in dist/
npm run lint         # eslint pass
```

> **Note:** Chrome must be closed (or you must copy the `History` file) while the backend reads it, because Chrome keeps the DB locked while running.

---


## Performance Notes

- **Code-splitting** — `SessionsList` is lazy-loaded; `html2canvas` + `jspdf` are loaded on demand for PDF export
- **IntersectionObserver** — count-up animations and scroll reveals only fire when elements enter the viewport
- **ResizeObserver** — daily trend chart re-scales its SVG path without triggering a React re-render loop
- **Memoised helpers** — deterministic seeded RNG keeps sparklines stable across renders

---

## Roadmap

- [ ] Cross-platform history paths (Windows / Linux)
- [ ] Export to PNG / shareable link
- [ ] Weekly email summary
- [ ] PWA offline support
- [ ] Real-time WebSocket sync when Chrome is open

---

## License

MIT — built for demonstration and personal analytics.

---

> Built by **Bartosz Wójs** 
