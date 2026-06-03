import { useMutation } from "@tanstack/react-query";
import { getUploadImageUrl } from "@workspace/api-client-react";
import type { UploadResponse } from "@workspace/api-client-react/src/generated/api.schemas";

export function useImageUpload() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(getUploadImageUrl(), {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        let msg = "Failed to upload image";
        try { const body = await res.json(); msg = body?.error || body?.message || msg; } catch {}
        throw new Error(msg);
      }

      return res.json();
    },
  });
}
