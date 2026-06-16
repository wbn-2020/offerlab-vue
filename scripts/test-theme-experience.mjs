import { readdirSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const themeStore = readFileSync(new URL('../src/stores/theme.ts', import.meta.url), 'utf8')
const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')
const login = readFileSync(new URL('../src/views/LoginView.vue', import.meta.url), 'utf8')
const register = readFileSync(new URL('../src/views/RegisterView.vue', import.meta.url), 'utf8')
const authThemeToggle = readFileSync(new URL('../src/components/auth/AuthThemeToggle.vue', import.meta.url), 'utf8')
const home = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const explore = readFileSync(new URL('../src/views/ExploreView.vue', import.meta.url), 'utf8')
const governance = readFileSync(new URL('../src/views/AdminGovernanceView.vue', import.meta.url), 'utf8')
const globals = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8')

const relativeLuminance = ([r, g, b]) => {
  const channels = [r, g, b].map((value) => {
    const next = value / 255
    return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

const contrastRatio = (foreground, background) => {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (light + 0.05) / (dark + 0.05)
}

const collectVueFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
  if (entry.isDirectory()) {
    return collectVueFiles(child)
  }
  return entry.name.endsWith('.vue') ? [child] : []
})

assert.match(themeStore, /watch\(\[mode,\s*prefersDark\],\s*updateDOM,\s*\{\s*immediate:\s*true\s*\}\)/, 'theme store must apply saved/system theme immediately')
assert.match(themeStore, /document\.documentElement\.classList\.toggle\('dark',\s*isDark\(\)\)/, 'theme store must keep html.dark synchronized with the effective theme')
assert.match(themeStore, /toggleExplicitMode/, 'theme store must expose an effective-theme toggle helper')
assert.match(main, /useThemeStore\(pinia\)\.initialize\(\)/, 'app startup must initialize theme before mount')

assert.match(header, /data-theme-toggle/, 'AppHeader must keep a theme toggle button')
assert.match(header, /themeStore\.toggleExplicitMode\(\)/, 'AppHeader theme toggle must use effective dark/light state')
assert.doesNotMatch(header, /themeStore\.mode\s*===\s*'dark'/, 'AppHeader must not toggle based only on persisted mode')

for (const [name, source] of [['LoginView', login], ['RegisterView', register]]) {
  assert.match(source, /AuthThemeToggle/, `${name} must expose a theme toggle for signed-out users`)
}

assert.match(authThemeToggle, /Moon/, 'auth theme toggle must render a moon icon for dark mode entry')
assert.match(authThemeToggle, /Sun/, 'auth theme toggle must render a sun icon for light mode entry')
assert.match(authThemeToggle, /themeStore\.toggleExplicitMode\(\)/, 'auth theme toggle must use the shared effective-theme toggle helper')
assert.match(authThemeToggle, /data-theme-toggle/, 'auth theme toggle must be easy to locate in visual checks')

const scopedDarkSelectorLeaks = collectVueFiles(new URL('../src/', import.meta.url))
  .filter((file) => /:global\(\.dark\)\s+\./.test(readFileSync(file, 'utf8')))
  .map((file) => file.pathname)

assert.deepEqual(scopedDarkSelectorLeaks, [], 'scoped dark selectors must target component descendants instead of compiling into bare .dark rules')

assert.match(home, /class="metric-value"/, 'home metric numbers must use a stable metric-value class')
assert.match(home, /\.metric-value\s*\{[\s\S]*min-height:\s*2\.125rem[\s\S]*line-height:\s*1\.15/, 'home metric numbers must reserve enough height to avoid clipping')
assert.match(home, /@media \(max-width:\s*640px\)\s*\{[\s\S]*\.metric-value\s*\{[\s\S]*min-height:\s*1\.5rem/, 'home mobile metric numbers must reserve enough height to avoid clipping')
assert.match(home, /\.dark \.metric-tile\s*\{[\s\S]*background:\s*rgba\(15,\s*23,\s*42,\s*0\.86\)/, 'home dark metric tiles must have a stronger surface')
assert.match(home, /\.dark \.metric-value\s*\{[\s\S]*color:\s*#f8fafc/, 'home dark metric values must use a high-contrast foreground')
assert.ok(contrastRatio([248, 250, 252], [15, 23, 42]) >= 4.5, 'home dark metric value contrast must meet WCAG AA')

assert.match(explore, /class="recommended-user-card"/, 'recommended users must use a stable card class')
assert.match(explore, /\.recommended-user-card\s*\{[\s\S]*min-height:\s*15rem[\s\S]*justify-content:\s*space-between/, 'recommended user cards must reserve stable height for stats and actions')
assert.match(explore, /class="user-stat-chip"/, 'recommended user stats must be scannable chips')
assert.match(explore, /follow-button--primary/, 'follow button must have a primary dark-mode state')
assert.match(explore, /\.follow-button\s*\{[\s\S]*min-height:\s*42px[\s\S]*justify-content:\s*center/, 'follow buttons must keep stable touch-friendly dimensions')
assert.match(explore, /class="topic-count"/, 'topic rows must render the count as an explicit badge')
assert.match(explore, /\.topic-row\s*\{[\s\S]*min-height:\s*44px/, 'topic rows must keep a touch-friendly entry height')
assert.match(explore, /\.topic-count\s*\{[\s\S]*display:\s*inline-flex[\s\S]*min-height:\s*1\.55rem/, 'topic count badges must be visually centered badges')
assert.match(explore, /\.dark \.topic-count\s*\{[\s\S]*background:\s*rgb\(30 27 75 \/ 0\.72\)/, 'dark topic count badge must not look disabled')
assert.match(explore, /\.dark \.follow-button--primary:not\(:disabled\):hover\s*\{[\s\S]*background:\s*#4338ca/, 'dark follow buttons must have a deliberate hover state')
assert.ok(contrastRatio([199, 210, 254], [30, 27, 75]) >= 4.5, 'dark topic count badge contrast must meet WCAG AA')
assert.ok(contrastRatio([255, 255, 255], [79, 70, 229]) >= 4.5, 'dark primary follow button contrast must meet WCAG AA')

assert.match(governance, /class="governance-page min-h-screen"/, 'governance page must expose local theme tokens')
assert.match(governance, /\.dark \.governance-page\s*\{[\s\S]*--governance-tabs-bg:/, 'governance page must define dark segmented-tab tokens')
assert.doesNotMatch(governance, /\.secondary-button,\s*\n\.tab-button\s*\{[^}]*background:\s*white/, 'governance buttons must not default to white surfaces')
assert.doesNotMatch(governance, /\.metric-card,\s*\n\.panel\s*\{[^}]*background:\s*white/, 'governance panels must not default to white surfaces')
assert.match(governance, /\.violation-card\s*\{[\s\S]*?background:\s*var\(--governance-surface-muted\)/, 'governance violation cards must use local surface tokens')
assert.match(governance, /\.field-input\s*\{[\s\S]*?background:\s*var\(--governance-surface\)/, 'governance inputs must use local surface tokens')
assert.doesNotMatch(governance, /(?:\.violation-card|\.field-input)\s*\{[^}]*background:\s*(?:white|#fff|#ffffff|rgb\(255 255 255)/, 'governance detail/input surfaces must not regress to white defaults')
assert.match(governance, /\.data-table\s*\{[\s\S]*background:\s*var\(--governance-surface\)/, 'governance tables must inherit the local surface token')
assert.match(governance, /\.dark \.status-muted,\s*\n\.dark \.meta-chip\s*\{[\s\S]*background:\s*rgb\(15 23 42 \/ 0\.82\)/, 'governance dark muted chips must not use pale light-mode surfaces')
assert.match(governance, /\.dark \.status-danger\s*\{[\s\S]*background:\s*rgb\(127 29 29 \/ 0\.7\)/, 'governance dark danger chips must use a dark danger surface')
assert.match(governance, /\.dark \.data-table th\s*\{[\s\S]*background:\s*var\(--governance-surface-muted\)/, 'governance dark table headers must use dark local surface tokens')

const broadDarkFallback = globals.match(/html\.dark :is\(\s*\.surface-card[\s\S]*?\n\}/)?.[0] || ''
assert.ok(broadDarkFallback && !broadDarkFallback.includes('!important'), 'broad dark component fallback must not use !important')
assert.doesNotMatch(globals, /html\.dark :is\([\s\S]*?\.text-slate-700[\s\S]*?\)\s*\{/, 'global dark fallback must not override Tailwind text atoms')
assert.doesNotMatch(globals, /html\.dark :is\(\.bg-white\)/, 'global dark fallback must not override Tailwind bg-white atoms')
assert.doesNotMatch(globals, /!important/, 'global theme fallback must not use !important')

console.log('theme experience guard passed')
