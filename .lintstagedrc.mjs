export default {
  "*.{ts,tsx}": [
    "eslint --max-warnings=20"
  ],
  "**/*.{ts,tsx}": () => "tsc --noEmit"
};
