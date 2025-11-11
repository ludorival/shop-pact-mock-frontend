import { defineConfig } from "cypress";
import pactPlugin from 'pact-js-mock/lib/cypress/plugin';

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    setupNodeEvents(on, config) {
      return pactPlugin(on, config);
    },
  },
});
