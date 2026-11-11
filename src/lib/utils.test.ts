import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names and resolves conflicts", () => {
    expect(cn("px-2", "px-4", false && "hidden", "text-white")).toContain("px-4");
    expect(cn("px-2", "px-4")).not.toContain("px-2");
  });
});
