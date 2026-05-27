import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const HEX_OR_RGB = "/(^#[0-9A-Fa-f]{3,8}$|^rgba?\\(|^hsla?\\()/";
const PX_LITERAL = "/^[0-9]+px$/";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name="style"] Literal[value=${HEX_OR_RGB}]`,
          message:
            "Hardcoded color literal in style prop. Use a 42labs DS token: Tailwind class (e.g. text-(--fg-muted)) or var(--token).",
        },
        {
          selector: `JSXAttribute[name.name="style"] Property[key.name="fontSize"] Literal`,
          message:
            "Hardcoded fontSize in style prop. Use a 42labs DS type-scale class.",
        },
        {
          selector: `JSXAttribute[name.name="style"] Property[key.name=/^(padding|margin)/] Literal[value=${PX_LITERAL}]`,
          message:
            "Hardcoded px padding/margin in style prop. Use a 42labs DS spacing class or var(--sp-*) token.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
