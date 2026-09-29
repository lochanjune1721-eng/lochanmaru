// Shared materials. Everything solid uses ONE patched Lambert so the world has a single lighting
// language: a soft two-band sun ramp, hemisphere fill, warm rim, baked contact shadow, per-vertex glow.
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshLambertMaterial,
  ShaderChunk,
  ShaderMaterial,
  SpriteMaterial,
  Texture,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three'
import { R, SEA } from '../engine/planet'
import { P } from './palette'

/** Uniforms shared by every world material (updated once per frame). */
export const U = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uGlowGain: { value: 1.15 },
  uRimColor: { value: new Color('#ffc59a') },
  uRimAmt: { value: 0.42 },
  uGroundAO: { value: 0.22 },
}

const NOISE_GLSL = /* glsl */ `
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z);
}
`

// Original Lambert direct term uses a hard cos falloff; we swap in a painterly two-band ramp.
const lambertChunk = (() => {
  const src = ShaderChunk.lights_lambert_pars_fragment
  const re = /float dotNL = saturate\(\s*dot\(\s*geometryNormal,\s*directLight\.direction\s*\)\s*\);\s*vec3 irradiance = dotNL \* directLight\.color;/
  if (!re.test(src)) {
    console.warn('[materials] lambert chunk changed; using stock lighting')
    return src
  }
  return src.replace(
    re,
    `float dotNL = dot( geometryNormal, directLight.direction );
	float ramp = smoothstep( -0.12, 0.30, dotNL ) * 0.56 + smoothstep( 0.30, 0.82, dotNL ) * 0.44;
	vec3 irradiance = ramp * directLight.color;`,
  )
})()

export interface WorldMatOpts {
  sway?: boolean
  ground?: boolean
  double?: boolean
  rim?: boolean
  transparent?: boolean
  opacity?: number
  /** textured surface (painted signs); vertex colours are off unless asked for */
  map?: Texture
  vertexColors?: boolean
  alphaTest?: number
  /** flat decal lying on the ground: always wins the depth fight against terrain/paths */
  decal?: number | boolean
}

const cache = new Map<string, MeshLambertMaterial>()

export function worldMaterial(o: WorldMatOpts = {}): MeshLambertMaterial {
  const vc = o.vertexColors ?? !o.map
  const key = JSON.stringify([!!o.sway, !!o.ground, !!o.double, o.rim !== false, !!o.transparent, o.opacity ?? 1, o.map?.uuid ?? null, vc, o.alphaTest ?? 0, o.decal ?? 0])
  const hit = cache.get(key)
  if (hit) return hit

  const m = new MeshLambertMaterial({
    vertexColors: vc,
    map: o.map ?? null,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    alphaTest: o.alphaTest ?? 0,
    dithering: true,
  })
  if (o.double) m.side = DoubleSide
  if (o.decal) {
    const lvl = o.decal === true ? 1 : o.decal
    m.polygonOffset = true
    m.polygonOffsetFactor = -2 * lvl
    m.polygonOffsetUnits = -4 * lvl
  }
  const useRim = o.rim !== false
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec2 aAux;
varying float vGlow;
varying vec3 vWPos;
uniform float uTime;
uniform float uWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3( position );
#ifdef SWAY
  {
    float sw = aAux.y * uWind;
    vec3 ip = vec3(0.0);
    #ifdef USE_INSTANCING
      ip = instanceMatrix[3].xyz;
    #endif
    float ph = ip.x * 0.71 + ip.y * 0.53 + ip.z * 0.93 + position.x * 0.9 + position.z * 0.7;
    transformed.x += sin(uTime * 1.25 + ph) * 0.11 * sw;
    transformed.z += cos(uTime * 1.05 + ph * 1.31) * 0.09 * sw;
    transformed.y += sin(uTime * 2.1 + ph) * 0.015 * sw;
  }
#endif`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vGlow = aAux.x;
{
  vec4 wp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp;
  #endif
  vWPos = ( modelMatrix * wp ).xyz;
}`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vGlow;
varying vec3 vWPos;
uniform float uGlowGain;
uniform vec3 uRimColor;
uniform float uRimAmt;
uniform float uGroundAO;
${NOISE_GLSL}`,
      )
      .replace('#include <lights_lambert_pars_fragment>', lambertChunk)

    if (o.ground) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  // painterly grain: broad tonal drift + fine dabs, anchored in world space
  float g1 = vnoise(vWPos * 0.42);
  float g2 = vnoise(vWPos * 1.9);
  float g3 = vnoise(vWPos * 5.3);
  float tone = 0.93 + 0.14 * g1 + 0.05 * (g2 - 0.5);
  float dab = smoothstep(0.60, 0.80, g3) * 0.045 - smoothstep(0.40, 0.22, g3) * 0.04;
  diffuseColor.rgb *= tone + dab;
}`,
      )
    }

    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
      `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
${
  o.ground
    ? ''
    : `{
  float hgt = length( vWPos ) - ${R.toFixed(2)};
  outgoingLight *= mix( 1.0 - uGroundAO, 1.0, smoothstep( 0.0, 1.5, hgt ) );
}`
}
${
  useRim
    ? `#if NUM_DIR_LIGHTS > 0
{
  vec3 Vv = normalize( vViewPosition );
  float fres = pow( 1.0 - saturate( dot( normal, Vv ) ), 2.4 );
  float toSun = saturate( dot( normal, directionalLights[0].direction ) * 0.5 + 0.5 );
  outgoingLight += diffuseColor.rgb * uRimColor * fres * toSun * uRimAmt;
}
#endif`
    : ''
}
outgoingLight += diffuseColor.rgb * vGlow * uGlowGain;`,
    )
  }
  m.defines = { ...(m.defines || {}) }
  if (o.sway) (m.defines as Record<string, string>).SWAY = ''
  m.customProgramCacheKey = () => key
  cache.set(key, m)
  return m
}

// ---- water ---------------------------------------------------------------------------------------
const WATER_VS = /* glsl */ `
attribute float aDepth;
varying float vDepth;
varying vec3 vWPos;
uniform float uTime;
#include <fog_pars_vertex>
void main(){
  vec3 p = position;
  vec3 dir = normalize(p);
  float w = sin(dot(dir, vec3(3.1,1.7,2.3)) * 22.0 + uTime * 0.9) * 0.05
          + sin(dot(dir, vec3(-2.2,3.9,1.1)) * 31.0 - uTime * 1.25) * 0.035;
  p += dir * w * smoothstep(0.2, 1.4, aDepth);
  vDepth = aDepth;
  vWPos = ( modelMatrix * vec4( p, 1.0 ) ).xyz;
  vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const WATER_FS = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 cShallow;
uniform vec3 cMid;
uniform vec3 cDeep;
uniform vec3 cFoam;
varying float vDepth;
varying vec3 vWPos;
${NOISE_GLSL}
#include <fog_pars_fragment>
void main(){
  float d = vDepth;
  vec3 dir = normalize(vWPos);
  vec3 col = mix(cShallow, cMid, smoothstep(0.0, 1.1, d));
  col = mix(col, cDeep, smoothstep(0.9, 3.0, d));
  float rip = vnoise(dir * 120.0 + vec3(uTime * 0.22, uTime * 0.11, -uTime * 0.17));
  float rip2 = vnoise(dir * 260.0 - vec3(uTime * 0.31, 0.0, uTime * 0.2));
  col += (rip - 0.5) * 0.07 + (rip2 - 0.5) * 0.03;

  // shore foam: wobbling line + a trailing second wave
  float n1 = vnoise(dir * 95.0 + vec3(0.0, uTime * 0.25, 0.0)) - 0.5;
  float edge = d + n1 * 0.20;
  float wave = sin(uTime * 0.9 + d * 7.0) * 0.5 + 0.5;
  float foam = smoothstep(0.26, 0.05, edge) + smoothstep(0.60, 0.50, abs(edge - 0.42 - wave * 0.14)) * smoothstep(0.75, 0.2, edge) * 0.55;
  foam = clamp(foam, 0.0, 1.0);

  // sun glints
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 N = normalize(dir + vec3(rip - 0.5, rip2 - 0.5, rip - rip2) * 0.16);
  vec3 Rr = reflect(-uSunDir, N);
  float spec = pow(max(dot(Rr, V), 0.0), 70.0);
  col += vec3(1.0, 0.9, 0.7) * spec * 0.9;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, vec3(1.0, 0.86, 0.78), fres * 0.35);

  col = mix(col, cFoam, foam);
  float alpha = mix(0.30, 0.94, smoothstep(0.0, 1.0, d));
  alpha = max(alpha, foam * 0.95);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

export function makeWaterMaterial() {
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: U.uTime,
      uSunDir: { value: new Vector3(0.3, 0.8, 0.5) },
      cShallow: { value: new Color(P.waterShallow) },
      cMid: { value: new Color(P.waterMid) },
      cDeep: { value: new Color(P.waterDeep) },
      cFoam: { value: new Color(P.foam) },
    },
  ])
  // keep the shared time uniform by reference
  uniforms.uTime = U.uTime
  return new ShaderMaterial({
    uniforms,
    vertexShader: WATER_VS,
    fragmentShader: WATER_FS,
    fog: true,
    transparent: true,
    depthWrite: false,
  })
}

export const WATER_RADIUS = R + SEA

// ---- sky -----------------------------------------------------------------------------------------
const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // pin to far plane
}`

const SKY_FS = /* glsl */ `
varying vec3 vDir;
uniform vec3 uUp;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uHorizon;
uniform float uTime;
uniform vec3 cZenith;
uniform vec3 cMid;
uniform vec3 cHorizon;
uniform vec3 cSun;
${NOISE_GLSL}
void main(){
  vec3 d = normalize(vDir);
  float h = dot(d, uUp);
  float t = clamp((h - uHorizon) / (1.0 - uHorizon), 0.0, 1.0);
  vec3 col = mix(cHorizon, cMid, smoothstep(0.02, 0.42, t));
  col = mix(col, cZenith, smoothstep(0.36, 1.0, t));

  float s = max(dot(d, uSunDir), 0.0);
  col += cSun * (pow(s, 5.0) * 0.20 + pow(s, 40.0) * 0.42);
  col = mix(col, vec3(1.0, 0.97, 0.88), smoothstep(0.99935, 0.99965, s));

  // giant pale moon, low in the sky
  float m = dot(d, uMoonDir);
  float moonDisc = smoothstep(0.9915, 0.9925, m);
  float crater = vnoise(d * 55.0) * 0.5 + vnoise(d * 130.0) * 0.25;
  vec3 moonCol = mix(vec3(0.99, 0.90, 0.92), vec3(0.86, 0.80, 0.93), crater);
  col = mix(col, moonCol, moonDisc * 0.92);
  col += vec3(1.0, 0.85, 0.9) * pow(max(m, 0.0), 60.0) * 0.16;

  // faint stars near the zenith
  vec3 sp = d * 160.0;
  float st = step(0.9965, hash13(floor(sp)));
  float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash13(floor(sp) + 3.0) * 30.0);
  col += vec3(1.0) * st * tw * smoothstep(0.45, 0.85, t) * 0.55;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`

export function makeSkyMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: U.uTime,
      uUp: { value: new Vector3(0, 1, 0) },
      uSunDir: { value: new Vector3(0.3, 0.4, 0.5).normalize() },
      uMoonDir: { value: new Vector3(-0.4, 0.3, -0.5).normalize() },
      uHorizon: { value: -0.5 },
      cZenith: { value: new Color(P.skyZenith) },
      cMid: { value: new Color(P.skyMid) },
      cHorizon: { value: new Color(P.fog) },
      cSun: { value: new Color(P.sun) },
    },
    vertexShader: SKY_VS,
    fragmentShader: SKY_FS,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  })
}

// ---- soft glow sprite ---------------------------------------------------------------------------
let _glowTex: CanvasTexture | null = null
export function glowTexture() {
  if (_glowTex) return _glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grd.addColorStop(0.6, 'rgba(255,255,255,0.14)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  _glowTex = new CanvasTexture(c)
  return _glowTex
}

export function glowSpriteMaterial(color: string, opacity = 0.9) {
  return new SpriteMaterial({
    map: glowTexture(),
    color: new Color(color),
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity,
    fog: true,
  })
}
