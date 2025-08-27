import tsParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "client/dist",
      "client/postcss.config.js",
      "client/tailwind.config.js",
      "client/vite.config.ts",
      "client/public/sw.js",
      "server/uploads",
      "server/tmp",
      "eslint.config.js",
    ],
  },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { modules: true },
        tsconfigRootDir: __dirname,
        project: ["./client/tsconfig.json", "./server/tsconfig.json"],
      },
    },
    rules: {
      ...typescriptPlugin.configs["eslint-recommended"].rules,
      ...typescriptPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
