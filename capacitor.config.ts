import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fr.nereis.inspecteur",
  appName: "Inspecteur NEREIS-7",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
