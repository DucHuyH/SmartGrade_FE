import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    rules: {
      // Tắt cảnh báo về kiểu any
      '@typescript-eslint/no-explicit-any': 'off',
      // Tắt cảnh báo về export nhiều component (nếu cần, nhưng rule này không được bật mặc định ở đây)
      'react/no-multi-comp': 'off',
      // Tắt cảnh báo về biến chưa sử dụng (JavaScript)
      'no-unused-vars': 'off',
      // Tắt cảnh báo về biến chưa sử dụng (TypeScript)
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
])
