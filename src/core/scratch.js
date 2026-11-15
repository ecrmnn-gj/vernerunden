// Reusable math objects for per-frame work, so the game loop does not allocate.
import * as THREE from 'three';

export const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v3 = new THREE.Vector3(), _v2 = new THREE.Vector2(), _s3 = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
