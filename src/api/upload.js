import http from "http";
import https from "https";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  // CORS cho FE
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept"
  );

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const soChungTu = String(
    req.query.soChungTu || ""
  ).trim();

  if (!soChungTu) {
    return res.status(400).json({
      success: false,
      message: "Thiếu soChungTu",
    });
  }

  const targetUrl =
    `http://api2026.otobathanh.vn/api/ImageAPI/UploadFiles` +
    `?soChungTu=${encodeURIComponent(soChungTu)}`;

  const target = new URL(targetUrl);

  const lib =
    target.protocol === "https:"
      ? https
      : http;

  const headers = {
    "content-type":
      req.headers["content-type"] || "",
    "content-length":
      req.headers["content-length"] || undefined,
    accept:
      req.headers["accept"] || "application/json",
  };

  const proxyReq = lib.request(
    target,
    {
      method: "POST",
      headers,
    },
    (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 500;

      res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
      );

      res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
      );

      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept"
      );

      if (proxyRes.headers["content-type"]) {
        res.setHeader(
          "Content-Type",
          proxyRes.headers["content-type"]
        );
      }

      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    console.error("PROXY UPLOAD ERROR:", error);

    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: "Không kết nối được API tổng",
        error: error.message,
      });
    }
  });

  // Quan trọng:
  // Không parse FormData ở proxy.
  // Chuyển nguyên multipart body sang API tổng.
  req.pipe(proxyReq);
}