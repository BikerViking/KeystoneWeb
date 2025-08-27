import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules', 'dist', 'build']
  },
  {
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module'
    },
    rules: {}
  }
];
