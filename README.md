# Parthiban Gunasekaran — Portfolio

Static personal portfolio site. Plain HTML, CSS and JavaScript — no build step, no dependencies.

```
index.html     page content (edit text here)
styles.css     design tokens, light/dark themes, layout
script.js      theme toggle, scroll spy, reveal animations, copy-email
assets/        resume PDF
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

**GitHub Pages:** push to a repo named `<username>.github.io` (or any repo), then
Settings → Pages → Deploy from branch → `main` / root.

**Vercel / Netlify:** import the repo; no build command, output directory is the root.

## Updating

- Swap the resume: replace `assets/Parthiban_Gunasekaran_Resume.pdf` (keep the filename).
- Colours live in the `:root` tokens at the top of `styles.css`.
