import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const canvasGradient = { addColorStop: vi.fn() };
const canvasPattern = null;
const canvasContext = {
  dpr: 1,
  arc: vi.fn(),
  beginPath: vi.fn(),
  bezierCurveTo: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  closePath: vi.fn(),
  createLinearGradient: vi.fn(() => canvasGradient),
  createPattern: vi.fn(() => canvasPattern),
  createRadialGradient: vi.fn(() => canvasGradient),
  drawImage: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  moveTo: vi.fn(),
  rect: vi.fn(),
  restore: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
  strokeText: vi.fn(),
  transform: vi.fn(),
  translate: vi.fn(),
} as unknown as CanvasRenderingContext2D;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => canvasContext),
});
