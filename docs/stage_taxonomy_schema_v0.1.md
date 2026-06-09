# 阶段分类与 Schema v0.1

## 1. 双阶段轴

本系统有两个核心阶段轴：

```text
AgePhase：由 ageMonths 自动决定，用于筛选事件池和玩法强度。
IdentityStage：动态状态机，用于决定角色的修行身份与可触发内容。
```

## 2. AgePhase Schema

```ts
interface LifeAgePhaseDefinition {
  id: LifeAgePhaseId;
  name: string;
  minAgeMonths: number;
  maxAgeMonths: number;
  description: string;
  allowedInterludeIntensity: InterludeIntensityLimit;
  eventPoolTags: string[];
  narrativeToneTags: string[];
}
```

## 3. IdentityStage Schema

```ts
interface CultivationIdentityStageDefinition {
  id: CultivationIdentityStageId;
  name: string;
  category: "mortal" | "omen" | "seeker" | "initiated" | "system" | "home";
  description: string;
  canCoexistWith: string[];
  unlocks: string[];
  eventBiasTags: string[];
  transitionInTags: string[];
  transitionOutTags: string[];
}
```

## 4. InitiationNode Schema

```ts
interface InitiationNodeDefinition {
  id: string;
  name: string;
  description: string;
  worldWrapper: string;
  triggerTags: string[];
  requiredIdentityStages?: string[];
  recommendedAgeRange?: [number, number];
  possibleInterludeModes: string[];
  successEffects: LifeStageEffect[];
  failureEffects: LifeStageEffect[];
  age18Hooks: string[];
}
```

## 5. StageTransitionRule Schema

```ts
interface StageTransitionRule {
  id: string;
  from: string[];
  to: string[];
  triggerType: "age" | "token" | "score" | "choice" | "interlude" | "age18";
  requirements: TransitionRequirement[];
  priority: number;
  cooldownMonths?: number;
  playerChoicePolicy: "automatic" | "prompt" | "forced";
  promptText?: string;
  options?: StageTransitionOption[];
}
```

## 6. Stage Rhythm Budget Schema

```ts
interface StageRhythmBudgetRule {
  id: string;
  agePhaseId: string;
  maxPlayableInterludes: number;
  maxForcedInterludes: number;
  minMonthsBetweenInterludes: number;
  minMonthsBetweenIdentityTransitions: number;
  allowedInterludeModes: string[];
  notes: string;
}
```
