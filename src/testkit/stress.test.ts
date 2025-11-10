import { describe, it } from "vitest";
import { createHarness } from "./harness";
import { GAME_CONSTANTS } from "../game/constants";
import { Vec2 } from "../primitives/vec2-gl";

type FrameMetrics = {
  frameTime: number;
  fps: number;
};

type MemoryUsage = {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
};

type StressTestMetrics = {
  averageFps: number;
  minFps: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  totalFrames: number;
  memoryStart: MemoryUsage;
  memoryEnd: MemoryUsage;
  memoryPeak: MemoryUsage;
  memoryGrowth: number;
};

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)] ?? 0;
}

function getMemoryUsage(): MemoryUsage {
  if (
    typeof globalThis !== "undefined" &&
    "process" in globalThis &&
    typeof (globalThis as unknown as { process?: { memoryUsage?: () => { heapUsed: number; heapTotal: number; external: number; rss: number } } }).process?.memoryUsage === "function"
  ) {
    const process = (globalThis as unknown as { process: { memoryUsage: () => { heapUsed: number; heapTotal: number; external: number; rss: number } } }).process;
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }
  return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
}

function forceGC(): void {
  if (
    typeof globalThis !== "undefined" &&
    "global" in globalThis &&
    typeof (globalThis as unknown as { global?: { gc?: () => void } }).global?.gc === "function"
  ) {
    (globalThis as unknown as { global: { gc: () => void } }).global.gc();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function calculateMetrics(
  frameMetrics: FrameMetrics[],
  memoryStart: MemoryUsage,
  memoryEnd: MemoryUsage,
  memoryPeak: MemoryUsage,
): StressTestMetrics {
  if (frameMetrics.length === 0) {
    return {
      averageFps: 0,
      minFps: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      totalFrames: 0,
      memoryStart,
      memoryEnd,
      memoryPeak,
      memoryGrowth: 0,
    };
  }

  const fpsValues = frameMetrics.map((m) => m.fps);
  const sortedFps = [...fpsValues].sort((a, b) => a - b);

  const averageFps =
    fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
  const minFps = Math.min(...fpsValues);

  const memoryGrowth = memoryEnd.heapUsed - memoryStart.heapUsed;

  return {
    averageFps: Math.round(averageFps * 100) / 100,
    minFps: Math.round(minFps * 100) / 100,
    p50: Math.round(calculatePercentile(sortedFps, 50) * 100) / 100,
    p90: Math.round(calculatePercentile(sortedFps, 90) * 100) / 100,
    p95: Math.round(calculatePercentile(sortedFps, 95) * 100) / 100,
    p99: Math.round(calculatePercentile(sortedFps, 99) * 100) / 100,
    totalFrames: frameMetrics.length,
    memoryStart,
    memoryEnd,
    memoryPeak,
    memoryGrowth,
  };
}

function printMetrics(metrics: StressTestMetrics): void {
  const fpsTable = [
    { Метрика: "Средний FPS", Значение: metrics.averageFps.toFixed(2) },
    { Метрика: "Минимальный FPS", Значение: metrics.minFps.toFixed(2) },
    { Метрика: "p50", Значение: metrics.p50.toFixed(2) },
    { Метрика: "p90", Значение: metrics.p90.toFixed(2) },
    { Метрика: "p95", Значение: metrics.p95.toFixed(2) },
    { Метрика: "p99", Значение: metrics.p99.toFixed(2) },
    { Метрика: "Кадров", Значение: metrics.totalFrames.toString() },
  ];

  console.table(fpsTable);

  const memoryTable = [
    {
      Метрика: "Память (начало)",
      Значение: formatBytes(metrics.memoryStart.heapUsed),
    },
    {
      Метрика: "Память (конец)",
      Значение: formatBytes(metrics.memoryEnd.heapUsed),
    },
    {
      Метрика: "Память (пик)",
      Значение: formatBytes(metrics.memoryPeak.heapUsed),
    },
    {
      Метрика: "Прирост памяти",
      Значение: formatBytes(metrics.memoryGrowth),
    },
    {
      Метрика: "RSS (начало)",
      Значение: formatBytes(metrics.memoryStart.rss),
    },
    {
      Метрика: "RSS (конец)",
      Значение: formatBytes(metrics.memoryEnd.rss),
    },
  ];

  console.table(memoryTable);

  if (metrics.minFps < 30) {
    console.warn(
      `⚠️  Внимание: Минимальный FPS (${metrics.minFps.toFixed(2)}) ниже порога 30 FPS`,
    );
  }

  if (metrics.memoryGrowth > 10 * 1024 * 1024) {
    console.warn(
      `⚠️  Внимание: Прирост памяти (${formatBytes(metrics.memoryGrowth)}) превышает 10 MB. Возможна утечка памяти.`,
    );
  }
}

describe("Стресс-тест производительности", () => {
  it(
    "должен пройти 10 секунд реального времени и собрать метрики FPS и памяти",
    async () => {
    const testDurationSeconds = 10;
    const targetFps = 60;
    const dt = 1 / targetFps;
    const frameTimeMs = dt * 1000;

    const h = await createHarness({
      seed: "stress-test-42",
      includeRender: false,
      includeAudio: false,
    });

    const viewportSize = h.viewportSize;
    const startPlayerPos = Vec2.fromValues(
      viewportSize[0] / 2,
      GAME_CONSTANTS.PLAYER_START_Y,
    );

    const player = h.spawn.player({ x: startPlayerPos[0], y: startPlayerPos[1] });

    h.spawn.platform({
      x: startPlayerPos[0],
      y: startPlayerPos[1],
      kind: "default",
    });

    const cameraPos = Vec2.create();
    Vec2.scale(cameraPos, viewportSize, 0.5);
    h.spawn.camera({
      followFor: player,
      x: cameraPos[0],
      y: cameraPos[1],
    });

    h.spawn.spawner();

    const memoryStart = getMemoryUsage();
    let memoryPeak = { ...memoryStart };

    const frameMetrics: FrameMetrics[] = [];
    const testStartTime = performance.now();

    let currentTime = 0;
    let jumpPressTime = 0;
    let moveDirection: "left" | "right" | null = null;
    let moveStartTime = 0;
    let frame = 0;
    let lastMemoryCheck = 0;

    console.log(`Запуск стресс-теста на ${testDurationSeconds} секунд реального времени...`);

    while (true) {
      const elapsedRealTime = (performance.now() - testStartTime) / 1000;
      if (elapsedRealTime >= testDurationSeconds) {
        break;
      }

      currentTime = frame * dt;

      if (currentTime - jumpPressTime >= 2.5) {
        h.input.down("jump");
        jumpPressTime = currentTime;
      } else if (currentTime - jumpPressTime >= 0.1) {
        h.input.up("jump");
      }

      if (moveDirection === null || currentTime - moveStartTime >= 3.0) {
        moveDirection = moveDirection === "left" ? "right" : "left";
        moveStartTime = currentTime;
        h.input.up("moveLeft", "moveRight");
        h.input.down(moveDirection === "left" ? "moveLeft" : "moveRight");
      }

      const frameStart = performance.now();
      h.world.fixedUpdate(dt);
      h.world.update(dt);
      const frameEnd = performance.now();

      const actualFrameTime = (frameEnd - frameStart) / 1000;
      const fps = actualFrameTime > 0 ? 1 / actualFrameTime : 0;

      frameMetrics.push({ frameTime: actualFrameTime, fps });

      const elapsedSinceLastCheck = elapsedRealTime - lastMemoryCheck;
      if (elapsedSinceLastCheck >= 5) {
        forceGC();
        await sleep(10);
        const currentMemory = getMemoryUsage();
        if (currentMemory.heapUsed > memoryPeak.heapUsed) {
          memoryPeak = currentMemory;
        }
        lastMemoryCheck = elapsedRealTime;
      }

      const frameElapsed = (frameEnd - frameStart) / 1000;
      const sleepTime = Math.max(0, frameTimeMs - frameElapsed * 1000);
      if (sleepTime > 0) {
        await sleep(sleepTime);
      }

      frame++;
    }

    const memoryEnd = getMemoryUsage();
    if (memoryEnd.heapUsed > memoryPeak.heapUsed) {
      memoryPeak = memoryEnd;
    }

    const metrics = calculateMetrics(
      frameMetrics,
      memoryStart,
      memoryEnd,
      memoryPeak,
    );
    printMetrics(metrics);

    if (metrics.minFps < 30) {
      throw new Error(
        `Стресс-тест провален: минимальный FPS ${metrics.minFps.toFixed(2)} ниже порога 30 FPS`,
      );
    }
    },
    15000,
  );
});

