# StudyHub

Website thư viện tài liệu và luyện trắc nghiệm cho học sinh THPT (lớp 10, 11, 12). Dự án STEAM.
Bản này cài đặt toàn bộ phạm vi **P0** và **P1** của tài liệu đặc tả: thư viện, tìm kiếm, xem/tải PDF, trắc nghiệm, quản trị và duyệt nội dung (P0); tài khoản học sinh, yêu thích, lịch sử làm bài, tiến độ học tập và báo lỗi (P1).

## Chạy thử trong 1 phút

```bash
npm install
cp .env.example .env.local   # sau đó đặt ADMIN_PASSWORD và SESSION_SECRET
npm run dev
```

Mở http://localhost:3000. Khu quản trị nằm ở http://localhost:3000/admin, đăng nhập bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env.local`.

Ở chế độ mặc định (`DATA_BACKEND=local`), dữ liệu nằm trong `.data/db.json` và được tự tạo từ dữ liệu mẫu ở lần chạy đầu. Tệp PDF nằm trong `storage/`. Chế độ này không cần tài khoản dịch vụ nào.

| Lệnh | Việc làm |
| --- | --- |
| `npm run dev` | Chạy môi trường phát triển |
| `npm run build && npm start` | Build và chạy bản production |
| `npm test` | 30 test: chấm điểm, tìm kiếm không dấu, tiến độ, dữ liệu mẫu, và **chạy thật schema SQL + RLS** trên PostgreSQL (PGlite, không cần Docker) |
| `npm run typecheck` / `npm run lint` | Kiểm tra kiểu và lint |
| `npm run db:reset-local` | Xóa dữ liệu cục bộ để nạp lại dữ liệu mẫu |
| `npm run samples:pdf` | Sinh lại các PDF mẫu trong `storage/samples/` (cần font Arial và Segoe UI Symbol, có sẵn trên Windows) |
| `npm run db:seed-sql` | Sinh `supabase/seed.sql` từ dữ liệu mẫu |

## Kiến trúc: đi từ dữ liệu lên giao diện

```
supabase/migrations/0001_schema.sql  ← 1. Schema CSDL + RLS (nguồn sự thật)
src/lib/types.ts                     ← 2. Kiểu dữ liệu miền, khớp 1-1 với các bảng
src/lib/repo/types.ts                ← 3. Interface Repository (hợp đồng truy cập dữ liệu)
   ├─ repo/local.ts                  ←    cài đặt bằng tệp JSON (dev/demo)
   └─ repo/supabase.ts               ←    cài đặt bằng Supabase (triển khai)
src/lib/services/, search.ts, grading.ts, validation.ts  ← 4. Nghiệp vụ thuần, có unit test
src/lib/auth/, storage.ts, proxy.ts  ← 5. Phân quyền và lưu trữ tệp
src/app/(site)/…                     ← 6. Giao diện học sinh
src/app/admin/…                      ← 7. Giao diện quản trị (mọi action đều gọi requireAdmin())
```

Trang và action chỉ làm việc qua `getRepo()`. Muốn đổi kho dữ liệu thì chỉ cần đổi biến `DATA_BACKEND`, không phải sửa giao diện.

## Đối chiếu với đặc tả

| Mã | Chức năng | Vị trí |
| --- | --- | --- |
| F01 | Phân loại Khối → Môn → (Bộ sách) → Chương → Bài | `/thu-vien/[lop]/[mon]`, `/admin/phan-loai` |
| F02 | Tìm kiếm có/không dấu, gợi ý khi gõ | `lib/search.ts`, `/api/goi-y`, `components/search-box.tsx` |
| F03 | Lọc theo lớp, môn, loại, bộ sách; sắp xếp mới nhất/phù hợp | `/tim-kiem` |
| F04 | Trang chi tiết: nguồn, loại, số trang, ngày cập nhật, trạng thái | `/tai-lieu/[id]` |
| F05 | Xem PDF bằng PDF.js, tải không cần đăng nhập | `components/pdf-viewer.tsx`, `/api/tai-lieu/[id]/tep` |
| F06 | Bộ đề theo lớp/môn/chủ đề, mỗi câu 1 đáp án đúng | `/luyen-tap` |
| F07 | Làm bài, xác nhận nộp, chấm điểm phía server, giải thích từng câu | `/luyen-tap/[id]`, `components/quiz-player.tsx` |
| F08 | Thêm/sửa/ẩn tài liệu, tải tệp, gắn phân loại và nguồn | `/admin/tai-lieu` |
| F09 | Thêm/sửa câu hỏi: 4 phương án, đáp án đúng, lời giải | `/admin/de-thi/[id]` |
| F10 | Quy trình duyệt Nháp → Chờ duyệt → Công khai / Từ chối / Ẩn | `lib/services/documents.ts` |
| F11 (P1) | Tài khoản học sinh: đăng ký, đăng nhập, yêu thích, lịch sử, tiến độ | `/dang-ky`, `/dang-nhap`, `/tai-khoan`, `/tai-khoan/lich-su/[id]` |
| F12 (P1) | Báo tài liệu/câu hỏi lỗi, quản trị xử lý | `components/report-form.tsx`, `/admin/bao-loi` |

Chưa làm (P2): gợi ý cá nhân hóa, thống kê nâng cao, AI tóm tắt và tạo câu hỏi.

### Tài khoản học sinh (P1)

- **Không bắt buộc.** Khách vẫn đọc, tải tài liệu và làm bài như cũ. Đăng nhập chỉ để lưu thêm dữ liệu.
- **Thu thập tối thiểu**: email, tên hiển thị (biệt danh là đủ), mật khẩu. Ở chế độ local, mật khẩu được băm bằng scrypt; ở chế độ Supabase thì Supabase Auth quản lý.
- `/tai-khoan` có 3 phần: tiến độ theo môn (điểm cao nhất trung bình mỗi đề, số lượt, lượt trong 7 ngày), lịch sử làm bài (có nút "Xem lại" đáp án và lời giải), và tài liệu yêu thích.
- Chỉ chủ tài khoản xem được kết quả của mình. Đoán được id lượt làm bài của người khác vẫn nhận 404 (đã có test SQL cho điều này).
- Ở chế độ Supabase, nếu project bật **xác nhận email**, học sinh phải bấm link trong email trước khi đăng nhập. Với buổi demo có thể tắt tùy chọn này trong Authentication → Providers → Email.

## Bảo mật (yêu cầu phi chức năng)

- **Đáp án không bao giờ xuống trình duyệt trước khi nộp bài.** Đề gửi cho học sinh không có `isCorrect` và lời giải. Bài được chấm phía server (local: `lib/grading.ts`; Supabase: hàm SQL `grade_quiz`).
- Chỉ quản trị viên được ghi dữ liệu. `proxy.ts` chặn sớm, còn `requireAdmin()` kiểm tra lại trong từng trang và server action. Với Supabase, RLS là lớp chặn cuối cùng.
- Tệp tải lên phải đúng định dạng PDF, tối đa 10 MB, và không chứa `/JavaScript`, `/Launch` hay tệp nhúng. Tệp được phục vụ với `application/pdf` và `nosniff`. Tài liệu chưa duyệt không thể tải nếu chưa đăng nhập quản trị.
- Học sinh không cần đăng nhập. Kết quả luyện tập chỉ hiện trên máy người làm. Lượt làm bài của khách được lưu ẩn danh.
- Đăng nhập quản trị có giới hạn: sai 5 lần sẽ bị khóa 5 phút. Cookie phiên được ký HMAC, `httpOnly`. Không có khóa dịch vụ nào trong mã nguồn.

## Chuyển sang Supabase (khi triển khai)

1. Tạo project Supabase. Mở SQL Editor, chạy `supabase/migrations/0001_schema.sql`, rồi chạy `supabase/seed.sql`.
2. Trong Storage → bucket `documents` (migration đã tạo sẵn), tải các tệp trong `storage/samples/` lên thư mục `samples/`, giữ nguyên tên tệp.
3. Tạo tài khoản quản trị trong Authentication → Users, rồi chạy:
   `update public.profiles set role = 'admin' where id = '<uuid người dùng>';`
4. Trong `.env.local` (hoặc trên Vercel), đặt `DATA_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

**Mức độ đã kiểm chứng:** schema, RLS, trigger và mọi hàm SQL (`get_public_quiz`, `grade_quiz`, `get_attempt_result`, `admin_save_question`, policy storage) **đã chạy thật** trên PostgreSQL trong `tests/sql.test.mts`, với lớp giả lập `auth`/`storage`/role giống Supabase. Phần **chưa** chạy với Supabase thật là lớp kết nối `repo/supabase.ts`, đăng nhập Supabase Auth và tải tệp lên Storage. Sau khi tạo project, nhóm nên đi lại trọn luồng một lượt.

Chế độ `local` ghi dữ liệu ra ổ đĩa, nên **không dùng được trên Vercel** (hệ thống tệp chỉ đọc). Bản deploy cần dùng Supabase.

> `npm test` dùng cờ `--liftoff-only` vì trình biên dịch WASM tối ưu của Node có thể hết bộ nhớ khi nạp PGlite trên máy ít RAM trống.

## Nội dung mẫu

Bản demo có 17 tài liệu (16 tài liệu có PDF, 15 công khai, 1 chờ duyệt, 1 nháp) và 6 đề với 29 câu hỏi có lời giải. Toàn bộ do nhóm tự biên soạn để minh họa.

Đã rà soát: mọi phép tính và đáp số trong PDF mẫu và đề trắc nghiệm đều đã được kiểm tra lại bằng máy. Mỗi câu có đúng 1 đáp án đúng (có test). Tên chương Toán, Lý, Hóa khớp mục lục bộ Kết nối tri thức.

Nhờ giáo viên bộ môn xem lại trước buổi demo:
- Cách diễn đạt các khái niệm trong tài liệu Ngữ văn (thần thoại, nghị luận xã hội) và Tiếng Anh.
- Tên chương Ngữ văn 10 "Sức hấp dẫn của truyện kể": cần đối chiếu với sách đang dùng.
- "Viết: Nghị luận xã hội" (Ngữ văn 12) là nhãn nhóm tự đặt, không phải tên chương trong sách, nên không gắn bộ sách.
