/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm có/không dấu (F02).
 * "Công thức Nguyên hàm" -> "cong thuc nguyen ham"
 */
export function normalizeVi(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  const n = normalizeVi(input);
  return n ? n.split(" ") : [];
}

export function slugify(input: string): string {
  return normalizeVi(input).replace(/ /g, "-");
}
