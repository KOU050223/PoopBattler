import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// データアクセス境界（docs/architecture.md「責務のルール」3）を機械的に守らせる。
// 既定を「src/ 全体で禁止」にし、生成を許す場所だけを後段で解除する許可リスト方式。
// 禁止リスト方式だと、新しく増えたディレクトリが黙って穴になる。
const supabaseClientMessage =
  "Supabaseクライアントは features/<機能名>/actions.ts か lib/supabase/、proxy.ts で生成する（docs/architecture.md 参照）。";

// ラッパー経由（エイリアス・相対パスの双方）と、生のSDKからの直接生成を塞ぐ。
const restrictedModules = [
  "@/lib/supabase/client",
  "@/lib/supabase/server",
  "**/lib/supabase/client",
  "**/lib/supabase/server",
  "@supabase/ssr",
  "@supabase/supabase-js",
];

// no-restricted-imports は静的な import/export 宣言しか見ないため、
// import() 式は no-restricted-syntax で別途塞ぐ。
const restrictedDynamicImports = restrictedModules.map((source) => ({
  selector: `ImportExpression[source.value=${JSON.stringify(source)}]`,
  message: supabaseClientMessage,
}));

// クライアントを生成してよい場所。architecture.md が挙げるものだけを並べる。
const supabaseClientAllowlist = [
  "src/features/*/actions.ts",
  "src/lib/supabase/**/*.{ts,tsx,js,jsx}",
  "src/proxy.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // tsconfig で allowJs が有効なため js/jsx も対象に含める。
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: restrictedModules, message: supabaseClientMessage }] },
      ],
      "no-restricted-syntax": ["error", ...restrictedDynamicImports],
    },
  },
  {
    // 許可リスト。禁止ブロックより後に置くことで解除が効く。
    files: supabaseClientAllowlist,
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
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
