import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utils", () => {
  describe("cn (className merger)", () => {
    it("should merge class names", () => {
      const result = cn("btn", "btn-primary");
      expect(result).toBe("btn btn-primary");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("btn", isActive && "active");
      expect(result).toBe("btn active");
    });

    it("should filter out falsy values", () => {
      const result = cn("btn", false, null, undefined, "active");
      expect(result).toBe("btn active");
    });

    it("should handle tailwind class conflicts", () => {
      // tailwind-merge should handle conflicting classes
      const result = cn("px-2 py-1", "px-4");
      expect(result).toBe("py-1 px-4");
    });

    it("should handle empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle array of classes", () => {
      const result = cn(["btn", "btn-primary"]);
      expect(result).toBe("btn btn-primary");
    });
  });
});
