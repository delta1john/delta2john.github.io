/* Ahazi Kids — hero3d.js
   Floating 3D toys (letter blocks, balls, rings, a star) behind the hero car.
   Desktop only; removes itself quietly if WebGL or the module import fails. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

const canvas = document.getElementById("hero3d");
const hero = document.querySelector(".showroom-hero");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && hero && !reducedMotion && window.innerWidth > 1080) {
  try { init(); } catch (error) { canvas.remove(); }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x090909, 15, 30);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 0, 14);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9ff57, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(6, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9ff57, 0.7);
  rim.position.set(-7, -4, 6);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  const letterTexture = (letter, background) => {
    const surface = document.createElement("canvas");
    surface.width = surface.height = 256;
    const context = surface.getContext("2d");
    context.fillStyle = background;
    context.fillRect(0, 0, 256, 256);
    context.strokeStyle = "rgba(9,9,9,.32)";
    context.lineWidth = 10;
    context.strokeRect(16, 16, 224, 224);
    context.fillStyle = "#10110f";
    context.font = "900 148px Manrope, 'Arial Black', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(letter, 128, 140);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const toyMaterial = color => new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.08 });

  const starGeometry = (() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? 0.34 : 0.78;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  })();

  const ACID = "#d9ff57", YELLOW = "#f5c84c", PINK = "#f4a5b8", MINT = "#c5e8d8", WHITE = "#ffffff";
  const items = [
    { kind: "block", letter: "A", color: YELLOW, position: [-8.4, 3.2, -4.0], size: 1.15 },
    { kind: "block", letter: "H", color: PINK,   position: [-3.4, -3.7, -2.6], size: 1.0 },
    { kind: "block", letter: "A", color: MINT,   position: [2.8, 4.0, -5.0], size: 1.25 },
    { kind: "block", letter: "Z", color: ACID,   position: [8.6, -3.0, -2.2], size: 1.05 },
    { kind: "block", letter: "I", color: WHITE,  position: [0.4, -4.8, -6.0], size: 1.2 },
    { kind: "sphere", color: PINK,   position: [-9.8, -2.6, -5.0], size: 0.85 },
    { kind: "sphere", color: MINT,   position: [5.9, 1.7, -3.2], size: 0.55 },
    { kind: "sphere", color: YELLOW, position: [9.6, 3.5, -6.0], size: 1.05 },
    { kind: "sphere", color: WHITE,  position: [-5.4, 2.6, -6.5], size: 0.6 },
    { kind: "torus", color: ACID, position: [-7.0, -4.6, -4.5], size: 0.8 },
    { kind: "torus", color: MINT, position: [7.7, -5.2, -3.6], size: 0.65 },
    { kind: "star",  color: ACID, position: [3.5, -0.9, -3.0], size: 0.9 },
  ];

  const toys = items.map((item, index) => {
    let mesh;
    if (item.kind === "block") {
      const material = new THREE.MeshStandardMaterial({ map: letterTexture(item.letter, item.color), roughness: 0.34, metalness: 0.05 });
      mesh = new THREE.Mesh(new THREE.BoxGeometry(item.size, item.size, item.size), material);
    } else if (item.kind === "sphere") {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(item.size, 40, 40), toyMaterial(item.color));
    } else if (item.kind === "torus") {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(item.size, item.size * 0.38, 22, 44), toyMaterial(item.color));
    } else {
      mesh = new THREE.Mesh(starGeometry, toyMaterial(item.color));
    }
    mesh.position.set(item.position[0], item.position[1], item.position[2]);
    mesh.rotation.set(index * 0.7, index * 1.1, index * 0.4);
    mesh.userData = {
      targetScale: item.kind === "star" ? item.size : 1,
      baseY: item.position[1],
      floatAmp: 0.3 + (index % 4) * 0.11,
      floatSpeed: 0.45 + (index % 5) * 0.12,
      spinX: 0.1 + (index % 3) * 0.07,
      spinY: 0.14 + (index % 4) * 0.06,
      phase: index * 1.7,
    };
    group.add(mesh);
    return mesh;
  });

  /* Toys pop in after the preloader/hero intro settles */
  toys.forEach(toy => toy.scale.setScalar(0.001));
  if (window.gsap) {
    toys.forEach((toy, index) => {
      const s = toy.userData.targetScale;
      window.gsap.to(toy.scale, { x: s, y: s, z: s, duration: 1.3, ease: "back.out(1.5)", delay: 1.8 + index * 0.07 });
    });
  } else {
    toys.forEach(toy => toy.scale.setScalar(toy.userData.targetScale));
  }

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  window.addEventListener("pointermove", event => {
    pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const resize = () => {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  let onScreen = true;
  new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; }).observe(hero);

  const clock = new THREE.Clock();
  const tick = () => {
    requestAnimationFrame(tick);
    if (!onScreen || document.hidden) return;
    const t = clock.getElapsedTime();
    const progress = typeof window.__ahaziHeroProgress === "number"
      ? window.__ahaziHeroProgress
      : Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight));

    toys.forEach(toy => {
      const data = toy.userData;
      toy.position.y = data.baseY + Math.sin(t * data.floatSpeed + data.phase) * data.floatAmp;
      toy.rotation.x += data.spinX * 0.004;
      toy.rotation.y += data.spinY * 0.004;
    });

    pointer.x += (pointer.targetX - pointer.x) * 0.04;
    pointer.y += (pointer.targetY - pointer.y) * 0.04;
    camera.position.x = pointer.x * 1.1;
    camera.position.y = -pointer.y * 0.7 + progress * 4;
    camera.lookAt(0, progress * 4, 0);

    renderer.render(scene, camera);
  };
  tick();
}
