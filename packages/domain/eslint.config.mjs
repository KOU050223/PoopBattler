import { defineConfig } from "eslint/config";
import nextTs from "eslint-config-next/typescript";

// domain は React/Next/Supabase/描画系に依存しない純粋TSに保つ。
// RN等の別クライアントから再利用するための境界なので、機械的に塞ぐ。
const forbidden = [
  "react",
  "react-dom",
  "react/*",
  "react-dom/*",
  "next",
  "next/*",
  "next-intl",
  "next-intl/*",
  "@supabase/*",
  "three",
  "three/*",
  "@react-three/*",
  "framer-motion",
  "zustand",
  "zustand/*",
  "stripe",
  "@tensorflow/*",
  "@tensorflow-models/*",
  "@/*",
  "@poop-battler/*",
];

const message =
  "packages/domain は純粋TS。UI・フレームワーク・外部SDKには依存しない（必要なら ports.ts のinterface経由）。";

const SLASH = "[/]";
const dynamicSelector = `ImportExpression[source.value=/^(?:${["react", "react-dom", "next", "next-intl", "@supabase", "three", "@react-three", "framer-motion", "zustand", "stripe", "@tensorflow", "@tensorflow-models"].join("|")})(?:${SLASH}.*)?$/]`;

export default defineConfig([
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx,mts,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: forbidden, message },
            // group(gitignore記法)の "motion" は domain 内の motion/ ディレクトリ(相対import)にも誤マッチするため、npmパッケージ名だけを正規表現で禁止する。
            { regex: "^motion(/.*)?$", message },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: dynamicSelector, message },
      ],
    },
  },
]);
