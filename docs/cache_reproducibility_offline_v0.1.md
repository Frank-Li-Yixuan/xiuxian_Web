# 缓存、复现与离线模式 v0.1

## 为什么必须缓存

人生模拟是存档内容。玩家刷新、继续游戏、截图、回看日志时，同一个事件文本不应随机变化。

## CacheKey 组成

```text
narrative:v0.1:{profileId}:{characterId}:{seed}:{ageMonth}:{taskType}:{eventId}:{choiceId}:{outcomeId}:{templateVersion}:{locale}
```

## 存储位置

v0.1 可存：

```text
profile.narrativeCache[cacheKey] = NarrativeResponse
```

后续可迁移 IndexedDB。

## 离线模式

```text
LLM disabled
  → 直接使用 fallback templates
```

离线模式不是降级失败，而是正式支持模式。

## 重生成策略

允许开发工具提供：

```text
Regenerate narrative text
```

但默认存档不会自动重生成。
