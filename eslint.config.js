import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // Add your custom rules here
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
  },
];