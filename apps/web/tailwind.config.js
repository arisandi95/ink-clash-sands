/** @type {import('tailwindcss').Config} */
const token = (name) => ({ opacityValue }) => {
  if (!opacityValue || opacityValue.startsWith('var(')) {
    return `var(${name})`;
  }
  return `color-mix(in srgb, var(${name}) calc(${opacityValue} * 100%), transparent)`;
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wall: token('--wall'),
        panel: token('--panel'),
        'panel-raised': token('--panel-raised'),
        line: token('--line'),
        ink: token('--ink'),
        'ink-soft': token('--ink-soft'),
        board: token('--board'),
        'on-board': token('--on-board'),
        frame: token('--frame'),
        highlight: token('--highlight'),
        'on-highlight': token('--on-highlight'),
        'on-accent': token('--on-accent'),
        blue: token('--marker-blue'),
        red: token('--marker-red'),
        green: token('--marker-green')
      },
      fontFamily: {
        marker: ['"Permanent Marker"', 'cursive'],
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        control: '10px',
        panel: '14px',
        board: '6px',
        tray: '18px',
        note: '2px'
      },
      boxShadow: {
        board: 'var(--shadow-board)',
        note: 'var(--shadow-note)',
        raised: 'var(--shadow-raised)'
      },
      transitionTimingFunction: {
        office: 'cubic-bezier(.2,.8,.2,1)',
        pop: 'cubic-bezier(.34,1.56,.64,1)'
      },
      spacing: {
        18: '4.5rem'
      },
      screens: {
        xs: '480px'
      }
    }
  },
  plugins: []
};
