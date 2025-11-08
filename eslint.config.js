// eslint.config.js (flat config, monorepo-aware)
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import reactJsxRuntime from "eslint-plugin-react/configs/jsx-runtime.js";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(repoRoot, "apps/frontend");
const backendDir = path.resolve(repoRoot, "apps/backend");
const testingLibraryReact = testingLibrary.configs["flat/react"] ?? testingLibrary.configs.react;
const jestDomRecommended = jestDom.configs["flat/recommended"] ?? jestDom.configs.recommended;

export default [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.vercel/**",
      "**/.next/**",
      "**/coverage/**",
      "apps/edge/**",
      "apps/frontend/src/supabase/**",
      "node_modules/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: globals.es2021,
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "no-console": "off",
      "no-useless-escape": "off",
    },
  },
  {
    files: ["apps/backend/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        allowDefaultProject: true,
        project: [
          path.resolve(backendDir, "tsconfig.eslint.json"),
          path.resolve(repoRoot, "packages/shared/tsconfig.eslint.json")
        ],
        tsconfigRootDir: backendDir,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "no-undef": "off",
    },
  },
  {
    files: ["apps/frontend/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: frontendDir,
      },
      globals: {
        ...globals.browser,
        JSX: "readonly",
      },
    },
    plugins: { react: (await import("eslint-plugin-react")).default },
    rules: {
      ...reactRecommended.rules,
      ...reactJsxRuntime.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-undef": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["apps/frontend/src/**/*.{test,spec}.{ts,tsx}"],
    plugins: {
      "testing-library": testingLibrary,
      "jest-dom": jestDom,
    },
    rules: {
      ...(testingLibraryReact?.rules ?? {}),
      ...(jestDomRecommended?.rules ?? {}),
    },
  },
  {
    files: ["**/*.js", "**/*.cjs", "apps/frontend/src/verify-*.js", "apps/frontend/src/vite.config*.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    ignores: ["apps/frontend/src/postcss.config.cjs", "apps/frontend/src/tailwind.config.cjs"],
  },
  {
    files: ["packages/shared/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        project: ["./packages/shared/tsconfig.eslint.json"],
        tsconfigRootDir: process.cwd(),
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
];
