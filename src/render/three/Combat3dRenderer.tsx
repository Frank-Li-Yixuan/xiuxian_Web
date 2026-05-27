import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneThreeObject } from "three/examples/jsm/utils/SkeletonUtils.js";

import type {
  Combat3dArtifactView,
  Combat3dBossView,
  Combat3dBulletView,
  Combat3dEnemyView,
  Combat3dModelRef,
  Combat3dPickupView,
  Combat3dPlayerView,
  Combat3dViewState,
  Combat3dWarningView,
  Combat3dWorldPosition
} from "./Combat3dViewState";

export interface Combat3dRendererProps {
  readonly viewState: Combat3dViewState;
}

export function Combat3dRenderer({ viewState }: Combat3dRendererProps): ReactElement {
  return (
    <Canvas
      className="dev-3d-combat-canvas"
      camera={{ far: 80, near: 0.1, position: [0, 12.5, 10.5], zoom: 70 }}
      orthographic
    >
      <color args={["#050914"]} attach="background" />
      <fog args={["#050914", 13, 28]} attach="fog" />
      <CameraRig />
      <ambientLight intensity={0.65} />
      <directionalLight intensity={2.4} position={[4, 8, 5]} />
      <pointLight color="#7dd3fc" intensity={26} position={[-5, 4, 3]} />
      <CombatEnvironment />
      <group renderOrder={10}>
        {viewState.pickups.map((pickup) => (
          <PickupNode key={pickup.id} pickup={pickup} />
        ))}
        {viewState.enemies.map((enemy) => (
          <EnemyNode enemy={enemy} key={enemy.id} />
        ))}
        {viewState.boss === undefined ? null : <BossNode boss={viewState.boss} />}
        {viewState.players.map((player) => (
          <PlayerNode key={player.id} player={player} />
        ))}
        {viewState.artifacts.map((artifact) => (
          <ArtifactNode artifact={artifact} key={artifact.id} />
        ))}
      </group>
      <WarningRings warnings={viewState.warnings} />
      <BulletInstances bullets={viewState.playerBullets} kind="player" />
      <BulletInstances bullets={viewState.enemyBullets} kind="enemy" />
    </Canvas>
  );
}

function CameraRig(): null {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 12.5, 10.5);
    camera.lookAt(0, 0, 0.65);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function CombatEnvironment(): ReactElement {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial color="#07111c" roughness={0.92} />
      </mesh>
      <gridHelper args={[18, 36, "#24515d", "#15313a"]} position={[0, 0.012, 0]} />
      <FormationLines />
      <MistParticles />
    </group>
  );
}

function FormationLines(): ReactElement {
  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(-6.5, 0.025, -3.6),
      new THREE.Vector3(6.5, 0.025, -3.6),
      new THREE.Vector3(6.5, 0.025, 3.6),
      new THREE.Vector3(-6.5, 0.025, 3.6),
      new THREE.Vector3(-6.5, 0.025, -3.6),
      new THREE.Vector3(0, 0.025, -4.2),
      new THREE.Vector3(0, 0.025, 4.2),
      new THREE.Vector3(-7.4, 0.025, 0),
      new THREE.Vector3(7.4, 0.025, 0)
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#38bdf8" opacity={0.18} transparent />
    </lineSegments>
  );
}

function MistParticles(): ReactElement {
  const positions = useMemo(() => {
    const data = new Float32Array(72 * 3);
    for (let index = 0; index < 72; index += 1) {
      const angle = index * 2.399963229728653;
      const radius = 1.6 + (index % 17) * 0.42;
      data[index * 3] = Math.cos(angle) * radius;
      data[index * 3 + 1] = 0.08 + (index % 5) * 0.06;
      data[index * 3 + 2] = Math.sin(angle) * radius * 0.62;
    }
    return data;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial color="#86efac" opacity={0.22} size={0.08} sizeAttenuation transparent />
    </points>
  );
}

function PlayerNode({ player }: { readonly player: Combat3dPlayerView }): ReactElement {
  return (
    <group position={toTuple(player.position)}>
      <ModelOrFallback fallbackKind="player" model={player.model} scale={0.72} />
      <mesh position={[0, 0.08, 0]} renderOrder={30} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 24]} />
        <meshBasicMaterial color={player.renderColor === "player1" ? "#7dd3fc" : "#f0abfc"} depthTest={false} transparent />
      </mesh>
    </group>
  );
}

function ArtifactNode({ artifact }: { readonly artifact: Combat3dArtifactView }): ReactElement {
  return (
    <group position={toTuple(artifact.position)} rotation={[0, Math.PI * 0.18, -0.45]}>
      <ModelOrFallback fallbackKind="artifact" model={artifact.model} scale={0.5} />
    </group>
  );
}

function EnemyNode({ enemy }: { readonly enemy: Combat3dEnemyView }): ReactElement {
  return (
    <group position={toTuple(enemy.position)}>
      <ModelOrFallback fallbackKind="enemy" model={enemy.model} scale={enemy.renderKind === "elite_split_wind_wolf" ? 0.9 : 0.72} />
      <HealthPip ratio={enemy.hpRatio} />
    </group>
  );
}

function PickupNode({ pickup }: { readonly pickup: Combat3dPickupView }): ReactElement {
  return (
    <group position={toTuple(pickup.position)}>
      <ModelOrFallback fallbackKind="pickup" model={pickup.model} scale={0.55} />
    </group>
  );
}

function BossNode({ boss }: { readonly boss: Combat3dBossView }): ReactElement {
  return (
    <group position={toTuple(boss.position)}>
      <ModelOrFallback fallbackKind="boss" model={boss.model} scale={0.95} />
      <HealthPip ratio={boss.hpRatio} width={1.6} y={1.55} />
    </group>
  );
}

function HealthPip({ ratio, width = 0.72, y = 1.02 }: { readonly ratio: number; readonly width?: number; readonly y?: number }): ReactElement {
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, 0.035, 0.035]} />
        <meshBasicMaterial color="#334155" />
      </mesh>
      <mesh position={[-(width * (1 - clamp01(ratio))) / 2, 0.002, 0]}>
        <boxGeometry args={[Math.max(0.01, width * clamp01(ratio)), 0.045, 0.045]} />
        <meshBasicMaterial color={ratio < 0.35 ? "#fb7185" : "#22c55e"} />
      </mesh>
    </group>
  );
}

function WarningRings({ warnings }: { readonly warnings: readonly Combat3dWarningView[] }): ReactElement {
  return (
    <group renderOrder={20}>
      {warnings.map((warning) => (
        <mesh key={warning.id} position={[warning.position.x, 0.045, warning.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.05, warning.radiusWorld * 0.88), Math.max(0.08, warning.radiusWorld), 48]} />
          <meshBasicMaterial color={warning.severity === "lethal" ? "#facc15" : "#fb7185"} depthTest={false} opacity={0.72} transparent />
        </mesh>
      ))}
    </group>
  );
}

function BulletInstances({ bullets, kind }: { readonly bullets: readonly Combat3dBulletView[]; readonly kind: "player" | "enemy" }): ReactElement | null {
  const shellRef = useRef<THREE.InstancedMesh | null>(null);
  const coreRef = useRef<THREE.InstancedMesh | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    for (let index = 0; index < bullets.length; index += 1) {
      const bullet = bullets[index];
      if (bullet === undefined) {
        continue;
      }
      dummy.position.set(bullet.position.x, bullet.position.y, bullet.position.z);
      dummy.scale.setScalar(bullet.radiusWorld * (kind === "enemy" ? 1.9 : 1.45));
      dummy.updateMatrix();
      shellRef.current?.setMatrixAt(index, dummy.matrix);
      dummy.scale.setScalar(bullet.radiusWorld * (kind === "enemy" ? 0.82 : 0.7));
      dummy.updateMatrix();
      coreRef.current?.setMatrixAt(index, dummy.matrix);
    }
    if (shellRef.current !== null) {
      shellRef.current.instanceMatrix.needsUpdate = true;
    }
    if (coreRef.current !== null) {
      coreRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [bullets, dummy, kind]);

  if (bullets.length === 0) {
    return null;
  }

  const shellColor = kind === "player" ? "#38bdf8" : "#ef4444";
  const coreColor = kind === "player" ? "#e0f2fe" : "#ffffff";
  return (
    <group renderOrder={kind === "enemy" ? 50 : 35}>
      <instancedMesh args={[undefined, undefined, bullets.length]} ref={shellRef}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={shellColor} depthTest={false} opacity={0.62} transparent />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, bullets.length]} ref={coreRef}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshBasicMaterial color={coreColor} depthTest={false} opacity={0.96} transparent />
      </instancedMesh>
    </group>
  );
}

function ModelOrFallback({
  model,
  fallbackKind,
  scale
}: {
  readonly model: Combat3dModelRef;
  readonly fallbackKind: "player" | "artifact" | "enemy" | "pickup" | "boss";
  readonly scale: number;
}): ReactElement {
  if (model.usesFallback || model.path === undefined) {
    return <FallbackPrimitive kind={fallbackKind} scale={scale} />;
  }
  return <LoadedModel fallbackKind={fallbackKind} model={model} scale={scale} />;
}

function LoadedModel({
  model,
  fallbackKind,
  scale
}: {
  readonly model: Combat3dModelRef;
  readonly fallbackKind: "player" | "artifact" | "enemy" | "pickup" | "boss";
  readonly scale: number;
}): ReactElement {
  const [sourceScene, setSourceScene] = useState<THREE.Object3D | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (model.path === undefined) {
      return;
    }
    let cancelled = false;
    setFailed(false);
    setSourceScene(null);
    new GLTFLoader().load(
      model.path,
      (gltf) => {
        if (!cancelled) {
          setSourceScene(gltf.scene);
        }
      },
      undefined,
      () => {
        if (!cancelled) {
          setFailed(true);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [model.path]);

  const scene = useMemo(() => {
    if (sourceScene === null) {
      return null;
    }
    const clone = cloneThreeObject(sourceScene);
    clone.traverse((object) => {
      if (!object.matrixAutoUpdate) {
        object.matrix.decompose(object.position, object.quaternion, object.scale);
      }
      object.matrixAutoUpdate = true;
      object.matrixWorldAutoUpdate = true;
    });
    return clone;
  }, [sourceScene]);

  if (failed) {
    return <FallbackPrimitive kind={fallbackKind} scale={scale} />;
  }
  if (scene === null) {
    return <FallbackPrimitive kind={fallbackKind} scale={scale} ghost />;
  }
  return <primitive object={scene} scale={[scale * model.scale.x, scale * model.scale.y, scale * model.scale.z]} />;
}

function FallbackPrimitive({
  kind,
  scale,
  ghost = false
}: {
  readonly kind: "player" | "artifact" | "enemy" | "pickup" | "boss";
  readonly scale: number;
  readonly ghost?: boolean;
}): ReactElement {
  const opacity = ghost ? 0.38 : 1;
  switch (kind) {
    case "player":
      return (
        <group scale={scale}>
          <mesh position={[0, 0.55, 0]}>
            <capsuleGeometry args={[0.22, 0.8, 8, 14]} />
            <meshStandardMaterial color="#22d3ee" emissive="#075985" emissiveIntensity={0.45} opacity={opacity} transparent={ghost} />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <coneGeometry args={[0.26, 0.42, 5]} />
            <meshStandardMaterial color="#67e8f9" opacity={opacity} transparent={ghost} />
          </mesh>
        </group>
      );
    case "artifact":
      return (
        <group scale={scale}>
          <mesh position={[0, 0.38, 0]}>
            <boxGeometry args={[0.08, 1.05, 0.05]} />
            <meshStandardMaterial color="#e5e7eb" emissive="#38bdf8" emissiveIntensity={0.28} metalness={0.45} opacity={opacity} roughness={0.3} transparent={ghost} />
          </mesh>
          <mesh position={[0, 0.96, 0]}>
            <coneGeometry args={[0.08, 0.22, 4]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.5} opacity={opacity} roughness={0.25} transparent={ghost} />
          </mesh>
        </group>
      );
    case "pickup":
      return (
        <mesh scale={scale}>
          <sphereGeometry args={[0.28, 24, 14]} />
          <meshStandardMaterial color="#7ddf9b" emissive="#1f8f5b" emissiveIntensity={1.2} opacity={opacity} transparent={ghost} />
        </mesh>
      );
    case "boss":
      return (
        <mesh scale={[scale * 0.75, scale * 1.35, scale * 0.75]}>
          <octahedronGeometry args={[0.75, 0]} />
          <meshStandardMaterial color="#a855f7" emissive="#581c87" emissiveIntensity={0.75} opacity={opacity} roughness={0.28} transparent={ghost} />
        </mesh>
      );
    case "enemy":
      return (
        <mesh position={[0, 0.45 * scale, 0]} scale={scale}>
          <icosahedronGeometry args={[0.48, 1]} />
          <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.25} opacity={opacity} transparent={ghost} />
        </mesh>
      );
  }
}

function toTuple(position: Combat3dWorldPosition): [number, number, number] {
  return [position.x, position.y, position.z];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
