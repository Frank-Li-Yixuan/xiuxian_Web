# 《半年重大选择事件分类与 Schema v0.1》

## 1. 事件定义

```ts
interface MajorChoiceEventDefinition {
  id: string;
  title: string;
  description: string;

  phaseIds: LifePhaseId[];
  ageRangeMonths: [number, number];

  category: MajorChoiceCategory;
  tags: string[];
  baseWeight: number;

  triggerHooks?: string[];
  requirements?: LifeChoiceRequirement[];
  cooldownMonths?: number;
  maxOccurrences?: number;

  options: MajorChoiceOptionDefinition[];
}
```

## 2. 选项定义

```ts
interface MajorChoiceOptionDefinition {
  id: string;
  label: string;
  description: string;

  riskTier: ChoiceRiskTier;
  optionType: "safe" | "steady" | "risky" | "dangerous" | "forbidden" | "destiny" | "hidden";

  requirements?: LifeChoiceRequirement[];
  visibleHint: string;

  check?: ChoiceCheckDefinition;
  outcomes: ChoiceOutcomeTable;

  tags: string[];
  hiddenSuccessRequirements?: LifeChoiceRequirement[];
}
```

## 3. 判定定义

```ts
interface ChoiceCheckDefinition {
  difficulty: number;
  primaryAptitudes?: AptitudeStatKey[];
  primaryCoreStats?: CoreStatKey[];
  supportAptitudes?: AptitudeStatKey[];
  lifeSkills?: LifeSkillKey[];
  elementTags?: string[];
  destinyTags?: string[];
  originTags?: string[];
  itemTags?: string[];
}
```

## 4. Outcome 表

```ts
interface ChoiceOutcomeTable {
  failure?: ChoiceOutcomeDefinition;
  mixed?: ChoiceOutcomeDefinition;
  success?: ChoiceOutcomeDefinition;
  great?: ChoiceOutcomeDefinition;
  hidden?: ChoiceOutcomeDefinition;
}
```

## 5. 效果定义

```ts
interface LifeChoiceEffect {
  type:
    | "modifyCoreStat"
    | "modifyAptitude"
    | "modifyLifeSkill"
    | "modifyKarma"
    | "modifyHeartDemon"
    | "addWound"
    | "addHeartKnot"
    | "addFlag"
    | "modifyHiddenFate"
    | "modifyCarriedItem"
    | "addMajorChoiceHook"
    | "addAge18Hook"
    | "addModeBiasTag";

  key?: string;
  value?: number;
  id?: string;
  tags?: string[];
  visible: boolean;
}
```

## 6. 隐藏信息规则

`visible: false` 的效果不能在正式 UI 中展示真名。
例如：

```json
{
  "type": "modifyHiddenFate",
  "key": "hidden_fate_ancient_thunder_blood",
  "value": 12,
  "visible": false
}
```

UI 只能显示：

```text
你感到雷声离自己更近了一些。
```

## 7. 类别枚举

```ts
type MajorChoiceCategory =
  | "study_path"
  | "martial_path"
  | "alchemy_path"
  | "temple_path"
  | "family_path"
  | "wilderness_path"
  | "crisis_path"
  | "dream_path"
  | "origin_path"
  | "hidden_fate_path"
  | "destiny_path"
  | "system_path";
```

## 8. 风险枚举

```ts
type ChoiceRiskTier =
  | "safe"
  | "steady"
  | "risky"
  | "dangerous"
  | "forbidden"
  | "destiny";
```

## 9. UI 必填字段

每个选项实例必须能渲染：

```text
风险徽章
标题
描述
可见提示
预计成功倾向
命格 / 隐藏 / 随身物专属标识
```
