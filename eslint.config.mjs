import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// データアクセス境界（docs/architecture.md「責務のルール」3）を機械的に守らせる。
// Supabaseクライアントの生成は features/<機能名>/actions.ts と lib/supabase/、proxy.ts に限る。
// UI（app/、components/、features/*/components/、features/*/hooks/）からは生成させない。
const supabaseClientMessage =
  "Supabaseクライアントは features/<機能名>/actions.ts か lib/supabase/ で生成する。UIコンポーネントから直接生成しない（docs/architecture.md 参照）。";

const restrictedSupabaseImports = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          // エイリアス経由と相対パス経由の両方を塞ぐ。
          group: [
            "@/lib/supabase/client",
            "@/lib/supabase/server",
            "**/lib/supabase/client",
            "**/lib/supabase/server",
          ],
          message: supabaseClientMessage,
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/features/*/components/**/*.{ts,tsx}",
      "src/features/*/hooks/**/*.{ts,tsx}",
    ],
    rules: restrictedSupabaseImports,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
