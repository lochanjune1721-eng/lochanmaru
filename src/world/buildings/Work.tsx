// WORK — "The Studio": a cinema for case studies. A huge LED marquee cycles through every project,
// searchlights sweep the sky, a film reel turns on the roof, and a red carpet leads to the doors.
import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, ShaderMaterial, Vector3 } from 'three'
import { R } from '../../engine/planet'
import { PROJECTS, WINGS } from '../../content/projects'
import { register } from '../../engine/interact'
import { game } from '../../engine/game'
import { store } from '../../engine/store'
import { GeoBuilder } from '../../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../../gfx/materials'
import { P } from '../../gfx/palette'
import { FONT, fitText, makeCanvas, roundRect, signTexture, toTexture, wrapLines } from '../../gfx/text'
import { registerCullable } from '../cull'
import { POIS } from '../layout'
import { Placed, boxCollider, circleCollider, makeFrame, subFrame } from '../place'
import { ribbon } from '../ribbon'
import { Bulbs, LedScreen } from './led'
import { Door, SignBoard, useBuildingDoor } from './parts'
import { addBench, addLamp, addPlanter, V3 } from '../props'

const FRONT = 8.1
const W = 20
const D = 16

function buildStudio() {
  const b = new GeoBuilder(51)
  b.aoHeight = 2.6
  b.ao = 0.3
  const teal = P.teal
  // plinth + body
  b.put(0, -2.4, 0, (b) => b.box(W + 1.2, 3.1, D + 1.2, '#e8d7b4'))
  b.put(0, 0.7, 0, (b) => b.box(W, 8.2, D, teal, { top: '#3fb0a8' }))
  // cream bands
  b.put(0, 0.7, 0, (b) => b.box(W + 0.24, 0.55, D + 0.24, P.cream))
  b.put(0, 8.35, 0, (b) => b.box(W + 0.5, 0.6, D + 0.5, P.cream))
  b.put(0, 8.95, 0, (b) => b.box(W + 0.24, 0.3, D + 0.24, P.marigold))
  // barrel-vault roof (half cylinder along X, squashed)
  const vault = new CylinderGeometry(D / 2, D / 2, W, 28, 1, false, 0, Math.PI)
  b.push().at(0, 9.25, 0).rotZ(Math.PI / 2).scale(0.42, 1, 1).custom(vault, P.cream, { top: '#fff4de' }).pop()
  // vault ribs
  for (let i = -4; i <= 4; i++) {
    const rib = new CylinderGeometry(D / 2 + 0.06, D / 2 + 0.06, 0.28, 28, 1, false, 0, Math.PI)
    b.push().at(i * 2.3, 9.25, 0).rotZ(Math.PI / 2).scale(0.42, 1, 1).custom(rib, P.tealDeep).pop()
  }
  // film-strip frieze along the top of the walls
  for (let i = 0; i < 20; i++) {
    const x = -W / 2 + 0.5 + i * (W - 1) / 19
    b.put(x, 7.05, D / 2 + 0.13, (b) => b.box(0.55, 0.42, 0.06, P.ink))
    b.put(x, 7.05, -D / 2 - 0.13, (b) => b.box(0.55, 0.42, 0.06, P.ink))
  }
  for (let i = 0; i < 16; i++) {
    const z = -D / 2 + 0.5 + i * (D - 1) / 15
    b.put(W / 2 + 0.13, 7.05, z, (b) => b.box(0.06, 0.42, 0.55, P.ink))
    b.put(-W / 2 - 0.13, 7.05, z, (b) => b.box(0.06, 0.42, 0.55, P.ink))
  }
  // big screen bezel above the entrance
  b.put(0, 4.55, FRONT + 0.1, (b) => b.box(13.2, 4.6, 0.36, P.ink))
  b.put(0, 4.55, FRONT + 0.04, (b) => b.box(13.8, 5.0, 0.16, P.tealDeep))
  // marquee canopy over the doors + pillars
  b.put(0, 3.85, FRONT + 1.7, (b) => b.box(9.6, 0.4, 3.4, P.red))
  b.put(0, 4.25, FRONT + 1.7, (b) => b.box(9.9, 0.16, 3.7, P.marigold))
  for (const sx of [-4.4, 4.4]) {
    b.put(sx, 0, FRONT + 3.1, (b) => b.cyl(0.28, 0.34, 3.85, 10, P.cream))
    b.put(sx, 3.6, FRONT + 3.1, (b) => b.cyl(0.42, 0.3, 0.3, 10, P.gold))
    b.put(sx, 0, FRONT + 3.1, (b) => b.cyl(0.5, 0.55, 0.3, 10, P.gold))
  }
  // steps
  b.put(0, 0.05, FRONT + 0.9, (b) => b.box(6.2, 0.2, 1.3, '#efe0c0'))
  b.put(0, 0.0, FRONT + 1.55, (b) => b.box(7.2, 0.12, 1.1, '#f6ead0'))
  // poster cases beside the doors
  for (const sx of [-1, 1]) {
    for (const k of [0, 1]) {
      const x = sx * (6.1 + k * 2.55)
      b.put(x, 1.0, FRONT + 0.12, (b) => b.box(2.25, 3.25, 0.24, P.woodDark))
    }
  }
  // searchlight bases + roof plinth for the reel
  for (const sx of [-1, 1]) {
    b.put(sx * 8.6, 9.6, D / 2 - 1.2, (b) => b.cyl(0.9, 1.05, 0.7, 10, P.ink))
    b.put(sx * 8.6, 10.2, D / 2 - 1.2, (b) => b.cyl(0.55, 0.9, 1.0, 10, '#4b425a'))
  }
  b.put(-6.8, 11.0, -0.4, (b) => b.box(0.9, 4.6, 0.9, P.woodDark))
  // side windows (round portholes) so the flanks are not blank
  for (const sz of [-4.5, 0, 4.5]) {
    for (const sx of [-1, 1]) {
      b.push().at(sx * (W / 2 + 0.04), 3.9, sz).rotY(sx * Math.PI / 2).rotX(Math.PI / 2)
      b.put(0, 0, 0, (b) => b.cyl(1.2, 1.2, 0.2, 18, P.cream))
      b.put(0, 0.11, 0, (b) => b.cyl(0.98, 0.98, 0.1, 18, '#2a1b33', { glow: 0.55, ao: 0 }))
      b.pop()
    }
  }
  return b.build()
}

function buildReel() {
  const b = new GeoBuilder(52)
  b.ao = 0
  b.push().rotX(Math.PI / 2)
  b.cyl(2.3, 2.3, 0.5, 26, '#f4efe4')
  b.put(0, 0.5, 0, (b) => b.cyl(2.3, 2.3, 0.14, 26, P.red))
  b.put(0, -0.14, 0, (b) => b.cyl(2.3, 2.3, 0.14, 26, P.red))
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    b.put(Math.cos(a) * 1.35, -0.16, Math.sin(a) * 1.35, (b) => b.cyl(0.5, 0.5, 0.82, 12, P.teal))
  }
  b.put(0, -0.2, 0, (b) => b.cyl(0.32, 0.32, 0.9, 10, P.gold))
  b.pop()
  return b.build()
}

function buildBooth() {
  const b = new GeoBuilder(53)
  b.aoHeight = 1.6
  b.put(0, -1.4, 0, (b) => b.box(3.2, 1.6, 2.6, '#e8d7b4'))
  b.box(2.8, 3.1, 2.2, P.saffron, { top: '#ffc45c' })
  b.put(0, 1.05, 1.12, (b) => b.box(1.7, 1.1, 0.1, '#2a1b33', { glow: 0.6, ao: 0 }))
  b.put(0, 0.98, 1.4, (b) => b.box(2.2, 0.16, 0.6, P.woodDark))
  for (let i = 0; i < 6; i++) b.put(-1.4 + (i + 0.5) * (2.8 / 6), 2.35, 1.5, (b) => b.rotX(-0.42).box(2.8 / 6, 0.07, 0.95, i % 2 ? P.cream : P.red))
  b.put(0, 3.1, 0, (b) => b.box(3.2, 0.3, 2.6, P.cream))
  b.put(0, 3.4, 0, (b) => b.cone(1.9, 1.2, 4, P.red))
  return b.build()
}

/** the marquee screen: cycles every case study, wipe transitions, logos where we have them */
function useMarqueeDraw() {
  const logos = useRef<Record<string, HTMLImageElement>>({})
  useEffect(() => {
    PROJECTS.forEach((p) => {
      if (!p.logo || logos.current[p.id]) return
      const im = new Image()
      im.src = p.logo
      logos.current[p.id] = im
    })
  }, [])
  return useCallback((g: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    const SLIDE = 3.2
    const n = PROJECTS.length
    const idx = Math.floor(t / SLIDE) % n
    const prog = (t % SLIDE) / SLIDE
    const drawSlide = (i: number, ox: number) => {
      const p = PROJECTS[i]
      const wing = WINGS.find((x) => x.id === p.wing)!
      g.save()
      g.translate(ox, 0)
      const grd = g.createLinearGradient(0, 0, w, h)
      grd.addColorStop(0, '#171326')
      grd.addColorStop(1, wing.color)
      g.fillStyle = grd
      g.fillRect(0, 0, w, h)
      // scanlines
      g.fillStyle = 'rgba(255,255,255,0.035)'
      for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2)
      g.textBaseline = 'middle'
      g.textAlign = 'left'
      g.fillStyle = '#ffe3a1'
      g.font = `500 26px ${FONT.mono}`
      ;(g as any).letterSpacing = '6px'
      g.fillText('NOW SHOWING', 56, 54)
      g.fillStyle = 'rgba(255,255,255,0.7)'
      g.textAlign = 'right'
      g.fillText(`${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, w - 56, 54)
      ;(g as any).letterSpacing = '0px'
      const im = logos.current[p.id]
      const hasLogo = !!(im && im.complete && im.naturalWidth)
      const left = hasLogo ? 300 : 56
      if (hasLogo) {
        g.save()
        g.beginPath()
        g.arc(160, h / 2 + 8, 108, 0, Math.PI * 2)
        g.clip()
        g.fillStyle = '#fff'
        g.fillRect(40, 60, 240, 240)
        const r = Math.min(240 / im.naturalWidth, 240 / im.naturalHeight)
        const iw = im.naturalWidth * r
        const ih = im.naturalHeight * r
        g.drawImage(im, 160 - iw / 2, h / 2 + 8 - ih / 2, iw, ih)
        g.restore()
        g.lineWidth = 8
        g.strokeStyle = '#ffe3a1'
        g.beginPath()
        g.arc(160, h / 2 + 8, 108, 0, Math.PI * 2)
        g.stroke()
      }
      g.textAlign = 'left'
      g.fillStyle = '#fff8ea'
      const nm = p.name.toUpperCase()
      const size = fitText(g, nm, w - left - 56, 118, 900, FONT.display, 40)
      g.font = `900 ${size}px ${FONT.display}`
      g.fillText(nm, left, h / 2 - 8)
      if (p.headline) {
        g.font = `700 50px ${FONT.sans}`
        g.fillStyle = '#ffe3a1'
        g.fillText(p.headline, left, h / 2 + 76)
      } else {
        g.font = `500 30px ${FONT.mono}`
        g.fillStyle = 'rgba(255,255,255,0.75)'
        ;(g as any).letterSpacing = '5px'
        g.fillText('CASE STUDY', left, h / 2 + 72)
        ;(g as any).letterSpacing = '0px'
      }
      g.font = `500 24px ${FONT.mono}`
      g.fillStyle = 'rgba(255,255,255,0.65)'
      ;(g as any).letterSpacing = '4px'
      g.fillText(wing.name, left, h - 44)
      ;(g as any).letterSpacing = '0px'
      g.restore()
    }
    const e = prog < 0.88 ? 0 : (prog - 0.88) / 0.12
    const ease = e * e * (3 - 2 * e)
    drawSlide(idx, -ease * w)
    if (e > 0) drawSlide((idx + 1) % n, w - ease * w)
    // progress ticks
    g.fillStyle = 'rgba(255,255,255,0.18)'
    g.fillRect(56, h - 18, w - 112, 4)
    g.fillStyle = '#ffe3a1'
    g.fillRect(56, h - 18, (w - 112) * ((idx + prog) / n), 4)
  }, [])
}

export function Work() {
  const poi = POIS.work
  const frame = useMemo(() => makeFrame(poi.x, poi.z, poi.yaw), [poi])
  const geo = useMemo(buildStudio, [])
  const reelGeo = useMemo(buildReel, [])
  const boothGeo = useMemo(buildBooth, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffcf7a', 0.8), [])
  const root = useRef<Group>(null)
  const reel = useRef<Group>(null)
  const beams = useRef<Group[]>([])
  const draw = useMarqueeDraw()

  const canopySign = useMemo(() => signTexture({ text: 'WORK', sub: 'NOW SHOWING · EVERY CASE STUDY', w: 1024, h: 240, bg: P.red, border: '#ffe3a1', color: '#fff8ea', subColor: '#ffe3a1' }), [])
  const roofSign = useMemo(() => signTexture({ text: 'THE STUDIO', sub: 'CASE STUDIES', w: 1024, h: 240, bg: P.ink, border: P.marigold, color: P.marigold, subColor: '#f8ecd5' }), [])
  const posters = useMemo(
    () =>
      WINGS.map((w) => {
        const { c, g } = makeCanvas(380, 520)
        g.fillStyle = w.color
        roundRect(g, 0, 0, 380, 520, 24)
        g.fill()
        g.lineWidth = 10
        g.strokeStyle = '#fff8ea'
        roundRect(g, 14, 14, 352, 492, 16)
        g.stroke()
        g.fillStyle = 'rgba(255,255,255,0.7)'
        g.font = `500 26px ${FONT.mono}`
        ;(g as any).letterSpacing = '6px'
        g.textAlign = 'center'
        g.fillText('THE WING', 190, 78)
        ;(g as any).letterSpacing = '0px'
        g.fillStyle = '#fff8ea'
        g.font = `900 70px ${FONT.display}`
        const lines = wrapLines(g, w.name, 300)
        lines.forEach((ln, i) => g.fillText(ln, 190, 210 + i * 78))
        g.font = `600 26px ${FONT.sans}`
        g.fillStyle = 'rgba(255,255,255,0.85)'
        const sub = wrapLines(g, w.sub, 290)
        sub.forEach((ln, i) => g.fillText(ln, 190, 420 + i * 32))
        return toTexture(c, 8)
      }),
    [],
  )
  const bulbPts = useMemo(() => {
    const pts: V3[] = []
    for (let i = 0; i <= 24; i++) pts.push([-4.7 + (i * 9.4) / 24, 3.78, FRONT + 3.45])
    for (let i = 1; i <= 8; i++) pts.push([4.7, 3.78, FRONT + 3.45 - (i * 3.3) / 8], [-4.7, 3.78, FRONT + 3.45 - (i * 3.3) / 8])
    // around the big screen
    for (let i = 0; i <= 28; i++) pts.push([-6.7 + (i * 13.4) / 28, 7.12, FRONT + 0.32])
    for (let i = 0; i <= 28; i++) pts.push([-6.7 + (i * 13.4) / 28, 2.0, FRONT + 0.32])
    for (let i = 1; i < 10; i++) pts.push([-6.7, 2.0 + (i * 5.1) / 10, FRONT + 0.32], [6.7, 2.0 + (i * 5.1) / 10, FRONT + 0.32])
    return pts
  }, [])

  const carpet = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 26; i++) pts.push(frame.unit(0, FRONT + 1.9 + i * 0.7))
    return ribbon({
      pts,
      width: 3.0,
      lift: 0.06,
      cross: [
        { at: -1, color: new Color(P.gold) },
        { at: -0.86, color: new Color('#d33d3d') },
        { at: 0.86, color: new Color('#d33d3d') },
        { at: 1, color: new Color(P.gold) },
      ],
    })
  }, [frame])
  const boothFrame = useMemo(() => subFrame(frame, 8.6, FRONT + 6.4, -0.25), [frame])
  const carpetMat = useMemo(() => worldMaterial({ ground: true, rim: false, double: true, decal: 3 }), [])

  const posts = useMemo(() => {
    const b = new GeoBuilder(54)
    b.aoHeight = 0.6
    for (let i = 0; i < 8; i++) {
      const z = FRONT + 4.2 + i * 2.6
      for (const sx of [-1, 1]) {
        b.stand(sx * 2.15, z)
        b.cyl(0.16, 0.2, 0.15, 8, P.gold)
        b.put(0, 0.15, 0, (b) => b.cyl(0.05, 0.06, 0.95, 6, P.gold))
        b.put(0, 1.1, 0, (b) => b.sphere(0.12, P.gold, {}, 6, 5))
        b.pop()
        if (i < 7) {
          // rope: between the two post tops, following the sphere
          const a = new Vector3(sx * 2.15, 0, z)
          const c = new Vector3(sx * 2.15, 0, z + 2.6)
          const up = (v: Vector3) => {
            const d = new Vector3(v.x, R, v.z).normalize()
            return [d.x * R, d.y * R - R + 0.95 * d.y, d.z * R] as [number, number, number]
          }
          const pa = up(a)
          const pc = up(c)
          b.bar([pa[0], pa[1], pa[2]], [pc[0], pc[1], pc[2]], 0.035, 5, P.red)
        }
      }
    }
    return b.build()
  }, [])

  const court = useMemo(() => {
    const b = new GeoBuilder(55)
    const glows: V3[] = []
    glows.push(addLamp(b, -4.6, FRONT + 5.2), addLamp(b, 4.6, FRONT + 5.2))
    glows.push(addLamp(b, -4.6, FRONT + 12.4), addLamp(b, 4.6, FRONT + 12.4))
    addPlanter(b, -6.6, FRONT + 3.6, 1.1, P.pink)
    addPlanter(b, 6.6, FRONT + 3.6, 1.1, P.marigold)
    addBench(b, -8.2, FRONT + 8.4, Math.PI / 2 - 0.35)
    return { geo: b.build(), glows }
  }, [])

  useBuildingDoor({ id: 'work', label: poi.label, color: '#e2493f', frame, doorZ: FRONT + 0.16, lookY: 2.0, radius: 6.2 })

  useEffect(() => {
    const offs = [
      boxCollider(frame, 0, 0, W / 2 + 0.3, D / 2 + 0.3, 12),
      circleCollider(frame, -4.4, FRONT + 3.1, 0.5, 4),
      circleCollider(frame, 4.4, FRONT + 3.1, 0.5, 4),
      boxCollider(frame, 8.6, FRONT + 6.4, 1.6, 1.4, 4),
      circleCollider(frame, -4.6, FRONT + 5.2, 0.35, 3),
      circleCollider(frame, 4.6, FRONT + 5.2, 0.35, 3),
      circleCollider(frame, -4.6, FRONT + 12.4, 0.35, 3),
      circleCollider(frame, 4.6, FRONT + 12.4, 0.35, 3),
      registerCullable({ obj: root.current!, n: frame.n, ang: 0.5, h: 18 }),
      register({
        id: 'ticket-booth',
        anchor: frame.toWorld(8.6, 1.6, FRONT + 8.0),
        radius: 3.0,
        label: 'KNOCK',
        title: 'Ticket booth',
        kind: 'secret',
        scope: 'world',
        look: frame.toWorld(8.6, 1.8, FRONT + 6.4),
        onUse: () => {
          const st = store.getState()
          if (st.addSecret('booth')) st.showToast('Admission: one curious click. You’re already in.', 'secret')
          else st.showToast('Admission is still one curious click.', 'info')
        },
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [frame])

  useFrame(() => {
    const t = game.time
    if (reel.current) reel.current.rotation.z = t * 0.5
    beams.current.forEach((g, i) => {
      if (!g) return
      g.rotation.z = Math.sin(t * 0.5 + i * 2.1) * 0.55
      g.rotation.x = Math.cos(t * 0.37 + i * 1.3) * 0.35 - 0.2
    })
  })

  const beamGeo = useMemo(() => new ConeGeometry(3.6, 46, 22, 1, true).rotateX(Math.PI).translate(0, 23, 0), [])
  const beamMat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: { uColor: { value: new Color('#ffe9b8') } },
        vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.4); float a = vUv.y * vUv.y * f; gl_FragColor = vec4(uColor, a * 0.32); }`,
      }),
    [],
  )

  return (
    <>
      <mesh geometry={carpet} material={carpetMat} receiveShadow renderOrder={2} />
      <Placed frame={boothFrame}>
        <mesh geometry={boothGeo} material={mat} castShadow receiveShadow />
      </Placed>
      <Placed frame={frame}>
      <group ref={root}>
        <mesh geometry={geo} material={mat} castShadow receiveShadow />
        <Door id="work" width={3.5} height={4.0} color={P.tealDeep} dark="#154b52" trim={P.cream} position={[0, 0.02, FRONT + 0.16]} frame={frame} localZ={FRONT + 0.16} />
        <SignBoard map={canopySign} w={9.0} h={1.35} position={[0, 3.62, FRONT + 3.45]} lit={false} />
        <SignBoard map={roofSign} w={8.6} h={2.0} position={[0, 12.7, -2.6]} lit={false} />
        <LedScreen w={13.0} h={4.4} position={[0, 4.55, FRONT + 0.3]} draw={draw} fps={12} texW={1024} texH={346} range={80} />
        <Bulbs points={bulbPts} size={0.09} speed={6} group={3} />
        {posters.map((tex, i) => {
          const sx = i < 2 ? -1 : 1
          const k = i % 2
          return <SignBoard key={i} map={tex} w={1.95} h={2.86} position={[sx * (6.1 + k * 2.55), 2.6, FRONT + 0.27]} />
        })}
        <group ref={reel} position={[-6.8, 16.0, -0.4]}>
          <mesh geometry={reelGeo} material={mat} castShadow />
        </group>
        {[-1, 1].map((sx, i) => (
          <group key={i} ref={(g) => { if (g) beams.current[i] = g }} position={[sx * 8.6, 10.7, D / 2 - 1.2]}>
            <mesh geometry={beamGeo} material={beamMat} />
          </group>
        ))}
        <mesh geometry={posts} material={mat} castShadow />
        <mesh geometry={court.geo} material={mat} castShadow receiveShadow />
        {court.glows.map((g, i) => (
          <sprite key={i} material={halo} position={g} scale={[2.6, 2.6, 1]} />
        ))}
        <sprite material={halo} position={[0, 4.6, FRONT + 2]} scale={[16, 8, 1]} />
      </group>
      </Placed>
    </>
  )
}

