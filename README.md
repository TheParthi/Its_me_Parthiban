# Parthiban Gunasekaran — Portfolio

Live: https://theparthi.github.io/Its_me_Parthiban/

React + TypeScript + Vite, styled with Tailwind CSS v4. Motion by Framer Motion,
GSAP ScrollTrigger and Lenis; the hero core is Three.js via React Three Fiber
(lazy-loaded, with an SVG fallback on mobile and for reduced motion).

## Editing content

All copy lives in `src/data/` — components never hard-code personal details.

| File | What it holds |
| --- | --- |
| `profile.ts` | Name, links, hero roles, About copy, "Currently Exploring" |
| `projects.ts` | Featured projects (showcase + detail modal) and the archive list |
| `skills.ts` | Skill constellation: categories, notes and links between skills |
| `experience.ts` | Timeline. `kind` labels Winner / Selected / Participated / Certified; `hidden: true` keeps an entry out until verified |

The resume is `public/Parthiban_Gunasekaran_Resume.pdf` (keep the filename, or
update `resumeUrl` in `profile.ts`).

## Structure

```
src/
  data/                 content (edit here)
  components/sections/  page sections: Nav, Hero, About, Projects, Lab, Skills, Experience, Exploring, Contact, Footer
  components/previews/  animated SVG project previews
  components/lab/       Engineering Lab experiments
  components/three/     WebGL hero core + fallback
  components/ui/        Reveal, Magnetic, Button, icons, cursor/grain
  lib/                  motion hooks, smooth scroll
```

## Commands

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build into dist/
npm run deploy     # build and publish dist/ to the gh-pages branch
```

GitHub Pages serves the `gh-pages` branch.
