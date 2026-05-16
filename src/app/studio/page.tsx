import { StudioClient } from "./studio-client";

export default function StudioPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(120deg,oklch(0.985_0.022_164),oklch(0.997_0.012_105)_52%,oklch(0.972_0.027_204))]">
      <StudioClient />
    </div>
  );
}
