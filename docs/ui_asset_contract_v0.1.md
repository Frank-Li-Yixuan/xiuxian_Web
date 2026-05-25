# UI 资产接入契约 v0.1

## 1. 资产目录

请将已经逐一生成好的 UI 控件放到以下目录。Codex 不应重新设计或生成这些资产。

```text
public/assets/generated/ui/common/
  close_button_normal.png
  close_button_hover.png
  close_button_pressed.png
  close_button_disabled.png

public/assets/generated/ui/character_creation/
  character_creation_main_panel.png
  character_portrait_frame.png
  name_input_field.png
  character_attribute_panel.png
  attribute_row.png
  spiritual_root_disc.png
  element_badge_frame.png
  destiny_card_common.png
  destiny_card_rare.png
  destiny_card_epic.png
  destiny_card_legendary.png
  destiny_card_flaw.png
  trait_lock_button_locked.png
  trait_lock_button_unlocked.png
  reroll_fate_button_normal.png
  reroll_fate_button_hover.png
  confirm_life_button_normal.png
  background_origin_panel.png
  hidden_bloodline_panel.png
  divination_token_badge.png
```

可选人物资产目录：

```text
public/assets/generated/characters/default_cultivator/
  portrait_full.png
  portrait_bust.png
  combat_avatar.png
  soul_form.png
  manifest.v0.1.json
```

若人物资产尚未生成，创建角色页可以先使用 `character_portrait_frame.png` 内的占位剪影，但必须在 UI 上预留真实头像接入点。

---

## 2. UI manifest

Codex 应创建：

```text
public/assets/generated/ui/character_creation_manifest.v0.1.json
```

示例：

```json
{
  "version": "0.1",
  "namespace": "ui.character_creation",
  "assets": {
    "cc.mainPanel": {
      "path": "/assets/generated/ui/character_creation/character_creation_main_panel.png",
      "category": "panel",
      "required": true,
      "recommendedWidth": 1500,
      "recommendedHeight": 880
    },
    "cc.portraitFrame": {
      "path": "/assets/generated/ui/character_creation/character_portrait_frame.png",
      "category": "frame",
      "required": true,
      "recommendedWidth": 420,
      "recommendedHeight": 680
    },
    "cc.nameInput": {
      "path": "/assets/generated/ui/character_creation/name_input_field.png",
      "category": "input",
      "required": true
    },
    "cc.destiny.common": {
      "path": "/assets/generated/ui/character_creation/destiny_card_common.png",
      "category": "card",
      "required": true
    },
    "cc.destiny.rare": {
      "path": "/assets/generated/ui/character_creation/destiny_card_rare.png",
      "category": "card",
      "required": true
    },
    "cc.destiny.epic": {
      "path": "/assets/generated/ui/character_creation/destiny_card_epic.png",
      "category": "card",
      "required": true
    },
    "cc.destiny.legendary": {
      "path": "/assets/generated/ui/character_creation/destiny_card_legendary.png",
      "category": "card",
      "required": true
    },
    "cc.destiny.flaw": {
      "path": "/assets/generated/ui/character_creation/destiny_card_flaw.png",
      "category": "card",
      "required": true
    },
    "cc.reroll.normal": {
      "path": "/assets/generated/ui/character_creation/reroll_fate_button_normal.png",
      "category": "button",
      "required": true
    },
    "cc.reroll.hover": {
      "path": "/assets/generated/ui/character_creation/reroll_fate_button_hover.png",
      "category": "button",
      "required": true
    },
    "cc.confirmLife.normal": {
      "path": "/assets/generated/ui/character_creation/confirm_life_button_normal.png",
      "category": "button",
      "required": true
    },
    "common.close.normal": {
      "path": "/assets/generated/ui/common/close_button_normal.png",
      "category": "button",
      "required": true
    },
    "common.close.hover": {
      "path": "/assets/generated/ui/common/close_button_hover.png",
      "category": "button",
      "required": true
    }
  }
}
```

---

## 3. 渲染规则

1. PNG 只负责控件外观。
2. 所有文字由 DOM 渲染。
3. 按钮 hover / pressed / disabled 由 CSS 和不同 PNG 状态切换。
4. 卡牌内的标题、描述、正负效果、稀有度标签由 DOM 渲染。
5. 图片不允许拉伸到明显变形；优先使用 `background-size: 100% 100%` 或保持原比例。
6. 如果发现某个控件不适合大尺寸拉伸，应给其固定尺寸。
7. 开发模式可显示 `MISSING UI ASSET`，测试/RC 模式缺 required 资产必须失败。

---

## 4. 推荐组件映射

| 组件 | 背景资产 | 文字来源 |
|---|---|---|
| CharacterCreationScreen | `cc.mainPanel` | DOM |
| NameInput | `cc.nameInput` | input value |
| AttributePanel | `cc.attributePanel` + `cc.attributeRow` | DOM |
| SpiritualRootDisc | `cc.spiritualRootDisc` | DOM icon / badge |
| DestinyCard | `cc.destiny.*` | DOM |
| RerollButton | `cc.reroll.normal/hover` | DOM |
| ConfirmLifeButton | `cc.confirmLife.normal` | DOM |
| BackgroundOriginPanel | `cc.backgroundOriginPanel` | DOM |
| HiddenBloodlinePanel | `cc.hiddenBloodlinePanel` | DOM |
| CloseButton | `common.close.*` | aria-label + click |
