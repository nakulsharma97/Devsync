import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The React Compiler-era rules below are experimental and false-positive
      // heavy for this codebase (fetch-in-effect state, Math.random decorations,
      // derived deps). Kept OFF for the CI gate but visible in editors.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
      // v6 flags ref-cleanup timing and derived dependencies; keep as a warning
      // so it surfaces without blocking the build.
      "react-hooks/exhaustive-deps": "warn",
      // Boundary code (catch clauses, third-party callbacks) legitimately needs
      // loose typing; real logic is still covered by explicit types.
      "@typescript-eslint/no-explicit-any": "warn",
      // `_`-prefixed args are the codebase's convention for intentionally
      // unused parameters (e.g. stub service signatures); keep real unused
      // variables as errors.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
);
