export interface CanvasLikeContext {
  readonly recordCommand?: (layerId: string, commandId: string) => void;

  save(): void;
  restore(): void;
  beginPath(): void;
  closePath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  fill(): void;
  stroke(): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  drawImage?(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void;
  translate?(x: number, y: number): void;
  rotate?(angle: number): void;
  scale?(x: number, y: number): void;

  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  globalCompositeOperation?: GlobalCompositeOperation;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const SYSTEM_UI_FONT = '12px system-ui, "Microsoft YaHei", "PingFang SC", sans-serif';

export function clearCanvas(context: CanvasLikeContext, width: number, height: number): void {
  context.clearRect(0, 0, width, height);
}

export function fillRect(
  context: CanvasLikeContext,
  rect: Rect,
  style: string,
  alpha = 1
): void {
  withCanvasState(context, () => {
    context.globalAlpha = alpha;
    context.fillStyle = style;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  });
}

export function drawFilledCircle(
  context: CanvasLikeContext,
  center: Vec2,
  radius: number,
  style: string,
  alpha = 1
): void {
  withCanvasState(context, () => {
    context.globalAlpha = alpha;
    context.fillStyle = style;
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.fill();
  });
}

export function drawRing(
  context: CanvasLikeContext,
  center: Vec2,
  radius: number,
  style: string,
  lineWidth = 2,
  alpha = 1
): void {
  withCanvasState(context, () => {
    context.globalAlpha = alpha;
    context.strokeStyle = style;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.stroke();
  });
}

export function drawLine(
  context: CanvasLikeContext,
  from: Vec2,
  to: Vec2,
  style: string,
  lineWidth = 2,
  alpha = 1
): void {
  withCanvasState(context, () => {
    context.globalAlpha = alpha;
    context.strokeStyle = style;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
}

export function drawText(
  context: CanvasLikeContext,
  text: string,
  position: Vec2,
  style: string,
  font = SYSTEM_UI_FONT,
  align: CanvasTextAlign = "left",
  alpha = 1
): void {
  withCanvasState(context, () => {
    context.globalAlpha = alpha;
    context.fillStyle = style;
    context.font = font;
    context.textAlign = align;
    context.textBaseline = "middle";
    context.fillText(text, position.x, position.y);
  });
}

function withCanvasState(context: CanvasLikeContext, draw: () => void): void {
  context.save();
  try {
    draw();
  } finally {
    context.restore();
  }
}
