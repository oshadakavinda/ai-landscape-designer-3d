/**
 * controls/WalkControls.jsx
 *
 * First-person walk controller with:
 *   ─ Pointer Lock API   — click canvas to capture mouse; Esc to release
 *   ─ WASD + Arrow keys  — move forward/back/strafe
 *   ─ Shift              — sprint (2× speed)
 *   ─ AABB collision     — can't walk through house or tall objects; slides along walls
 */
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GROUND_HEIGHT } from '../../../constants/renderConfig';

// ─── Constants ────────────────────────────────────────────────────────────────
const EYE_HEIGHT     = 1.7;    // metres above ground
const MOVE_SPEED     = 5.0;    // m/s base
const SPRINT_MULTI   = 2.2;
const LOOK_SENS      = 0.002;  // radians per raw pixel
const PITCH_LIMIT    = Math.PI / 2.5;
const PLAYER_RADIUS  = 0.4;    // collision capsule half-width (metres)
const EDGE_MARGIN    = PLAYER_RADIUS + 0.05;

// Object types that have physical height the player can't walk through
const SOLID_TYPES = new Set([
  'trees', 'fountain', 'bench', 'covered_car_park',
  'garden_lights', 'seating_area',
]);

// ─── Build padded AABB colliders from house + objects ─────────────────────────
function buildColliders(house, objects) {
  const boxes = [];
  const pad = PLAYER_RADIUS;

  if (house) {
    boxes.push({
      minX: house.x     - pad,
      maxX: house.x + house.width  + pad,
      minZ: house.y     - pad,
      maxZ: house.y + house.depth  + pad,
    });
  }

  for (const obj of objects) {
    const isSolid = SOLID_TYPES.has(obj.type) || (obj.height != null && obj.height > 0.5);
    if (!isSolid) continue;
    boxes.push({
      minX: obj.x          - pad,
      maxX: obj.x + obj.width  + pad,
      minZ: obj.y          - pad,
      maxZ: obj.y + obj.depth  + pad,
    });
  }

  return boxes;
}

// Returns true when point (x, z) is inside any padded AABB
function insideAny(x, z, boxes) {
  for (const b of boxes) {
    if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
  }
  return false;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalkControls({ land, house, objects = [] }) {
  const { camera, gl } = useThree();

  const keys      = useRef({});
  const yaw       = useRef(Math.PI);
  const pitch     = useRef(-0.15);
  const isLocked  = useRef(false);
  const colliders = useRef(buildColliders(house, objects));

  // Rebuild colliders if layout changes
  useEffect(() => {
    colliders.current = buildColliders(house, objects);
  }, [house, objects]);

  // ── Teleport to a good starting position inside the plot ──────────────────
  useEffect(() => {
    const startX = land.width / 2;
    const startZ = Math.min(land.depth - EDGE_MARGIN, land.depth * 0.8);
    camera.position.set(startX, GROUND_HEIGHT + EYE_HEIGHT, startZ);
    camera.fov = 75;
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pointer Lock setup ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement;

    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
    };
    const onLockError = () => {
      console.warn('[WalkControls] Pointer lock request denied.');
    };

    // Mouse-look — only fires when locked; movementX/Y are raw deltas
    const onMouseMove = (e) => {
      if (!isLocked.current) return;
      yaw.current   -= e.movementX * LOOK_SENS;
      pitch.current -= e.movementY * LOOK_SENS;
      pitch.current  = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };

    // Click canvas to acquire lock
    const onClick = () => {
      if (!isLocked.current) {
        canvas.requestPointerLock();
      }
    };

    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('pointerlockerror',  onLockError);
    document.addEventListener('mousemove',         onMouseMove);
    canvas.addEventListener('click',               onClick);

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('pointerlockerror',  onLockError);
      document.removeEventListener('mousemove',         onMouseMove);
      canvas.removeEventListener('click',               onClick);
      // Always release lock when component unmounts
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true; };
    const up   = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  // ── Per-frame game loop ───────────────────────────────────────────────────
  // Allocate vectors outside frame loop to avoid GC pressure
  const _qYaw   = new THREE.Quaternion();
  const _qPitch = new THREE.Quaternion();
  const _fwd    = new THREE.Vector3();
  const _right  = new THREE.Vector3();
  const _UP     = new THREE.Vector3(0, 1, 0);
  const _RIGHT  = new THREE.Vector3(1, 0, 0);

  useFrame((_, delta) => {
    const k = keys.current;

    // ── Camera rotation ──────────────────────────────────────────────────────
    _qYaw.setFromAxisAngle(_UP,    yaw.current);
    _qPitch.setFromAxisAngle(_RIGHT, pitch.current);
    camera.quaternion.copy(_qYaw).multiply(_qPitch);

    // ── Compute movement intent (horizontal plane only) ──────────────────────
    _fwd.set(0, 0, -1).applyQuaternion(_qYaw);   // ignore pitch for walking
    _right.set(1, 0, 0).applyQuaternion(_qYaw);

    const sprint = (k['ShiftLeft'] || k['ShiftRight']) ? SPRINT_MULTI : 1;
    const spd    = MOVE_SPEED * sprint * delta;

    let dx = 0, dz = 0;
    if (k['KeyW'] || k['ArrowUp'])    { dx += _fwd.x   * spd; dz += _fwd.z   * spd; }
    if (k['KeyS'] || k['ArrowDown'])  { dx -= _fwd.x   * spd; dz -= _fwd.z   * spd; }
    if (k['KeyA'] || k['ArrowLeft'])  { dx -= _right.x * spd; dz -= _right.z * spd; }
    if (k['KeyD'] || k['ArrowRight']) { dx += _right.x * spd; dz += _right.z * spd; }

    const curX = camera.position.x;
    const curZ = camera.position.z;
    const boxes = colliders.current;

    // ── Clamp to land boundary ───────────────────────────────────────────────
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const boundX = (x) => clamp(x, EDGE_MARGIN, land.width  - EDGE_MARGIN);
    const boundZ = (z) => clamp(z, EDGE_MARGIN, land.depth  - EDGE_MARGIN);

    let newX = boundX(curX + dx);
    let newZ = boundZ(curZ + dz);

    // ── Wall-sliding collision resolution ────────────────────────────────────
    if (insideAny(newX, newZ, boxes)) {
      // Try sliding along X axis only
      const slideX = boundX(curX + dx);
      if (!insideAny(slideX, curZ, boxes)) {
        newX = slideX;
        newZ = curZ;
      } else {
        // Try sliding along Z axis only
        const slideZ = boundZ(curZ + dz);
        if (!insideAny(curX, slideZ, boxes)) {
          newX = curX;
          newZ = slideZ;
        } else {
          // Fully blocked — no movement
          newX = curX;
          newZ = curZ;
        }
      }
    }

    camera.position.x = newX;
    camera.position.z = newZ;
    camera.position.y = GROUND_HEIGHT + EYE_HEIGHT; // lock to eye height
  });

  return null;
}
