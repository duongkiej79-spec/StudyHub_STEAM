/**
 * Chạy THẬT supabase/migrations/0001_schema.sql + supabase/seed.sql trên PostgreSQL
 * (PGlite — Postgres biên dịch sang WASM, chạy trong Node, không cần Docker),
 * với một lớp giả lập tối thiểu những gì Supabase cung cấp sẵn:
 *   - role anon / authenticated, quyền mặc định trên schema public;
 *   - auth.users, auth.uid() (đọc từ request.jwt.claim.sub như Supabase);
 *   - storage.buckets, storage.objects.
 * Mục tiêu: chứng minh RLS và các hàm SQL hoạt động đúng như thiết kế.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { buildSeedQuizzes, seedId } from "../src/lib/seed-data.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
`;

const ADMIN = "00000000-0000-4000-8000-00000000000a";
const STUDENT_A = "00000000-0000-4000-8000-0000000000a1";
const STUDENT_B = "00000000-0000-4000-8000-0000000000b1";

let db: PGlite;

/** Chạy câu lệnh dưới vai trò của một người dùng (null = khách anon). */
async function as<T = Record<string, unknown>>(user: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ""}', false); set role ${user ? "authenticated" : "anon"};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

async function rejects(user: string | null, sql: string, params: unknown[] = []) {
  await assert.rejects(() => as(user, sql, params));
}

before(async () => {
  db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
  await db.exec(await readFile(path.join(ROOT, "supabase/migrations/0001_schema.sql"), "utf8"));
  await db.exec(await readFile(path.join(ROOT, "supabase/seed.sql"), "utf8"));
  // Tạo tài khoản (trigger tự sinh profile), rồi nâng 1 tài khoản thành admin như README hướng dẫn.
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@x.vn', '{}'),
      ('${STUDENT_A}', 'a@x.vn', '{"display_name":"Minh Anh"}'),
      ('${STUDENT_B}', 'b@x.vn', '{}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
    insert into storage.objects (bucket_id, name) values ('documents', 'samples/toan12-nguyen-ham-cong-thuc.pdf'), ('documents', 'samples/ly12-cau-truc-chat.pdf');
  `);
});

after(async () => {
  await db?.close();
});

const { quizzes, questions } = buildSeedQuizzes();
const publishedQuiz = quizzes.find((q) => q.isPublished)!;
const draftQuiz = quizzes.find((q) => !q.isPublished)!;
const qsOf = (quizId: string) => questions.filter((q) => q.quizId === quizId);
const allCorrect = (quizId: string) => Object.fromEntries(qsOf(quizId).map((q) => [q.id, q.options.find((o) => o.isCorrect)!.id]));

describe("Schema & dữ liệu mẫu", () => {
  test("migration + seed chạy được, trigger tạo profile kèm tên hiển thị", async () => {
    const [{ n }] = (await db.query<{ n: number }>("select count(*)::int n from public.documents")).rows;
    assert.equal(n, 17);
    const [p] = (await db.query<{ display_name: string; role: string }>(`select display_name, role from public.profiles where id = '${STUDENT_A}'`)).rows;
    assert.deepEqual(p, { display_name: "Minh Anh", role: "student" });
  });

  test("ràng buộc: tối đa 1 đáp án đúng mỗi câu", async () => {
    const q = qsOf(publishedQuiz.id)[0];
    await assert.rejects(() => db.query(`update public.question_options set is_correct = true where question_id = $1`, [q.id]));
  });

  test("ràng buộc: không công khai tài liệu chưa có tệp", async () => {
    await assert.rejects(() => db.query(`update public.documents set status = 'published' where file_path is null`));
  });
});

describe("RLS — khách (anon)", () => {
  test("chỉ thấy tài liệu đã công khai", async () => {
    const rows = await as<{ status: string }>(null, "select status from public.documents");
    assert.equal(rows.length, 15);
    assert.ok(rows.every((r) => r.status === "published"));
  });

  test("không đọc trực tiếp được câu hỏi và đáp án", async () => {
    assert.equal((await as(null, "select * from public.questions")).length, 0);
    assert.equal((await as(null, "select * from public.question_options")).length, 0);
  });

  test("get_public_quiz không lộ đáp án/lời giải; đề nháp trả null", async () => {
    const [{ q }] = await as<{ q: Record<string, unknown> }>(null, "select public.get_public_quiz($1) q", [publishedQuiz.id]);
    const text = JSON.stringify(q);
    assert.ok(!text.includes("isCorrect") && !text.includes("is_correct") && !text.includes("explanation"));
    assert.equal((q.questions as unknown[]).length, qsOf(publishedQuiz.id).length);
    const [{ q: draft }] = await as<{ q: unknown }>(null, "select public.get_public_quiz($1) q", [draftQuiz.id]);
    assert.equal(draft, null);
  });

  test("grade_quiz chấm đúng, lưu lượt ẩn danh, không lưu lựa chọn", async () => {
    const [{ r }] = await as<{ r: { score: string | number; correctCount: number; total: number } }>(
      null,
      "select public.grade_quiz($1, $2::jsonb) r",
      [publishedQuiz.id, JSON.stringify(allCorrect(publishedQuiz.id))],
    );
    assert.equal(Number(r.score), 10);
    assert.equal(r.correctCount, r.total);
    const [{ n }] = (await db.query<{ n: number }>("select count(*)::int n from public.attempt_answers")).rows;
    assert.equal(n, 0);
  });

  test("grade_quiz bỏ qua phương án của câu khác và dữ liệu rác", async () => {
    const qs = qsOf(publishedQuiz.id);
    const answers = { [qs[0].id]: qs[1].options.find((o) => o.isCorrect)!.id, [qs[1].id]: "không-phải-uuid" };
    const [{ r }] = await as<{ r: { correctCount: number } }>(null, "select public.grade_quiz($1, $2::jsonb) r", [publishedQuiz.id, JSON.stringify(answers)]);
    assert.equal(r.correctCount, 0);
  });

  test("grade_quiz với đề nháp trả null", async () => {
    const [{ r }] = await as<{ r: unknown }>(null, "select public.grade_quiz($1, '{}'::jsonb) r", [draftQuiz.id]);
    assert.equal(r, null);
  });

  test("không ghi được tài liệu; gửi được báo lỗi nhưng không đọc lại được", async () => {
    await rejects(null, "insert into public.documents (title, grade_id, subject_id, type, source, license_note) values ('Hack', 10, 'toan', 'ly_thuyet', 'x', 'x')");
    await as(null, "insert into public.reports (target_type, target_id, message) values ('document', $1, 'Tệp bị lỗi trang 2')", [seedId("doc:toan12-nguyen-ham-cong-thuc")]);
    assert.equal((await as(null, "select * from public.reports")).length, 0);
  });

  test("storage: chỉ đọc được tệp của tài liệu đã công khai", async () => {
    const rows = await as<{ name: string }>(null, "select name from storage.objects");
    assert.deepEqual(rows.map((r) => r.name), ["samples/toan12-nguyen-ham-cong-thuc.pdf"]);
  });
});

describe("RLS — học sinh (authenticated)", () => {
  test("làm bài: lưu lựa chọn; chỉ chủ tài khoản xem lại được", async () => {
    const [{ r }] = await as<{ r: { score: number } }>(STUDENT_A, "select public.grade_quiz($1, $2::jsonb) r", [publishedQuiz.id, JSON.stringify(allCorrect(publishedQuiz.id))]);
    assert.equal(Number(r.score), 10);
    const mine = await as<{ id: string }>(STUDENT_A, "select id from public.quiz_attempts");
    assert.equal(mine.length, 1, "chỉ thấy lượt của mình, không thấy lượt ẩn danh");
    const [{ res }] = await as<{ res: { questions: { isCorrect: boolean; explanation: string }[] } }>(STUDENT_A, "select public.get_attempt_result($1) res", [mine[0].id]);
    assert.ok(res.questions.every((q) => q.isCorrect && q.explanation.length > 0));
    // Học sinh khác đoán được id cũng không xem được.
    assert.equal((await as(STUDENT_B, "select id from public.quiz_attempts")).length, 0);
    const [{ res: other }] = await as<{ res: unknown }>(STUDENT_B, "select public.get_attempt_result($1) res", [mine[0].id]);
    assert.equal(other, null);
  });

  test("yêu thích: chỉ thêm/đọc được của chính mình", async () => {
    const doc = seedId("doc:toan12-nguyen-ham-cong-thuc");
    await as(STUDENT_A, "insert into public.favorites (user_id, document_id) values ($1, $2)", [STUDENT_A, doc]);
    await rejects(STUDENT_A, "insert into public.favorites (user_id, document_id) values ($1, $2)", [STUDENT_B, doc]);
    assert.equal((await as(STUDENT_B, "select * from public.favorites")).length, 0);
    const rows = await as<{ documents: { title: string } }>(STUDENT_A, "select to_jsonb(d) documents from public.favorites f join public.documents d on d.id = f.document_id");
    assert.equal(rows.length, 1);
  });

  test("không tự nâng quyền admin; sửa được tên hiển thị", async () => {
    await rejects(STUDENT_A, "update public.profiles set role = 'admin' where id = $1", [STUDENT_A]);
    await as(STUDENT_A, "update public.profiles set display_name = 'Anh' where id = $1", [STUDENT_A]);
    const [p] = (await db.query<{ role: string; display_name: string }>(`select role, display_name from public.profiles where id = '${STUDENT_A}'`)).rows;
    assert.deepEqual(p, { role: "student", display_name: "Anh" });
  });

  test("học sinh không gọi được hàm quản trị", async () => {
    await rejects(STUDENT_A, "select public.admin_save_question($1, null, 'Hack?', '', 99, $2::jsonb)", [
      publishedQuiz.id,
      JSON.stringify([{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }]),
    ]);
  });
});

describe("RLS — quản trị viên", () => {
  test("thấy mọi tài liệu và câu hỏi", async () => {
    assert.equal((await as(ADMIN, "select id from public.documents")).length, 17);
    assert.ok((await as(ADMIN, "select id from public.question_options")).length > 0);
    assert.equal((await as(ADMIN, "select id from public.reports")).length, 1);
  });

  test("admin_save_question: thêm, sửa nguyên tử, chặn 2 đáp án đúng", async () => {
    const opts = [
      { text: "11", isCorrect: true },
      { text: "3", isCorrect: false },
      { text: "10", isCorrect: false },
      { text: "14", isCorrect: false },
    ];
    const [{ id }] = await as<{ id: string }>(ADMIN, "select public.admin_save_question($1, null, 'NaOH 0,001 M có pH?', 'pOH = 3', 3, $2::jsonb) id", [draftQuiz.id, JSON.stringify(opts)]);
    const saved = await as<{ option_text: string; is_correct: boolean }>(ADMIN, "select option_text, is_correct from public.question_options where question_id = $1 order by sort_order", [id]);
    assert.deepEqual(saved.map((o) => o.option_text), ["11", "3", "10", "14"]);

    const bad = opts.map((o) => ({ ...o, isCorrect: true }));
    await rejects(ADMIN, "select public.admin_save_question($1, $2, 'x', '', 3, $3::jsonb)", [draftQuiz.id, id, JSON.stringify(bad)]);
    // Giao dịch lỗi không làm mất phương án cũ.
    assert.equal((await as(ADMIN, "select id from public.question_options where question_id = $1", [id])).length, 4);
  });

  test("duyệt tài liệu: chuyển 'pending' sang 'published' thì khách thấy ngay", async () => {
    const id = seedId("doc:ly12-cau-truc-chat");
    await as(ADMIN, "update public.documents set status = 'published', published_at = now() where id = $1", [id]);
    assert.equal((await as(null, "select id from public.documents")).length, 16);
    assert.equal((await as(null, "select name from storage.objects")).length, 2);
  });
});
