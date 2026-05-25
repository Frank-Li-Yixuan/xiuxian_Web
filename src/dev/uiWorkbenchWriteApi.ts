import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";

export interface UiWorkbenchWriteRequest {
  readonly path: string;
  readonly base64: string;
}

export interface UiWorkbenchWriteResult {
  readonly ok: true;
  readonly path: string;
  readonly bytes: number;
}

export interface UiWorkbenchWriteHandlerOptions {
  readonly projectRoot: string;
  readonly maxBytes?: number;
}

const EDITOR_ROOT = "public/assets/generated/ui/editor/";
const MAX_BYTES = 2_000_000;

export function createUiWorkbenchWriteHandler(options: UiWorkbenchWriteHandlerOptions) {
  return async (request: UiWorkbenchWriteRequest): Promise<UiWorkbenchWriteResult> => {
    const valid = validateUiWorkbenchWriteRequest(request, options.maxBytes);
    const projectRoot = resolve(options.projectRoot);
    const absolutePath = resolve(projectRoot, valid.path);
    const editorRoot = resolve(projectRoot, EDITOR_ROOT);
    if (!absolutePath.startsWith(`${editorRoot}${sep}`) && absolutePath !== editorRoot) {
      throw new Error(`Workbench write path must stay under editor root: ${request.path}`);
    }
    const bytes = Buffer.from(valid.base64, "base64");
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, bytes);
    return {
      ok: true,
      path: valid.path,
      bytes: bytes.byteLength
    };
  };
}

export function validateUiWorkbenchWriteRequest(
  request: UiWorkbenchWriteRequest,
  maxBytes = MAX_BYTES
): UiWorkbenchWriteRequest {
  const normalizedPath = normalize(request.path).replace(/\\/g, "/");
  if (isAbsolute(request.path) || /^[A-Za-z]:/.test(request.path)) {
    throw new Error("Workbench write path must be relative");
  }
  if (!normalizedPath.startsWith(EDITOR_ROOT)) {
    throw new Error(`Workbench write path must stay under ${EDITOR_ROOT}`);
  }
  if (normalizedPath.includes("../") || normalizedPath.includes("..\\")) {
    throw new Error("Workbench write path must not contain traversal");
  }
  if (!normalizedPath.endsWith(".json") && !normalizedPath.endsWith(".png")) {
    throw new Error("Workbench write path must use a supported extension");
  }
  if (!/^[A-Za-z0-9+/=]*$/.test(request.base64)) {
    throw new Error("Workbench write payload must be base64");
  }
  const byteLength = Buffer.from(request.base64, "base64").byteLength;
  if (byteLength > maxBytes) {
    throw new Error("Workbench write payload is too large");
  }
  return {
    path: normalizedPath,
    base64: request.base64
  };
}

export function toBase64Utf8(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}
