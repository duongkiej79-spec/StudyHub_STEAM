-- =====================================================================
-- StudyHub — Schema CSDL cốt lõi (PostgreSQL / Supabase)
-- Ứng với mục 7 & 8 của tài liệu đặc tả yêu cầu.
--
-- Nguyên tắc bảo mật:
--   * Mọi bảng đều bật RLS. Khách (anon) chỉ ĐỌC nội dung đã công khai.
--   * Chỉ quản trị viên (profiles.role = 'admin') được thêm/sửa/xóa.
--   * Học sinh KHÔNG đọc trực tiếp bảng questions/question_options
--     (để không lộ đáp án). Đề công khai lấy qua get_public_quiz(),
--     chấm điểm qua grade_quiz() — cả hai chạy phía CSDL.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Kiểu liệt kê ----------
create type public.document_type   as enum ('ly_thuyet', 'tom_tat', 'bai_tap', 'de_kiem_tra');
create type public.document_status as enum ('draft', 'pending', 'published', 'rejected', 'hidden');
create type public.user_role       as enum ('student', 'admin');
create type public.report_target   as enum ('document', 'question');
create type public.report_status   as enum ('open', 'resolved');

-- ---------- Người dùng ----------
-- auth.users do Supabase quản lý; profiles là bảng "users(id, role)" của đặc tả.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'student',
  display_name text,
  created_at   timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Tự tạo profile 'student' khi có tài khoản mới. Nâng quyền admin bằng tay:
--   update public.profiles set role = 'admin' where id = '<uuid>';
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 60))
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Phân loại: Khối → Môn → (Bộ sách) → Chương → Bài ----------
create table public.grades (
  id   smallint primary key check (id in (10, 11, 12)),
  name text not null,
  slug text not null unique
);

create table public.subjects (
  id         text primary key check (id ~ '^[a-z0-9-]+$'),
  name       text not null,
  sort_order int  not null default 0
);

create table public.textbook_series (
  id   text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null
);

create table public.chapters (
  id                 uuid primary key default gen_random_uuid(),
  grade_id           smallint not null references public.grades (id),
  subject_id         text     not null references public.subjects (id),
  textbook_series_id text              references public.textbook_series (id),
  title              text     not null check (char_length(title) between 2 and 200),
  sort_order         int      not null default 0
);
create index chapters_grade_subject_idx on public.chapters (grade_id, subject_id, sort_order);

create table public.lessons (
  id         uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 200),
  sort_order int  not null default 0
);
create index lessons_chapter_idx on public.lessons (chapter_id, sort_order);

-- ---------- Tài liệu ----------
create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null check (char_length(title) between 3 and 200),
  grade_id           smallint not null references public.grades (id),
  subject_id         text     not null references public.subjects (id),
  textbook_series_id text              references public.textbook_series (id),
  chapter_id         uuid              references public.chapters (id) on delete set null,
  lesson_id          uuid              references public.lessons (id) on delete set null,
  type               public.document_type not null,
  description        text not null default '' check (char_length(description) <= 2000),
  file_path          text unique,            -- khóa trong bucket 'documents'
  file_size          integer check (file_size is null or file_size > 0),
  page_count         integer check (page_count is null or page_count > 0),
  source             text not null check (char_length(source) >= 2),       -- bắt buộc ghi nguồn
  license_note       text not null check (char_length(license_note) >= 2), -- bắt buộc ghi quyền chia sẻ
  status             public.document_status not null default 'draft',
  review_note        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz,
  -- Không được công khai tài liệu chưa có tệp.
  constraint published_needs_file check (status <> 'published' or file_path is not null)
);
create index documents_listing_idx on public.documents (status, grade_id, subject_id);
create trigger documents_touch before update on public.documents
  for each row execute function public.touch_updated_at();

create table public.favorites (            -- [P1]
  user_id     uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, document_id)
);

-- ---------- Trắc nghiệm ----------
create table public.quizzes (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 3 and 200),
  description      text not null default '',
  grade_id         smallint not null references public.grades (id),
  subject_id       text     not null references public.subjects (id),
  chapter_id       uuid              references public.chapters (id) on delete set null,
  duration_minutes int check (duration_minutes is null or duration_minutes between 1 and 180),
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger quizzes_touch before update on public.quizzes
  for each row execute function public.touch_updated_at();

create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes (id) on delete cascade,
  text        text not null check (char_length(text) >= 2),
  explanation text not null default '',
  sort_order  int  not null default 0
);
create index questions_quiz_idx on public.questions (quiz_id, sort_order);

create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_text text not null check (char_length(option_text) >= 1),
  is_correct  boolean not null default false,
  sort_order  int not null default 0
);
-- Giai đoạn đầu: mỗi câu có đúng MỘT phương án đúng (tối đa 1 ở CSDL, tối thiểu 1 kiểm ở ứng dụng).
create unique index question_options_one_correct on public.question_options (question_id) where is_correct;

create table public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,  -- null = khách
  quiz_id       uuid not null references public.quizzes (id) on delete cascade,
  correct_count int  not null,
  total         int  not null,
  score         numeric(4, 2) not null check (score between 0 and 10),
  submitted_at  timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, submitted_at desc);

create table public.attempt_answers (       -- [P1] chỉ lưu khi có tài khoản
  attempt_id  uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  option_id   uuid references public.question_options (id) on delete set null,
  is_correct  boolean not null,
  primary key (attempt_id, question_id)
);

-- ---------- Báo lỗi ----------
create table public.reports (               -- [P1]
  id          uuid primary key default gen_random_uuid(),
  target_type public.report_target not null,
  target_id   uuid not null,
  message     text not null check (char_length(message) between 5 and 1000),
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.grades           enable row level security;
alter table public.subjects         enable row level security;
alter table public.textbook_series  enable row level security;
alter table public.chapters         enable row level security;
alter table public.lessons          enable row level security;
alter table public.documents        enable row level security;
alter table public.favorites        enable row level security;
alter table public.quizzes          enable row level security;
alter table public.questions        enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_attempts    enable row level security;
alter table public.attempt_answers  enable row level security;
alter table public.reports          enable row level security;

-- Hồ sơ: tự xem hồ sơ của mình; admin xem tất cả.
-- Người dùng chỉ được sửa display_name của chính mình — KHÔNG sửa được cột role (không tự nâng quyền).
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Danh mục: ai cũng đọc, chỉ admin ghi.
create policy grades_read   on public.grades          for select using (true);
create policy subjects_read on public.subjects        for select using (true);
create policy series_read   on public.textbook_series for select using (true);
create policy chapters_read on public.chapters        for select using (true);
create policy lessons_read  on public.lessons         for select using (true);
create policy grades_admin   on public.grades          for all using (public.is_admin()) with check (public.is_admin());
create policy subjects_admin on public.subjects        for all using (public.is_admin()) with check (public.is_admin());
create policy series_admin   on public.textbook_series for all using (public.is_admin()) with check (public.is_admin());
create policy chapters_admin on public.chapters        for all using (public.is_admin()) with check (public.is_admin());
create policy lessons_admin  on public.lessons         for all using (public.is_admin()) with check (public.is_admin());

-- Tài liệu: khách chỉ thấy 'published'.
create policy documents_public_read on public.documents for select using (status = 'published' or public.is_admin());
create policy documents_admin       on public.documents for all using (public.is_admin()) with check (public.is_admin());

create policy favorites_own on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Đề: khách thấy thông tin đề đã xuất bản; câu hỏi/đáp án chỉ admin đọc trực tiếp.
create policy quizzes_public_read on public.quizzes for select using (is_published or public.is_admin());
create policy quizzes_admin       on public.quizzes for all using (public.is_admin()) with check (public.is_admin());
create policy questions_admin     on public.questions        for all using (public.is_admin()) with check (public.is_admin());
create policy options_admin       on public.question_options for all using (public.is_admin()) with check (public.is_admin());

-- Kết quả luyện tập là riêng tư: chỉ chủ tài khoản (hoặc admin) xem. Ghi qua grade_quiz().
create policy attempts_own_read on public.quiz_attempts   for select using (user_id = auth.uid() or public.is_admin());
create policy answers_own_read  on public.attempt_answers for select using (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin()))
);

-- Báo lỗi: ai cũng gửi được (trạng thái mặc định 'open'); chỉ admin xem & xử lý.
create policy reports_insert on public.reports for insert with check (status = 'open' and resolved_at is null);
create policy reports_admin  on public.reports for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Hàm cho luồng làm bài (chạy với quyền owner, tự kiểm tra điều kiện)
-- =====================================================================

-- Số câu của mỗi đề đã xuất bản (để hiển thị danh sách).
create or replace function public.quiz_question_counts()
returns table (quiz_id uuid, question_count bigint)
language sql stable security definer set search_path = public
as $$
  select q.quiz_id, count(*)
  from public.questions q
  join public.quizzes z on z.id = q.quiz_id
  where z.is_published or public.is_admin()
  group by q.quiz_id;
$$;

-- Đề công khai: KHÔNG có is_correct và explanation.
create or replace function public.get_public_quiz(p_quiz_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', z.id,
    'title', z.title,
    'description', z.description,
    'gradeId', z.grade_id,
    'subjectId', z.subject_id,
    'chapterId', z.chapter_id,
    'durationMinutes', z.duration_minutes,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'text', q.text,
        'order', q.sort_order,
        'options', (
          select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.option_text) order by o.sort_order)
          from public.question_options o where o.question_id = q.id
        )
      ) order by q.sort_order)
      from public.questions q where q.quiz_id = z.id
    ), '[]'::jsonb)
  )
  from public.quizzes z
  where z.id = p_quiz_id and z.is_published;
$$;

-- Chấm điểm + ghi lượt làm bài. p_answers: {"<question_id>": "<option_id>", ...}
-- Trả về đúng hình dạng QuizResult trong src/lib/types.ts.
create or replace function public.grade_quiz(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_total     int;
  v_correct   int;
  v_score     numeric(4, 2);
  v_attempt   uuid;
  v_questions jsonb;
begin
  if not exists (select 1 from public.quizzes where id = p_quiz_id and is_published) then
    return null;
  end if;

  create temporary table _graded on commit drop as
  select
    q.id, q.text, q.explanation, q.sort_order,
    c.id as correct_id,
    s.id as selected_id,
    (s.id is not null and s.id = c.id) as is_correct
  from public.questions q
  left join public.question_options c on c.question_id = q.id and c.is_correct
  -- Chỉ nhận phương án thuộc đúng câu hỏi đó (so sánh dạng text để không lỗi khi dữ liệu bẩn).
  left join public.question_options s on s.question_id = q.id and s.id::text = (p_answers ->> q.id::text)
  where q.quiz_id = p_quiz_id;

  select count(*), count(*) filter (where is_correct) into v_total, v_correct from _graded;
  v_score := case when v_total = 0 then 0 else round(v_correct * 10.0 / v_total, 2) end;

  insert into public.quiz_attempts (user_id, quiz_id, correct_count, total, score)
  values (auth.uid(), p_quiz_id, v_correct, v_total, v_score)
  returning id into v_attempt;

  if auth.uid() is not null then
    insert into public.attempt_answers (attempt_id, question_id, option_id, is_correct)
    select v_attempt, id, selected_id, is_correct from _graded;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'questionId', g.id,
    'text', g.text,
    'selectedOptionId', g.selected_id,
    'correctOptionId', g.correct_id,
    'isCorrect', g.is_correct,
    'explanation', g.explanation,
    'options', (
      select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.option_text) order by o.sort_order)
      from public.question_options o where o.question_id = g.id
    )
  ) order by g.sort_order), '[]'::jsonb)
  into v_questions
  from _graded g;

  return jsonb_build_object(
    'quizId', p_quiz_id,
    'correctCount', v_correct,
    'total', v_total,
    'score', v_score,
    'questions', v_questions
  );
end;
$$;

-- [P1] Xem lại một lượt làm bài của CHÍNH MÌNH (kèm đáp án đúng và lời giải).
-- Học sinh không đọc trực tiếp được bảng questions, nên cần hàm security definer
-- tự kiểm tra quyền sở hữu (a.user_id = auth.uid()).
create or replace function public.get_attempt_result(p_attempt_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'quizId', a.quiz_id,
    'correctCount', a.correct_count,
    'total', a.total,
    'score', a.score,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'questionId', q.id,
        'text', q.text,
        'selectedOptionId', aa.option_id,
        'correctOptionId', (select o.id from public.question_options o where o.question_id = q.id and o.is_correct limit 1),
        'isCorrect', coalesce(aa.is_correct, false),
        'explanation', q.explanation,
        'options', (
          select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.option_text) order by o.sort_order)
          from public.question_options o where o.question_id = q.id
        )
      ) order by q.sort_order)
      from public.questions q
      left join public.attempt_answers aa on aa.question_id = q.id and aa.attempt_id = a.id
      where q.quiz_id = a.quiz_id
    ), '[]'::jsonb)
  )
  from public.quiz_attempts a
  where a.id = p_attempt_id and a.user_id = auth.uid();
$$;

-- [admin] Lưu câu hỏi + toàn bộ phương án trong MỘT giao dịch.
-- security invoker: RLS vẫn áp dụng, nên chỉ admin ghi được.
create or replace function public.admin_save_question(
  p_quiz_id uuid, p_question_id uuid, p_text text, p_explanation text, p_order int, p_options jsonb
)
returns uuid
language plpgsql volatile security invoker set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Không có quyền' using errcode = '42501';
  end if;
  if (select count(*) from jsonb_array_elements(p_options) o where (o ->> 'isCorrect')::boolean) <> 1 then
    raise exception 'Mỗi câu phải có đúng một phương án đúng' using errcode = '23514';
  end if;

  if p_question_id is null then
    insert into public.questions (quiz_id, text, explanation, sort_order)
    values (p_quiz_id, p_text, p_explanation, p_order)
    returning id into v_id;
  else
    update public.questions
       set text = p_text, explanation = p_explanation, sort_order = p_order
     where id = p_question_id and quiz_id = p_quiz_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Không tìm thấy câu hỏi' using errcode = 'P0002';
    end if;
    delete from public.question_options where question_id = v_id;
  end if;

  insert into public.question_options (question_id, option_text, is_correct, sort_order)
  select v_id, o ->> 'text', (o ->> 'isCorrect')::boolean, (t.ord - 1)::int
  from jsonb_array_elements(p_options) with ordinality as t (o, ord);

  return v_id;
end;
$$;

grant execute on function public.admin_save_question(uuid, uuid, text, text, int, jsonb) to authenticated;
grant execute on function public.get_public_quiz(uuid)        to anon, authenticated;
grant execute on function public.grade_quiz(uuid, jsonb)      to anon, authenticated;
grant execute on function public.quiz_question_counts()       to anon, authenticated;
grant execute on function public.get_attempt_result(uuid)     to authenticated;

-- =====================================================================
-- Kho tệp: bucket riêng tư 'documents'
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Đọc tệp: admin, hoặc tệp thuộc một tài liệu đã công khai.
create policy documents_files_read on storage.objects for select using (
  bucket_id = 'documents' and (
    public.is_admin()
    or exists (select 1 from public.documents d where d.file_path = storage.objects.name and d.status = 'published')
  )
);
create policy documents_files_admin_write on storage.objects for insert with check (bucket_id = 'documents' and public.is_admin());
create policy documents_files_admin_update on storage.objects for update using (bucket_id = 'documents' and public.is_admin());
create policy documents_files_admin_delete on storage.objects for delete using (bucket_id = 'documents' and public.is_admin());
