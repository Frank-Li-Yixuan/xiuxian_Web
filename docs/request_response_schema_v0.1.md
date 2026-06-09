# Narrative Request / Response Schema v0.1

## NarrativeRequest

```ts
interface NarrativeRequest {
  requestId: string;
  taskType: NarrativeTaskType;
  locale: "zh-CN";
  templateVersion: string;
  cacheKey: string;
  worldContext: SafeWorldContext;
  characterSurface: SafeCharacterSurface;
  eventPayload: SafeEventPayload;
  constraints: NarrativeConstraints;
}
```

## DeepSeekResponse JSON

```ts
interface NarrativeResponse {
  version: "0.1";
  taskType: NarrativeTaskType;
  text: string;
  optionTexts?: string[];
  visibleHints?: string[];
  toneTags: string[];
  safetyFlags: string[];
}
```

## 校验要求

- JSON parse 成功。
- `version` 匹配。
- `taskType` 匹配请求。
- `text` 非空。
- 长度不超过任务限制。
- 不包含 forbiddenHiddenTerms。
- 不包含 modernForbiddenTerms。
- `optionTexts` 数量与请求要求一致。
