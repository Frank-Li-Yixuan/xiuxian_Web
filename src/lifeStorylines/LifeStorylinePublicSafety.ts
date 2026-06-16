export const LIFE_STORYLINE_PUBLIC_SAFETY_SOURCE = "life_storylines_v0_1_public_safety";

const HIDDEN_TRUE_NAME_REPLACEMENTS: readonly [RegExp, string][] = Object.freeze([
  [/\u53e4\u96f7\u771f\u8840/g, "雷脉异兆"],
  [/\u4e39\u5723\u9057\u9aa8/g, "丹道旧兆"],
  [/\u7cfb\u7edf\u5171\u9e23\u4f53/g, "冷光杂音"],
  [/\u524d\u4e16\u5251\u9b44/g, "旧剑回响"],
  [/\u9b54\u5370\u5fae\u75d5/g, "心影微痕"],
  [/\u592a\u9634\u6b8b\u8109/g, "月影余脉"],
  [/\u9f99\u9aa8\u672a\u9192/g, "兽骨异兆"],
  [/\u5929\u4e66\u6b8b\u9875/g, "无字残页"],
  [/\u57df\u5916\u6218\u573a\u56de\u54cd/g, "远战回声"],
  [/\u529f\u5fb7\u79cd\u5b50/g, "护命善缘"]
]);

export function sanitizeLifeStorylinePublicText(value: string): string {
  return HIDDEN_TRUE_NAME_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
      .replace(/trueName(?!Revealed)/gi, "[filtered]")
      .replace(/true_name/gi, "[filtered]")
      .replace(/truename/gi, "[filtered]")
      .replace(/internal_hidden/gi, "[filtered]")
  );
}

export function sanitizeLifeStorylinePublicStringArray(values: readonly string[]): readonly string[] {
  return deepFreeze(values.map(sanitizeLifeStorylinePublicText).filter((value) => value.trim().length > 0));
}

export function isLifeStorylinePublicSafeText(value: string): boolean {
  return sanitizeLifeStorylinePublicText(value) === value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
