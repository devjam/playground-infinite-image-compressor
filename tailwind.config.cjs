/* eslint-disable */
const fs = require('node:fs')
const path = require('node:path')
const postcss = require('postcss')
const plugin = require('tailwindcss/plugin')

const pxToRem = (px, defaultFontSize = 16) => {
  return `${px / defaultFontSize}rem`
}

/**
 * Loads CSS files through Tailwind’s plugin system to enable IntelliSense support.
 *
 * This plugin scans CSS files from `src/styles/{base,components,utilities}` and appends them to
 * their respective layers.
 */
const cssFiles = plugin(({ addBase, addComponents, addUtilities }) => {
  const layers = ['base', 'components', 'utilities']
  const stylesDir = path.join(__dirname, 'src/styles')
  const addStylesMap = {
    base: addBase,
    components: addComponents,
    utilities: addUtilities,
  }

  for (const layer of layers) {
    const layerDir = path.join(stylesDir, layer)
    const files = fs.readdirSync(layerDir)
    const addStyles = addStylesMap[layer]

    for (const file of files) {
      if (path.extname(file) === '.css') {
        const filePath = path.join(layerDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const styles = postcss.parse(content)
        addStyles(styles.nodes)
      }
    }
  }
})

/**
 * Create a responsive grid layout without media queries using CSS Grid.
 *
 * This plugin is based on a method provided by Andy Bell on piccalil.li.
 * See: https://piccalil.li/tutorial/create-a-responsive-grid-layout-with-no-media-queries-using-css-grid/
 */
const autoGrid = plugin(
  ({ addComponents, matchComponents, theme }) => {
    const values = theme('autoGrid')

    matchComponents(
      {
        'auto-grid': (value) => ({
          display: 'grid',
          'grid-template-columns': `repeat(auto-fill, minmax(min(${value}, 100%), 1fr))`,
        }),
      },
      { values },
    )

    addComponents({
      '.auto-grid-none': {
        display: 'revert',
        'grid-template-columns': 'revert',
      },
    })
  },
  {
    theme: {
      autoGrid: ({ theme }) => ({
        ...theme('spacing'),
      }),
    },
  },
)

// バリアブルフォントのwidthを指定するためのクラス追加
const fontWidth = plugin(({ matchUtilities, theme }) => {
  matchUtilities(
    {
      'text-w': (value) => ({
        'font-variation-settings': `'wdth' ${value}`,
      }),
    },
    {
      values: theme('fontWidth'),
    },
  )
})

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    screens: {
      sm: '350px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    spacing: Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`${i}`, pxToRem(i)])),
    fontSize: Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`${i}`, pxToRem(i)])),
    fontWidth: {
      regular: 100,
      90: 90,
      94: 94,
      95: 95,
      109: 109,
    },
    extend: {
      fontFamily: {
        shiftbrain: ['SHIFTBRAIN Norms Variable, sans-serif'],
        noto: ['Noto Sans JP', 'SHIFTBRAIN Norms Variable', 'sans-serif'],
        'shiftbrain-noto': ['SHIFTBRAIN Norms Variable', 'Noto Sans JP', 'sans-serif'],
      },
      colors: {
        transparent: 'transparent',
        white: {
          DEFAULT: '#ffffff',
          primary: '#F5F5F5',
        },
        black: {
          DEFAULT: '#000000',
          primary: '#1C1C1C',
        },
        gray: {
          200: '#EDEDED',
          300: '#E0E0E0',
          500: '#CCCCCC',
          600: '#6C6C6C',
          700: '#5F5F5F',
          900: '#303030',
        },
      },
      transitionTimingFunction: {
        out1: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries'), cssFiles, autoGrid, fontWidth],
}
