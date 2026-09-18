/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Legacy utility aliases. Older screens still use Tailwind's indigo /
        // violet names; map them onto the Taskina identity so the product
        // remains visually coherent while components migrate to semantic tokens.
        indigo: {
          50: "hsl(var(--primary-light) / <alpha-value>)",
          100: "hsl(155 32% 88% / <alpha-value>)",
          200: "hsl(155 30% 78% / <alpha-value>)",
          300: "hsl(156 34% 64% / <alpha-value>)",
          400: "hsl(158 40% 45% / <alpha-value>)",
          500: "hsl(var(--primary) / <alpha-value>)",
          600: "hsl(var(--primary) / <alpha-value>)",
          700: "hsl(var(--primary-dark) / <alpha-value>)",
          800: "hsl(164 48% 17% / <alpha-value>)",
          900: "hsl(var(--sidebar-bg) / <alpha-value>)",
          950: "hsl(164 31% 8% / <alpha-value>)",
        },
        violet: {
          50: "hsl(var(--accent-light) / <alpha-value>)",
          100: "hsl(19 76% 89% / <alpha-value>)",
          200: "hsl(19 75% 80% / <alpha-value>)",
          300: "hsl(19 76% 69% / <alpha-value>)",
          400: "hsl(19 78% 60% / <alpha-value>)",
          500: "hsl(var(--accent) / <alpha-value>)",
          600: "hsl(var(--accent) / <alpha-value>)",
          700: "hsl(17 66% 44% / <alpha-value>)",
          800: "hsl(16 58% 34% / <alpha-value>)",
          900: "hsl(15 48% 25% / <alpha-value>)",
          950: "hsl(15 42% 15% / <alpha-value>)",
        },
        purple: {
          50: "hsl(var(--accent-light) / <alpha-value>)",
          100: "hsl(19 76% 89% / <alpha-value>)",
          200: "hsl(19 75% 80% / <alpha-value>)",
          300: "hsl(19 76% 69% / <alpha-value>)",
          400: "hsl(19 78% 60% / <alpha-value>)",
          500: "hsl(var(--accent) / <alpha-value>)",
          600: "hsl(var(--accent) / <alpha-value>)",
          700: "hsl(17 66% 44% / <alpha-value>)",
          800: "hsl(16 58% 34% / <alpha-value>)",
          900: "hsl(15 48% 25% / <alpha-value>)",
          950: "hsl(15 42% 15% / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
