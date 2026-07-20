import { handleApi, ok, fail, requireUser } from "@/lib/api";
import { STORAGE_BUCKETS } from "@/lib/constants";
import * as StorageService from "@/services/StorageService";

/** Загрузка аватара (kind=avatar) или документа мастера (kind=document). */
export const POST = handleApi(async (req: Request) => {
  const session = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof File)) return fail("Файл не передан");

  const bucket = kind === "document" ? STORAGE_BUCKETS.DOCUMENTS : STORAGE_BUCKETS.AVATARS;
  const url = await StorageService.uploadFile(bucket, session.id, file);
  return ok({ url }, "Файл загружен");
});
