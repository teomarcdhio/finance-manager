import { api } from '@/lib/api';

export const exportService = {
  downloadBackup: async () => {
    const response = await api.get('/export/backup', {
      responseType: 'blob',
    });
    
    // Create a link to download the blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from header if possible, or generate one
    // Note: checking headers might be tricky with some interceptors, so I'll just use a default timestamped name
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.setAttribute('download', `backup_${date}.zip`);
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
