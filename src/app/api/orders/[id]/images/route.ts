import { handleApi, ok, fail, requireUser } from "@/lib/api";
import { IMAGE_TYPES, STORAGE_BUCKETS } from "@/lib/constants";
import * as OrderService from "@/services/OrderService";
import * as StorageService from "@/services/StorageService";

/** Загрузка фото «до»/«после» к заказу (multipart: file, type=BEFORE|AFTER). */
export const POST = handleApi(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  const type = form.get("type") === IMAGE_TYPES.AFTER ? IMAGE_TYPES.AFTER : IMAGE_TYPES.BEFORE;
  if (!(file instanceof File)) return fail("Файл не передан");

  const url = await StorageService.uploadFile(STORAGE_BUCKETS.ORDER_IMAGES, session.id, file);
  await OrderService.addImage(session, id, url, type);
  return ok({ url, type }, "Фото загружено", { status: 201 });
});
