import { defineConfig } from "cypress";
import pactPlugin from "pact-js-mock/lib/cypress/plugin";

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: {
        define: {
          "import.meta.env.VITE_API_URL": JSON.stringify("/order-service/v1"),
        },
      },
    },
    setupNodeEvents(on, config) {
      return pactPlugin(on, config, {
        consumerName: "shop-frontend",
        pactVersion: "3.0.0",
        outputDir: "./pacts",
      });
    },
  },
});
