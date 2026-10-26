import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { certificateExtension } from './processing-certificate';

export const DIARY_IMAGE_LIMIT = 2 * 1024 * 1024;
export const DIARY_VOICE_LIMIT = 2 * 1024 * 1024;
export const DIARY_UPLOAD_LIMIT = 3500 * 1024;
export const DIARY_IMAGE_COUNT = 12;
export class DiaryMediaError extends Error {}
export type PreparedDiaryFile = { id: string; kind: 'IMAGE' | 'VOICE'; mimeType: string; fileName: string; fileSize: number; bytes: Buffer };
export const diaryMediaUrl = (id: string) => `/api/farming-logs/media/${id}`;
export function mediaType(bytes: Buffer, kind: 'IMAGE' | 'VOICE'): string | null {
  if (kind === 'IMAGE') {
    const extension = certificateExtension(bytes);
    return extension ? ({ jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp' } as Record<string,string>)[extension] || null : null;
  }
  if (bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))) return 'audio/webm';
  if (bytes.toString('ascii',0,4) === 'OggS') return 'audio/ogg';
  if (bytes.toString('ascii',4,8) === 'ftyp') return 'audio/mp4';
  if (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WAVE') return 'audio/wav';
  return null;
}
export function prepareDiaryBytes(bytes: Buffer, kind: 'IMAGE' | 'VOICE', name: string): PreparedDiaryFile {
  const limit = kind === 'IMAGE' ? DIARY_IMAGE_LIMIT : DIARY_VOICE_LIMIT;
  if (!bytes.length || bytes.length > limit) throw new DiaryMediaError(`${kind === 'IMAGE' ? 'Ảnh' : 'Ghi âm'} tối đa 2 MB mỗi file.`);
  const mimeType = mediaType(bytes, kind);
  if (!mimeType) throw new DiaryMediaError(kind === 'IMAGE' ? 'Chỉ nhận ảnh JPG, PNG hoặc WebP hợp lệ.' : 'Ghi âm phải là WebM, MP4/M4A, Ogg hoặc WAV hợp lệ.');
  return { id:randomUUID(),kind,mimeType,fileName:name.replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(-160) || 'attachment',fileSize:bytes.length,bytes };
}
export async function prepareDiaryFiles(images: File[], voice?: File | null) {
  if (images.length > DIARY_IMAGE_COUNT) throw new DiaryMediaError('Tối đa 12 ảnh cho một nhật ký.');
  if (images.reduce((sum,f) => sum + f.size,0) + (voice?.size || 0) > DIARY_UPLOAD_LIMIT) throw new DiaryMediaError('Tổng file tải lên tối đa 3,5 MB. Hãy giảm số ảnh hoặc thời lượng ghi âm.');
  return Promise.all([...images.map(async file => prepareDiaryBytes(Buffer.from(await file.arrayBuffer()),'IMAGE',file.name)), ...(voice ? [(async () => prepareDiaryBytes(Buffer.from(await voice.arrayBuffer()),'VOICE',voice.name))()] : [])]);
}

/** File bytes and links commit together with the log: no temporary/orphan uploads. */
export async function saveDiaryMedia(tx: Prisma.TransactionClient, options: {
  logId: string; uploaderId: string; existingImages: string[]; existingVoice: string | null;
  retainedImages?: unknown; retainedVoice?: unknown; files: PreparedDiaryFile[];
}) {
  const { logId,uploaderId,existingImages,existingVoice,files } = options;
  const retained = options.retainedImages === undefined ? existingImages : options.retainedImages;
  if (!Array.isArray(retained) || retained.some(url => typeof url !== 'string' || !existingImages.includes(url))) throw new DiaryMediaError('Ảnh giữ lại phải thuộc nhật ký đang sửa.');
  const images: string[] = [];
  const retainedIds: string[] = [];
  const write = async (file: PreparedDiaryFile) => { await tx.farmingLogMedia.create({ data:{...file,logId,uploaderId} }); retainedIds.push(file.id); return diaryMediaUrl(file.id); };
  for (const url of retained as string[]) {
    if (url.startsWith('data:')) {
      const match = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(url);
      if (!match) throw new DiaryMediaError('Ảnh cũ không hợp lệ; hãy xóa ảnh này hoặc tải lại file gốc.');
      images.push(await write(prepareDiaryBytes(Buffer.from(match[1],'base64'),'IMAGE','legacy-image')));
    } else { images.push(url); if (url.startsWith('/api/farming-logs/media/')) retainedIds.push(url.split('/').at(-1)!); }
  }
  let voiceUrl = options.retainedVoice === undefined ? existingVoice : options.retainedVoice;
  if (voiceUrl !== null && voiceUrl !== existingVoice) throw new DiaryMediaError('Ghi âm giữ lại phải thuộc nhật ký đang sửa.');
  if (voiceUrl) retainedIds.push(String(voiceUrl).split('/').at(-1)!);
  for (const file of files) {
    const url = await write(file);
    if (file.kind === 'IMAGE') images.push(url);
    else voiceUrl = url;
  }
  if (images.length > DIARY_IMAGE_COUNT) throw new DiaryMediaError('Tối đa 12 ảnh cho một nhật ký.');
  // Replaced voice is no longer referenced, even if its previous URL was retained.
  const keep = new Set([...images, ...(voiceUrl ? [String(voiceUrl)] : [])].map(url => url.split('/').at(-1)!));
  await tx.farmingLogMedia.deleteMany({ where:{logId,id:{notIn:retainedIds.filter(id=>keep.has(id))}} });
  return { images, voiceUrl: voiceUrl ? String(voiceUrl) : null };
}
