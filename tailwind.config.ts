import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        muted: "#667085",
        line: "#d9e2ec",
        surface: "#f7f9fc",
        brand: {
          50: "#eef8f5",
          100: "#d6efe7",
          500: "#159274",
          600: "#0f755e",
          700: "#0b5d4c"
        },
        amberflow: "#d18b24",
        danger: "#d94b4b"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 33, 43, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
