/**
 * ESLint 9 flat config.
 * Mirrors the rules from the original .eslintrc.json (kept for reference), which the
 * installed ESLint version no longer reads.
 */
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
	{
		ignores: ['node_modules/**', 'dist/**', 'eslint.config.js']
	},
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				process: 'readonly',
				console: 'readonly',
				Buffer: 'readonly',
				__dirname: 'readonly',
				setTimeout: 'readonly'
			}
		},
		plugins: {
			'@typescript-eslint': tsPlugin
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'no-unused-expressions': 'error',
			'prefer-const': 'error',
			'no-console': 'warn',
			'@typescript-eslint/no-explicit-any': 0
		}
	}
];
