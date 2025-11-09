module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: ["../../backend/*", "../backend/*", "*/backend/*"]
      }
    ]
  }
};
