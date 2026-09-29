// WHO AM I — a cosy study. Every object is a piece of the story; nothing is a wall of text.
import { useMemo } from 'react'
import { CanvasTexture, Vector3 } from 'three'
import { HERO } from '../content/about'
import { aboutPanel } from '../content/panels'
import { PROJECTS } from '../content/projects'
import { game } from '../engine/game'
import { store } from '../engine/store'
import { GeoBuilder } from '../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { FONT, loadHandFont, makeCanvas, roundRect, toTexture, wrapLines } from '../gfx/text'
import { LedScreen } from '../world/buildings/led'
import { SignBoard } from '../world/buildings/parts'
import { Hotspot, Interior, useBox, useCircle, useOpen } from './kit'
import { bookshelf, cat, chair, desk, lamp, plant, room, rug } from './parts'

const W = 22
const D = 16

// ---- hand-painted textures ----------------------------------------------------------------------
function windowTexture() {
  const w = 512
  const h = 700
  const { c, g } = makeCanvas(w, h)
  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#3a2f7a')
  sky.addColorStop(0.32, '#a24fa0')
  sky.addColorStop(0.58, '#f0708c')
  sky.addColorStop(0.78, '#ffb060')
  sky.addColorStop(1, '#ffe2a0')
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  // stars
  g.fillStyle = 'rgba(255,255,255,.85)'
  for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h * 0.42, 2, 2)
  // sun
  const sg = g.createRadialGradient(330, 520, 4, 330, 520, 120)
  sg.addColorStop(0, '#fff6d0')
  sg.addColorStop(0.3, '#ffd27a')
  sg.addColorStop(1, 'rgba(255,190,110,0)')
  g.fillStyle = sg
  g.fillRect(0, 300, w, 400)
  g.fillStyle = '#fff2c4'
  g.beginPath()
  g.arc(330, 520, 34, 0, Math.PI * 2)
  g.fill()
  // dunes + a small town of domes
  const layer = (y: number, col: string, amp: number, ph: number) => {
    g.fillStyle = col
    g.beginPath()
    g.moveTo(0, h)
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.014 + ph) * amp + Math.sin(x * 0.037 + ph * 2) * amp * 0.4)
    g.lineTo(w, h)
    g.closePath()
    g.fill()
  }
  layer(560, '#c85a70', 26, 1)
  const town = (x: number, base: number, s: number, col: string) => {
    g.fillStyle = col
    g.fillRect(x, base - 40 * s, 44 * s, 40 * s)
    g.beginPath()
    g.arc(x + 22 * s, base - 40 * s, 20 * s, Math.PI, 0)
    g.fill()
    g.fillRect(x + 21 * s, base - 78 * s, 2 * s, 18 * s)
    g.fillRect(x - 12 * s, base - 62 * s, 8 * s, 62 * s)
    g.beginPath()
    g.arc(x - 8 * s, base - 62 * s, 6 * s, Math.PI, 0)
    g.fill()
    g.fillRect(x + 48 * s, base - 54 * s, 8 * s, 54 * s)
    g.beginPath()
    g.arc(x + 52 * s, base - 54 * s, 6 * s, Math.PI, 0)
    g.fill()
  }
  town(90, 600, 1.15, '#7a3a64')
  town(250, 618, 0.8, '#7a3a64')
  town(380, 606, 1.0, '#6a3058')
  layer(610, '#8a3f64', 20, 3)
  layer(650, '#5a2a56', 16, 5)
  // birds
  g.strokeStyle = '#3a2350'
  g.lineWidth = 3
  for (const [bx, by] of [[150, 300], [190, 330], [110, 340]]) {
    g.beginPath()
    g.moveTo(bx - 10, by)
    g.quadraticCurveTo(bx, by - 9, bx + 10, by)
    g.stroke()
  }
  return toTexture(c, 4)
}

function laptopDraw() {
  const lines = ['> hello, world.', '', "hi, i'm lochan.", 'creative director.', 'strategist.', 'builder.']
  return (g: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    g.fillStyle = '#17142b'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#ffe3a1'
    g.font = `500 44px ${FONT.mono}`
    g.textBaseline = 'top'
    const total = lines.join('\n').length
    const n = Math.floor((t * 9) % (total + 30))
    let left = n
    lines.forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left))
      left -= ln.length + 1
      g.fillStyle = i === 2 ? '#fff8ea' : '#ffe3a1'
      g.fillText(part, 40, 34 + i * 62)
    })
    if (Math.floor(t * 2) % 2 === 0) {
      g.fillStyle = '#ff8f7a'
      g.fillRect(40 + Math.min(n, 30) * 26 * 0 + 12, h - 70, 26, 8)
    }
  }
}

function chalkTexture() {
  const w = 720
  const h = 480
  const { c, g } = makeCanvas(w, h)
  const draw = () => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = '#26403f'
    roundRect(g, 0, 0, w, h, 24)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.08)'
    g.lineWidth = 30
    g.beginPath()
    g.moveTo(-20, 340)
    g.lineTo(w + 20, 230)
    g.stroke()
    g.textAlign = 'left'
    g.fillStyle = '#fff8ea'
    g.font = `600 64px ${FONT.hand}`
    g.fillText('what I do:', 44, 84)
    const skills = ['Creative Writing', 'Copywriting', 'Creative Strategy', 'Direction', 'Team Management']
    g.font = `600 50px ${FONT.hand}`
    skills.forEach((sk, i) => {
      g.fillStyle = ['#ffd27a', '#ff9a82', '#9be4d4', '#c8b5ff', '#ffe3a1'][i]
      g.fillText(`${i + 1}. ${sk}`, 60, 160 + i * 62)
    })
    g.strokeStyle = '#ffd27a'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(44, 100)
    g.lineTo(290, 100)
    g.stroke()
  }
  draw()
  const tex = toTexture(c, 4) as CanvasTexture
  loadHandFont().then(() => {
    draw()
    tex.needsUpdate = true
  })
  return tex
}

function corkTexture() {
  const w = 1024
  const h = 768
  const { c, g } = makeCanvas(w, h)
  const tex = toTexture(c, 4) as CanvasTexture
  const drawBase = () => {
    g.fillStyle = '#c99a62'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${90 + Math.random() * 80},${50 + Math.random() * 50},20,${0.08 + Math.random() * 0.12})`
      g.beginPath()
      g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, Math.PI * 2)
      g.fill()
    }
    g.lineWidth = 22
    g.strokeStyle = '#6a4432'
    g.strokeRect(11, 11, w - 22, h - 22)
  }
  drawBase()
  void paintPolaroids(g, tex)
  return tex
}

async function paintPolaroids(g: CanvasRenderingContext2D, tex: CanvasTexture) {
  const picks = ['saasflash', 'greg', 'den', 'june', 'beyond', 'evolving', 'sahil', 'gfg']
  const items = picks.map((id) => PROJECTS.find((p) => p.id === id)!).filter(Boolean)
  const imgs = await Promise.all(
    items.map(
      (p) =>
        new Promise<HTMLImageElement | null>((res) => {
          const im = new Image()
          im.onload = () => res(im)
          im.onerror = () => res(null)
          im.src = p.logo!
        }),
    ),
  )
  await loadHandFont()
  const pos = [
    [150, 170, -0.1],
    [400, 150, 0.07],
    [660, 170, -0.05],
    [880, 150, 0.09],
    [190, 500, 0.08],
    [450, 520, -0.07],
    [700, 500, 0.05],
    [900, 520, -0.09],
  ]
  const pins: [number, number][] = []
  items.forEach((p, i) => {
    const [x, y, rot] = pos[i]
    pins.push([x, y - 128])
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.shadowColor = 'rgba(40,20,10,.35)'
    g.shadowBlur = 16
    g.shadowOffsetY = 6
    g.fillStyle = '#fffaf0'
    g.fillRect(-108, -128, 216, 262)
    g.shadowColor = 'transparent'
    g.fillStyle = '#e8e2d4'
    g.fillRect(-92, -112, 184, 184)
    const im = imgs[i]
    if (im) {
      const r = Math.min(184 / im.naturalWidth, 184 / im.naturalHeight)
      const iw = im.naturalWidth * r
      const ih = im.naturalHeight * r
      g.fillStyle = '#fff'
      g.fillRect(-92, -112, 184, 184)
      g.drawImage(im, -iw / 2, -112 + (184 - ih) / 2, iw, ih)
    }
    g.fillStyle = '#2b2438'
    g.textAlign = 'center'
    g.font = `600 30px ${FONT.hand}`
    const nm = p.name
    g.fillText(nm.length > 15 ? nm.slice(0, 14) + '…' : nm, 0, 116)
    g.restore()
  })
  // red string
  g.strokeStyle = '#d33d3d'
  g.lineWidth = 3
  g.beginPath()
  pins.forEach(([x, y], i) => (i ? g.lineTo(x, y + 8 + (i % 2) * 6) : g.moveTo(x, y + 8)))
  g.stroke()
  for (const [x, y] of pins) {
    g.fillStyle = '#d33d3d'
    g.beginPath()
    g.arc(x, y + 8, 9, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,.6)'
    g.beginPath()
    g.arc(x - 3, y + 5, 3, 0, Math.PI * 2)
    g.fill()
  }
  tex.needsUpdate = true
}

function posterTexture() {
  const w = 700
  const h = 480
  const { c, g } = makeCanvas(w, h)
  g.fillStyle = P.terracotta
  roundRect(g, 0, 0, w, h, 20)
  g.fill()
  g.lineWidth = 10
  g.strokeStyle = P.cream
  roundRect(g, 18, 18, w - 36, h - 36, 12)
  g.stroke()
  g.fillStyle = P.cream
  g.textAlign = 'center'
  g.font = `900 44px ${FONT.display}`
  const lines = wrapLines(g, `“${HERO.lead}”`, w - 120)
  lines.forEach((ln, i) => g.fillText(ln, w / 2, 170 + i * 56))
  g.font = `500 22px ${FONT.mono}`
  ;(g as any).letterSpacing = '6px'
  g.fillStyle = '#ffd9a8'
  g.fillText('CREATIVE DIRECTOR · STRATEGIST · BUILDER', w / 2, h - 66)
  return toTexture(c, 4)
}

function buildRoom() {
  const b = new GeoBuilder(101)
  b.aoHeight = 2.2
  b.ao = 0.28
  room(b, { w: W, d: D, wallH: 8, floorTop: '#e2c197', floorSide: '#a98368', wall: '#f5e3c8', wallTop: '#faeed8', trim: '#b98a68' })
  // planks hint on the floor
  for (let i = -5; i <= 5; i++) b.put(i * 2, 0.005, 0, (b) => b.box(0.05, 0.02, D - 0.4, '#c9a273', { ao: 0 }))
  // window frame in the back wall
  b.put(4.6, 1.3, -D / 2 + 0.06, (b) => b.arch(4.6, 6.0, 0.32, P.cream))
  b.put(4.6, 1.3, -D / 2 + 0.27, (b) => b.box(4.7, 0.24, 0.5, P.cream))
  // rug, desk, chair, shelves, lamps, plants
  rug(b, 0, 1.6, 8.6, 5.6, P.tealDeep, P.cream, P.terracotta)
  desk(b, -4.0, -5.4)
  chair(b, -4.0, -3.6, Math.PI, P.marigold)
  bookshelf(b, -10.2, -2.2, Math.PI / 2, 4.6, 5.0, 3)
  bookshelf(b, -10.2, 3.4, Math.PI / 2, 3.2, 3.2, 8)
  plant(b, -8.6, -7.0, 1.3, P.pink)
  plant(b, 9.6, -7.0, 1.2, P.marigold)
  plant(b, 9.8, 5.2, 1.0)
  cat(b, 1.2, 2.4, 0.6)
  const glows = [lamp(b, 7.6, -6.8, 3.2), lamp(b, -8.6, 5.6, 2.8)]
  // side table + typewriter
  b.put(-7.6, 0, 0.4, (b) => b.box(1.7, 1.15, 1.3, P.wood))
  b.put(-7.6, 1.15, 0.4, (b) => b.box(1.2, 0.34, 0.9, '#3a3350'))
  b.put(-7.6, 1.52, 0.5, (b) => b.box(1.0, 0.1, 0.6, '#4a4260'))
  b.put(-7.6, 1.5, 0.05, (b) => b.box(0.9, 0.5, 0.06, '#fff8ea'))
  // toy robot on the desk
  b.push().at(-2.3, 1.18, -5.5)
  b.put(0, 0, 0, (b) => b.box(0.55, 0.5, 0.4, P.teal))
  b.put(0, 0.52, 0, (b) => b.box(0.4, 0.34, 0.34, P.cream))
  b.put(-0.09, 0.66, 0.18, (b) => b.sphere(0.055, P.marigold, { glow: 0.9 }, 5, 4))
  b.put(0.09, 0.66, 0.18, (b) => b.sphere(0.055, P.marigold, { glow: 0.9 }, 5, 4))
  b.put(0, 0.86, 0, (b) => b.cyl(0.02, 0.02, 0.2, 4, P.ink))
  b.put(0, 1.06, 0, (b) => b.sphere(0.06, P.coral, { glow: 0.8 }, 5, 4))
  b.pop()
  // tripod + camera
  b.push().at(7.4, 0, 1.6)
  for (const a of [0, 2.1, 4.2]) b.push().rotY(a).at(0.55, 0, 0).rotZ(0.28).cyl(0.05, 0.05, 2.7, 5, P.ink).pop()
  b.put(0, 2.5, 0, (b) => b.box(0.9, 0.62, 0.7, P.ink))
  b.put(0, 2.52, 0.45, (b) => b.cyl(0.3, 0.3, 0.42, 12, '#4a4260'))
  b.put(0, 2.52, 0.68, (b) => b.cyl(0.22, 0.22, 0.06, 12, '#8fd4ff', { glow: 0.5 }))
  b.put(0, 2.88, -0.05, (b) => b.box(0.3, 0.14, 0.2, P.red))
  b.pop()
  // pinboard + poster frames
  b.put(10.55, 1.6, -3.2, (b) => b.box(0.32, 4.4, 5.6, '#6a4432'))
  b.put(-0.2, 3.35, -D / 2 + 0.06, (b) => b.box(4.1, 2.9, 0.22, P.woodDark))
  return { geo: b.build(), glows }
}

function HomeContent() {
  const { geo, glows } = useMemo(buildRoom, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffbf5a', 0.8), [])
  const winTex = useMemo(windowTexture, [])
  const posterTex = useMemo(posterTexture, [])
  const chalkTex = useMemo(chalkTexture, [])
  const corkTex = useMemo(corkTexture, [])
  const draw = useMemo(laptopDraw, [])
  const open = useOpen()
  const deskMat = useMemo(() => worldMaterial({ map: corkTex, rim: false }), [corkTex])

  // furniture is solid
  useBox(-4.0, -5.4, 1.8, 0.85, 2)
  useBox(-10.2, -2.2, 0.6, 2.4, 3)
  useBox(-10.2, 3.4, 0.6, 1.7, 3)
  useBox(-7.6, 0.4, 0.95, 0.75, 1.4)
  useCircle(7.4, 1.6, 0.9, 3)
  useCircle(-8.6, -7.0, 0.6, 2)
  useCircle(9.6, -7.0, 0.6, 2)
  useCircle(9.8, 5.2, 0.55, 2)
  useCircle(7.6, -6.8, 0.4, 3)
  useCircle(-8.6, 5.6, 0.4, 3)
  useBox(10.55, -3.2, 0.6, 2.8, 4)

  const note = (id: string, text: string) => () => {
    const st = store.getState()
    st.showToast(text, st.addSecret(id) ? 'secret' : 'info')
  }

  return (
    <>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {glows.map((g, i) => (
        <sprite key={i} material={halo} position={g} scale={[3.4, 3.4, 1]} />
      ))}
      {/* the window: dusk over a small desert town */}
      <SignBoard map={winTex} w={4.1} h={5.6} position={[4.6, 4.2, -D / 2 + 0.29]} lit={false} />
      <SignBoard map={posterTex} w={3.7} h={2.55} position={[-0.2, 3.35, -D / 2 + 0.2]} />
      <SignBoard map={chalkTex} w={2.5} h={1.67} position={[-10.3, 3.9, -6.6]} rotation={[0, Math.PI / 2, 0]} />
      <mesh position={[10.36, 3.35, -3.2]} rotation={[0, -Math.PI / 2, 0]} material={deskMat}>
        <planeGeometry args={[5.0, 3.75]} />
      </mesh>
      <LedScreen w={1.32} h={0.84} position={[-4.55, 1.72, -5.48]} rotation={[-0.25, 0, 0]} draw={draw} fps={10} texW={512} texH={340} range={40} active={() => game.mode === 'interior'} />

      <Hotspot id="laptop" x={-4.0} y={1.9} z={-4.4} radius={3.2} label="OPEN" title="The laptop" look={[-4.4, 1.7, -5.4]} onUse={() => open(aboutPanel('hello'), -4.4, 1.9, -5.2, 7.5)} />
      <Hotspot id="window" x={4.6} y={2.2} z={-6.4} radius={3.6} label="LOOK OUT" title="Where it started" look={[4.6, 4, -D / 2]} onUse={() => open(aboutPanel('origin'), 4.6, 3.6, -7.2, 9)} />
      <Hotspot id="chalk" x={-8.6} y={2.2} z={-6.0} radius={3.2} label="READ" title="The chalkboard" look={[-10.3, 3.9, -6.6]} onUse={() => open(aboutPanel('skills'), -10.1, 3.6, -6.2, 8)} />
      <Hotspot id="camera" x={6.2} y={2.4} z={2.8} radius={3.2} label="LOOK THROUGH" title="The camera" look={[7.4, 2.6, 1.6]} onUse={() => open(aboutPanel('turn'), 7.4, 2.6, 1.6, 8)} />
      <Hotspot id="pins" x={8.4} y={2.6} z={-3.2} radius={3.4} label="READ" title="The pinboard" look={[10.5, 3.4, -3.2]} onUse={() => open(aboutPanel('craft'), 10.4, 3.2, -3.2, 8.5)} />
      <Hotspot
        id="robot"
        x={-2.5}
        y={2.2}
        z={-4.3}
        radius={2.4}
        label="POKE"
        title="Toy robot"
        kind="secret"
        look={[-2.3, 1.7, -5.5]}
        onUse={() => {
          note('robot', 'Beep. Still thinks like an engineer.')()
          open(aboutPanel('both'), -2.3, 1.9, -5.5, 7.5)
        }}
      />
      <Hotspot id="typewriter" x={-6.5} y={1.9} z={1.7} radius={2.4} label="TYPE" title="Typewriter" kind="secret" look={[-7.6, 1.6, 0.4]} onUse={note('typewriter', 'Clack clack clack. The first draft is always a lie.')} />
    </>
  )
}

export function HomeRoom() {
  return (
    <Interior id="home" w={W} d={D} floor="wood">
      <HomeContent />
    </Interior>
  )
}

void Vector3
