import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/image-api": {
        target: "http://api2026.otobathanh.vn",
        changeOrigin: true,
        secure: false,
        rewrite: (path) =>
          path.replace(/^\/image-api/, "/api/ImageAPI"),
      },

      "/upload-api": {
        target: "http://api2026.otobathanh.vn",
        changeOrigin: true,
        secure: false,
        rewrite: (path) =>
          path.replace(
            /^\/upload-api/,
            "/api/ImageAPI/UploadFiles"
          ),
      },

      // API kho
      "/warehouse-api": {
        target: "http://local.otobathanh.vn",
        changeOrigin: true,
        secure: false,
        rewrite: (path) =>
          path.replace(/^\/warehouse-api/, "/api"),
      },
    },
  },
});