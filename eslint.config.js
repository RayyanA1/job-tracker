import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/dist/', '**/coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['apps/api/src/**/services/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^express(?:/|$)',
              message: 'Keep Express request and response handling in http/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/**/http/**/*.ts', 'apps/api/src/**/routes.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?:pg|(?:node:)?fs)(?:/|$)',
              message:
                'Use a repository or store for database and file access.',
            },
          ],
        },
      ],
    },
  },
  prettier,
];
