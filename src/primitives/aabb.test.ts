import { describe, it, expect } from "vitest";
import { AABB } from "./aabb";
import { Vec2 } from "./vec2-gl";

describe("AABB", () => {
	describe("fromCenter", () => {
		it("should create AABB from center and size", () => {
			const center = Vec2.fromValues(10, 20);
			const size = Vec2.fromValues(6, 8);
			const aabb = AABB.fromCenter(center, size);

			expect(aabb.min[0]).toBe(7);
			expect(aabb.min[1]).toBe(16);
			expect(aabb.max[0]).toBe(13);
			expect(aabb.max[1]).toBe(24);
		});
	});

	describe("intersects", () => {
		it("should return true for intersecting AABBs", () => {
			const aabb1 = AABB.fromCenter(
				Vec2.fromValues(10, 10),
				Vec2.fromValues(4, 4),
			);
			const aabb2 = AABB.fromCenter(
				Vec2.fromValues(11, 11),
				Vec2.fromValues(4, 4),
			);
			expect(aabb1.intersects(aabb2)).toBe(true);
		});

		it("should return false for non-intersecting AABBs", () => {
			const aabb1 = AABB.fromCenter(
				Vec2.fromValues(0, 0),
				Vec2.fromValues(2, 2),
			);
			const aabb2 = AABB.fromCenter(
				Vec2.fromValues(5, 5),
				Vec2.fromValues(2, 2),
			);
			expect(aabb1.intersects(aabb2)).toBe(false);
		});

		it("should return false for touching AABBs (strict intersection)", () => {
			const aabb1 = new AABB(Vec2.fromValues(0, 0), Vec2.fromValues(2, 2));
			const aabb2 = new AABB(Vec2.fromValues(2, 0), Vec2.fromValues(4, 2));
			expect(aabb1.intersects(aabb2)).toBe(false);
		});

		it("should return true for slightly overlapping AABBs", () => {
			const aabb1 = new AABB(Vec2.fromValues(0, 0), Vec2.fromValues(2.1, 2));
			const aabb2 = new AABB(Vec2.fromValues(2, 0), Vec2.fromValues(4, 2));
			expect(aabb1.intersects(aabb2)).toBe(true);
		});
	});

	describe("union", () => {
		it("should create union of two AABBs", () => {
			const aabb1 = new AABB(Vec2.fromValues(0, 0), Vec2.fromValues(2, 2));
			const aabb2 = new AABB(Vec2.fromValues(5, 5), Vec2.fromValues(7, 7));
			const union = aabb1.union(aabb2);

			expect(union.min[0]).toBe(0);
			expect(union.min[1]).toBe(0);
			expect(union.max[0]).toBe(7);
			expect(union.max[1]).toBe(7);
		});
	});

	describe("center", () => {
		it("should calculate center correctly", () => {
			const aabb = new AABB(Vec2.fromValues(0, 0), Vec2.fromValues(10, 20));
			const center = aabb.center;
			expect(center[0]).toBe(5);
			expect(center[1]).toBe(10);
		});
	});

	describe("width and height", () => {
		it("should calculate width and height", () => {
			const aabb = new AABB(Vec2.fromValues(0, 0), Vec2.fromValues(10, 20));
			expect(aabb.width).toBe(10);
			expect(aabb.height).toBe(20);
		});
	});
});
