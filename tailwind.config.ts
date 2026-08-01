import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: ["./src/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#f0fdf4",
                    100: "#dcfce7",
                    200: "#bbf7d0",
                    300: "#86efac",
                    400: "#4ade80",
                    500: "#22c55e",
                    600: "#16a34a",
                    700: "#15803d",
                    800: "#166534",
                    900: "#14532d",
                },
            },
            boxShadow: {
                soft: "0 20px 60px rgba(22, 163, 74, 0.12)",
            },
            backgroundImage: {
                "farm-radial": "radial-gradient(circle at top, rgba(34,197,94,0.16), transparent 45%), linear-gradient(180deg, rgba(240,253,244,1), rgba(255,255,255,1))",
            },
        },
    },
    plugins: [],
};

export default config;
