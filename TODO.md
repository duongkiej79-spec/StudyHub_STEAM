# StudyHub — Việc cần làm

Cập nhật: 18/11/2026. Đánh dấu `[x]` khi xong. Chi tiết kỹ thuật xem [README.md](README.md).

**Trạng thái code:** đã có đủ P0 và P1. Có 30 test (`npm test`), typecheck, lint và build đều qua.

## 1. Làm ngay

- [ ] Commit code vào git (hiện mới có commit khởi tạo của Next.js)
- [ ] Đẩy code lên GitHub và mời các thành viên vào repo
- [ ] Chạy `npm install` sau khi chép dự án sang máy hoặc thư mục khác

## 2. Nhóm chốt (mục 13 của đặc tả)

- [ ] Danh mục môn chính thức, và bộ sách nào cần phân biệt
- [ ] Quy tắc đặt tên, ghi nguồn, và ai duyệt từng tài liệu
- [ ] Số đề và số câu tối thiểu cho bản demo; cách tính điểm (code đang tính đúng 1 điểm, sai 0 điểm, quy về thang 10)
- [ ] Phân công vai trò: UI/UX, Frontend, Backend, Nội dung/QA
- [ ] Hạn nộp STEAM thực tế và nơi triển khai bản demo

## 3. Kết nối Supabase để deploy

- [ ] Tạo project Supabase
- [ ] Mở SQL Editor, chạy `supabase/migrations/0001_schema.sql`, sau đó chạy `supabase/seed.sql`
- [ ] Tải các file trong `storage/samples/` lên bucket `documents`, đặt vào thư mục `samples/`, giữ nguyên tên file
- [ ] Tạo tài khoản admin trong Authentication → Users, rồi chạy:
      `update public.profiles set role = 'admin' where id = '<uuid>';`
- [ ] Quyết định bật hay tắt xác nhận email cho học sinh (nên tắt cho buổi demo)
- [ ] Đặt `DATA_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- [ ] Đi lại trọn luồng một lượt: đăng nhập admin → upload PDF → duyệt → học sinh đăng ký → làm bài → xem lịch sử
- [ ] Deploy lên Vercel, tách hai môi trường thử nghiệm và chính thức

## 4. Nội dung

- [ ] Nhờ giáo viên đọc lại phần Ngữ văn (thần thoại, nghị luận xã hội) và Tiếng Anh
- [ ] Đối chiếu tên chương Ngữ văn 10 "Sức hấp dẫn của truyện kể" với sách nhóm đang dùng
- [ ] Bổ sung tài liệu thật, mục tiêu khoảng 150 (3 khối × 5 môn × 10 tài liệu); không bắt buộc cho demo
- [ ] Chuẩn bị ít nhất 1 chương hoàn chỉnh cho demo: có lý thuyết, PDF, bài tập và đề có lời giải
- [ ] Kiểm tra mọi tài liệu đều ghi nguồn và có quyền chia sẻ

## 5. Chuẩn bị demo

- [ ] Thử trên điện thoại thật, cả Android và iPhone
- [ ] Tập kịch bản demo khoảng 3 phút theo mục 11 của đặc tả
- [ ] Đổi mật khẩu admin và `SESSION_SECRET` trong `.env.local` trước khi demo công khai

## 6. Mở rộng sau (P2, không cần cho demo)

- [ ] Gợi ý nội dung cá nhân hóa
- [ ] Thống kê học tập nâng cao
- [ ] AI tóm tắt tài liệu và tạo câu hỏi, có người duyệt
- [ ] Cho học sinh tự xóa tài khoản ở chế độ Supabase
- [ ] Lưu giới hạn số lần đăng nhập sai ra Redis hoặc CSDL (hiện lưu trong bộ nhớ server, khởi động lại là mất)
