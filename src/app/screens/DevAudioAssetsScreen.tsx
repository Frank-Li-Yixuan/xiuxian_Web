import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import {
  CombatAudioAssetRegistry,
  loadCombatAudioAssetRegistry,
  requiresAttribution,
  type CombatAudioAssetEntry
} from "../../assets/CombatAssetRegistry";
import { AudioBus } from "../../audio/AudioBus";

interface DevAudioAssetsScreenProps {
  readonly registry?: CombatAudioAssetRegistry;
  readonly initialAssetId?: string;
  readonly enablePlayback?: boolean;
}

export function DevAudioAssetsScreen({
  registry: providedRegistry,
  initialAssetId,
  enablePlayback = typeof window !== "undefined"
}: DevAudioAssetsScreenProps): ReactElement {
  const [loadedRegistry, setLoadedRegistry] = useState<CombatAudioAssetRegistry | undefined>(providedRegistry);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(initialAssetId);
  const [playingAssetId, setPlayingAssetId] = useState<string | undefined>(undefined);
  const [groupSettings, setGroupSettings] = useState<Record<string, GroupSetting>>(() => createGroupSettings(providedRegistry));
  const audioBus = useRef<AudioBus | null>(null);

  useEffect(() => {
    if (providedRegistry !== undefined) {
      setLoadedRegistry(providedRegistry);
      return;
    }

    let cancelled = false;
    void loadCombatAudioAssetRegistry()
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

  useEffect(() => {
    return () => {
      audioBus.current?.stopAll();
      audioBus.current = null;
    };
  }, []);

  useEffect(() => {
    setGroupSettings(createGroupSettings(loadedRegistry));
    audioBus.current?.stopAll();
    audioBus.current = null;
    setPlayingAssetId(undefined);

    if (!enablePlayback || loadedRegistry === undefined || typeof Audio === "undefined") {
      return;
    }

    audioBus.current = new AudioBus({ registry: loadedRegistry, unlocked: true });
    return () => {
      audioBus.current?.stopAll();
      audioBus.current = null;
    };
  }, [enablePlayback, loadedRegistry]);

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

  const playAsset = (asset: CombatAudioAssetEntry): void => {
    setSelectedAssetId(asset.id);
    audioBus.current?.stopAll();

    if (!enablePlayback || audioBus.current === null || asset.planned === true) {
      setPlayingAssetId(undefined);
      return;
    }

    const result = audioBus.current.play({ assetId: asset.id, priority: "normal" });
    setPlayingAssetId(result.played ? asset.id : undefined);
  };

  const stopCurrent = (): void => {
    audioBus.current?.stopAll();
    setPlayingAssetId(undefined);
  };

  const setMixGroupVolume = (mixGroup: string, volume: number): void => {
    const clamped = clamp01(volume);
    audioBus.current?.setGroupVolume(mixGroup, clamped);
    setGroupSettings((current) => ({
      ...current,
      [mixGroup]: { ...(current[mixGroup] ?? DEFAULT_GROUP_SETTING), volume: clamped }
    }));
  };

  const setMixGroupMuted = (mixGroup: string, muted: boolean): void => {
    audioBus.current?.setGroupMuted(mixGroup, muted);
    setGroupSettings((current) => ({
      ...current,
      [mixGroup]: { ...(current[mixGroup] ?? DEFAULT_GROUP_SETTING), muted }
    }));
    if (muted && selectedAsset?.mixGroup === mixGroup) {
      setPlayingAssetId(undefined);
    }
  };

  if (error !== undefined) {
    return (
      <main className="dev-combat-assets-screen">
        <h1>Audio Combat Assets</h1>
        <p className="dev-combat-assets-error">{error}</p>
      </main>
    );
  }

  if (loadedRegistry === undefined || selectedAsset === undefined) {
    return (
      <main className="dev-combat-assets-screen">
        <h1>Audio Combat Assets</h1>
        <p>Loading audio asset manifest...</p>
      </main>
    );
  }

  return (
    <main className="dev-combat-assets-screen dev-audio-assets-screen">
      <header className="dev-combat-assets-header">
        <div>
          <h1>Audio Combat Assets</h1>
          <p>
            {loadedRegistry.manifest.namespace} v{loadedRegistry.manifest.version} · {assets.length} assets
          </p>
        </div>
        <div className="dev-combat-assets-summary" aria-label="Audio asset preview summary">
          <span>{loadedRegistry.groupByMixGroup().length} mix groups</span>
          <span>{assets.filter((asset) => requiresAttribution(asset)).length} attribution required</span>
        </div>
      </header>

      <section className="dev-combat-assets-layout">
        <AudioList
          groups={loadedRegistry.groupByMixGroup()}
          onPlay={playAsset}
          onSelect={setSelectedAssetId}
          onStop={stopCurrent}
          playingAssetId={playingAssetId}
          selectedAssetId={selectedAsset.id}
        />
        <section className="dev-combat-assets-preview-panel" aria-label="Selected audio asset controls">
          <div className="dev-combat-assets-preview-toolbar">
            <strong>{selectedAsset.id}</strong>
            <span>{selectedAsset.mixGroup}</span>
          </div>
          <AudioPreview asset={selectedAsset} isPlaying={playingAssetId === selectedAsset.id} onPlay={playAsset} onStop={stopCurrent} />
          <MixGroupControls
            groups={loadedRegistry.groupByMixGroup().map(([mixGroup]) => mixGroup)}
            groupSettings={groupSettings}
            onMutedChange={setMixGroupMuted}
            onVolumeChange={setMixGroupVolume}
          />
        </section>
        <AudioDetails asset={selectedAsset} />
      </section>
    </main>
  );
}

interface GroupSetting {
  readonly volume: number;
  readonly muted: boolean;
}

const DEFAULT_GROUP_SETTING: GroupSetting = Object.freeze({ volume: 1, muted: false });

function MixGroupControls({
  groups,
  groupSettings,
  onMutedChange,
  onVolumeChange
}: {
  readonly groups: readonly string[];
  readonly groupSettings: Readonly<Record<string, GroupSetting>>;
  readonly onMutedChange: (mixGroup: string, muted: boolean) => void;
  readonly onVolumeChange: (mixGroup: string, volume: number) => void;
}): ReactElement {
  return (
    <section className="dev-audio-mix-controls" aria-label="Audio mix group controls">
      <h2>Mix Group Controls</h2>
      {groups.map((mixGroup) => {
        const setting = groupSettings[mixGroup] ?? DEFAULT_GROUP_SETTING;
        return (
          <div className="dev-audio-mix-row" key={mixGroup}>
            <label>
              <span>{mixGroup} Volume</span>
              <input
                max="100"
                min="0"
                onChange={(event) => onVolumeChange(mixGroup, Number(event.currentTarget.value) / 100)}
                type="range"
                value={Math.round(setting.volume * 100)}
              />
              <strong>{Math.round(setting.volume * 100)}%</strong>
            </label>
            <label>
              <input checked={setting.muted} onChange={(event) => onMutedChange(mixGroup, event.currentTarget.checked)} type="checkbox" />
              <span>Mute {mixGroup}</span>
            </label>
          </div>
        );
      })}
    </section>
  );
}

function AudioList({
  groups,
  selectedAssetId,
  playingAssetId,
  onSelect,
  onPlay,
  onStop
}: {
  readonly groups: readonly [string, readonly CombatAudioAssetEntry[]][];
  readonly selectedAssetId: string;
  readonly playingAssetId: string | undefined;
  readonly onSelect: (assetId: string) => void;
  readonly onPlay: (asset: CombatAudioAssetEntry) => void;
  readonly onStop: () => void;
}): ReactElement {
  return (
    <aside className="dev-combat-assets-list" aria-label="Audio combat asset list">
      {groups.map(([mixGroup, assets]) => (
        <section className="dev-combat-assets-group" key={mixGroup}>
          <h2>{mixGroup}</h2>
          {assets.map((asset) => (
            <div className={`dev-audio-list-item ${asset.id === selectedAssetId ? "is-selected" : ""}`} data-asset-id={asset.id} key={asset.id}>
              <button className="dev-combat-assets-list-item" onClick={() => onSelect(asset.id)} type="button">
                <span>{asset.id}</span>
                <small>
                  {formatDuration(asset.durationMs)} · volume {asset.volume}
                </small>
              </button>
              <div className="dev-audio-inline-controls">
                <button onClick={() => onPlay(asset)} type="button">
                  Play
                </button>
                <button disabled={playingAssetId !== asset.id} onClick={onStop} type="button">
                  Stop
                </button>
              </div>
            </div>
          ))}
        </section>
      ))}
    </aside>
  );
}

function AudioPreview({
  asset,
  isPlaying,
  onPlay,
  onStop
}: {
  readonly asset: CombatAudioAssetEntry;
  readonly isPlaying: boolean;
  readonly onPlay: (asset: CombatAudioAssetEntry) => void;
  readonly onStop: () => void;
}): ReactElement {
  return (
    <div className="dev-audio-preview-card" data-asset-id={asset.id} data-playing={isPlaying ? "true" : "false"}>
      <div className="dev-audio-waveform" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => (
          <span key={index} style={{ height: `${24 + ((index * 17) % 58)}%` }} />
        ))}
      </div>
      <div className="dev-audio-primary-controls">
        <button onClick={() => onPlay(asset)} type="button">
          Play
        </button>
        <button disabled={!isPlaying} onClick={onStop} type="button">
          Stop
        </button>
      </div>
      <p>{isPlaying ? "Playing selected asset" : "Ready for manual playback"}</p>
      {requiresAttribution(asset) ? <p className="dev-combat-assets-warning">CC-BY attribution required</p> : <p>No attribution required</p>}
    </div>
  );
}

function AudioDetails({ asset }: { readonly asset: CombatAudioAssetEntry }): ReactElement {
  return (
    <aside className="dev-combat-assets-details" aria-label="Selected audio asset metadata">
      <h2>{asset.id}</h2>
      <dl>
        <MetaRow label="Category" value={asset.category} />
        <MetaRow label="Mix Group" value={asset.mixGroup} />
        <MetaRow label="Duration" value={formatDuration(asset.durationMs)} />
        <MetaRow label="Volume" value={String(asset.volume)} />
        <MetaRow label="Cooldown" value={`${asset.cooldownMs} ms`} />
        <MetaRow label="Max Instances" value={String(asset.maxInstances)} />
        <MetaRow label="Loop" value={asset.loop === true ? "true" : "false"} />
        <MetaRow label="Source" value={asset.sourceName} />
        <MetaRow label="Author" value={asset.author} />
        <MetaRow label="License" value={`${asset.license}${requiresAttribution(asset) ? " · attribution required" : ""}`} />
        <MetaRow label="Path" value={asset.path} />
        <MetaRow label="Source URL" value={asset.sourceUrl} />
        <MetaRow label="Required" value={asset.required ? "true" : "false"} />
        <MetaRow label="Planned" value={asset.planned === true ? "true" : "false"} />
        <MetaRow label="Notes" value={asset.notes} />
      </dl>
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function createGroupSettings(registry: CombatAudioAssetRegistry | undefined): Record<string, GroupSetting> {
  if (registry === undefined) {
    return {};
  }
  return Object.fromEntries(registry.groupByMixGroup().map(([mixGroup]) => [mixGroup, DEFAULT_GROUP_SETTING]));
}
