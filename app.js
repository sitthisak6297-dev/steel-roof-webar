import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const host = document.getElementById('canvas-host');
const loading = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xf1f5f3);
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  1,
  0.01,
  1000
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.enableZoom = true;

// แสง
scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.5));

const light1 = new THREE.DirectionalLight(0xffffff, 3);
light1.position.set(5, -5, 10);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffffff, 1.5);
light2.position.set(-5, 5, 5);
scene.add(light2);

// โหลดโมเดลใหม่
const loader = new GLTFLoader();

loader.load(
  './SteelRoof_New_From_Drawing.glb',

  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // คำนวณขนาดโมเดลอัตโนมัติ
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    controls.target.copy(center);

    const maxSize = Math.max(size.x, size.y, size.z);
    const distance =
      maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    camera.position.set(
      center.x + distance * 0.8,
      center.y - distance * 0.8,
      center.z + distance * 0.55
    );

    camera.near = Math.max(maxSize / 1000, 0.01);
    camera.far = maxSize * 100;
    camera.updateProjectionMatrix();

    controls.update();

    if (loading) {
      loading.hidden = true;
    }

    console.log('Steel Roof model loaded successfully');
  },

  undefined,

  (error) => {
    console.error('GLB load error:', error);

    if (loading) {
      loading.hidden = false;

      const title = document.getElementById('load-title');
      const detail = document.getElementById('load-detail');

      if (title) title.textContent = 'เปิดโมเดลไม่สำเร็จ';
      if (detail) detail.textContent = 'ไม่สามารถโหลดไฟล์ GLB ได้';
    }
  }
);

// ปรับขนาดอัตโนมัติ
function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;

  if (!width || !height) return;

  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

// Render loop
function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

animate();
