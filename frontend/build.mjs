import { build } from "esbuild";

await build({
  entryPoints: ["src/panel.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  outfile: "../custom_components/umbau_planer/frontend/umbau-planer-panel.js",
});
console.log("built");
