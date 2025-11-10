import { describe, it, expect, beforeEach } from "vitest";
import { JumpComponent } from "./jumpComponent";

describe("JumpComponent", () => {
  let jump: JumpComponent;

  beforeEach(() => {
    jump = new JumpComponent({
      jumpHeight: 100,
      minJumpFactor: 0.35,
      coyoteTime: 0.1,
      bufferTime: 0.1,
    });
  });

  describe("jump timing", () => {
    it("should allow jump when recently grounded and jump pressed", () => {
      const now = 1.0;
      jump.recordGrounded(0.95);
      jump.recordJumpPress(0.95);
      expect(jump.canJump(now)).toBe(true);
    });

    it("should not allow jump when coyote time expired", () => {
      const now = 1.0;
      jump.recordGrounded(0.85);
      expect(jump.canJump(now)).toBe(false);
    });

    it("should allow jump with buffered input", () => {
      const now = 1.0;
      jump.recordGrounded(0.95);
      jump.recordJumpPress(0.95);
      expect(jump.canJump(now)).toBe(true);
    });

    it("should not allow jump when buffer time expired", () => {
      const now = 1.0;
      jump.recordGrounded(0.95);
      jump.recordJumpPress(0.85);
      expect(jump.canJump(now)).toBe(false);
    });
  });

  describe("consumeJump", () => {
    it("should consume jump press", () => {
      const now = 1.0;
      jump.recordGrounded(0.95);
      jump.recordJumpPress(0.95);
      jump.consumeJump();

      expect(jump.canJump(now)).toBe(false);
    });
  });
});

