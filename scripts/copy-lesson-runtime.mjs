import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const target = join(
  process.cwd(),
  "public",
  "lesson-runtime",
  "vendor",
  "three.module.js"
);

mkdirSync(dirname(target), { recursive: true });
copyFileSync(
  join(process.cwd(), "node_modules", "three", "build", "three.module.js"),
  target
);

console.log(`Copied Three.js runtime to ${target}`);
