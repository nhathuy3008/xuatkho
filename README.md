# QR Xe Demo - Ô Tô Bá Thành

## 1. Cài đặt

```bash
npm install
npm run dev
```

Mở URL Vite hiện ra, thường là:

http://localhost:5173

## 2. API

Mặc định frontend dùng:

http://local.otobathanh.vn

Các API:

- GET /api/xe/:bienSo
- GET /api/xe/:bienSo/baogia-gan-nhat
- GET /api/baogia/:maBaoGia

QR test:

https://zalo.me/s/2371521952655417765/?p=bao-gia&khoa=TT0000000004892

Khi quét QR này, app lấy `khoa=TT0000000004892` và gọi:

GET /api/baogia/TT0000000004892

## 3. API key

Để demo nhanh, API key đang có fallback trong `src/main.jsx`.

Production không nên để API key trong React frontend. Nên tạo proxy ở backend:

React -> backend proxy -> local.otobathanh.vn

## 4. Nếu domain local không truy cập được

Tạo file `.env`:

```env
VITE_API_BASE_URL=http://local.otobathanh.vn
VITE_API_KEY=YOUR_KEY
```

Sau đó restart:

```bash
npm run dev
```

## 5. Luồng

Quét QR
-> đọc URL
-> lấy query `khoa`
-> gọi API báo giá
-> tìm biển số trong response
-> gọi API xe
-> gọi API báo giá gần nhất
-> hiển thị kết quả.
