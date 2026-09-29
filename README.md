# Lochan’s World

A portfolio you walk around instead of scroll: **a tiny planet** with five buildings, each one an interactive
presentation of a part of Lochan Maheshwari’s work — *Who am I*, *Experience*, *Work*, *Results* and *Hire Lochan*.
Walk (or tap) up to a door, go inside, poke at the objects, read the stories, leave through the glowing threshold.

It is a static single-page app: **Vite + React + three.js (react-three-fiber)**, TypeScript, no backend.
Everything you see is generated in code (geometry, textures, water, sky, sound) — there are no 3D model files.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
npm run preview
```

Deploys as-is to Vercel (`vercel.json` adds long-lived cache headers for hashed assets, fonts and images).

## Playing

|            | Desktop                                   | Phone / tablet                    |
| ---------- | ----------------------------------------- | --------------------------------- |
| Walk       | `W A S D` / arrow keys (`Shift` to run)   | floating joystick, left thumb     |
| Look       | drag the mouse (wheel to zoom)            | drag with the right thumb         |
| Interact   | `E` or click the glowing thing            | tap the round button / the thing  |
| Back       | `Esc` closes a panel                      | tap ×                             |
| Sound      | `M` (off by default)                      | speaker chip                      |
| Help       | `H`                                       | ? chip                            |

* A **text version** of the whole portfolio is one click away on the intro screen (and used automatically when
  WebGL is unavailable). It is also linked as “Read the text version” for screen-reader and keyboard users.
* `prefers-reduced-motion` shortens the intro fly-in and removes the birds and butterflies.
* Resolution adapts to the device: if the frame rate sags the renderer steps its pixel ratio down (and back up).
  Force a tier with `?q=0|1|2`.

## Editing the content

**The old portfolio is the source of truth** and nothing here is invented. All words and numbers live in
`src/content/`, and the rooms only *present* them:

| File            | What it holds                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `site.ts`       | name, roles, links (`email`, `linkedin`, `instagram`, `resume`, `phone`, **`x` — fill in the X handle**) |
| `about.ts`      | the *Who am I* story, hero line and skills                                                             |
| `experience.ts` | the timeline chapters (NIT Mechanics → … → SaaSFlash, Social Capital)                                  |
| `projects.ts`   | all case studies, grouped in four wings                                                                |
| `results.ts`    | the headline numbers (`BIG`) and the proof points taken from the case studies (`PROOF`)                |
| `contact.ts`    | the four doors (Creative Direction, Launch Strategy, Content, Distribution), channels and the closing line |
| `panels.ts`     | turns any of the above into the slide-in panels                                                        |
| `secrets.ts`    | the ids of the little things to find                                                                   |

Every record carries a `source` tag: `'site'` (transcribed from the previous website) or `'brief'` (named in the
redesign brief, but no details were available). Brief-only entries — PlayerZero, PolyAI, Fish Audio, Matic,
Wispr Flow, Social Capital and the seven headline figures in `BIG` — are shown by **name only**, with an “ask about
it” link, so the world never states something that is not known. To fill one in, add its `story`, `metrics`, `role`
… and switch `source` to `'site'`; the pods, panels and screens update themselves.

## How it is put together

```
src/
  engine/     game state, planet maths, player + camera, collision, interaction, scene changes, audio, quality
  gfx/        procedural geometry builder (GeoBuilder), painterly materials, sky/water shaders, canvas text
  world/      the planet: terrain, paths, plaza, flora, dressing, life (clouds/birds/butterflies), visitors,
              and one file per building exterior (world/buildings/*)
  interiors/  the five rooms (each a small floating diorama), plus the kit they share (kit.tsx, fx.tsx, parts.ts)
  play/       the character, the game loop, loading + performance governors
  ui/         intro, loader, HUD, prompts, panels, radar, help, text fallback
  content/    all copy and numbers (see above)
```

Ideas worth knowing before changing things:

* **A planet, not a plane.** Everything outside stands on a sphere (R = 44). Places are authored on a flat *design
  map* (x east, z north, in surface units) and projected onto the sphere (`engine/planet.ts`, `world/place.tsx`).
  Movement, collision and the camera all work in each spot’s local tangent frame.
* **One draw call per prop cluster.** `GeoBuilder` merges primitives into a single vertex-coloured geometry, with
  baked contact shadows, glow and wind-sway attributes read by a patched Lambert material (`gfx/materials.ts`).
  Flora is instanced and culled by chunk and by the planet’s horizon.
* **Interiors are cut-away dioramas** placed far from the planet (`2000 + index × 300` on x). `enterBuilding()`
  opens the door, walks the visitor in, closes the iris, swaps the visible world for the room and opens the iris
  again; `exitBuilding()` reverses it. A room registers a floor, colliders and *hotspots* through `interiors/kit.tsx`.
* **Deterministic simulation.** `engine/sim.ts` steps the game with a clamped delta and owns timers (`after()`),
  so slow devices never fire cutscene beats early. `?debug` exposes `window.__lw` for automated tests
  (`step`, `teleport`, `goDoor`, `freeCam` …); `?autostart=1` skips the intro.
* **Sound is synthesised** (Web Audio, `engine/audio.ts`): ambience per place, footsteps by surface, door and UI
  sounds. It is muted until the visitor turns it on, and the choice is remembered.

## Performance notes

* ≈ 415 KB gzipped of JavaScript (three.js is the bulk), fonts self-hosted as WOFF2, images WebP, no external
  requests at runtime other than the optional work-sample embeds (loaded only when a visitor asks for them).
* Materials and shaders for every room are compiled during the loading screen, so entering a building never hitches.
* Shadows follow the visitor in a texel-snapped frustum; instance counts, shadow-map size, planet detail and
  pixel ratio come from the quality tier (`engine/quality.ts`).

## Credits

All art, code and sound in this repository are original to this project. The idea of a small playful world you
wander through is a genre with many wonderful examples; nothing from any of them — models, textures, characters,
code or branding — is used here.
