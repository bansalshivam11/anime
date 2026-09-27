# Anime - Itachi Uchiha

React single-page site built with Vite. The visual effects remain in JavaScript and render to canvas/WebGL; the image sequences are served from `public/frames`.

Live Link: https://anime-view-itachi.vercel.app/

## Project layout

- `src/SiteContent.jsx` contains the page markup.
- `src/App.jsx` mounts the UI and loads its browser effects after render.
- `src/page-effects.js` coordinates scrolling, pointer input, audio, and animation.
- `src/canvas-utils.js` contains reusable canvas, WebGL, and interpolation helpers.
- `src/app.css` contains global styles and responsive rules.
- `public/frames/` contains the image sequences and storm background.

## Run locally

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```
