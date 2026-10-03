import { readFile } from "node:fs/promises";
import path from "node:path";

/** Decorative bar scene — landing hero atmosphere (SSR inline). */
export async function BarScene({ className = "" }: { className?: string }) {
  const svg = await readFile(
    path.join(process.cwd(), "public/bar-scene.svg"),
    "utf8",
  );

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#120B08] ${className}`}
      aria-hidden="true"
    >
      <div
        className="bar-scene-svg aspect-[1000/600] w-full [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
