// 双人雷霆战机修仙版：联机同步类型草案 v0.1
// 目标：确定性帧同步 + 输入延迟缓冲 + 状态哈希 + Host 快照修正。

export type Id = string;
export type PlayerId = "p1" | "p2";

export type RoomPhase =
  | "lobby"
  | "loadout_commit"
  | "loading"
  | "countdown"
  | "in_run"
  | "insight_pause"
  | "network_waiting"
  | "finished"
  | "aborted";

export type UiOrRunPauseMode =
  | "running"
  | "insight_pause"
  | "network_waiting"
  | "finished"
  | "aborted";

export const enum InputButtonBit {
  Spell1 = 1 << 0,
  Spell2 = 1 << 1,
  Spell3 = 1 << 2,
  Spell4 = 1 << 3,
  Pill1 = 1 << 4,
  Pill2 = 1 << 5,
  Pill3 = 1 << 6,
  Interact = 1 << 7,
  Focus = 1 << 8,
  Confirm = 1 << 9,
  Cancel = 1 << 10
}

export type InputButtonMask = number;

export interface FrameInput {
  frame: number;
  playerId: PlayerId;

  moveX: -1 | 0 | 1;
  moveY: -1 | 0 | 1;

  downMask: InputButtonMask;
  pressedMask: InputButtonMask;
  releasedMask: InputButtonMask;

  inputSeq: number;
}

export interface EncodedFrameInput {
  frameDelta: number;
  move: number; // compacted moveX/moveY
  downMask: number;
  pressedMask: number;
  releasedMask: number;
}

export interface VersionHandshake {
  clientVersion: string;
  protocolVersion: string;
  dataPackHash: string;
  balanceHash: string;
  uiSchemaHash?: string;
  platform: "web" | "desktop";
}

export interface PlayerRunStartInfo {
  playerId: PlayerId;
  displayName?: string;
  loadoutHash: string;
  loadout: unknown;
}

export interface RunStartMessage {
  type: "run_start";
  roomId: Id;
  runId: Id;
  hostId: PlayerId;

  protocolVersion: string;
  dataPackHash: string;
  balanceHash: string;

  seed: number;
  stageId: Id;
  difficultyId: Id;

  players: PlayerRunStartInfo[];

  simFps: 60;
  inputDelayFrames: number;
  startFrame: number;

  createdAtServerMs: number;
}

export interface StateHashReport {
  frame: number;
  hash: string;
  simFrame: number;
  rngDigest: string;
  entityCountDigest: string;
}

export interface InputBatchMessage {
  type: "input_batch";
  roomId: Id;
  senderId: PlayerId;
  seq: number;

  baseFrame: number;
  inputs: EncodedFrameInput[];

  ackFrame: number;
  lastKnownStateHash?: StateHashReport;

  sentAtClientMs: number;
}

export interface InsightDecisionMessage {
  type: "insight_decision";
  roomId: Id;
  playerId: PlayerId;
  insightId: Id;
  clientDecisionSeq: number;
  action: "choose" | "reroll";
  optionIndex?: 0 | 1 | 2;
}

export interface OrderedInsightDecisionEvent {
  eventType: "insight_decision_ordered";
  serverDecisionSeq: number;
  decision: InsightDecisionMessage;
}

export interface OrderedRoomEventMessage {
  type: "ordered_room_event";
  roomId: Id;
  serverSeq: number;
  event:
    | OrderedInsightDecisionEvent
    | NetworkWaitingEvent
    | PeerDisconnectedEvent
    | PeerReconnectedEvent
    | DesyncRepairEvent;
}

export interface NetworkWaitingEvent {
  eventType: "pause_network_waiting" | "resume_from_network_waiting";
  frame: number;
  reason: "missing_inputs" | "peer_disconnected" | "snapshot_repair";
}

export interface PeerDisconnectedEvent {
  eventType: "peer_disconnected";
  playerId: PlayerId;
  serverTimeMs: number;
  reconnectGraceMs: number;
}

export interface PeerReconnectedEvent {
  eventType: "peer_reconnected";
  playerId: PlayerId;
  serverTimeMs: number;
  snapshotFrame: number;
}

export interface DesyncRepairEvent {
  eventType: "desync_repair_start" | "desync_repair_complete";
  frame: number;
  authorityPlayerId: PlayerId;
  reason?: string;
}

export interface HashReportMessage {
  type: "hash_report";
  roomId: Id;
  playerId: PlayerId;
  report: StateHashReport;
}

export interface SnapshotRequestMessage {
  type: "snapshot_request";
  roomId: Id;
  requestingPlayerId: PlayerId;
  fromFrame: number;
  reason: "desync" | "reconnect" | "debug";
}

export interface CombatSnapshotEnvelope {
  runId: Id;
  frame: number;
  stateHash: string;
  state: unknown;
  rngState: RunRngState;
}

export interface SnapshotResponseMessage {
  type: "snapshot_response";
  roomId: Id;
  targetPlayerId: PlayerId;
  snapshotFrame: number;
  snapshot: CombatSnapshotEnvelope;
  inputHistoryAfterSnapshot: InputBatchMessage[];
}

export interface RngStreamState {
  streamId: string;
  algorithm: "mulberry32" | "xoroshiro128" | "pcg32";
  state: string;
  draws: number;
}

export interface RunRngState {
  gameplay: RngStreamState;
  stage: RngStreamState;
  drop: RngStreamState;
  reward: RngStreamState;
  boss: RngStreamState;
  tribulation: RngStreamState;
  visual: RngStreamState;
}

export interface LockstepConfig {
  simFps: 60;
  inputDelayFrames: number;
  hashEveryFrames: number;
  snapshotEveryFrames: number;
  snapshotRingSize: number;
  missingInputStallFramesBeforeWarning: number;
}

export interface NetDiagnostics {
  rttMs: number;
  jitterMs: number;
  packetLossPctEstimate: number;
  inputBufferFrames: number;
  lastAckFrame: number;
  lastHashFrame: number;
  desyncSuspected: boolean;
}

export type NetMessage =
  | RunStartMessage
  | InputBatchMessage
  | InsightDecisionMessage
  | OrderedRoomEventMessage
  | HashReportMessage
  | SnapshotRequestMessage
  | SnapshotResponseMessage;
