import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { createTestRenderer, createMockImageBitmap } from "../testkit/renderer";
import { Vec2 } from "../primitives/vec2-gl";

describe("CanvasRenderer", () => {
	describe("renderAnimated", () => {
		describe("линейная анимация (без cols)", () => {
			it("должен использовать горизонтальное смещение для кадра", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(100, 100);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 3,
					direction: "right",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
				});

				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(300);
				expect(call[2]).toBe(0);
				expect(call[3]).toBe(100);
				expect(call[4]).toBe(100);
			});

			it("должен корректно обрабатывать направление влево", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(100, 100);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 2,
					direction: "left",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
				});

				expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(200);
				expect(call[2]).toBe(0);
				expect(call[3]).toBe(100);
				expect(call[4]).toBe(100);
			});
		});

		describe("матричная анимация (с cols)", () => {
			it("должен вычислять колонку и строку для первого кадра", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(100, 100);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 0,
					direction: "right",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
					cols: 3,
				});

				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(0);
				expect(call[2]).toBe(0);
				expect(call[3]).toBe(100);
				expect(call[4]).toBe(100);
			});

			it("должен вычислять колонку и строку для кадра в первой строке", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(100, 100);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 2,
					direction: "right",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
					cols: 3,
				});

				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(200);
				expect(call[2]).toBe(0);
				expect(call[3]).toBe(100);
				expect(call[4]).toBe(100);
			});

			it("должен вычислять колонку и строку для кадра во второй строке", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(100, 100);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 3,
					direction: "right",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
					cols: 3,
				});

				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(0);
				expect(call[2]).toBe(100);
				expect(call[3]).toBe(100);
				expect(call[4]).toBe(100);
			});

			it("должен вычислять колонку и строку для кадра в середине матрицы", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(100, 100);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 5,
					direction: "right",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
					cols: 3,
				});

				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(200);
				expect(call[2]).toBe(100);
				expect(call[3]).toBe(100);
				expect(call[4]).toBe(100);
			});

			it("должен корректно работать с направлением влево для матрицы", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(100, 100);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 4,
					direction: "left",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
					cols: 3,
				});

				expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(100);
				expect(call[2]).toBe(100);
				expect(call[3]).toBe(100);
				expect(call[4]).toBe(100);
			});

			it("должен корректно работать с матрицей 2x2", () => {
				const { renderer, ctx, setImage } = createTestRenderer();
				const mockImage = createMockImageBitmap();
				setImage("cardIdle", mockImage);

				const spriteSize = Vec2.fromValues(50, 50);

				renderer.renderAnimated({
					name: "cardIdle",
					frame: 3,
					direction: "right",
					position: Vec2.create(),
					offset: Vec2.create(),
					size: spriteSize,
					spriteSize,
					cols: 2,
				});

				expect(ctx.drawImage).toHaveBeenCalled();
				const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
				expect(call[1]).toBe(50);
				expect(call[2]).toBe(50);
				expect(call[3]).toBe(50);
				expect(call[4]).toBe(50);
			});
		});
	});
});
