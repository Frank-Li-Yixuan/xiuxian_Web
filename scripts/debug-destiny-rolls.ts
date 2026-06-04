import {
  buildDestinyCombinationProbe,
  buildDestinyDebugSamples,
  formatDestinyDebugSamples
} from "../src/characterCreation/destiny/DestinyDistributionTelemetry";

const samples = buildDestinyDebugSamples({
  seedPrefix: "dt-c006-debug",
  count: 8
});

process.stdout.write(formatDestinyDebugSamples(samples));
process.stdout.write("\n# Destiny Combination Probes\n");

for (const probe of [
  buildDestinyCombinationProbe(["destiny_heaven_jealous_talent", "destiny_thunder_affinity"]),
  buildDestinyCombinationProbe(["destiny_waste_root_defiant", "destiny_tenacious"]),
  buildDestinyCombinationProbe(["destiny_alchemy_prodigy", "destiny_artifact_blessed"])
]) {
  process.stdout.write(`\nTraits: ${probe.traitIds.join(", ")}\n`);
  process.stdout.write(`Hard Exclusive: ${probe.hardExclusiveRuleIds.length === 0 ? "none" : probe.hardExclusiveRuleIds.join(", ")}\n`);
  process.stdout.write(`Synergies: ${probe.synergyIds.length === 0 ? "none" : probe.synergyIds.join(", ")}\n`);
  process.stdout.write(`Synergy Warnings: ${probe.synergyWarnings.length === 0 ? "none" : probe.synergyWarnings.join(" | ")}\n`);
  process.stdout.write(`Conflict Warnings: ${probe.conflictWarnings.length === 0 ? "none" : probe.conflictWarnings.join(" | ")}\n`);
}
