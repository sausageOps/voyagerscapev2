import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const searchDirs = [
    { dir: path.join(process.cwd(), "public", "icons", "nav"), publicPath: "/icons/nav" },
    { dir: path.join(process.cwd(), "public", "ejp-pictograms"), publicPath: "/ejp-pictograms" },
  ];

  let foundIcons: string[] = [];

  for (const { dir, publicPath } of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const svgFiles = files
        .filter((file) => file.toLowerCase().endsWith(".svg"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

      if (svgFiles.length > 0) {
        foundIcons = svgFiles.map((file) => `${publicPath}/${file}`);
        break;
      }
    }
  }

  return NextResponse.json({
    icons: foundIcons,
    count: foundIcons.length,
  });
}
