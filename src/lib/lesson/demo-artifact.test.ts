import { describe, expect, it } from "vitest";
import { solarSystemDemoArtifact } from "./demo-artifact";

describe("solar system demo artifact", () => {
  it("keeps the source-controlled demo on the sandboxed solar runtime", () => {
    expect(solarSystemDemoArtifact.title).toBe("Explore the Solar System");
    expect(solarSystemDemoArtifact.spec.kind).toBe("solar-system");
    expect(solarSystemDemoArtifact.html).toContain(
      'data-runtime="solar-system"'
    );
    expect(solarSystemDemoArtifact.html).toContain(
      "/lesson-runtime/solar-system.v1.js"
    );
    expect(solarSystemDemoArtifact.html).toContain("Test your orbit instincts");
  });
});
