import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

const eslintConfig = [
  ...nextConfig,
  ...tseslint.configs.recommended,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["tests/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
