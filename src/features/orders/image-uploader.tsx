"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, FetchError } from "@/lib/fetcher";
import type { ImageType } from "@/lib/constants";

export function ImageUploader({
  orderId,
  type,
  label,
}: {
  orderId: string;
  type: ImageType;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      await apiFetch(`/api/orders/${orderId}/images`, { method: "POST", body: form });
      toast.success("Фото загружено");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (err) {
      toast.error(err instanceof FetchError ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {label}
      </Button>
    </>
  );
}
