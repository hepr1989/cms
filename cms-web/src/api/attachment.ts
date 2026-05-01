import client from './client';
import type { AttachmentVO } from '@/types';

export const uploadFile = (
  file: File,
  refType?: string,
  refCode?: string,
  onProgress?: (percent: number) => void,
) => {
  const formData = new FormData();
  formData.append('file', file);
  if (refType) formData.append('refType', refType);
  if (refCode) formData.append('refCode', refCode);
  return client.post<AttachmentVO>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => {
          if (e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        }
      : undefined,
  });
};

export const getAttachment = (attachmentCode: string) =>
  client.get<AttachmentVO>(`/attachments/${attachmentCode}`);

export const deleteAttachment = (attachmentCode: string) =>
  client.delete(`/attachments/${attachmentCode}`);

export const getAttachmentsByRef = (refType: string, refCode: string) =>
  client.get<AttachmentVO[]>('/attachments/query', { params: { refType, refCode } });
