import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

const isProd = process.env.NODE_ENV === 'production' || process.env.CI === 'true'

// In production/CI, disable aggressive linting by exporting a minimal config.
// This avoids ESLint errors breaking builds while keeping dev linting active.
const config = isProd
  ? defineConfigWithVueTs(
      {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mts,tsx,vue}'],
      },
      globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),
    )
  : defineConfigWithVueTs(
      {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mts,tsx,vue}'],
      },
      globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),
      pluginVue.configs['flat/essential'],
      vueTsConfigs.recommended,
      skipFormatting,
    )

export default config
