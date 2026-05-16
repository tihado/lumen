import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const vendorFiles = ["three.module.js", "three.core.js"];
const vendorDir = join(process.cwd(), "public", "lesson-runtime", "vendor");

mkdirSync(vendorDir, { recursive: true });

for (const fileName of vendorFiles) {
  const target = join(vendorDir, fileName);

  copyFileSync(
    join(process.cwd(), "node_modules", "three", "build", fileName),
    target
  );

  console.log(`Copied Three.js runtime to ${target}`);
}
