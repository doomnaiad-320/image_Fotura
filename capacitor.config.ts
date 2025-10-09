import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aigc.studio",
  appName: "AIGC Studio",
  webDir: "dist-cap",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https"
  }
};

export default config;
