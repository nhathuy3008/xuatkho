import React, { useEffect, useRef, useState } from "react";

import { createRoot } from "react-dom/client";

import { Html5Qrcode } from "html5-qrcode";

import jsQR from "jsqr";

import {

  Camera,

  ImagePlus,

  Upload,

  Trash2,

  X,

  RefreshCw,

  AlertCircle,

  Search,

} from "lucide-react";

import "./styles.css";

const WAREHOUSE_API_BASE = "https://local.otobathanh.vn/api";

const WAREHOUSE_API_KEY =
  import.meta.env.VITE_WAREHOUSE_API_KEY ||
  "26831d77cec7f4b2403e8990574ec122d532d8533624b65d";

/* =========================================================

   CONFIG

\========================================================= */

const buildPartsDocKey = (

  quoteCode

) => {

  const code = String(

    quoteCode || ""

  )

    .trim()

    .toUpperCase()

    .replace(/^HPT\//, "");

  if (!code) {

    return "";

  }

  return `hpt/${code}`;

};
const compressImageIfNeeded = async (file) => {
  const MAX_SIZE = 2000;
  const TARGET_SIZE = 1.5 * 1024 * 1024;

  if (!file?.type?.startsWith("image/")) {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = imageUrl;
    });

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > MAX_SIZE || height > MAX_SIZE) {
      const scale = Math.min(
        MAX_SIZE / width,
        MAX_SIZE / height
      );

      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return file;
    }

    ctx.drawImage(image, 0, 0, width, height);

    let quality = 0.85;
    let blob = null;

    for (let i = 0; i < 6; i++) {
      blob = await new Promise((resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          quality
        );
      });

      if (!blob) {
        return file;
      }

      if (blob.size <= TARGET_SIZE) {
        break;
      }

      quality -= 0.1;
    }

    if (!blob) {
      return file;
    }

    return new File(
      [blob],
      `${file.name.replace(/\.[^/.]+$/, "")}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};
const uploadDocumentFile = async (soChungTu, file, onProgress) => {
  const uploadFile = await compressImageIfNeeded(file);

  const formData = new FormData();

  formData.append("file", uploadFile, uploadFile.name);

  return new Promise((resolve, reject) => {

    const xhr = new XMLHttpRequest();

    // QUAN TRỌNG:

    // Không gọi api2026 trực tiếp nữa

    const url =

      `/upload-api?soChungTu=${encodeURIComponent(

        soChungTu

      )}`;

    console.log("UPLOAD URL:", url);

    xhr.open("POST", url, true);

    xhr.setRequestHeader(

      "Accept",

      "application/json"

    );

    xhr.upload.onprogress = (event) => {

      if (

        event.lengthComputable &&

        onProgress

      ) {

        onProgress(

          Math.round(

            (event.loaded / event.total) * 100

          )

        );

      }

    };

    xhr.onload = () => {

      console.log(

        "UPLOAD STATUS:",

        xhr.status

      );

      console.log(

        "UPLOAD RESPONSE:",

        xhr.responseText

      );

      if (

        xhr.status >= 200 &&

        xhr.status < 300

      ) {

        resolve(xhr.responseText);

      } else {

        reject(

          new Error(

            `Upload lỗi ${xhr.status}: ${xhr.responseText}`

          )

        );

      }

    };

    xhr.onerror = () => {

      reject(

        new Error(

          "Không kết nối được proxy upload"

        )

      );

    };

    xhr.send(formData);

  });

};

const extractQrInfo = (

  raw

) => {

  const value =

    String(raw || "").trim();

  if (!value) {

    return {

      raw: "",

      khoa: "",

    };

  }

  try {

    const url =

      new URL(value);

    return {

      raw: value,

      khoa:

        url.searchParams.get(

          "khoa"

        ) ||

        url.searchParams.get(

          "key"

        ) ||

        url.searchParams.get(

          "maBaoGia"

        ) ||

        "",

    };

  } catch {

    return {

      raw: value,

      khoa: value,

    };

  }

};

/* =========================================================

   APP

\========================================================= */

function App() {

  const scannerRef =

    useRef(null);

  const scannerRunningRef =

    useRef(false);

  const qrFileInputRef =

    useRef(null);

  const [scannerOpen, setScannerOpen] =

    useState(false);

  const [imageScanOpen, setImageScanOpen] =

    useState(false);

  const [quoteCode, setQuoteCode] =

    useState("");

  const [manualCode, setManualCode] =

    useState("");

  const [rawQr, setRawQr] =

    useState("");

  const [error, setError] =

    useState("");

  /* =====================================================

     IMAGES

  ===================================================== */

  const [

    selectedImages,

    setSelectedImages,

  ] = useState([]);

const [

    uploadingImages,

    setUploadingImages,

  ] = useState(false);

const [

    uploadProgress,

    setUploadProgress,

  ] = useState(0);

  const [

    uploadMessage,

    setUploadMessage,

  ] = useState("");

  const partScannerRef = useRef(null);
  const partQrFileInputRef = useRef(null);
  const partScannerRunningRef = useRef(false);
  const [partScannerOpen, setPartScannerOpen] = useState(false);
  const [partCode, setPartCode] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [exportingPart, setExportingPart] = useState(false);
  const [partMessage, setPartMessage] = useState("");

/* =====================================================

     CLOSE CAMERA

  ===================================================== */

  const closeScanner =

    async () => {

      try {

        if (

          scannerRef.current &&

          scannerRunningRef.current

        ) {

          await scannerRef.current.stop();

          scannerRunningRef.current =

            false;

        }

      } catch {}

      try {

        if (

          scannerRef.current

        ) {

          await scannerRef.current.clear();

        }

      } catch {}

      scannerRef.current =

        null;

      setScannerOpen(false);

    };

  /* =====================================================

     LOAD FILES

  ===================================================== */

const processQr =

    async (decodedText) => {

      const info =

        extractQrInfo(

          decodedText

        );

      if (!info.khoa) {

        setError(

          "QR không có mã khoa."

        );

        return;

      }

      const code =

        info.khoa

          .trim()

          .toUpperCase();

      setRawQr(info.raw);

      setQuoteCode(code);

      setManualCode(code);

      setError("");

      setUploadMessage("");

      await closeScanner();

};

  /* =====================================================

     CAMERA

  ===================================================== */

  const openScanner =

    async () => {

      setError("");

      setScannerOpen(true);

      setTimeout(

        async () => {

          try {

            if (

              scannerRef.current

            ) {

              return;

            }

            const scanner =

              new Html5Qrcode(

                "qr-reader"

              );

            scannerRef.current =

              scanner;

            await scanner.start(

              {

                facingMode:

                  "environment",

              },

              {

                fps: 10,

                qrbox: {

                  width: 250,

                  height: 250,

                },

              },

              async (

                decodedText

              ) => {

                if (

                  !scannerRunningRef.current

                ) {

                  return;

                }

                await processQr(

                  decodedText

                );

              },

              () => {}

            );

            scannerRunningRef.current =

              true;

          } catch (e) {

            console.error(

              e

            );

            scannerRef.current =

              null;

            setScannerOpen(

              false

            );

            setError(

              `Không mở được camera: ${

                e.message || ""

              }`

            );

          }

        },

        200

      );

    };

  /* =====================================================

     QR FROM IMAGE

  ===================================================== */

  const scanImageFile =

    async (file) => {

      if (!file) {

        return;

      }

      setError("");

      setImageScanOpen(true);

      let imageUrl = null;

      try {

        imageUrl =

          URL.createObjectURL(

            file

          );

        const image =

          new Image();

        await new Promise(

          (

            resolve,

            reject

          ) => {

            image.onload =

              resolve;

            image.onerror =

              reject;

            image.src =

              imageUrl;

          }

        );

        const width =

          image.naturalWidth;

        const height =

          image.naturalHeight;

        const canvas =

          document.createElement(

            "canvas"

          );

        const maxSize = 2000;

        let targetWidth =

          width;

        let targetHeight =

          height;

        if (

          width > maxSize ||

          height > maxSize

        ) {

          const scale =

            Math.min(

              maxSize /

                width,

              maxSize /

                height

            );

          targetWidth =

            Math.round(

              width * scale

            );

          targetHeight =

            Math.round(

              height * scale

            );

        }

        canvas.width =

          targetWidth;

        canvas.height =

          targetHeight;

        const ctx =

          canvas.getContext(

            "2d",

            {

              willReadFrequently:

                true,

            }

          );

        ctx.drawImage(

          image,

          0,

          0,

          targetWidth,

          targetHeight

        );

        const imageData =

          ctx.getImageData(

            0,

            0,

            targetWidth,

            targetHeight

          );

        const result =

          jsQR(

            imageData.data,

            imageData.width,

            imageData.height,

            {

              inversionAttempts:

                "attemptBoth",

            }

          );

        let decodedText =

          result?.data || "";

        if (!decodedText) {

          const fallback =

            new Html5Qrcode(

              "image-qr-reader"

            );

          try {

            decodedText =

              await fallback.scanFile(

                file,

                true

              );

          } finally {

            try {

              await fallback.clear();

            } catch {}

          }

        }

        if (!decodedText) {

          throw new Error(

            "Không tìm thấy QR."

          );

        }

        setImageScanOpen(

          false

        );

        await processQr(

          decodedText

        );

      } catch (e) {

        console.error(

          "QR IMAGE ERROR:",

          e

        );

        setImageScanOpen(

          false

        );

        setError(

          "Không đọc được QR trong ảnh."

        );

      } finally {

        if (imageUrl) {

          URL.revokeObjectURL(

            imageUrl

          );

        }

      }

    };

  const handleQrImage =

    async (e) => {

      const file =

        e.target.files?.[0];

      e.target.value = "";

      if (file) {

        await scanImageFile(

          file

        );

      }

    };

  /* =====================================================
     QUÉT + XUẤT PHỤ TÙNG
  ===================================================== */

  const closePartScanner = async () => {
    try {
      if (partScannerRef.current && partScannerRunningRef.current) {
        await partScannerRef.current.stop();
      }
    } catch {}
    try {
      if (partScannerRef.current) await partScannerRef.current.clear();
    } catch {}
    partScannerRunningRef.current = false;
    partScannerRef.current = null;
    setPartScannerOpen(false);
  };

  const processPartQr = async (decodedText) => {
    const code = String(decodedText || "").trim();
    if (!code) return;
    setPartCode(code);
    setPartMessage("");
    await closePartScanner();
  };

  const openPartScanner = async () => {
    if (!quoteCode) {
      setPartMessage("Chưa có mã TT.");
      return;
    }
    setPartMessage("");
    setPartScannerOpen(true);
    setTimeout(async () => {
      try {
        if (partScannerRef.current) return;
        const scanner = new Html5Qrcode("part-qr-reader");
        partScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (!partScannerRunningRef.current) return;
            await processPartQr(decodedText);
          },
          () => {}
        );
        partScannerRunningRef.current = true;
      } catch (e) {
        console.error("PART QR ERROR:", e);
        partScannerRunningRef.current = false;
        partScannerRef.current = null;
        setPartScannerOpen(false);
        setPartMessage(`Không mở được camera: ${e.message || ""}`);
      }
    }, 200);
  };

  const scanPartImageFile = async (file) => {
    if (!file) return;

    setPartMessage("");

    let imageUrl = null;

    try {
      imageUrl = URL.createObjectURL(file);
      const image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageUrl;
      });

      const maxSize = 2000;
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      const imageData = ctx.getImageData(
        0,
        0,
        targetWidth,
        targetHeight
      );

      let decodedText = "";
      const result = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        { inversionAttempts: "attemptBoth" }
      );

      decodedText = result?.data || "";

      if (!decodedText) {
        const fallback = new Html5Qrcode("part-image-qr-reader");
        try {
          decodedText = await fallback.scanFile(file, true);
        } finally {
          try {
            await fallback.clear();
          } catch {}
        }
      }

      if (!decodedText) {
        throw new Error("Không tìm thấy QR mã phụ tùng trong ảnh.");
      }

      await processPartQr(decodedText);
    } catch (e) {
      console.error("PART QR IMAGE ERROR:", e);
      setPartMessage(
        e.message || "Không đọc được QR mã phụ tùng trong ảnh."
      );
    } finally {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    }
  };

  const handlePartQrImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (file) {
      await scanPartImageFile(file);
    }
  };

  const exportPartToTT = async () => {
    const code = String(partCode || "").trim();
    const quantity = Number(partQuantity);

    if (!quoteCode) return setPartMessage("Chưa có mã TT.");
    if (!code) return setPartMessage("Chưa có mã hàng.");
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return setPartMessage("Số lượng không hợp lệ.");
    }

    setExportingPart(true);
    setPartMessage("");

    try {
      const hangHoaResponse = await fetch(
  `${WAREHOUSE_API_BASE}/hanghoa/${encodeURIComponent(code)}`,
  {
    headers: {
      Accept: "application/json",
    },
  }
);
      const hangHoaText = await hangHoaResponse.text();
      let hangHoa = null;
      try { hangHoa = hangHoaText ? JSON.parse(hangHoaText) : null; } catch {
        throw new Error(hangHoaText || "Dữ liệu hàng hóa không hợp lệ.");
      }
      if (!hangHoaResponse.ok) {
        throw new Error(hangHoa?.message || hangHoa?.detail || `Không tìm thấy hàng hóa (${hangHoaResponse.status})`);
      }
      const data = hangHoa?.data || hangHoa;
      const khoaHangHoa = data?.khoa || data?.Khoa || data?.khoaHangHoa || data?.KhoaHangHoa;
      if (!khoaHangHoa) throw new Error(`Không lấy được khóa hàng hóa của mã ${code}.`);

      const exportResponse = await fetch(`${WAREHOUSE_API_BASE}/xe/xuat-kho`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": WAREHOUSE_API_KEY,
        },
        body: JSON.stringify({
          khoaBaoGia: quoteCode,
          lines: [{ khoaHangHoa, soLuong: quantity }],
          dryRun: false,
        }),
      });
      const exportText = await exportResponse.text();
      let result = null;
      try { result = exportText ? JSON.parse(exportText) : null; } catch {}
      if (!exportResponse.ok) {
        throw new Error(result?.message || result?.detail || result?.error || exportText || `Xuất kho lỗi ${exportResponse.status}`);
      }
      setPartMessage(`Đã xuất ${quantity} ${code} vào TT ${quoteCode}.`);
      setPartCode("");
      setPartQuantity(1);
    } catch (e) {
      console.error("EXPORT PART ERROR:", e);
      setPartMessage(`Xuất kho thất bại: ${e.message || "Lỗi không xác định"}`);
    } finally {
      setExportingPart(false);
    }
  };

  /* =====================================================

     MANUAL CODE

  ===================================================== */

  const searchManual =

    async (e) => {

      e.preventDefault();

      const code =

        manualCode

          .trim()

          .toUpperCase();

      if (!code) {

        return;

      }

      setQuoteCode(code);

      setRawQr("");

      setError("");

};

  /* =====================================================

     SELECT IMAGES

  ===================================================== */

  const handleImages =

    (e) => {

      const files =

        Array.from(

          e.target.files || []

        ).filter(

          (file) =>

            file.type.startsWith(

              "image/"

            )

        );

      if (!files.length) {

        return;

      }

      setSelectedImages(

        (old) => [

          ...old,

          ...files,

        ]

      );

      setUploadMessage("");

      setUploadProgress(0);

      e.target.value = "";

    };

  const removeImage =

    (index) => {

      setSelectedImages(

        (old) =>

          old.filter(

            (_, i) =>

              i !== index

          )

      );

    };

  const clearImages =

    () => {

      setSelectedImages([]);

      setUploadProgress(0);

      setUploadMessage("");

    };

  /* =====================================================

     UPLOAD

  ===================================================== */

  const uploadImages =

    async () => {

      if (!quoteCode) {

        setUploadMessage(

          "Chưa có mã TT."

        );

        return;

      }

      if (

        !selectedImages.length

      ) {

        setUploadMessage(

          "Chưa chọn ảnh."

        );

        return;

      }

      const soChungTu =

        buildPartsDocKey(

          quoteCode

        );

      setUploadingImages(

        true

      );

      setUploadMessage("");

      setUploadProgress(0);

      try {

        for (

          let i = 0;

          i < selectedImages.length;

          i++

        ) {

          const file =

            selectedImages[i];

          await uploadDocumentFile(

            soChungTu,

            file,

            (progress) => {

              const totalProgress =

                (

                  i +

                  progress

                ) /

                selectedImages.length;

              setUploadProgress(

                Math.round(

                  totalProgress *

                    100

                )

              );

            }

          );

        }

        setUploadMessage(

          `Upload thành công ${selectedImages.length} ảnh.`

        );

        setSelectedImages([]);

} catch (e) {

        console.error(

          "Upload error:",

          e

        );

        setUploadMessage(

          `Upload thất bại: ${

            e.message

          }`

        );

      } finally {

        setUploadingImages(

          false

        );

      }

    };

  /* =====================================================

     DELETE

  ===================================================== */

  const reset =

    () => {

      setQuoteCode("");

      setManualCode("");

      setRawQr("");

      setError("");

      setSelectedImages([]);

setUploadMessage("");

      setUploadProgress(0);
      setPartCode("");
      setPartQuantity(1);
      setPartMessage("");

    };

  /* =====================================================

     UI

  ===================================================== */


  useEffect(() => {
    return () => {
      try {
        if (partScannerRef.current && partScannerRunningRef.current) {
          partScannerRef.current.stop();
        }
      } catch {}
    };
  }, []);
  return (

    <div className="app">

      <header className="topbar">

        <div className="brand">

          <div className="brand-icon">

            <Camera size={24} />

          </div>

          <div>

            <strong>

              Ô TÔ BÁ THÀNH

            </strong>

            <span>

              Quản lý ảnh phụ tùng

            </span>

          </div>

        </div>

      </header>

      <main className="container">

        <section className="hero">

          <div>

            <span className="eyebrow">

              QUẢN LÝ ẢNH

            </span>

            <h1>

              Quét QR để upload ảnh

            </h1>

            <p>

              Quét mã QR hoặc nhập

              mã TT để quản lý ảnh

              phụ tùng.

            </p>

          </div>

          <button

            className="primary-btn"

            onClick={openScanner}

          >

            <Camera size={21} />

            Quét mã QR

          </button>

        </section>

        <form

          className="manual"

          onSubmit={searchManual}

        >

          <div className="manual-input">

            <Search size={19} />

            <input

              value={manualCode}

              onChange={(e) =>

                setManualCode(

                  e.target.value

                )

              }

              placeholder="Nhập mã TT..."

            />

          </div>

          <button type="submit">

            Tra cứu

          </button>

        </form>

        <div className="qr-extra-actions">

          <button

            type="button"

            className="secondary-btn"

            onClick={() =>

              qrFileInputRef.current?.click()

            }

          >

            <ImagePlus size={18} />

            Quét QR từ ảnh

          </button>

          <input

            ref={qrFileInputRef}

            type="file"

            accept="image/*"

            hidden

            onChange={

              handleQrImage

            }

          />

        </div>

        {error && (

          <div className="error-box">

            <AlertCircle size={19} />

            <span>

              {error}

            </span>

          </div>

        )}

        {quoteCode && (

          <section className="result">

            <div className="result-head">

              <div>

                <span className="eyebrow">

                  MÃ CHỨNG TỪ

                </span>

                <h2>

                  {quoteCode}

                </h2>

              </div>

              <button

                className="reset-btn"

                onClick={reset}

              >

                <X size={17} />

                Xóa

              </button>

            </div>

            <div className="section-card">

              <div className="section-title">
                <Search size={20} />
                <div>
                  <h3>Xuất phụ tùng</h3>
                  <span>TT: {quoteCode}</span>
                </div>
              </div>

              <div className="image-upload-actions">
                <button type="button" className="secondary-btn" onClick={openPartScanner} disabled={exportingPart}>
                  <Camera size={18} />
                  Quét mã hàng
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => partQrFileInputRef.current?.click()}
                  disabled={exportingPart}
                >
                  <ImagePlus size={18} />
                  Chọn ảnh QR
                </button>

                <input
                  ref={partQrFileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePartQrImage}
                />
              </div>

              <div className="manual-input" style={{ marginTop: 12 }}>
                <Search size={19} />
                <input value={partCode} onChange={(e) => setPartCode(e.target.value)} placeholder="Nhập mã hàng..." />
              </div>

              <div className="manual-input" style={{ marginTop: 10 }}>
                <input type="number" min="1" value={partQuantity} onChange={(e) => setPartQuantity(e.target.value)} placeholder="Số lượng" />
              </div>

              <button type="button" className="primary-btn upload-btn" style={{ marginTop: 12 }} onClick={exportPartToTT} disabled={exportingPart || !partCode.trim()}>
                {exportingPart ? (
                  <>
                    <RefreshCw className="spin" size={18} />
                    Đang xuất...
                  </>
                ) : "XUẤT PHỤ TÙNG VÀO TT"}
              </button>

              {partMessage && (
                <div className={partMessage.startsWith("Đã xuất") ? "success-box" : "error-box"} style={{ marginTop: 12 }}>
                  <AlertCircle size={18} />
                  <span>{partMessage}</span>
                </div>
              )}
            </div>

            <div className="section-card">

              <div className="section-title">

                <ImagePlus

                  size={20}

                />

                <div>

                  <h3>

                    Ảnh phụ tùng

                  </h3>

                  <span>

                    Chứng từ:{" "}

                    {buildPartsDocKey(

                      quoteCode

                    )}

                  </span>

                </div>

              </div>

              <div className="image-upload-actions">

                <label className="secondary-btn upload-label">

                  <Camera size={18} />

                  Chụp ảnh

                  <input

                    type="file"

                    accept="image/*"

                    capture="environment"

                    multiple

                    hidden

                    onChange={

                      handleImages

                    }

                  />

                </label>

                <label className="secondary-btn upload-label">

                  <ImagePlus

                    size={18}

                  />

                  Chọn ảnh

                  <input

                    type="file"

                    accept="image/*"

                    multiple

                    hidden

                    onChange={

                      handleImages

                    }

                  />

                </label>

                {selectedImages.length >

                  0 && (

                  <button

                    type="button"

                    className="danger-btn"

                    onClick={

                      clearImages

                    }

                  >

                    <Trash2

                      size={17}

                    />

                    Xóa ảnh chọn

                  </button>

                )}

              </div>

              {selectedImages.length >

                0 && (

                <>

                  <div className="image-preview-grid">

                    {selectedImages.map(

                      (

                        file,

                        index

                      ) => (

                        <div

                          className="image-preview"

                          key={`${file.name}-${index}`}

                        >

                          <img

                            src={URL.createObjectURL(

                              file

                            )}

                            alt={

                              file.name

                            }

                          />

                          <button

                            type="button"

                            onClick={() =>

                              removeImage(

                                index

                              )

                            }

                          >

                            <X size={16} />

                          </button>

                          <span>

                            {

                              file.name

                            }

                          </span>

                        </div>

                      )

                    )}

                  </div>

                  {uploadingImages && (

                    <div className="upload-progress">

                      <div

                        className="upload-progress-bar"

                        style={{

                          width:

                            `${uploadProgress}%`,

                        }}

                      />

                      <span>

                        {uploadProgress}%

                      </span>

                    </div>

                  )}

                  <button

                    type="button"

                    className="primary-btn upload-btn"

                    onClick={

                      uploadImages

                    }

                    disabled={

                      uploadingImages

                    }

                  >

                    {uploadingImages ? (

                      <>

                        <RefreshCw

                          className="spin"

                          size={18}

                        />

                        Đang upload...

                      </>

                    ) : (

                      <>

                        <Upload

                          size={18}

                        />

                        Upload{" "}

                        {

                          selectedImages.length

                        }{" "}

                        ảnh

                      </>

                    )}

                  </button>

                </>

              )}

              {uploadMessage && (

                <div

                  className={

                    uploadMessage.includes(

                      "thành công"

                    )

                      ? "success-box"

                      : "error-box"

                  }

                >

                  <AlertCircle

                    size={18}

                  />

                  <span>

                    {

                      uploadMessage

                    }

                  </span>

                </div>

              )}

            </div>

            {rawQr && (

              <details className="debug">

                <summary>

                  QR gốc

                </summary>

                <code>

                  {rawQr}

                </code>

              </details>

            )}

          </section>

        )}

      </main>

      {scannerOpen && (

        <div

          className="modal-backdrop"

          onClick={

            closeScanner

          }

        >

          <div

            className="scanner-modal"

            onClick={(e) =>

              e.stopPropagation()

            }

          >

            <div className="modal-head">

              <div>

                <strong>

                  Quét mã QR

                </strong>

                <span>

                  Đưa mã QR vào khung

                </span>

              </div>

              <button

                onClick={

                  closeScanner

                }

              >

                <X size={21} />

              </button>

            </div>

            <div

              id="qr-reader"

              className="qr-reader"

            />

          </div>

        </div>

      )}

      {partScannerOpen && (
        <div className="modal-backdrop" onClick={closePartScanner}>
          <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <strong>Quét mã phụ tùng</strong>
                <span>TT: {quoteCode}</span>
              </div>
              <button type="button" onClick={closePartScanner}>
                <X size={21} />
              </button>
            </div>
            <div id="part-qr-reader" className="qr-reader" />
            <div id="part-image-qr-reader" style={{ display: "none" }} />
          </div>
        </div>
      )}

      {imageScanOpen && (

        <div className="modal-backdrop">

          <div className="scanner-modal">

            <div className="modal-head">

              <div>

                <strong>

                  Đang đọc QR

                </strong>

                <span>

                  Đang phân tích ảnh...

                </span>

              </div>

            </div>

            <div

              id="image-qr-reader"

              className="qr-reader"

            />

            <div className="scanner-tip">

              <RefreshCw

                className="spin"

                size={17}

              />

              Đang đọc QR...

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

createRoot(

  document.getElementById(

    "root"

  )

).render(

  <React.StrictMode>

    <App />

  </React.StrictMode>

);