import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CAMPUS, ZONES, CATEGORIES, ROADS, PLAZAS, WATER, FIELDS, SIGNS, FLAGPOLES, BUILDINGS, START_VIEW,
} from './campus-data.js';

// ───────────────────────── utilities ─────────────────────────

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, pz, r) {
  const dx = r.x2 - r.x1, dz = r.z2 - r.z1;
  const len2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((px - r.x1) * dx + (pz - r.z1) * dz) / len2));
  return Math.hypot(px - (r.x1 + t * dx), pz - (r.z1 + t * dz));
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const byId = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

// footprint rectangles in world space; buildings made of several blocks list each one
function footprints(b) {
  if (!b.blocks) return [[b.x, b.z, b.w, b.d]];
  return b.blocks.map(([dx, dz, w, d]) => [b.x + dx, b.z + dz, w, d]);
}

const OUTLINE_BOUNDS = CAMPUS.outline.reduce(
  (a, [x, z]) => ({ minX: Math.min(a.minX, x), maxX: Math.max(a.maxX, x), minZ: Math.min(a.minZ, z), maxZ: Math.max(a.maxZ, z) }),
  { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
);

// ───────────────────────── renderer & scene ─────────────────────────

const host = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
} catch (err) {
  document.getElementById('loading').textContent =
    'เบราว์เซอร์นี้เปิด WebGL ไม่ได้ ลองเปิดด้วย Chrome, Edge, Firefox หรือ Safari รุ่นล่าสุด';
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(host.clientWidth, host.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(host.clientWidth, host.clientHeight);
labelRenderer.domElement.className = 'label-layer';
host.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#cfe3f1', 1600, 5200);

const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 1, 9000);
const startView = window.matchMedia('(max-width: 760px)').matches ? START_VIEW.mobile : START_VIEW;
camera.position.set(...startView.position);

const controls = new MapControls(camera, renderer.domElement);
controls.target.set(...startView.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = THREE.MathUtils.degToRad(84);
controls.minDistance = 25;
controls.maxDistance = 2600;
controls.screenSpacePanning = false;
controls.update();

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

// ───────────────────────── lighting & sky ─────────────────────────

const hemi = new THREE.HemisphereLight('#dcecff', '#6d8a52', 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight('#fff2dc', 2.4);
const SHADOW_CENTER = new THREE.Vector3(230, 0, -180);
sun.position.copy(SHADOW_CENTER).add(new THREE.Vector3(-520, 760, 420));
sun.target.position.copy(SHADOW_CENTER);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -1050, right: 1050, top: 700, bottom: -700, near: 10, far: 2600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);

const skyUniforms = {
  top: { value: new THREE.Color('#5fa4dc') },
  bottom: { value: new THREE.Color('#dcebf5') },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(8000, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 bottom;
      varying vec3 vDir;
      void main() {
        float h = smoothstep(-0.02, 0.55, vDir.y);
        gl_FragColor = vec4(mix(bottom, top, h), 1.0);
      }`,
  }),
);
sky.renderOrder = -1;
scene.add(sky);

const stars = (() => {
  const r = mulberry32(99);
  const pos = [];
  for (let i = 0; i < 900; i++) {
    const th = r() * Math.PI * 2;
    const ph = Math.acos(r() * 0.9);
    pos.push(Math.sin(ph) * Math.cos(th) * 7000, Math.cos(ph) * 7000, Math.sin(ph) * Math.sin(th) * 7000);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false }));
  p.visible = false;
  return p;
})();
scene.add(stars);

// Everything that changes between day and night registers here.
const nightTargets = [];
function nightAware(mat, prop, day, night) {
  nightTargets.push({ mat, prop, day, night });
  return mat;
}

// ───────────────────────── procedural textures ─────────────────────────

function toTexture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const BAYS = 8, FLOORS = 8, BAY_W = 4, FLOOR_H = 3.8;

function makeFacadeTextures(glass) {
  const S = 256;
  const [dc, d] = canvas(S, S);
  const [lc, l] = canvas(S, S);
  const r = mulberry32(glass ? 11 : 7);
  const bw = S / BAYS, fh = S / FLOORS;
  d.fillStyle = '#ffffff'; d.fillRect(0, 0, S, S);
  l.fillStyle = '#000000'; l.fillRect(0, 0, S, S);
  for (let f = 0; f < FLOORS; f++) {
    for (let b = 0; b < BAYS; b++) {
      let x, y, w, h;
      if (glass) { x = b * bw + 1; y = f * fh + 3; w = bw - 2; h = fh - 6; }
      else { x = b * bw + bw * 0.16; y = f * fh + fh * 0.24; w = bw * 0.68; h = fh * 0.54; }
      const g = d.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, glass ? '#cfe4f5' : '#61738a');
      g.addColorStop(1, glass ? '#7a9cbc' : '#2a3544');
      d.fillStyle = g;
      d.fillRect(x, y, w, h);
      d.fillStyle = 'rgba(255,255,255,0.16)';
      d.fillRect(x, y, w * 0.32, h);
      if (r() < 0.58) {
        l.fillStyle = r() < 0.8 ? '#ffd48a' : '#d4e9ff';
        l.globalAlpha = 0.65 + r() * 0.35;
        l.fillRect(x, y, w, h);
        l.globalAlpha = 1;
      }
    }
    d.fillStyle = 'rgba(0,0,0,0.07)';
    d.fillRect(0, f * fh, S, 2);
  }
  return { day: toTexture(dc), lit: toTexture(lc) };
}

const facadeTex = makeFacadeTextures(false);
const glassTex = makeFacadeTextures(true);

function asphaltTexture(highway) {
  const [c, x] = canvas(256, highway ? 256 : 64);
  x.fillStyle = highway ? '#575b61' : '#6c7178';
  x.fillRect(0, 0, c.width, c.height);
  const r = mulberry32(highway ? 3 : 4);
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`;
    x.fillRect(r() * c.width, r() * c.height, 2, 2);
  }
  x.fillStyle = '#f4f1e6';
  if (highway) {
    for (const yy of [0.2, 0.33, 0.67, 0.8]) for (let i = 0; i < 4; i++) x.fillRect(i * 64, c.height * yy - 1, 36, 3);
    x.fillStyle = '#7d8a5a';
    x.fillRect(0, c.height * 0.46, 256, c.height * 0.08);
    x.fillStyle = '#f4f1e6';
    x.fillRect(0, 2, 256, 3);
    x.fillRect(0, c.height - 5, 256, 3);
  } else {
    for (let i = 0; i < 4; i++) x.fillRect(i * 64, c.height / 2 - 1, 32, 3);
  }
  return toTexture(c);
}

function parkingTexture() {
  const [c, x] = canvas(128, 128);
  x.fillStyle = '#80858c'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#eef0f2';
  for (let i = 0; i < 128; i += 16) { x.fillRect(i, 0, 2, 50); x.fillRect(i, 78, 2, 50); }
  x.fillRect(0, 50, 128, 2); x.fillRect(0, 76, 128, 2);
  return toTexture(c);
}

function farmlandTexture() {
  const [c, x] = canvas(512, 512);
  const r = mulberry32(21);
  const greens = ['#a7bb88', '#adc08d', '#a2b783', '#b3c392', '#a9bc87', '#b8c596'];
  for (let i = 0; i < 64; i++) {
    x.fillStyle = greens[Math.floor(r() * greens.length)];
    x.fillRect((i % 8) * 64, Math.floor(i / 8) * 64, 64, 64);
  }
  x.strokeStyle = 'rgba(80,90,50,0.18)'; x.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 512); x.stroke();
    x.beginPath(); x.moveTo(0, i * 64); x.lineTo(512, i * 64); x.stroke();
  }
  return toTexture(c);
}

function trackTexture(w, d) {
  const W = 1024, H = Math.round(1024 * (d / w));
  const [c, x] = canvas(W, H);
  const s = W / w;
  x.fillStyle = '#5ea54e'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#c4603f';
  roundRect(x, 2, 2, W - 4, H - 4, (H - 4) / 2); x.fill();
  const lane = 8 * s;
  const iw = W - 4 - lane * 2, ih = H - 4 - lane * 2;
  x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) {
    const o = (lane / 6) * i;
    roundRect(x, 2 + o, 2 + o, W - 4 - o * 2, H - 4 - o * 2, (H - 4 - o * 2) / 2); x.stroke();
  }
  for (let i = 0; i < 10; i++) {
    x.fillStyle = i % 2 ? '#5aa04a' : '#66ad55';
    roundRect(x, 2 + lane, 2 + lane, iw, ih, ih / 2); x.save(); x.clip();
    x.fillRect(2 + lane + (iw / 10) * i, 0, iw / 10, H); x.restore();
  }
  const px = W / 2 - (iw * 0.62) / 2, pz = H / 2 - (ih * 0.84) / 2, pw = iw * 0.62, ph = ih * 0.84;
  x.strokeStyle = '#ffffff'; x.lineWidth = 3;
  x.strokeRect(px, pz, pw, ph);
  x.beginPath(); x.moveTo(W / 2, pz); x.lineTo(W / 2, pz + ph); x.stroke();
  x.beginPath(); x.arc(W / 2, H / 2, ph * 0.16, 0, Math.PI * 2); x.stroke();
  x.strokeRect(px, H / 2 - ph * 0.3, pw * 0.15, ph * 0.6);
  x.strokeRect(px + pw * 0.85, H / 2 - ph * 0.3, pw * 0.15, ph * 0.6);
  return toTexture(c);
}

function courtTexture(w, d, n) {
  const W = 512, H = Math.round(512 * (d / w));
  const [c, x] = canvas(W, H);
  x.fillStyle = '#3f8a5a'; x.fillRect(0, 0, W, H);
  const cw = W / n;
  for (let i = 0; i < n; i++) {
    const cx = i * cw + cw * 0.14, cz = H * 0.1, w2 = cw * 0.72, h2 = H * 0.8;
    x.fillStyle = '#4d7fbf'; x.fillRect(cx, cz, w2, h2);
    x.strokeStyle = '#ffffff'; x.lineWidth = 2;
    x.strokeRect(cx, cz, w2, h2);
    x.strokeRect(cx + w2 * 0.12, cz + h2 * 0.23, w2 * 0.76, h2 * 0.54);
    x.beginPath(); x.moveTo(cx + w2 / 2, cz + h2 * 0.23); x.lineTo(cx + w2 / 2, cz + h2 * 0.77); x.stroke();
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx - 4, cz + h2 / 2); x.lineTo(cx + w2 + 4, cz + h2 / 2); x.stroke();
  }
  return toTexture(c);
}

function lawnTexture() {
  const [c, x] = canvas(256, 256);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? '#62ad55' : '#6fb860';
    x.fillRect(i * 32, 0, 32, 256);
  }
  x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.strokeRect(8, 8, 240, 240);
  return toTexture(c);
}

// ───────────────────────── ground ─────────────────────────

const PLATFORM = 1.6;
const world = new THREE.Group();
scene.add(world);

function flat(geo, mat, x, y, z, receive = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = receive;
  world.add(m);
  return m;
}

{
  const tex = farmlandTexture();
  tex.repeat.set(12, 12);
  const g = new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2);
  flat(g, nightAware(new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), 'color', '#ffffff', '#56657a'), 200, -PLATFORM, -100);
}

{
  const shape = new THREE.Shape(CAMPUS.outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: PLATFORM, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const top = nightAware(new THREE.MeshStandardMaterial({ color: '#8cc46a', roughness: 0.95 }), 'color', '#8cc46a', '#557d5c');
  const side = new THREE.MeshStandardMaterial({ color: '#f2b134', roughness: 0.7 });
  const m = new THREE.Mesh(g, [top, side]);
  m.position.y = -PLATFORM;
  m.receiveShadow = true;
  world.add(m);
}

const roadTex = asphaltTexture(false);
const highwayTex = asphaltTexture(true);
const roadMats = new Map();
const pathMat = nightAware(new THREE.MeshStandardMaterial({ color: '#e2ddd2', roughness: 0.9 }), 'color', '#e2ddd2', '#6a6f78');
for (const r of ROADS) {
  const len = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
  if (r.path) {
    const m = flat(new THREE.PlaneGeometry(len, r.w).rotateX(-Math.PI / 2), pathMat, (r.x1 + r.x2) / 2, 0.32, (r.z1 + r.z2) / 2);
    m.rotation.y = -Math.atan2(r.z2 - r.z1, r.x2 - r.x1);
    continue;
  }
  const base = r.highway ? highwayTex : roadTex;
  const tex = base.clone();
  tex.repeat.set(len / (r.highway ? 40 : 24), 1);
  tex.needsUpdate = true;
  const mat = nightAware(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 'color', '#ffffff', '#5a6170');
  roadMats.set(r, mat);
  const g = new THREE.PlaneGeometry(len, r.w).rotateX(-Math.PI / 2);
  const m = flat(g, mat, (r.x1 + r.x2) / 2, r.highway ? -PLATFORM + 0.1 : 0.3, (r.z1 + r.z2) / 2);
  m.rotation.y = -Math.atan2(r.z2 - r.z1, r.x2 - r.x1);
}
// ทางลาดจากถนนใหญ่เข้าวิทยาเขต
{
  const g = new THREE.BoxGeometry(28, PLATFORM, 12);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#6c7178', roughness: 0.9 }));
  m.position.set(-713, -PLATFORM / 2 + 0.29, 15);
  m.receiveShadow = true;
  world.add(m);
}

const parkTex = parkingTexture();
for (const p of PLAZAS) {
  let mat;
  if (p.kind === 'parking') {
    const t = parkTex.clone();
    t.repeat.set(p.w / 20, p.d / 18);
    t.needsUpdate = true;
    mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  } else if (p.kind === 'strip') {
    mat = new THREE.MeshStandardMaterial({ color: '#4c5058', roughness: 0.9 });
  } else {
    mat = new THREE.MeshStandardMaterial({ color: '#e4dccd', roughness: 0.85 });
  }
  nightAware(mat, 'color', mat.color.getStyle(), '#4a505a');
  flat(new THREE.PlaneGeometry(p.w, p.d).rotateX(-Math.PI / 2), mat, p.x, p.kind === 'strip' ? 0.08 : 0.2, p.z);
}

const waterMat = nightAware(
  new THREE.MeshStandardMaterial({ color: '#4fa8de', roughness: 0.08, metalness: 0.2, envMap: envTex, envMapIntensity: 0.7 }),
  'color', '#4fa8de', '#1b3654',
);
const bankMat = new THREE.MeshStandardMaterial({ color: '#e9f1f4', roughness: 0.9 });
function grownPolygon(pts, by) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, z]) => {
    const d = Math.hypot(x - cx, z - cz) || 1;
    return [cx + ((x - cx) * (d + by)) / d, cz + ((z - cz) * (d + by)) / d];
  });
}
function polygonGeometry(pts) {
  return new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))).rotateX(-Math.PI / 2);
}

for (const w of WATER) {
  if (w.kind === 'pool') {
    flat(polygonGeometry(grownPolygon(w.pts, 3)), bankMat, 0, 0.18, 0);
    flat(polygonGeometry(w.pts), waterMat, 0, 0.26, 0);
    continue;
  }
  if (w.kind === 'canal') {
    flat(new THREE.PlaneGeometry(w.w, w.d + 3).rotateX(-Math.PI / 2), bankMat, w.x, 0.18, w.z);
    flat(new THREE.PlaneGeometry(w.w, w.d).rotateX(-Math.PI / 2), waterMat, w.x, 0.26, w.z);
    continue;
  }
  const bank = flat(new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2), bankMat, w.x, 0.18, w.z);
  bank.scale.set(w.rx + 3, 1, w.rz + 3);
  const water = flat(new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2), waterMat, w.x, 0.26, w.z);
  water.scale.set(w.rx, 1, w.rz);
}

for (const f of FIELDS) {
  // the track texture is drawn lying along x; a track longer in z is drawn that way and turned
  const turn = f.kind === 'track' && f.d > f.w;
  const [tw, td] = turn ? [f.d, f.w] : [f.w, f.d];
  const tex = f.kind === 'track' ? trackTexture(tw, td) : f.kind === 'court' ? courtTexture(f.w, f.d, f.lines) : lawnTexture();
  const mat = nightAware(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 'color', '#ffffff', '#56606e');
  const g = new THREE.PlaneGeometry(tw, td).rotateX(-Math.PI / 2);
  if (turn) g.rotateY(Math.PI / 2);
  flat(g, mat, f.x, 0.22, f.z);
}

for (const s of SIGNS) {
  const [c, x] = canvas(1024, 96);
  const paint = () => {
    x.clearRect(0, 0, c.width, c.height);
    x.font = '700 72px "Chakra Petch", "Arial Narrow", sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#5b5148';
    x.fillText(s.text, 512, 52, 1000);
  };
  paint();
  const tex = toTexture(c);
  document.fonts?.ready.then(() => { paint(); tex.needsUpdate = true; });
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
  sign.position.set(s.x, s.h / 2 + 0.2, s.z);
  sign.rotation.y = -Math.PI / 2;
  sign.castShadow = true;
  world.add(sign);
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, s.hedge || s.w + 6), new THREE.MeshStandardMaterial({ color: '#b7c64a', roughness: 0.9 }));
  hedge.position.set(s.x + 2.5, 0.5, s.hedgeZ ?? s.z);
  hedge.receiveShadow = true;
  world.add(hedge);
}

function thaiFlagTexture() {
  const [c, x] = canvas(96, 64);
  [['#a51931', 0, 1], ['#f4f5f8', 1, 1], ['#2d2a4a', 2, 2], ['#f4f5f8', 4, 1], ['#a51931', 5, 1]].forEach(([col, y, h]) => {
    x.fillStyle = col;
    x.fillRect(0, (y * 64) / 6, 96, (h * 64) / 6 + 0.5);
  });
  return toTexture(c);
}
{
  const poleMat = new THREE.MeshStandardMaterial({ color: '#f2f3f5', roughness: 0.4, metalness: 0.3 });
  const flagMat = new THREE.MeshStandardMaterial({ map: thaiFlagTexture(), side: THREE.DoubleSide, roughness: 0.8 });
  for (const f of FLAGPOLES) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, f.h, 8), poleMat);
    pole.position.set(f.x, f.h / 2, f.z);
    pole.castShadow = true;
    world.add(pole);
    if (f.flag) {
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3), flagMat);
      flag.position.set(f.x, f.h - 1.8, f.z + 2.4);
      flag.rotation.y = Math.PI / 2 - 0.3;
      flag.castShadow = true;
      world.add(flag);
    }
  }
}

// ───────────────────────── buildings ─────────────────────────

const buildingsRoot = new THREE.Group();
scene.add(buildingsRoot);

const roofMat = nightAware(new THREE.MeshStandardMaterial({ color: '#c3c8cf', roughness: 0.9 }), 'color', '#c3c8cf', '#59606b');
const unitMat = new THREE.MeshStandardMaterial({ color: '#9aa1aa', roughness: 0.7 });
const goldMat = new THREE.MeshStandardMaterial({ color: '#e2b244', metalness: 0.75, roughness: 0.28, envMap: envTex });
const woodMat = new THREE.MeshStandardMaterial({ color: '#6f3f25', roughness: 0.85 });

function facadeMaterial(color, faceWidth, height, glass) {
  const set = glass ? glassTex : facadeTex;
  const bays = Math.max(1, Math.round(faceWidth / BAY_W));
  const floors = Math.max(1, Math.round(height / FLOOR_H));
  const map = set.day.clone();
  const lit = set.lit.clone();
  for (const t of [map, lit]) {
    t.repeat.set(bays / BAYS, floors / FLOORS);
    t.needsUpdate = true;
  }
  const mat = new THREE.MeshStandardMaterial({
    color, map, emissive: '#ffffff', emissiveMap: lit, emissiveIntensity: 0,
    roughness: glass ? 0.2 : 0.85, metalness: glass ? 0.35 : 0, envMap: glass ? envTex : null,
  });
  return nightAware(mat, 'emissiveIntensity', 0, 0.95);
}

function add(group, mesh, bid, shadow = true) {
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.userData.bid = bid;
  group.add(mesh);
  return mesh;
}

function block(group, b, w, d, h, y0 = 0, ox = 0, oz = 0) {
  const sx = facadeMaterial(b.color, d, h, b.glass);
  const sz = facadeMaterial(b.color, w, h, b.glass);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sx, sx, roofMat, roofMat, sz, sz]);
  m.position.set(ox, y0 + h / 2, oz);
  add(group, m, b.id);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.9, d + 0.6), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.8 }));
  cap.position.set(ox, y0 + h + 0.45, oz);
  add(group, cap, b.id);
  return m;
}

function rooftopUnits(group, b, w, d, top, seed) {
  const r = mulberry32(seed);
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const uw = 3 + r() * Math.min(8, w * 0.25), ud = 3 + r() * Math.min(6, d * 0.25), uh = 1.5 + r() * 2;
    const u = new THREE.Mesh(new THREE.BoxGeometry(uw, uh, ud), unitMat);
    u.position.set((r() - 0.5) * (w - uw - 4), top + uh / 2 + 0.9, (r() - 0.5) * (d - ud - 4));
    add(group, u, b.id);
  }
}

function accentBands(group, b, w, d, h, y0 = 0) {
  if (!b.accent) return;
  const mat = new THREE.MeshStandardMaterial({ color: b.accent, roughness: 0.6 });
  for (let y = y0 + FLOOR_H * 2; y < y0 + h - 1; y += FLOOR_H * 2) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.9, d + 0.8), mat);
    band.position.y = y;
    add(group, band, b.id);
  }
}

function gableRoof(w, d, rise, overhang = 1.2) {
  const s = new THREE.Shape([
    new THREE.Vector2(-d / 2 - overhang, 0),
    new THREE.Vector2(d / 2 + overhang, 0),
    new THREE.Vector2(0, rise),
  ]);
  const depth = w + overhang * 2;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

// White-silver cladding with the long dark glass slits seen on ตึกเพชร
function facetPanelTexture() {
  const [c, x] = canvas(512, 512);
  const g = x.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#f6f7f8');
  g.addColorStop(1, '#d8dde1');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(110,120,128,0.3)';
  x.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 32) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke();
  }
  x.fillStyle = '#2d474c';
  for (const [sx, sy, len, th] of [[30, 110, 320, 14], [150, 230, 330, 11], [40, 360, 230, 16], [280, 420, 200, 10], [260, 60, 210, 9]]) {
    x.save();
    x.translate(sx, sy);
    x.rotate(-0.2);
    x.fillRect(0, 0, len, th);
    x.restore();
  }
  return toTexture(c);
}
const panelTex = facetPanelTexture();

function solarTexture() {
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#c9ccd0';
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 8; j++) {
      x.fillStyle = (i + j) % 3 ? '#27365a' : '#2d3e66';
      x.fillRect(i * 64 + 3, j * 32 + 3, 58, 26);
    }
  }
  x.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 256; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
  return toTexture(c);
}
const solarTex = solarTexture();

// Curtain wall: glass grid crossed by the large white diagonal members seen on A3.
// Lines are [u1, v1, u2, v2] across one face, v = 0 at the top.
const CURTAIN_LINES = [
  [0, 0, 0.46, 1], [1, 0, 0.54, 1], [0.22, 0, 0.46, 1], [0.78, 0, 0.54, 1],
  [0, 0.62, 0.22, 0], [1, 0.62, 0.78, 0], [0.22, 0, 0.5, 0.42], [0.78, 0, 0.5, 0.42],
];
function curtainTextures(wm, hm, seed) {
  const PX = 8;
  const W = Math.min(2048, Math.round(wm * PX)), H = Math.round(hm * PX);
  const [dc, d] = canvas(W, H);
  const [lc, l] = canvas(W, H);
  const r = mulberry32(seed);
  const bay = 1.6 * (W / wm), floor = FLOOR_H * (H / hm);
  l.fillStyle = '#000'; l.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += floor) {
    for (let x = 0; x < W; x += bay) {
      const t = 0.82 + r() * 0.18;
      d.fillStyle = `rgb(${Math.round(150 * t)},${Math.round(178 * t)},${Math.round(184 * t)})`;
      d.fillRect(x, y, bay, floor);
      if (r() < 0.5) {
        l.fillStyle = r() < 0.8 ? '#ffd48a' : '#d4e9ff';
        l.globalAlpha = 0.5 + r() * 0.5;
        l.fillRect(x + 1, y + 1, bay - 2, floor - 2);
        l.globalAlpha = 1;
      }
    }
  }
  const sky = d.createLinearGradient(0, 0, W * 0.6, H);
  sky.addColorStop(0, 'rgba(255,255,255,0.28)');
  sky.addColorStop(1, 'rgba(255,255,255,0)');
  d.fillStyle = sky; d.fillRect(0, 0, W, H);
  d.strokeStyle = 'rgba(70,80,86,0.55)'; d.lineWidth = 1;
  for (let x = 0; x <= W; x += bay) { d.beginPath(); d.moveTo(x, 0); d.lineTo(x, H); d.stroke(); }
  d.lineWidth = 2;
  for (let y = 0; y <= H; y += floor) { d.beginPath(); d.moveTo(0, y); d.lineTo(W, y); d.stroke(); }
  for (const ctx of [d, l]) {
    ctx.strokeStyle = ctx === d ? '#f4f5f6' : '#000';
    ctx.lineWidth = 0.7 * PX;
    ctx.lineCap = 'square';
    for (const [u1, v1, u2, v2] of CURTAIN_LINES) {
      ctx.beginPath(); ctx.moveTo(u1 * W, v1 * H); ctx.lineTo(u2 * W, v2 * H); ctx.stroke();
    }
    ctx.strokeRect(0, 0, W, H);
  }
  return { map: toTexture(dc), lit: toTexture(lc) };
}

function curtainBlock(group, b, x, z, w, d, h, lobby) {
  const face = (wm, seed) => {
    const t = curtainTextures(wm, h - lobby, seed);
    return nightAware(new THREE.MeshStandardMaterial({
      map: t.map, emissive: '#ffffff', emissiveMap: t.lit, emissiveIntensity: 0,
      roughness: 0.18, metalness: 0.35, envMap: envTex, envMapIntensity: 0.8,
    }), 'emissiveIntensity', 0, 0.9);
  };
  const fx = face(d, 31), fz = face(w, 32);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h - lobby, d), [fx, fx, roofMat, roofMat, fz, fz]);
  body.position.set(x, lobby + (h - lobby) / 2, z);
  add(group, body, b.id);
  const lobbyBox = new THREE.Mesh(new THREE.BoxGeometry(w - 8, lobby, d - 8), facadeMaterial('#9cc0c4', w, lobby, true));
  lobbyBox.position.set(x, lobby / 2, z);
  add(group, lobbyBox, b.id);
  const white = new THREE.MeshStandardMaterial({ color: '#f1f2f3', roughness: 0.6 });
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 1.4, d + 0.8), white);
  parapet.position.set(x, h + 0.7, z);
  add(group, parapet, b.id);
  // columns carrying the floating block over the lobby
  const colG = new THREE.BoxGeometry(1.2, lobby, 1.2);
  for (const sx of [-1, 1]) {
    for (const sz of [-0.5, 0, 0.5, -1, 1]) {
      const col = new THREE.Mesh(colG, white);
      col.position.set(x + sx * (w / 2 - 2), lobby / 2, z + sz * (d / 2 - 2));
      add(group, col, b.id);
    }
  }
}

// ConvexGeometry has no UVs; project each triangle onto the plane it faces most
function addPlanarUVs(g, scale) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    v.forEach((vec, k) => vec.fromBufferAttribute(p, i + k));
    const n = e1.subVectors(v[1], v[0]).cross(e2.subVectors(v[2], v[0]));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    v.forEach((vec, k) => {
      const [u, w] = ay >= ax && ay >= az ? [vec.x, vec.z] : ax >= az ? [vec.z, vec.y] : [vec.x, vec.y];
      uv[(i + k) * 2] = u * scale;
      uv[(i + k) * 2 + 1] = w * scale;
    });
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const facetGlassMat = nightAware(
  new THREE.MeshStandardMaterial({
    color: '#3e5d62', metalness: 0.6, roughness: 0.08, flatShading: true,
    envMap: envTex, envMapIntensity: 1.3, emissive: '#ffd9a0', emissiveIntensity: 0,
  }),
  'emissiveIntensity', 0, 0.35,
);

// Faceted wing: the low triangles of the walls become glass and the rest white cladding,
// which gives the alternating white and glass panels of the real wings.
function facetMass(group, b, pts) {
  const hull = new ConvexGeometry(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const p = hull.attributes.position;
  const top = Math.max(...pts.map((q) => q[1]));
  const clad = [], glass = [];
  for (let i = 0; i < p.count; i += 3) {
    const tri = [];
    for (let k = 0; k < 3; k++) tri.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
    const cy = (tri[1] + tri[4] + tri[7]) / 3;
    (cy < top * 0.4 ? glass : clad).push(...tri);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...clad, ...glass], 3));
  g.addGroup(0, clad.length / 3, 0);
  g.addGroup(clad.length / 3, glass.length / 3, 1);
  g.computeVertexNormals();
  addPlanarUVs(g, 1 / 40);
  const mat = nightAware(
    new THREE.MeshStandardMaterial({
      color: b.color, map: panelTex, metalness: 0.35, roughness: 0.3, flatShading: true,
      envMap: envTex, envMapIntensity: 0.9, emissive: '#9fd4ff', emissiveIntensity: 0,
    }),
    'emissiveIntensity', 0, 0.25,
  );
  add(group, new THREE.Mesh(g, [mat, facetGlassMat]), b.id);
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(g, 1),
    new THREE.LineBasicMaterial({ color: '#4d5a60', transparent: true, opacity: 0.5 }),
  ));
}

const builders = {
  box(group, b) {
    block(group, b, b.w, b.d, b.h);
    accentBands(group, b, b.w, b.d, b.h);
    rooftopUnits(group, b, b.w, b.d, b.h, hashStr(b.id));
  },
  tower(group, b) {
    const parts = [[0.4, 0, 0], [0.34, 2.5, -2], [0.26, -2, 2.5]];
    let y = 0;
    parts.forEach(([f, ox, oz], i) => {
      const hh = b.h * f, w = b.w - i * 3, d = b.d - i * 3;
      block(group, b, w, d, hh, y, ox, oz);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1.2, 1.4, d + 1.2),
        new THREE.MeshStandardMaterial({ color: i % 2 ? '#3d8fd1' : b.accent, roughness: 0.6 }),
      );
      band.position.set(ox, y + hh, oz);
      add(group, band, b.id);
      y += hh + 0.5;
    });
    const fin = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 8), new THREE.MeshStandardMaterial({ color: b.accent }));
    fin.position.set(-2, y + 5, 2.5);
    add(group, fin, b.id);
  },
  round(group, b) {
    const r = b.w / 2;
    const side = facadeMaterial(b.color, Math.PI * 2 * r, b.h, b.glass);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, b.h, 48), [side, roofMat, roofMat]);
    m.position.y = b.h / 2;
    add(group, m, b.id);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.6, r + 0.6, 1, 48), new THREE.MeshStandardMaterial({ color: b.color }));
    cap.position.y = b.h + 0.5;
    add(group, cap, b.id);
  },
  barrel(group, b) {
    const hb = b.h * 0.6;
    block(group, b, b.w, b.d, hb);
    const n = Math.max(1, Math.round(b.w / 16));
    const rad = b.w / n / 2;
    const mat = new THREE.MeshStandardMaterial({ color: b.roof || '#b5bdc6', roughness: 0.6, metalness: 0.2 });
    for (let i = 0; i < n; i++) {
      const g = new THREE.CylinderGeometry(rad, rad, b.d + 1, 20, 1, false, -Math.PI / 2, Math.PI);
      g.rotateX(-Math.PI / 2);
      g.scale(1, (b.h - hb) / rad, 1);
      const m = new THREE.Mesh(g, mat);
      m.position.set(-b.w / 2 + rad * (2 * i + 1), hb + 0.9, 0);
      add(group, m, b.id);
    }
  },
  gable(group, b) {
    const hb = b.h * 0.55;
    block(group, b, b.w, b.d, hb);
    const m = new THREE.Mesh(
      gableRoof(b.w, b.d, b.h - hb),
      new THREE.MeshStandardMaterial({ color: b.roof || '#8c96a2', roughness: 0.75, flatShading: true }),
    );
    m.position.y = hb + 0.9;
    add(group, m, b.id);
  },
  pavilion(group, b) {
    const hb = b.h * 0.6;
    const postG = new THREE.CylinderGeometry(0.35, 0.35, hb, 8);
    for (const sx of [-1, 0, 1]) {
      for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(postG, woodMat);
        p.position.set((sx * b.w) / 2.4, hb / 2, (sz * b.d) / 2.4);
        add(group, p, b.id);
      }
    }
    const floor = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.4, b.d), new THREE.MeshStandardMaterial({ color: '#d9cfbf' }));
    floor.position.y = 0.2;
    add(group, floor, b.id);
    const roof = new THREE.Mesh(gableRoof(b.w, b.d, b.h - hb), new THREE.MeshStandardMaterial({ color: '#a4552f', flatShading: true }));
    roof.position.y = hb;
    add(group, roof, b.id);
  },
  thai(group, b) {
    const postG = new THREE.CylinderGeometry(0.3, 0.3, 3.2, 8);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const p = new THREE.Mesh(postG, woodMat);
        p.position.set(-b.w * 0.4 + i * (b.w * 0.8 / 3), 1.6, -b.d * 0.35 + j * (b.d * 0.35));
        add(group, p, b.id);
      }
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.95, 0.6, b.d * 0.85), woodMat);
    deck.position.y = 3.4;
    add(group, deck, b.id);
    const houses = [[0.5, 0.6, -b.w * 0.18, 0], [0.32, 0.5, b.w * 0.27, -b.d * 0.08]];
    for (const [fw, fd, ox, oz] of houses) {
      const w = b.w * fw, d = b.d * fd;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, 3.4, d), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.8 }));
      body.position.set(ox, 5.4, oz);
      add(group, body, b.id);
      const roof = new THREE.Mesh(gableRoof(w, d, 5.6, 1.4), new THREE.MeshStandardMaterial({ color: '#5a1f17', flatShading: true }));
      roof.position.set(ox, 7.1, oz);
      add(group, roof, b.id);
    }
  },
  shrine(group, b) {
    const white = new THREE.MeshStandardMaterial({ color: '#f5f1e8', roughness: 0.8 });
    [[b.w, 1.2], [b.w * 0.8, 1], [b.w * 0.5, 3.2]].reduce((y, [s, h]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), white);
      m.position.y = y + h / 2;
      add(group, m, b.id);
      return y + h;
    }, 0);
    let y = 5.4;
    for (const [r, h] of [[b.w * 0.48, 2.2], [b.w * 0.36, 2], [b.w * 0.24, 1.8]]) {
      const g = new THREE.ConeGeometry(r, h, 4);
      g.rotateY(Math.PI / 4);
      const m = new THREE.Mesh(g, goldMat);
      m.position.y = y + h / 2;
      add(group, m, b.id);
      y += h * 0.7;
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.5, b.h - y, 8), goldMat);
    spire.position.y = y + (b.h - y) / 2;
    add(group, spire, b.id);
  },
  composite(group, b) {
    // hand-placed parts: faceted masses (hull points), glass blocks and curtain-wall blocks [x, z, w, d, h]
    for (const part of b.parts) {
      if (part.hull) facetMass(group, b, part.hull);
      if (part.glass || part.curtain) {
        const [x, z, w, d, h] = part.glass || part.curtain;
        if (part.curtain) curtainBlock(group, b, x, z, w, d, h, part.lobby || 0);
        else block(group, { ...b, color: b.glassColor || '#86b3ad', glass: true }, w, d, h, 0, x, z);
        if (part.solar) {
          const t = solarTex.clone();
          t.repeat.set((w * 0.8) / 16, (d * 0.85) / 16);
          t.needsUpdate = true;
          const panels = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.8, d * 0.85).rotateX(-Math.PI / 2),
            new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.3 }),
          );
          panels.position.set(x, h + (part.curtain ? 1.45 : 1.05), z);
          panels.receiveShadow = true;
          group.add(panels);
        }
      }
    }
  },
  dorm(group, b) {
    for (const [dx, dz, w, d] of b.blocks) {
      const sub = new THREE.Group();
      sub.position.set(dx, 0, dz);
      block(sub, b, w, d, b.h);
      rooftopUnits(sub, b, w, d, b.h, hashStr(b.id) + dx + dz);
      sub.children.forEach((c) => { c.userData.bid = b.id; });
      group.add(sub);
    }
  },
  none() {},
};

const hitBoxMat = new THREE.MeshBasicMaterial();
for (const b of BUILDINGS) {
  const group = new THREE.Group();
  group.position.set(b.x, 0, b.z);
  (builders[b.shape] || builders.box)(group, b);
  // invisible footprint box so thin or flat items are still easy to click
  const hit = new THREE.Mesh(new THREE.BoxGeometry(b.w, Math.max(b.h, 3), b.d), hitBoxMat);
  hit.position.y = Math.max(b.h, 3) / 2;
  hit.visible = false;
  hit.userData.bid = b.id;
  group.add(hit);
  b.group = group;
  b.top = Math.max(b.h, 3);
  buildingsRoot.add(group);
}

// ───────────────────────── trees, lamps, cars ─────────────────────────

function blocked(x, z, pad) {
  if (!pointInPolygon(x, z, CAMPUS.outline)) return true;
  for (const b of BUILDINGS) {
    for (const [fx, fz, fw, fd] of footprints(b)) if (Math.abs(x - fx) < fw / 2 + pad && Math.abs(z - fz) < fd / 2 + pad) return true;
  }
  for (const r of ROADS) if (distToSegment(x, z, r) < r.w / 2 + pad * 0.6) return true;
  for (const w of WATER) {
    if (w.kind === 'pool') { if (pointInPolygon(x, z, grownPolygon(w.pts, pad))) return true; }
    else if (w.kind === 'canal') { if (Math.abs(x - w.x) < w.w / 2 + pad && Math.abs(z - w.z) < w.d / 2 + pad) return true; }
    else if (((x - w.x) / (w.rx + pad)) ** 2 + ((z - w.z) / (w.rz + pad)) ** 2 < 1) return true;
  }
  for (const p of [...PLAZAS, ...FIELDS]) if (Math.abs(x - p.x) < p.w / 2 + pad && Math.abs(z - p.z) < p.d / 2 + pad) return true;
  return false;
}

{
  const r = mulberry32(2026);
  const spots = [];
  for (const road of ROADS) {
    if (road.highway || road.path) continue;
    const len = Math.hypot(road.x2 - road.x1, road.z2 - road.z1);
    const nx = -(road.z2 - road.z1) / len, nz = (road.x2 - road.x1) / len;
    for (let s = 10; s < len; s += 16) {
      for (const side of [-1, 1]) {
        const off = road.w / 2 + 4;
        const x = road.x1 + ((road.x2 - road.x1) * s) / len + nx * off * side;
        const z = road.z1 + ((road.z2 - road.z1) * s) / len + nz * off * side;
        if (!blocked(x, z, 2.5)) spots.push([x, z, 0.9]);
      }
    }
  }
  for (let i = 0; i < 9000 && spots.length < 1500; i++) {
    const B = OUTLINE_BOUNDS;
    const x = B.minX + r() * (B.maxX - B.minX), z = B.minZ + r() * (B.maxZ - B.minZ);
    if (!blocked(x, z, 6)) spots.push([x, z, 0.7 + r() * 0.7]);
  }
  for (let i = 0; i < 500; i++) {
    const a = r() * Math.PI * 2, dist = 900 + r() * 1800;
    const x = 240 + Math.cos(a) * dist, z = -180 + Math.sin(a) * dist * 0.7;
    if (Math.abs(x + 745) > 40) spots.push([x, z, 0.8 + r() * 0.8, true]);
  }

  const crownG = new THREE.IcosahedronGeometry(1, 1);
  const trunkG = new THREE.CylinderGeometry(0.35, 0.5, 1, 6);
  const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), spots.length);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: '#6b4a32' }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const col = new THREE.Color();
  spots.forEach(([x, z, k, outside], i) => {
    const y0 = outside ? -PLATFORM : 0;
    const th = 3 + 2 * k, cr = 3.2 * k + r() * 1.5;
    m.compose(p.set(x, y0 + th / 2, z), q.identity(), s.set(1, th, 1));
    trunks.setMatrixAt(i, m);
    q.setFromEuler(new THREE.Euler(0, r() * Math.PI, 0));
    m.compose(p.set(x, y0 + th + cr * 0.6, z), q, s.set(cr, cr * (0.75 + r() * 0.3), cr));
    crowns.setMatrixAt(i, m);
    crowns.setColorAt(i, col.setHSL(0.24 + r() * 0.08, 0.45 + r() * 0.2, 0.3 + r() * 0.12));
  });
  for (const im of [crowns, trunks]) { im.castShadow = true; im.receiveShadow = true; world.add(im); }
  nightAware(crowns.material, 'color', '#ffffff', '#6f7f8f');
}

const lampHeadMat = nightAware(
  new THREE.MeshStandardMaterial({ color: '#f5f3ea', emissive: '#ffd27a', emissiveIntensity: 0 }),
  'emissiveIntensity', 0, 3,
);
{
  const spots = [];
  for (const road of ROADS) {
    if (road.path) continue;
    const len = Math.hypot(road.x2 - road.x1, road.z2 - road.z1);
    const nx = -(road.z2 - road.z1) / len, nz = (road.x2 - road.x1) / len;
    for (let s = 15; s < len; s += road.highway ? 45 : 34) {
      const off = road.w / 2 + 1.2;
      const x = road.x1 + ((road.x2 - road.x1) * s) / len + nx * off;
      const z = road.z1 + ((road.z2 - road.z1) * s) / len + nz * off;
      spots.push([x, z, road.highway ? -PLATFORM : 0]);
    }
  }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.2, 7, 6), new THREE.MeshStandardMaterial({ color: '#4b5058' }), spots.length);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.7, 10, 8), lampHeadMat, spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, z, y], i) => {
    poles.setMatrixAt(i, m.makeTranslation(x, y + 3.5, z));
    heads.setMatrixAt(i, m.makeTranslation(x, y + 7.2, z));
  });
  poles.castShadow = true;
  world.add(poles, heads);
}

const cars = [];
{
  const r = mulberry32(5);
  const palette = ['#d94f3d', '#f2f2f2', '#2f3a4a', '#3b6fb6', '#c9ccd1', '#e3b23c', '#1f1f22'];
  const bodyG = new THREE.BoxGeometry(2, 1.3, 4.6);
  const cabG = new THREE.BoxGeometry(1.8, 0.9, 2.4);
  const glassM = new THREE.MeshStandardMaterial({ color: '#25303d', roughness: 0.2, metalness: 0.4 });
  for (let i = 0; i < 26; i++) {
    const dir = i % 2 ? 1 : -1;
    const lane = dir * (4 + (r() < 0.5 ? 0 : 6) + 2);
    const car = new THREE.Group();
    const body = new THREE.Mesh(bodyG, new THREE.MeshStandardMaterial({ color: palette[Math.floor(r() * palette.length)], roughness: 0.4, metalness: 0.3 }));
    body.position.y = 0.9;
    const cab = new THREE.Mesh(cabG, glassM);
    cab.position.set(0, 1.95, -0.2);
    car.add(body, cab);
    car.children.forEach((c) => { c.castShadow = true; });
    car.position.set(-745 + lane, -PLATFORM + 0.1, -500 + r() * 1000);
    car.rotation.y = dir > 0 ? 0 : Math.PI;
    car.userData = { dir, speed: 14 + r() * 10 };
    world.add(car);
    cars.push(car);
  }
}

// ───────────────────────── labels ─────────────────────────

const labelState = [];
for (const b of BUILDINGS) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'label';
  el.dataset.cat = b.category;
  el.innerHTML = `<span class="num">${b.num}</span><span class="txt">${b.label || b.nameTh}</span>`;
  el.setAttribute('aria-label', `${b.num} ${b.nameTh}`);
  el.addEventListener('click', (e) => { e.stopPropagation(); select(b.id, { fly: true }); });
  const obj = new CSS2DObject(el);
  obj.position.set(0, b.top + 6, 0);
  b.group.add(obj);
  labelState.push({ b, obj, el });
}

const zoneLabels = [];
for (const [key, z] of Object.entries(ZONES)) {
  const el = document.createElement('div');
  el.className = 'zone-tag';
  el.textContent = `ZONE ${key}`;
  const obj = new CSS2DObject(el);
  obj.position.set(z.x, 2, z.z);
  scene.add(obj);
  zoneLabels.push(obj);
}
{
  const el = document.createElement('div');
  el.className = 'road-tag';
  el.textContent = ROADS.find((r) => r.highway)?.name || '';
  const obj = new CSS2DObject(el);
  obj.position.set(-745, 0, 260);
  scene.add(obj);
  zoneLabels.push(obj);
}

// ───────────────────────── selection marker ─────────────────────────

const marker = new THREE.Group();
{
  const accent = new THREE.MeshBasicMaterial({ color: '#f5b335', transparent: true, opacity: 0.85, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), accent);
  ring.position.y = 0.5;
  ring.name = 'ring';
  const pin = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6, 20), new THREE.MeshStandardMaterial({ color: '#f5b335', emissive: '#f5b335', emissiveIntensity: 0.4 }));
  cone.rotation.x = Math.PI;
  cone.position.y = 3;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), cone.material);
  ball.position.y = 7.4;
  pin.add(cone, ball);
  pin.name = 'pin';
  marker.add(ring, pin);
  marker.visible = false;
  scene.add(marker);
}

// ───────────────────────── state & UI ─────────────────────────

const state = {
  mode: 'orbit',
  night: false,
  labels: true,
  selected: null,
  zone: 'all',
  category: 'all',
  query: '',
};

const $ = (s) => document.querySelector(s);
const listEl = $('#building-list');
const infoEl = $('#info');
const searchEl = $('#search');

function matches(b) {
  if (state.zone !== 'all' && b.zone !== state.zone) return false;
  if (state.category !== 'all' && b.category !== state.category) return false;
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return [b.nameTh, b.nameEn, b.id, String(b.num), ...(b.also || [])].some((s) => s.toLowerCase().includes(q));
}

function renderChips() {
  const zoneWrap = $('#zone-chips');
  const catWrap = $('#cat-chips');
  const zones = [['all', 'ทุกโซน'], ...Object.entries(ZONES).map(([k, z]) => [k, z.th])];
  zoneWrap.innerHTML = zones
    .map(([k, t]) => `<button type="button" class="chip" data-zone="${k}" aria-pressed="${state.zone === k}">${t}</button>`)
    .join('');
  const cats = [['all', 'ทุกประเภท'], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.th])];
  catWrap.innerHTML = cats
    .map(([k, t]) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${state.category === k}">${k !== 'all' ? `<i style="background:${CATEGORIES[k].color}"></i>` : ''}${t}</button>`)
    .join('');
}

function renderList() {
  const items = BUILDINGS.filter(matches);
  $('#result-count').textContent = `${items.length} จาก ${BUILDINGS.length} จุด`;
  if (!items.length) {
    listEl.innerHTML = '<p class="empty">ไม่พบสถานที่ที่ค้นหา ลองพิมพ์ชื่อหรือรหัสอาคาร เช่น หอสมุด, C6 หรือ 28</p>';
  } else {
    let html = '';
    let zone = null;
    for (const b of items) {
      if (b.zone !== zone) {
        zone = b.zone;
        html += `<li class="group">${ZONES[zone].th}</li>`;
      }
      html += `<li><button type="button" class="item" data-id="${b.id}" aria-current="${state.selected === b.id}">
        <span class="num">${b.num}</span>
        <span class="names"><span class="th">${b.nameTh}</span><span class="en">${b.nameEn}</span></span>
        <i class="dot" style="background:${CATEGORIES[b.category].color}" title="${CATEGORIES[b.category].th}"></i>
      </button></li>`;
    }
    listEl.innerHTML = html;
  }
  for (const l of labelState) l.match = matches(l.b);
}

$('#zone-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-zone]');
  if (!btn) return;
  state.zone = btn.dataset.zone;
  renderChips(); renderList();
  if (state.zone !== 'all') {
    const z = ZONES[state.zone];
    flyTo(new THREE.Vector3(z.x, 0, z.z), state.zone === 'D' ? 620 : 480);
  }
});
$('#cat-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cat]');
  if (!btn) return;
  state.category = btn.dataset.cat;
  renderChips(); renderList();
});
searchEl.addEventListener('input', () => { state.query = searchEl.value; renderList(); });
searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = BUILDINGS.find(matches);
    if (first) select(first.id, { fly: true });
  }
});
listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.item');
  if (!btn) return;
  select(btn.dataset.id, { fly: true });
  if (window.matchMedia('(max-width: 760px)').matches) document.body.classList.remove('list-open');
});
$('#list-toggle').addEventListener('click', () => document.body.classList.toggle('list-open'));

function renderInfo(b) {
  const cat = CATEGORIES[b.category];
  infoEl.innerHTML = `
    <div class="info-head">
      <span class="num big">${b.num}</span>
      <div class="info-title">
        <h2>${b.nameTh}</h2>
        <p class="en">${b.nameEn}</p>
      </div>
      <button type="button" class="icon-btn" id="info-close" aria-label="ปิดรายละเอียด">✕</button>
    </div>
    <div class="tags">
      <span class="tag">${ZONES[b.zone].th}</span>
      <span class="tag"><i style="background:${cat.color}"></i>${cat.th}</span>
      <span class="tag mono">#${b.id}</span>
    </div>
    <p class="desc">${b.desc}</p>
    ${b.note ? `<p class="source-note">${b.note}</p>` : ''}
    ${b.also ? `<div class="also"><h3>ภายในอาคาร</h3><ul>${b.also.map((a) => `<li>${a}</li>`).join('')}</ul></div>` : ''}
    <div class="actions">
      <button type="button" class="btn primary" id="info-fly">ซูมไปที่อาคาร</button>
      <button type="button" class="btn" id="info-walk">เดินไปที่นี่</button>
      <button type="button" class="btn" id="info-copy">คัดลอกลิงก์</button>
    </div>`;
  infoEl.hidden = false;
  $('#info-close').addEventListener('click', () => select(null));
  $('#info-fly').addEventListener('click', () => select(b.id, { fly: true }));
  $('#info-walk').addEventListener('click', () => enterWalk(b));
  $('#info-copy').addEventListener('click', async (e) => {
    const url = location.href.split('#')[0] + '#' + b.id;
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = 'คัดลอกแล้ว';
    } catch {
      btn.textContent = url;
    }
    setTimeout(() => { btn.textContent = 'คัดลอกลิงก์'; }, 2200);
  });
}

function select(id, { fly = false } = {}) {
  const b = id ? byId[id] : null;
  state.selected = b ? b.id : null;
  for (const l of labelState) l.el.classList.toggle('active', l.b === b);
  listEl.querySelectorAll('.item').forEach((el) => el.setAttribute('aria-current', String(el.dataset.id === state.selected)));
  if (!b) {
    infoEl.hidden = true;
    marker.visible = false;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    return;
  }
  renderInfo(b);
  marker.visible = true;
  marker.position.set(b.x, 0, b.z);
  const ring = marker.getObjectByName('ring');
  const rad = Math.hypot(b.w, b.d) / 2 + 6;
  ring.scale.set(rad, 1, rad);
  marker.getObjectByName('pin').userData.base = b.top + 14;
  try { history.replaceState(null, '', '#' + b.id); } catch { /* sandboxed frames may refuse */ }
  listEl.querySelector(`[data-id="${b.id}"]`)?.scrollIntoView({ block: 'nearest' });
  if (fly) {
    if (state.mode === 'walk') enterWalk(b);
    else flyTo(new THREE.Vector3(b.x, b.top * 0.4, b.z), THREE.MathUtils.clamp(Math.max(b.w, b.d, b.top) * 3.4, 110, 420));
  }
}

// ───────────────────────── camera tweening ─────────────────────────

let tween = null;
function flyTo(target, distance, opts = {}) {
  if (state.mode !== 'orbit') return;
  const dir = camera.position.clone().sub(controls.target);
  dir.y = 0;
  if (dir.lengthSq() < 1) dir.set(0, 0, 1);
  dir.normalize();
  const elev = THREE.MathUtils.degToRad(opts.elevation ?? 38);
  const toPos = target.clone().add(dir.multiplyScalar(Math.cos(elev) * distance)).add(new THREE.Vector3(0, Math.sin(elev) * distance, 0));
  tweenCamera(opts.position ? new THREE.Vector3(...opts.position) : toPos, target);
}

function tweenCamera(toPos, toTarget, duration = 1.3) {
  tween = {
    t: 0,
    duration: reducedMotion ? 0.001 : duration,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos, toTarget,
  };
  controls.enabled = false;
}

function updateTween(dt) {
  tween.t = Math.min(1, tween.t + dt / tween.duration);
  const k = easeInOutCubic(tween.t);
  camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
  camera.lookAt(controls.target);
  if (tween.t >= 1) {
    tween = null;
    controls.enabled = state.mode === 'orbit';
    controls.update();
  }
}

// ───────────────────────── walk mode ─────────────────────────

const walk = { yaw: 0, pitch: 0, keys: new Set(), dragging: false, saved: null };
const EYE = 1.7;
const walkHud = $('#walk-hud');

function enterWalk(b) {
  if (state.mode !== 'walk') {
    walk.saved = { pos: camera.position.clone(), target: controls.target.clone() };
  }
  tween = null;
  state.mode = 'walk';
  controls.enabled = false;
  document.body.classList.add('walking');
  walkHud.hidden = false;
  let x = -690, z = 15, yaw = -Math.PI / 2;
  if (b) {
    // ยืนห่างจากด้านหน้าอาคาร (ฝั่ง z บวก) แล้วหันเข้าหาอาคาร
    x = b.x;
    z = b.z + b.d / 2 + Math.max(30, b.top * 1.6);
    yaw = 0;
  }
  camera.position.set(x, EYE, z);
  resolveCollisions(camera.position);
  walk.yaw = yaw;
  walk.pitch = b ? Math.atan2(b.top * 0.35, z - b.z) : 0;
  applyLook();
  updateModeButtons();
}

function exitWalk() {
  if (state.mode !== 'walk') return;
  state.mode = 'orbit';
  document.body.classList.remove('walking');
  walkHud.hidden = true;
  walk.keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  const here = new THREE.Vector3(camera.position.x, 0, camera.position.z);
  const back = new THREE.Vector3(Math.sin(walk.yaw), 0, Math.cos(walk.yaw)).multiplyScalar(220);
  tweenCamera(here.clone().add(back).add(new THREE.Vector3(0, 200, 0)), here);
  updateModeButtons();
}

function applyLook() {
  camera.rotation.order = 'YXZ';
  camera.rotation.set(walk.pitch, walk.yaw, 0);
}

function resolveCollisions(p) {
  const pad = 1.2;
  for (const b of BUILDINGS) {
    if (b.shape === 'none' || b.shape === 'pavilion') continue;
    for (const [fx, fz, fw, fd] of footprints(b)) {
      const hx = fw / 2 + pad, hz = fd / 2 + pad;
      const dx = p.x - fx, dz = p.z - fz;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        const ox = hx - Math.abs(dx), oz = hz - Math.abs(dz);
        if (ox < oz) p.x = fx + Math.sign(dx || 1) * hx;
        else p.z = fz + Math.sign(dz || 1) * hz;
      }
    }
  }
  p.x = THREE.MathUtils.clamp(p.x, OUTLINE_BOUNDS.minX, OUTLINE_BOUNDS.maxX);
  p.z = THREE.MathUtils.clamp(p.z, OUTLINE_BOUNDS.minZ, OUTLINE_BOUNDS.maxZ);
}

const tmpF = new THREE.Vector3(), tmpR = new THREE.Vector3();
function updateWalk(dt) {
  const k = walk.keys;
  const fwd = (k.has('KeyW') || k.has('ArrowUp') || k.has('fwd') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') || k.has('back') ? 1 : 0);
  const strafe = (k.has('KeyD') || k.has('right') ? 1 : 0) - (k.has('KeyA') || k.has('left') ? 1 : 0);
  const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
  if (turn) { walk.yaw += turn * dt * 1.6; applyLook(); }
  if (!fwd && !strafe) return;
  const speed = k.has('ShiftLeft') || k.has('ShiftRight') || k.has('run') ? 32 : 9;
  tmpF.set(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
  tmpR.set(Math.cos(walk.yaw), 0, -Math.sin(walk.yaw));
  const move = tmpF.multiplyScalar(fwd).add(tmpR.multiplyScalar(strafe)).normalize().multiplyScalar(speed * dt);
  camera.position.add(move);
  resolveCollisions(camera.position);
  camera.position.y = EYE;
}

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  if (e.key === '/' ) { e.preventDefault(); searchEl.focus(); return; }
  if (state.mode === 'walk') {
    walk.keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (e.code === 'Escape' && !document.pointerLockElement) exitWalk();
  } else if (e.key === 'Escape') {
    select(null);
  }
});
window.addEventListener('keyup', (e) => walk.keys.delete(e.code));
window.addEventListener('blur', () => walk.keys.clear());

const canvasEl = renderer.domElement;
let downAt = null;
canvasEl.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY };
  if (state.mode === 'walk') {
    walk.dragging = true;
    canvasEl.setPointerCapture(e.pointerId);
  }
});
canvasEl.addEventListener('pointermove', (e) => {
  if (state.mode === 'walk' && (document.pointerLockElement === canvasEl || walk.dragging)) {
    const s = document.pointerLockElement ? 0.0022 : 0.004;
    walk.yaw -= e.movementX * s;
    walk.pitch = THREE.MathUtils.clamp(walk.pitch - e.movementY * s, -1.2, 1.2);
    applyLook();
  } else if (state.mode === 'orbit' && !e.buttons) {
    hoverAt(e);
  }
});
canvasEl.addEventListener('pointerup', (e) => {
  walk.dragging = false;
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 6) return;
  if (state.mode === 'walk') {
    if (!isTouch && !document.pointerLockElement) {
      try { canvasEl.requestPointerLock()?.catch?.(() => {}); } catch { /* pointer lock is optional */ }
    }
    return;
  }
  const id = pick(e);
  select(id, { fly: !!id });
});

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(e) {
  const rect = canvasEl.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(buildingsRoot.children, true);
  for (const h of hits) if (h.object.userData.bid) return h.object.userData.bid;
  return null;
}

let hoverT = 0;
function hoverAt(e) {
  const now = performance.now();
  if (now - hoverT < 60) return;
  hoverT = now;
  canvasEl.style.cursor = pick(e) ? 'pointer' : '';
}

// on-screen walk pad for touch screens
document.querySelectorAll('[data-move]').forEach((btn) => {
  const key = btn.dataset.move;
  const on = (e) => { e.preventDefault(); walk.keys.add(key); };
  const off = () => walk.keys.delete(key);
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('pointercancel', off);
});

// ───────────────────────── toolbar ─────────────────────────

function updateModeButtons() {
  $('#mode-orbit').setAttribute('aria-pressed', String(state.mode === 'orbit'));
  $('#mode-walk').setAttribute('aria-pressed', String(state.mode === 'walk'));
  $('#hint').textContent = state.mode === 'walk'
    ? (isTouch ? 'ลากหน้าจอเพื่อมองรอบ ๆ · กดปุ่มลูกศรเพื่อเดิน' : 'W A S D เดิน · Shift วิ่ง · คลิกแล้วขยับเมาส์เพื่อมอง · Esc ปลดเมาส์')
    : (isTouch ? 'ลากนิ้วเพื่อเลื่อน · สองนิ้วเพื่อหมุนและซูม · แตะอาคารเพื่อดูรายละเอียด' : 'ลากเมาส์ซ้ายเพื่อเลื่อน · ลากขวาเพื่อหมุน · ล้อเมาส์ซูม · คลิกอาคารเพื่อดูรายละเอียด');
}

$('#mode-orbit').addEventListener('click', exitWalk);
$('#mode-walk').addEventListener('click', () => enterWalk(state.selected ? byId[state.selected] : null));
$('#toggle-night').addEventListener('click', () => setNight(!state.night));
$('#toggle-labels').addEventListener('click', () => {
  state.labels = !state.labels;
  $('#toggle-labels').setAttribute('aria-pressed', String(state.labels));
});
$('#reset-view').addEventListener('click', () => {
  if (state.mode === 'walk') exitWalk();
  tweenCamera(new THREE.Vector3(...startView.position), new THREE.Vector3(...startView.target));
});

function setNight(night) {
  state.night = night;
  for (const t of nightTargets) {
    const v = night ? t.night : t.day;
    if (t.prop === 'color') t.mat.color.set(v);
    else t.mat[t.prop] = v;
  }
  skyUniforms.top.value.set(night ? '#081221' : '#5fa4dc');
  skyUniforms.bottom.value.set(night ? '#1e3150' : '#dcebf5');
  scene.fog.color.set(night ? '#132036' : '#cfe3f1');
  hemi.intensity = night ? 0.6 : 1.15;
  hemi.color.set(night ? '#7f9cc9' : '#dcecff');
  sun.intensity = night ? 0.5 : 2.4;
  sun.color.set(night ? '#a9c2ff' : '#fff2dc');
  stars.visible = night;
  renderer.toneMappingExposure = night ? 1.25 : 1.05;
  const btn = $('#toggle-night');
  btn.setAttribute('aria-pressed', String(night));
  btn.querySelector('.txt').textContent = night ? 'กลางคืน' : 'กลางวัน';
  document.body.classList.toggle('night', night);
}

// ───────────────────────── minimap ─────────────────────────

const mini = $('#minimap');
const miniCtx = mini.getContext('2d');
// The minimap is drawn north-up like a street map: +z (north) at the top and the entrance
// (east, small x) on the right, which is the scene turned 180 degrees.
const MB = {
  minX: OUTLINE_BOUNDS.minX - 75, maxX: OUTLINE_BOUNDS.maxX + 20,
  minZ: OUTLINE_BOUNDS.minZ - 20, maxZ: OUTLINE_BOUNDS.maxZ + 20,
};
let miniScale = 1, miniStatic = null;

function miniToWorld(px, py) {
  return [MB.maxX - px / miniScale, MB.maxZ - py / miniScale];
}

function miniTransform(ctx, k) {
  ctx.setTransform(-k, 0, 0, -k, MB.maxX * k, MB.maxZ * k);
}

function drawMiniStatic() {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const cssW = mini.clientWidth;
  if (!cssW) { miniStatic = null; return; }
  miniScale = cssW / (MB.maxX - MB.minX);
  const cssH = (MB.maxZ - MB.minZ) * miniScale;
  mini.style.height = cssH + 'px';
  mini.width = cssW * dpr;
  mini.height = cssH * dpr;
  const [c, x] = canvas(mini.width, mini.height);
  miniTransform(x, dpr * miniScale);
  const css = getComputedStyle(document.body);
  x.fillStyle = css.getPropertyValue('--mini-ground').trim() || '#cdd8bf';
  x.fillRect(MB.minX, MB.minZ, MB.maxX - MB.minX, MB.maxZ - MB.minZ);
  x.beginPath();
  CAMPUS.outline.forEach(([px, pz], i) => (i ? x.lineTo(px, pz) : x.moveTo(px, pz)));
  x.closePath();
  x.fillStyle = '#8cc46a'; x.fill();
  x.strokeStyle = '#f2b134'; x.lineWidth = 6; x.stroke();
  x.lineCap = 'round';
  for (const r of ROADS) {
    x.strokeStyle = r.path ? '#e2ddd2' : '#6c7178'; x.lineWidth = r.w;
    x.beginPath(); x.moveTo(r.x1, r.z1); x.lineTo(r.x2, r.z2); x.stroke();
  }
  x.fillStyle = '#4fa8de';
  for (const w of WATER) {
    x.beginPath();
    if (w.kind === 'pool') w.pts.forEach(([px, pz], i) => (i ? x.lineTo(px, pz) : x.moveTo(px, pz)));
    else if (w.kind === 'canal') x.rect(w.x - w.w / 2, w.z - w.d / 2, w.w, w.d);
    else x.ellipse(w.x, w.z, w.rx, w.rz, 0, 0, Math.PI * 2);
    x.fill();
  }
  for (const f of FIELDS) { x.fillStyle = f.kind === 'track' ? '#c4603f' : '#3f8a5a'; x.fillRect(f.x - f.w / 2, f.z - f.d / 2, f.w, f.d); }
  for (const b of BUILDINGS) {
    if (b.shape === 'none') continue;
    x.fillStyle = CATEGORIES[b.category].color;
    for (const [fx, fz, fw, fd] of footprints(b)) x.fillRect(fx - fw / 2, fz - fd / 2, fw, fd);
  }
  miniStatic = c;
}

function drawMini() {
  if (!miniStatic || !mini.clientWidth) return;
  const dpr = mini.width / mini.clientWidth;
  miniCtx.setTransform(1, 0, 0, 1, 0, 0);
  miniCtx.drawImage(miniStatic, 0, 0);
  miniTransform(miniCtx, dpr * miniScale);
  const u = 1 / miniScale;
  if (state.selected) {
    const b = byId[state.selected];
    miniCtx.strokeStyle = '#f5b335'; miniCtx.lineWidth = 3 * u;
    miniCtx.beginPath(); miniCtx.arc(b.x, b.z, 9 * u, 0, Math.PI * 2); miniCtx.stroke();
  }
  const focus = state.mode === 'walk' ? camera.position : controls.target;
  camera.getWorldDirection(tmpF);
  const a = Math.atan2(tmpF.z, tmpF.x);
  miniCtx.fillStyle = 'rgba(245,179,53,0.35)';
  miniCtx.beginPath();
  miniCtx.moveTo(focus.x, focus.z);
  miniCtx.arc(focus.x, focus.z, 30 * u, a - 0.5, a + 0.5);
  miniCtx.closePath();
  miniCtx.fill();
  miniCtx.fillStyle = '#1b1b1f';
  miniCtx.strokeStyle = '#ffffff'; miniCtx.lineWidth = 1.5 * u;
  miniCtx.beginPath(); miniCtx.arc(focus.x, focus.z, 4 * u, 0, Math.PI * 2); miniCtx.fill(); miniCtx.stroke();
}

mini.addEventListener('click', (e) => {
  const rect = mini.getBoundingClientRect();
  const [wx, wz] = miniToWorld(e.clientX - rect.left, e.clientY - rect.top);
  if (state.mode === 'walk') {
    camera.position.set(wx, EYE, wz);
    resolveCollisions(camera.position);
  } else {
    const dist = camera.position.distanceTo(controls.target);
    flyTo(new THREE.Vector3(wx, 0, wz), Math.min(dist, 600));
  }
});

// ───────────────────────── frame loop ─────────────────────────

const clock = new THREE.Clock();
const camPos = new THREE.Vector3();

function updateLabels() {
  camPos.copy(camera.position);
  const walking = state.mode === 'walk';
  for (const l of labelState) {
    const d = camPos.distanceTo(l.b.group.position);
    const selected = state.selected === l.b.id;
    const show = selected || (state.labels && l.match !== false && d < (walking ? 320 : 2600));
    l.obj.visible = show;
    if (show) l.el.classList.toggle('compact', !selected && d > (walking ? 140 : 720));
  }
  for (const z of zoneLabels) z.visible = state.labels && !walking;
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  if (tween) updateTween(dt);
  else if (state.mode === 'orbit') controls.update();
  if (state.mode === 'walk') updateWalk(dt);

  for (const car of cars) {
    car.position.z += car.userData.dir * -car.userData.speed * dt;
    if (car.position.z < -520) car.position.z = 520;
    if (car.position.z > 520) car.position.z = -520;
  }

  if (marker.visible) {
    const pin = marker.getObjectByName('pin');
    pin.position.y = pin.userData.base + (reducedMotion ? 0 : Math.sin(t * 2.4) * 2);
    pin.rotation.y = t;
    const ring = marker.getObjectByName('ring');
    ring.material.opacity = 0.55 + Math.sin(t * 3) * 0.3;
  }

  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
  updateLabels();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  drawMini();
}

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  drawMiniStatic();
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(host);

// ───────────────────────── boot ─────────────────────────

renderChips();
renderList();
updateModeButtons();
drawMiniStatic();
renderer.setAnimationLoop(frame);
$('#loading').hidden = true;

function selectFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && byId[id]) select(id, { fly: true });
}
window.addEventListener('hashchange', selectFromHash);
selectFromHash();
