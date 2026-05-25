import type { ReactElement } from "react";

import { MAIN_MENU_ASSET_IDS, type MainMenuAssetRegistry } from "../../assets/mainMenuAssets";
import { CloudLayer, MistLayer, XianxiaButton } from "../ui-system";

export interface MainMenuScreenProps {
  readonly assets: MainMenuAssetRegistry;
  readonly canContinue: boolean;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onSettings: () => void;
  readonly onExit: () => void;
}

export function MainMenuScreen({
  assets,
  canContinue,
  onNewGame,
  onContinue,
  onSettings,
  onExit
}: MainMenuScreenProps): ReactElement {
  return (
    <section
      className="main-menu-screen"
      data-testid="main-menu-screen"
      style={{ backgroundImage: `url("${assets.path(MAIN_MENU_ASSET_IDS.background)}")` }}
    >
      <MistLayer />
      <CloudLayer />
      <div className="main-menu-title-wrap">
        <img alt="" className="main-menu-title-plaque" src={assets.path(MAIN_MENU_ASSET_IDS.titlePlaque)} />
        <h1>双人雷霆战机修仙版</h1>
      </div>

      <nav aria-label="主菜单" className="main-menu-actions">
        <XianxiaButton className="main-menu-dom-button" onClick={onNewGame}>
          新的游戏
        </XianxiaButton>
        <XianxiaButton className="main-menu-dom-button" disabled={!canContinue} onClick={onContinue}>
          继续游戏
        </XianxiaButton>
        <XianxiaButton className="main-menu-dom-button" onClick={onSettings}>
          设置
        </XianxiaButton>
        <XianxiaButton className="main-menu-dom-button" variant="secondary" onClick={onExit}>
          退出
        </XianxiaButton>
      </nav>
    </section>
  );
}
