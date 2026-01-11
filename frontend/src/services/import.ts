import { api } from "@/lib/api";

export const importService = {
  async restoreBackup(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    // Using multipart/form-data, browser sets boundary automatically
    const response = await api.post("/import/restore", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return response.data;
  },
};
