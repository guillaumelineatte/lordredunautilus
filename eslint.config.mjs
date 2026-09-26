import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "docs/reference/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Toute écriture passe par la couche service (audit). Le client Prisma
    // n'est importable que par la couche serveur qui en a légitimement besoin.
    files: ["src/app/**/*.tsx", "src/components/**", "src/server/actions/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/db",
              message: "Passez par src/server/service ou src/server/queries.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
