import type { ReactElement } from "react";

import type { GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import { MAIN_MENU_ASSET_IDS, type MainMenuAssetRegistry } from "../../assets/mainMenuAssets";
import { GeneratedCloseButton } from "../components/GeneratedUi";
import { ImageButton } from "./MainMenuUi";

export interface SettingsScreenProps {
  readonly assets: MainMenuAssetRegistry;
  readonly bgmVolume: number;
  readonly generatedUiAssets: GeneratedUiAssetRegistry;
  readonly onBgmVolumeChange: (volume: number) => void;
  readonly onClose: () => void;
}

export function SettingsScreen({ assets, bgmVolume, generatedUiAssets, onBgmVolumeChange, onClose }: SettingsScreenProps): ReactElement {
  return (
    <section
      className="main-menu-screen settings-screen"
      data-testid="settings-screen"
      style={{ backgroundImage: `url("${assets.path(MAIN_MENU_ASSET_IDS.background)}")` }}
    >
      <div className="settings-panel">
        <GeneratedCloseButton assets={generatedUiAssets} onClick={onClose} />
        <header className="settings-header">
          <h1>设置</h1>
        </header>

        <div className="settings-tabs" aria-label="设置分类">
          <button className="settings-tab is-active" type="button">
            音画
          </button>
          <button className="settings-tab" type="button">
            操作
          </button>
          <button className="settings-tab" type="button">
            系统
          </button>
        </div>

        <div className="settings-grid">
          <label className="setting-row">
            <span className="setting-label">BGM音量</span>
            <span className="setting-control-with-value">
              <input
                aria-label="BGM音量"
                className="setting-range"
                max={100}
                min={0}
                type="range"
                value={Math.round(bgmVolume * 100)}
                onChange={(event) => onBgmVolumeChange(Number(event.currentTarget.value) / 100)}
              />
              <span className="setting-value">{Math.round(bgmVolume * 100)}%</span>
            </span>
          </label>
          <label className="setting-row">
            <span className="setting-label">特效强度</span>
            <input className="setting-range" defaultValue={60} max={100} min={0} type="range" />
          </label>
          <label className="setting-row">
            <span className="setting-label">屏幕震动</span>
            <span className="setting-toggle">
              <input defaultChecked type="checkbox" />
              <span aria-hidden="true" />
            </span>
          </label>
          <label className="setting-row">
            <span className="setting-label">低配粒子</span>
            <span className="setting-toggle">
              <input type="checkbox" />
              <span aria-hidden="true" />
            </span>
          </label>
          <label className="setting-row">
            <span className="setting-label">显示模式</span>
            <select className="setting-select" defaultValue="fullscreen">
              <option value="fullscreen">全屏</option>
              <option value="windowed">窗口</option>
            </select>
          </label>
          <label className="setting-row">
            <span className="setting-label">UI 缩放</span>
            <select className="setting-select" defaultValue="100">
              <option value="90">90%</option>
              <option value="100">100%</option>
              <option value="110">110%</option>
            </select>
          </label>
        </div>

        <div className="settings-actions">
          <ImageButton assets={assets} variant="secondary">
            重置
          </ImageButton>
          <ImageButton assets={assets} variant="secondary" onClick={onClose}>
            取消
          </ImageButton>
          <ImageButton assets={assets} variant="secondary" selected onClick={onClose}>
            确认
          </ImageButton>
        </div>
      </div>
    </section>
  );
}
