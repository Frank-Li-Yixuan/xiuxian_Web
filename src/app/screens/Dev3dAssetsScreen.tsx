import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactElement } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneThreeObject } from "three/examples/jsm/utils/SkeletonUtils.js";

import {
  loadThreeAssetRegistry,
  shouldUseFallbackPreview,
  ThreeAssetRegistry,
  type ThreeAssetBoundingBox,
  type ThreeAssetCategory,
  type ThreeAssetPreviewEntry,
  type ThreeAssetVector
} from "../../assets/ThreeAssetRegistry";

interface Dev3dAssetsScreenProps {
  readonly registry?: ThreeAssetRegistry;
  readonly initialAssetId?: string;
  readonly enableViewer?: boolean;
}

export function Dev3dAssetsScreen({
  registry: providedRegistry,
  initialAssetId,
  enableViewer = typeof window !== "undefined"
}: Dev3dAssetsScreenProps): ReactElement {
  const [loadedRegistry, setLoadedRegistry] = useState<ThreeAssetRegistry | undefined>(providedRegistry);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(initialAssetId);
  const [wireframe, setWireframe] = useState(false);
  const [viewRotationY, setViewRotationY] = useState(0);

  useEffect(() => {
    if (providedRegistry !== undefined) {
      setLoadedRegistry(providedRegistry);
      return;
    }

    let cancelled = false;
    void loadThreeAssetRegistry()
      .then((registry) => {
        if (!cancelled) {
          setLoadedRegistry(registry);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providedRegistry]);

  const assets = loadedRegistry?.all() ?? [];
  const selectedAsset = useMemo(() => {
    if (loadedRegistry === undefined || assets.length === 0) {
      return undefined;
    }
    const candidateId = selectedAssetId ?? initialAssetId ?? assets[0]?.id;
    if (candidateId !== undefined && loadedRegistry.has(candidateId)) {
      return loadedRegistry.get(candidateId);
    }
    return assets[0];
  }, [assets, initialAssetId, loadedRegistry, selectedAssetId]);

  useEffect(() => {
    if (selectedAssetId === undefined && selectedAsset !== undefined) {
      setSelectedAssetId(selectedAsset.id);
    }
  }, [selectedAsset, selectedAssetId]);

  if (error !== undefined) {
    return (
      <main className="dev-3d-assets-screen">
        <h1>3D Combat Assets</h1>
        <p className="dev-3d-assets-error">{error}</p>
      </main>
    );
  }

  if (loadedRegistry === undefined || selectedAsset === undefined) {
    return (
      <main className="dev-3d-assets-screen">
        <h1>3D Combat Assets</h1>
        <p>Loading 3D asset manifest...</p>
      </main>
    );
  }

  return (
    <main className="dev-3d-assets-screen">
      <header className="dev-3d-assets-header">
        <div>
          <h1>3D Combat Assets</h1>
          <p>
            {loadedRegistry.manifest.namespace} v{loadedRegistry.manifest.version} · {assets.length} assets
          </p>
        </div>
        <div className="dev-3d-assets-summary" aria-label="3D asset preview summary">
          <span>{assets.filter((asset) => asset.runtimeReady).length} runtimeReady</span>
          <span>{assets.filter((asset) => shouldUseFallbackPreview(asset)).length} fallback previews</span>
        </div>
      </header>

      <section className="dev-3d-assets-layout">
        <AssetList assets={assets} selectedAssetId={selectedAsset.id} onSelect={setSelectedAssetId} />
        <section className="dev-3d-assets-viewer-panel" aria-label="Selected 3D asset viewer">
          <div className="dev-3d-assets-viewer-toolbar">
            <strong>{selectedAsset.displayName}</strong>
            <div className="dev-3d-assets-controls">
              <button type="button" onClick={() => setViewRotationY((rotation) => rotation - Math.PI / 8)}>
                Rotate Left
              </button>
              <button type="button" onClick={() => setViewRotationY((rotation) => rotation + Math.PI / 8)}>
                Rotate Right
              </button>
              <label>
                <input checked={wireframe} onChange={(event) => setWireframe(event.currentTarget.checked)} type="checkbox" /> Wireframe
              </label>
            </div>
          </div>
          {enableViewer ? (
            <InteractiveViewer asset={selectedAsset} rotationY={viewRotationY} setRotationY={setViewRotationY} wireframe={wireframe} />
          ) : (
            <div className="dev-3d-assets-static-viewer" data-viewer-disabled="true">
              {shouldUseFallbackPreview(selectedAsset) ? "Fallback preview" : "Runtime model preview"} · Bounding Box · Pivot Marker
            </div>
          )}
        </section>
        <AssetDetails asset={selectedAsset} />
      </section>
    </main>
  );
}

function AssetList({
  assets,
  selectedAssetId,
  onSelect
}: {
  readonly assets: readonly ThreeAssetPreviewEntry[];
  readonly selectedAssetId: string;
  readonly onSelect: (assetId: string) => void;
}): ReactElement {
  return (
    <aside className="dev-3d-assets-list" aria-label="3D combat asset list">
      {assets.map((asset) => (
        <button
          className={`dev-3d-assets-list-item ${asset.id === selectedAssetId ? "is-selected" : ""}`}
          data-asset-id={asset.id}
          key={asset.id}
          onClick={() => onSelect(asset.id)}
          type="button"
        >
          <span>{asset.id}</span>
          <small>
            {asset.category} · {asset.runtimeReady ? "runtimeReady" : "fallback"}
          </small>
        </button>
      ))}
    </aside>
  );
}

function AssetDetails({ asset }: { readonly asset: ThreeAssetPreviewEntry }): ReactElement {
  const fallback = shouldUseFallbackPreview(asset);
  return (
    <aside className="dev-3d-assets-details" aria-label="Selected 3D asset metadata">
      <h2>{asset.id}</h2>
      <dl>
        <MetaRow label="Category" value={asset.category} />
        <MetaRow label="Source" value={asset.sourceName} />
        <MetaRow label="Author" value={asset.author} />
        <MetaRow label="License" value={`${asset.license}${asset.attributionRequired ? " · attribution required" : ""}`} />
        <MetaRow label="File Size" value={asset.fileSizeBytes === undefined ? "unknown" : formatBytes(asset.fileSizeBytes)} />
        <MetaRow label="Status" value={asset.runtimeReady ? "runtimeReady" : "cleanup needed"} />
        <MetaRow label="Preview" value={fallback ? "Fallback preview" : "Runtime model"} />
        <MetaRow label="Reason" value={asset.runtimeReason.length > 0 ? asset.runtimeReason : "none"} />
        <MetaRow label="Path" value={asset.path} />
        <MetaRow label="Source URL" value={asset.sourceUrl} />
      </dl>
      <section className="dev-3d-assets-detail-block">
        <h3>Bounding Box</h3>
        {asset.boundingBox?.available === true && asset.boundingBox.size !== null ? (
          <p>
            {asset.boundingBox.size.x} × {asset.boundingBox.size.y} × {asset.boundingBox.size.z}
          </p>
        ) : (
          <p>Unavailable</p>
        )}
      </section>
      <section className="dev-3d-assets-detail-block">
        <h3>Animation Clips</h3>
        {asset.animations.length > 0 ? (
          <ul>
            {asset.animations.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p>None</p>
        )}
      </section>
      <section className="dev-3d-assets-detail-block">
        <h3>Warnings</h3>
        {[...asset.warnings, ...asset.errors].length > 0 ? (
          <ul>
            {[...asset.warnings, ...asset.errors].map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          <p>None</p>
        )}
      </section>
    </aside>
  );
}

function MetaRow({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function InteractiveViewer({
  asset,
  rotationY,
  setRotationY,
  wireframe
}: {
  readonly asset: ThreeAssetPreviewEntry;
  readonly rotationY: number;
  readonly setRotationY: (update: (rotationY: number) => number) => void;
  readonly wireframe: boolean;
}): ReactElement {
  const dragState = useRef<{ readonly x: number; readonly rotationY: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { x: event.clientX, rotationY };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (dragState.current === null) {
      return;
    }
    const delta = event.clientX - dragState.current.x;
    setRotationY(() => (dragState.current?.rotationY ?? 0) + delta * 0.01);
  };
  const clearDrag = (): void => {
    dragState.current = null;
  };

  return (
    <div
      className="dev-3d-assets-viewer"
      data-fallback-preview={shouldUseFallbackPreview(asset) ? "true" : "false"}
      data-selected-asset-id={asset.id}
      data-wireframe={wireframe ? "true" : "false"}
      onPointerCancel={clearDrag}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clearDrag}
    >
      <Canvas camera={{ fov: 45, position: [0, 1.2, 5] }} className="dev-3d-assets-canvas">
        <color args={["#07111c"]} attach="background" />
        <ambientLight intensity={0.85} />
        <directionalLight intensity={2.1} position={[3, 5, 4]} />
        <pointLight color="#7dd3fc" intensity={16} position={[-3, 2, 2]} />
        <AssetScene asset={asset} rotationY={rotationY} wireframe={wireframe} />
      </Canvas>
      <div className="dev-3d-assets-viewer-badges" aria-hidden="true">
        <span>Bounding box</span>
        <span>Pivot marker</span>
      </div>
    </div>
  );
}

function AssetScene({
  asset,
  rotationY,
  wireframe
}: {
  readonly asset: ThreeAssetPreviewEntry;
  readonly rotationY: number;
  readonly wireframe: boolean;
}): ReactElement {
  const useFallback = shouldUseFallbackPreview(asset);
  const [loadFailed, setLoadFailed] = useState(false);
  const markLoadFailed = useCallback(() => setLoadFailed(true), []);

  useEffect(() => {
    setLoadFailed(false);
  }, [asset.id]);

  const previewBoundingBox = useMemo(() => scaleBoundingBoxForPreview(asset.boundingBox, asset.scale), [asset.boundingBox, asset.scale]);

  return (
    <>
      <CameraRig boundingBox={previewBoundingBox} rotationY={rotationY} />
      <gridHelper args={[8, 16, "#34545d", "#1f3a42"]} position={[0, -0.01, 0]} />
      <group rotation={[degToRad(asset.rotation.xDeg), degToRad(asset.rotation.yDeg), degToRad(asset.rotation.zDeg)]}>
        {useFallback || loadFailed ? (
          <FallbackPrimitive category={asset.category} wireframe={wireframe} />
        ) : (
          <LoadedGltfAsset asset={asset} onLoadFailed={markLoadFailed} wireframe={wireframe} />
        )}
        <BoundingBoxHelper boundingBox={previewBoundingBox} />
        <PivotMarker />
      </group>
    </>
  );
}

function CameraRig({
  boundingBox,
  rotationY
}: {
  readonly boundingBox: ThreeAssetBoundingBox | undefined;
  readonly rotationY: number;
}): null {
  const { camera } = useThree();

  useEffect(() => {
    const pose = computePreviewCameraPose(boundingBox, rotationY);
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    camera.updateProjectionMatrix();
  }, [boundingBox, camera, rotationY]);

  return null;
}

export function computePreviewCameraPose(
  boundingBox: ThreeAssetBoundingBox | undefined,
  rotationY: number
): {
  readonly position: ThreeAssetVector;
  readonly target: ThreeAssetVector;
  readonly distance: number;
  readonly maxDimension: number;
} {
  const target =
    boundingBox?.available === true && boundingBox.min !== null && boundingBox.max !== null
      ? vectorToPlain(midpoint(boundingBox.min, boundingBox.max))
      : { x: 0, y: 0.8, z: 0 };
  const maxDimension = boundingBox?.maxDimension ?? 2;
  const distance = Math.max(4.2, maxDimension * 1.8);
  return {
    target,
    distance,
    maxDimension,
    position: {
      x: target.x + Math.sin(rotationY) * distance,
      y: target.y + Math.max(1.2, maxDimension * 0.25),
      z: target.z + Math.cos(rotationY) * distance
    }
  };
}

export function scaleBoundingBoxForPreview(
  boundingBox: ThreeAssetBoundingBox | undefined,
  scale: ThreeAssetVector
): ThreeAssetBoundingBox | undefined {
  if (boundingBox === undefined || boundingBox.available !== true || boundingBox.min === null || boundingBox.max === null) {
    return boundingBox;
  }

  const scaledA = multiplyVector(boundingBox.min, scale);
  const scaledB = multiplyVector(boundingBox.max, scale);
  const min = {
    x: Math.min(scaledA.x, scaledB.x),
    y: Math.min(scaledA.y, scaledB.y),
    z: Math.min(scaledA.z, scaledB.z)
  };
  const max = {
    x: Math.max(scaledA.x, scaledB.x),
    y: Math.max(scaledA.y, scaledB.y),
    z: Math.max(scaledA.z, scaledB.z)
  };
  const size = {
    x: max.x - min.x,
    y: max.y - min.y,
    z: max.z - min.z
  };
  return {
    available: true,
    min,
    max,
    size,
    maxDimension: Math.max(size.x, size.y, size.z)
  };
}

function LoadedGltfAsset({
  asset,
  onLoadFailed,
  wireframe
}: {
  readonly asset: ThreeAssetPreviewEntry;
  readonly onLoadFailed: () => void;
  readonly wireframe: boolean;
}): ReactElement | null {
  const [sourceScene, setSourceScene] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      asset.path,
      (gltf) => {
        if (!cancelled) {
          setSourceScene(gltf.scene);
        }
      },
      undefined,
      () => {
        if (!cancelled) {
          onLoadFailed();
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [asset.path, onLoadFailed]);

  const scene = useMemo(() => (sourceScene === null ? null : cloneSceneWithMaterialMode(sourceScene, wireframe)), [sourceScene, wireframe]);
  if (scene === null) {
    return null;
  }

  return <primitive object={scene} scale={[asset.scale.x, asset.scale.y, asset.scale.z]} />;
}

function FallbackPrimitive({ category, wireframe }: { readonly category: ThreeAssetCategory; readonly wireframe: boolean }): ReactElement {
  switch (category) {
    case "player":
      return (
        <group>
          <mesh position={[0, 0.75, 0]}>
            <capsuleGeometry args={[0.28, 1.1, 8, 18]} />
            <meshStandardMaterial color="#22d3ee" emissive="#075985" emissiveIntensity={0.35} wireframe={wireframe} />
          </mesh>
          <mesh position={[0, 1.62, 0]}>
            <coneGeometry args={[0.34, 0.58, 5]} />
            <meshStandardMaterial color="#67e8f9" wireframe={wireframe} />
          </mesh>
        </group>
      );
    case "artifact":
      return (
        <group rotation={[0, 0, -0.45]}>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.12, 1.4, 0.06]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.45} roughness={0.3} wireframe={wireframe} />
          </mesh>
          <mesh position={[0, 1.17, 0]}>
            <coneGeometry args={[0.09, 0.3, 4]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.25} wireframe={wireframe} />
          </mesh>
          <mesh position={[0, -0.32, 0]}>
            <boxGeometry args={[0.46, 0.1, 0.1]} />
            <meshStandardMaterial color="#facc15" wireframe={wireframe} />
          </mesh>
        </group>
      );
    case "enemy":
      return (
        <mesh position={[0, 0.7, 0]}>
          <icosahedronGeometry args={[0.85, 1]} />
          <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.2} wireframe={wireframe} />
        </mesh>
      );
    case "pickup":
      return (
        <mesh position={[0, 0.65, 0]}>
          <sphereGeometry args={[0.45, 32, 18]} />
          <meshStandardMaterial color="#7ddf9b" emissive="#1f8f5b" emissiveIntensity={0.95} wireframe={wireframe} />
        </mesh>
      );
    case "boss":
      return (
        <mesh position={[0, 1.05, 0]} scale={[0.8, 1.6, 0.8]}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color="#a855f7" emissive="#581c87" emissiveIntensity={0.55} roughness={0.28} wireframe={wireframe} />
        </mesh>
      );
    case "environment":
      return (
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[1.4, 0.5, 1.4]} />
          <meshStandardMaterial color="#94a3b8" wireframe={wireframe} />
        </mesh>
      );
  }
}

function BoundingBoxHelper({ boundingBox }: { readonly boundingBox: ThreeAssetBoundingBox | undefined }): ReactElement | null {
  const helper = useMemo(() => {
    if (boundingBox?.available !== true || boundingBox.min === null || boundingBox.max === null) {
      return null;
    }
    return new THREE.Box3Helper(new THREE.Box3(toThreeVector(boundingBox.min), toThreeVector(boundingBox.max)), "#facc15");
  }, [boundingBox]);

  return helper === null ? null : <primitive object={helper} />;
}

function PivotMarker(): ReactElement {
  const axes = useMemo(() => new THREE.AxesHelper(0.75), []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.045, 16, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <primitive object={axes} />
    </group>
  );
}

function cloneSceneWithMaterialMode(source: THREE.Object3D, wireframe: boolean): THREE.Object3D {
  const clone = cloneThreeObject(source);
  preparePreviewObjectForTransforms(clone);
  clone.traverse((object) => {
    if (!isMesh(object)) {
      return;
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const clonedMaterials = materials.map((material) => {
      const cloned = material.clone();
      if ("wireframe" in cloned) {
        cloned.wireframe = wireframe;
      }
      return cloned;
    });
    const firstMaterial = clonedMaterials[0];
    if (firstMaterial === undefined) {
      return;
    }
    object.material = Array.isArray(object.material) ? clonedMaterials : firstMaterial;
  });
  return clone;
}

export function preparePreviewObjectForTransforms(object: THREE.Object3D): void {
  object.traverse((node) => {
    if (!node.matrixAutoUpdate) {
      node.matrix.decompose(node.position, node.quaternion, node.scale);
    }
    node.matrixAutoUpdate = true;
    node.matrixWorldAutoUpdate = true;
  });
  object.updateMatrixWorld(true);
}

function isMesh(object: THREE.Object3D): object is THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
  return "isMesh" in object && object.isMesh === true;
}

function toThreeVector(vector: { readonly x: number; readonly y: number; readonly z: number }): THREE.Vector3 {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}

function vectorToPlain(vector: THREE.Vector3): ThreeAssetVector {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function multiplyVector(vector: ThreeAssetVector, scale: ThreeAssetVector): ThreeAssetVector {
  return {
    x: vector.x * scale.x,
    y: vector.y * scale.y,
    z: vector.z * scale.z
  };
}

function midpoint(min: { readonly x: number; readonly y: number; readonly z: number }, max: { readonly x: number; readonly y: number; readonly z: number }): THREE.Vector3 {
  return new THREE.Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
}

function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
