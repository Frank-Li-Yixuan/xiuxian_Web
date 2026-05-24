import type { ReactElement } from "react";

import { MAIN_MENU_ASSET_IDS, type MainMenuAssetRegistry } from "../../assets/mainMenuAssets";
import type { OutgameProfileState } from "../../outgame/ProfileState";
import { ImageButton } from "./MainMenuUi";

export interface OutgameHomeScreenProps {
  readonly assets: MainMenuAssetRegistry;
  readonly profile: OutgameProfileState;
  readonly onEnterCombat: () => void;
  readonly onBackToMainMenu: () => void;
}

export function OutgameHomeScreen({
  assets,
  profile,
  onEnterCombat,
  onBackToMainMenu
}: OutgameHomeScreenProps): ReactElement {
  const activeLoadout = profile.loadouts.find((loadout) => loadout.id === profile.activeLoadoutId) ?? profile.loadouts[0];

  return (
    <section
      className="main-menu-screen outgame-home-screen"
      data-testid="outgame-home-screen"
      style={{ backgroundImage: `url("${assets.path(MAIN_MENU_ASSET_IDS.background)}")` }}
    >
      <div className="outgame-panel">
        <header>
          <img alt="" src={assets.path(MAIN_MENU_ASSET_IDS.titlePlaque)} />
          <h1>洞府总览</h1>
        </header>

        <div className="outgame-grid">
          <section>
            <h2>境界</h2>
            <p>练气 {profile.realm.layer} 层</p>
            <meter max={profile.realm.cultivationToNext} min={0} value={profile.realm.cultivation} />
          </section>

          <section>
            <h2>资源</h2>
            <p>{formatWallet(profile.wallet)}</p>
          </section>

          <section>
            <h2>当前配置</h2>
            <p>{activeLoadout?.name ?? "未配置"} · {activeLoadout?.natalArtifactId ?? "无本命法宝"}</p>
          </section>

          <section>
            <h2>闭关事项</h2>
            <p>{profile.flags.firstStageCleared === true ? "整理战利品，准备再入青云山。" : "初入青云，先完成第一轮历练。"}</p>
          </section>
        </div>

        <div className="outgame-actions">
          <ImageButton assets={assets} variant="back" onClick={onBackToMainMenu}>
            返回主菜单
          </ImageButton>
          <ImageButton assets={assets} selected onClick={onEnterCombat}>
            开始历练
          </ImageButton>
        </div>
      </div>
    </section>
  );
}

function formatWallet(wallet: Readonly<Record<string, number>>): string {
  const entries = Object.entries(wallet).slice(0, 5);
  if (entries.length === 0) {
    return "暂无资源";
  }
  return entries.map(([resourceId, amount]) => `${resourceLabel(resourceId)} ${amount}`).join(" · ");
}

function resourceLabel(resourceId: string): string {
  switch (resourceId) {
    case "spirit_stone_low":
      return "下品灵石";
    case "qingling_herb":
      return "青灵草";
    case "black_iron_essence":
      return "玄铁精";
    case "demon_core_small":
      return "小妖丹";
    case "spirit_jade":
      return "灵玉";
    default:
      return resourceId;
  }
}
