// Xóa kho dữ liệu cục bộ (.data/db.json) và tệp đã tải lên (storage/uploads).
// Lần chạy tiếp theo ứng dụng sẽ tự tạo lại dữ liệu mẫu.
import { rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
await rm(path.join(root, ".data"), { recursive: true, force: true });
await rm(path.join(root, "storage", "uploads"), { recursive: true, force: true });
console.log("Đã xóa .data/ và storage/uploads/. Khởi động lại `npm run dev` để nạp dữ liệu mẫu.");
