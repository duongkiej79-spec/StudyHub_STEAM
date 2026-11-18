import "server-only";
import { cache } from "react";
import { getBackend } from "../config";
import { localRepo } from "./local";
import { supabaseRepo } from "./supabase";
import type { Repository } from "./types";

export function getRepo(): Repository {
  return getBackend() === "supabase" ? supabaseRepo : localRepo;
}

/** Danh mục dùng ở nhiều component trong một request — chỉ tải một lần. */
export const getCatalog = cache(() => getRepo().getCatalog());

export type { Repository, PublicQuiz, DocumentPatch } from "./types";
