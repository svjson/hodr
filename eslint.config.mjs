import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
        sourceType: 'module'
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
      prettier: eslintPluginPrettier
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
