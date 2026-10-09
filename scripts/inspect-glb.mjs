import { readFileSync } from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'public/models/teeth-realistic.glb');
const buf = readFileSync(path);
const loader = new GLTFLoader();

loader.parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
  (gltf) => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    let tris = 0;
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        const g = o.geometry;
        tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        console.log('mesh', o.name, 'mats', o.material?.name || o.material?.type);
      }
    });
    console.log(JSON.stringify({ size, center, tris, mb: buf.length / 1e6 }, null, 2));
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
