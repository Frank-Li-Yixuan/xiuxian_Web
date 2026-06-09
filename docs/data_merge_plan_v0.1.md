# 数据合并计划 v0.1

## 1. 目标数据目录

建议最终整理为：

```text
data/
  world/
  character_creation/
    opening/
    nine_palace/
    destiny_v2/
    origin_fate_v02/
  life_sim/
    storylines/
    interludes/
    stages/
    monthly_events_v02/
    major_choices_v02/
    playable/
  narrative/
    llm/
  age18/
  trial_modes/
    outer_battlefield/
```

## 2. Registry 层级

```text
WorldRegistry
OpeningRegistry
NinePalaceRegistry
DestinyRegistryV2
OriginFateRegistryV2
LifeStorylineRegistry
LifeStageRegistry
LifeInterludeRegistry
MonthlyEventRegistryV2
MajorChoiceRegistryV2
NarrativeRegistry
Age18Registry
TrialModeRegistry
```

## 3. 数据依赖顺序

```text
world
  ↓
opening + nine_palace
  ↓
destiny_v2 + origin_fate_v02
  ↓
storylines + stages + interludes
  ↓
monthly_events_v02 + major_choices_v02
  ↓
life_playable
  ↓
adult_node / age18
```

## 4. ID 规范

```text
world.region.qingshi_village
npf.score.talent
root.thunder_fire
destiny.heaven_jealous_talent
hidden.thunder_omen
origin.apothecary_apprentice
item.old_wooden_sword
storyline.alchemy_apothecary
thread.alchemy_furnace_dream
monthly.rain_backhill_whisper
choice.rain_backhill_age7
interlude.rain_backhill_stg
stage.identity.half_cultivator
```

## 5. 不可直接暴露字段

```text
hiddenFateInternal.trueName
hiddenFateInternal.id
revealExactProgress
debugWeights
rngState
```

## 6. 数据校验脚本

总校验脚本建议：

```text
scripts/validate-sim-redesign-data.mjs
```

它应依次调用：

```text
validate_world_data
validate_nine_palace_data
validate_destiny_eligibility_data
validate_origin_fate_v02
validate_life_storylines
validate_life_interludes
validate_life_stage
validate_monthly_events_v02
validate_major_choices_v02
validate_llm_narrative
validate_life_playable
```
