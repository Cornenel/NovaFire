import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "obsidian",
      values: [
        { name: "obsidian", value: "#0a0a0a" },
        { name: "charcoal", value: "#111111" },
      ],
    },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
