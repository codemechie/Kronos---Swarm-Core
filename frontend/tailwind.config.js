/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        "2xs": "0.6875rem",
      },
      borderRadius: {
        card: "0.5rem",
        button: "0.375rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)",
        "card-hover":
          "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
        button: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        "button-hover":
          "0 2px 4px 0 rgba(0, 0, 0, 0.4), 0 1px 3px -1px rgba(0, 0, 0, 0.3)",
      },
      borderWidth: {
        card: "1px",
      },
      borderColor: {
        card: "#374151",
      },
    },
  },
  plugins: [],
};
