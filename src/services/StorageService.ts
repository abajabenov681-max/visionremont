import "server-only";
import { ApiError } from "@/lib/api";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

type Bucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export async function uploadFile(bucket: Bucket, ownerId: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new ApiError("Файл больше 10 МБ");
  const allowed = bucket === STORAGE_BUCKETS.DOCUMENTS ? ALLOWED_DOC_TYPES : ALLOWED_IMAGE_TYPES;
  if (!allowed.includes(file.type)) throw new ApiError("Недопустимый формат файла");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const db = getAdminClient();
  const { error } = await db.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
  });
  if (error) throw new ApiError(`Ошибка загрузки: ${error.message}`, 500);

  if (bucket === STORAGE_BUCKETS.DOCUMENTS) {
    // приватный бакет — отдаём подписанную ссылку на год (для просмотра админом)
    const { data, error: signError } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signError || !data) throw new ApiError("Ошибка создания ссылки", 500);
    return data.signedUrl;
  }

  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
