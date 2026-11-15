// ЗАЛ 3 — галерея. Скролл ведёт по коридору; каждая картина — отдельный маленький шейдер, который рисует себя сам.
import * as THREE from 'three';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 860px)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (id) => document.getElementById(id);
const rub = (n) => n.toLocaleString('ru-RU').replace(/ | /g, ' ') + ' ₽';

/* ---------- работы (вымышленные авторы и цены) ---------- */
const WORKS = [
  { title: 'Прилив № 4', who: 'Анна Ветер', year: 2026, w: 3.4, h: 2.3, kind: 0, c: ['#10223f', '#f0e6d2', '#ff5a36'], text: 'Полосы подчиняются шуму, как вода — луне. Ни один кадр не повторяется.', price: '180 000 ₽' },
  { title: 'Интерференция', who: 'Тимур Сай', year: 2025, w: 2.6, h: 2.6, kind: 1, c: ['#f4f1ea', '#141414', '#2337ff'], text: 'Две системы кругов накладываются друг на друга. Муар возникает сам — его никто не рисовал.', price: 'Продано' },
  { title: 'Тёплый фронт', who: 'Лея Морозова', year: 2027, w: 3.6, h: 2.2, kind: 2, c: ['#1d1a3a', '#e8508a', '#ffd166'], text: 'Облако из трёх красок, которое медленно перемешивает себя. Смотреть лучше минуту, а не секунду.', price: '240 000 ₽' },
  { title: 'Сорок девять', who: 'Group Zero', year: 2026, w: 2.6, h: 2.6, kind: 3, c: ['#ece7dc', '#151515', '#0f8f6a'], text: 'Сетка квадратов, где у каждого свой характер и своя скорость. Порядок, который не может усидеть на месте.', price: '120 000 ₽' },
  { title: 'Соседи', who: 'Ида Кром', year: 2025, w: 3.2, h: 2.4, kind: 4, c: ['#f2b705', '#d94f30', '#1f3a5f'], text: 'Клетки делят плоскость по правилу ближайшего соседа. Границы движутся, как на живой карте.', price: '210 000 ₽' },
  { title: 'Закат по расписанию', who: 'Марк Олин', year: 2027, w: 3.0, h: 2.6, kind: 5, c: ['#14213d', '#fca311', '#f7ede2'], text: 'Солнце, разрезанное на полосы, опускается ровно столько, сколько вы стоите перед ним.', price: 'Продано' },
].map((w, i) => ({ ...w, i, side: i % 2 ? 1 : -1, z: -9 - i * 9 }));
const END_Z = WORKS[WORKS.length - 1].z - 9;

$('works').innerHTML = WORKS.map((w) => `
  <section class="sec sec--work" id="w${w.i}" data-side="${w.side < 0 ? 'l' : 'r'}">
    <article class="plate">
      <p class="mono plate__n"><span>Работа ${w.i + 1} из ${WORKS.length}</span><span>${w.year}</span></p>
      <h2>${w.title}</h2>
      <p class="plate__who">${w.who}</p>
      <p>${w.text}</p>
      <dl><dt>Техника</dt><dd>Код, экран</dd><dt>Размер</dt><dd>${Math.round(w.w * 50)} × ${Math.round(w.h * 50)} см</dd><dt>Цена</dt><dd class="${w.price === 'Продано' ? 'sold' : ''}">${w.price}</dd></dl>
    </article>
  </section>`).join('');
const io = new IntersectionObserver((es) => es.forEach((e) => e.target.querySelector('.plate').classList.toggle('in', e.isIntersecting)), { rootMargin: '-25% 0px -25% 0px' });
document.querySelectorAll('.sec--work').forEach((s) => io.observe(s));

/* ---------- билеты (демо) ---------- */
const TYPES = [['adult', 'Взрослый', 700], ['student', 'Студенческий', 400], ['family', 'Семейный, до 4 человек', 1500]];
const order = { type: 'adult', qty: 2 };
$('types').insertAdjacentHTML('beforeend', TYPES.map(([id, name, p]) => `<label><input type="radio" name="type" value="${id}" ${id === order.type ? 'checked' : ''}><span>${name}<b>${rub(p)}</b></span></label>`).join(''));
const drawSum = () => { $('qty').textContent = order.qty; $('sum').textContent = rub(TYPES.find((t) => t[0] === order.type)[2] * order.qty); };
$('types').addEventListener('change', (e) => { order.type = e.target.value; drawSum(); });
$('minus').addEventListener('click', () => { order.qty = Math.max(1, order.qty - 1); drawSum(); });
$('plus').addEventListener('click', () => { order.qty = Math.min(10, order.qty + 1); drawSum(); });
$('buy').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('email'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()), note = $('note');
  note.classList.toggle('is-error', !ok); input.setAttribute('aria-invalid', String(!ok));
  note.textContent = ok ? 'Заказ собран. Демо: оплата не подключена, билет не отправлен.' : 'Проверьте адрес почты.';
  if (!ok) input.focus();
});
drawSum();
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const t = document.querySelector(a.getAttribute('href')); if (!t) return;
  e.preventDefault(); t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}));

/* ---------- скролл → где мы стоим в зале ---------- */
const secs = [...document.querySelectorAll('.sec')];
const STOPS = [0, ...WORKS.map((w) => w.z + 3.4), END_Z + 5]; // по одной точке на секцию
function walk() {
  const mid = innerHeight / 2; let t = 0;
  for (let i = 0; i < secs.length - 1; i++) {
    const a = secs[i].getBoundingClientRect(), b = secs[i + 1].getBoundingClientRect(), ca = a.top + a.height / 2, cb = b.top + b.height / 2;
    if (mid >= ca) t = i + sstep(0.3, 0.7, (mid - ca) / (cb - ca));
  }
  t = clamp(t, 0, STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  const near = Math.round(t);
  $('where').textContent = near === 0 ? 'Вход' : near > WORKS.length ? 'Касса' : `${WORKS[near - 1].title} · ${near}/${WORKS.length}`;
  return lerp(STOPS[i], STOPS[i + 1], t - i);
}

/* ------------------------------------------------------------------ */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' }); }
catch (e) { document.documentElement.classList.add('no-webgl'); document.body.classList.remove('is-loading'); }
if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  const WHITE = new THREE.Color('#f4f4f1');
  renderer.setClearColor(WHITE, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(WHITE, 16, 46);
  const camera = new THREE.PerspectiveCamera(small ? 74 : 58, innerWidth / innerHeight, 0.1, 120);

  const HALF = 4.2, H = 4.6, LEN = -END_Z + 6;
  const wallMat = new THREE.MeshStandardMaterial({ color: '#f6f6f3', roughness: 0.95 });
  const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const left = plane(LEN, H, wallMat); left.rotation.y = Math.PI / 2; left.position.set(-HALF, H / 2, -LEN / 2 + 3);
  const right = plane(LEN, H, wallMat); right.rotation.y = -Math.PI / 2; right.position.set(HALF, H / 2, -LEN / 2 + 3);
  const end = plane(HALF * 2, H, wallMat); end.position.set(0, H / 2, END_Z);
  const ceil = plane(HALF * 2, LEN, new THREE.MeshStandardMaterial({ color: '#e9e9e6', roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -LEN / 2 + 3);
  const floor = plane(HALF * 2, LEN, new THREE.MeshStandardMaterial({ color: '#dcdcd8', roughness: 0.35, transparent: true, opacity: 0.84 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -LEN / 2 + 3);
  const strip = plane(0.5, LEN, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })); strip.rotation.x = Math.PI / 2; strip.position.set(0, H - 0.01, -LEN / 2 + 3);
  scene.add(left, right, end, ceil, floor, strip);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, LEN), new THREE.MeshStandardMaterial({ color: '#cfcfcb' })); b.position.set(s * (HALF - 0.02), 0.06, -LEN / 2 + 3); scene.add(b); }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e6e0, 3.4));

  /* ---------- картины ---------- */
  const uTime = { value: 0 };
  const ART = /* glsl */`
    uniform float uTime, uAspect; uniform int uKind; uniform vec3 uA, uB, uC; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
    void main(){
      vec2 p = (vUv - .5) * vec2(uAspect, 1.) * 2.; float t = uTime * .15; vec3 c;
      if (uKind == 0) {
        float w = sin(p.y * 9. + sin(p.x * 2.2 + t * 2.) * 1.6 + fbm(p * 1.5 + t) * 3.);
        c = mix(uA, uB, smoothstep(-.12, .12, w)); c = mix(c, uC, smoothstep(.8, .97, sin(p.x * 2.6 + t * 1.5)) * smoothstep(-.12, .12, w));
      } else if (uKind == 1) {
        float d1 = length(p - vec2(-.45, .05) - .12 * vec2(sin(t * 2.), cos(t * 2.))), d2 = length(p - vec2(.45, -.05));
        c = mix(uA, uB, smoothstep(-.1, .1, sin(d1 * 40.) * sin(d2 * 40.)));
        c = mix(c, uC, smoothstep(.0, .012, .26 - length(p - vec2(0., .12 * sin(t * 1.5)))));
      } else if (uKind == 2) {
        float f = fbm(p * 1.5 + vec2(t, -t * .6) + fbm(p * 3. + t) * .9);
        c = mix(uA, uB, smoothstep(.28, .56, f)); c = mix(c, uC, smoothstep(.56, .74, f));
      } else if (uKind == 3) {
        vec2 g = p * 3.5, id = floor(g), f = fract(g) - .5; float a = h(id) * 6.28 + t * 3. * (h(id + 7.) - .5);
        f = mat2(cos(a), -sin(a), sin(a), cos(a)) * f;
        float s = 1. - smoothstep(0., .015, max(abs(f.x), abs(f.y)) - (.22 + .12 * h(id + 3.)));
        c = mix(uA, mix(uB, uC, step(.72, h(id + 11.))), s);
      } else if (uKind == 4) {
        vec2 g = p * 2.6, id = floor(g), f = fract(g), win = id; float md = 9.;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 o = vec2(float(i), float(j)), r = o + .5 + .42 * sin(t * 2.5 + 6.28 * vec2(h(id + o), h(id + o + 5.))) - f; float d = dot(r, r);
          if (d < md) { md = d; win = id + o; }
        }
        float k = h(win + 2.); c = k < .38 ? uA : k < .72 ? uB : uC; c *= .8 + .2 * smoothstep(0., .3, sqrt(md));
      } else {
        float band = floor((p.y + 1.) * 6.5); c = mix(uA, mix(uA, uB, .22), mod(band, 2.));
        float sunY = .2 - .12 * sin(t * 1.2), sun = 1. - smoothstep(.5, .51, length(p - vec2(0., sunY)));
        float cut = step(.45, fract((p.y + t * .35) * 6.5));
        c = mix(c, uB, sun * mix(1., cut, step(p.y, sunY - .05))); c = mix(c, uC, sun * step(sunY + .32, p.y));
      }
      c *= .9 + .1 * smoothstep(1.3, .2, length(p)); // свет софита к краям слабеет
      gl_FragColor = vec4(c, 1.);
    }`;
  const frameMat = new THREE.MeshBasicMaterial({ color: '#111111', side: THREE.DoubleSide });
  const mirror = new THREE.Group(); mirror.scale.y = -1; scene.add(mirror); // отражение в полу — зеркальная копия картин
  for (const w of WORKS) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, fog: false,
      uniforms: { uTime, uAspect: { value: w.w / w.h }, uKind: { value: w.kind }, uA: { value: new THREE.Color(w.c[0]) }, uB: { value: new THREE.Color(w.c[1]) }, uC: { value: new THREE.Color(w.c[2]) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`, fragmentShader: ART,
    });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(w.w, w.h), mat));
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w.w + 0.14, w.h + 0.14, 0.07), frameMat); fr.position.z = -0.045; g.add(fr);
    g.position.set(w.side * (HALF - 0.09), 2.05, w.z); g.rotation.y = -w.side * Math.PI / 2;
    scene.add(g); mirror.add(g.clone());
    const spot = new THREE.SpotLight(0xfff8ee, 46, 13, 0.62, 0.9, 1.6);
    spot.position.set(w.side * 0.9, H - 0.2, w.z); spot.target.position.set(w.side * HALF, 1.9, w.z); scene.add(spot, spot.target);
  }
  // скамейки посреди зала
  const bench = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.6 });
  for (const z of [-18, -36, -54]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 2.4), bench); b.position.set(0, 0.21, z + 4.5); scene.add(b); }

  /* ---------- камера ---------- */
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  let z = walk(), yaw = 0, started = false;
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (document.hidden) return;
    const time = clock.elapsedTime, k = (r) => (reduceMotion ? 1 : 1 - Math.exp(-dt * r));
    uTime.value = reduceMotion ? 12 : time;
    z = lerp(z, walk(), k(3.2));
    // голова поворачивается к ближайшей работе, а между работами смотрит вдоль зала
    let want = 0, side = 0;
    for (const w of WORKS) { const d = z - (w.z + 3.4), wgt = Math.exp(-(d * d) / 7); if (wgt > Math.abs(want)) { want = wgt; side = w.side; } }
    const portrait = camera.aspect < 0.85;
    yaw = lerp(yaw, -side * want * (portrait ? 0.98 : 0.86), k(3));
    mouse.sx = lerp(mouse.sx, mouse.x, k(3)); mouse.sy = lerp(mouse.sy, mouse.y, k(3));
    const bob = reduceMotion ? 0 : Math.sin(z * 1.6) * 0.035;
    camera.position.set(-side * want * (portrait ? 1.7 : 1.1), 1.72 + bob, z);
    camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw - mouse.sx * 0.12; camera.rotation.x = 0.03 - mouse.sy * 0.06;
    renderer.render(scene, camera);
    if (!started) { started = true; document.body.classList.remove('is-loading'); }
  }
  frame();
}
