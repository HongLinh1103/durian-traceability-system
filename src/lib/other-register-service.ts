import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { OtherRegisterState } from './other-registers';
import { saveOtherRegister } from './other-register-write';

export async function persistOtherRegister(ownerId: string, revision: number, record: unknown) {
 return prisma.$transaction(async tx => {
  const row = await tx.processingGmpWorkspace.findUnique({ where: { ownerId } });
  if (!row) throw Error('Chưa có dữ liệu Sổ Nhập hàng của cơ sở.');
  if (row.revision !== revision) throw Error('OTHER_REGISTER_REVISION_CONFLICT');
  const state = saveOtherRegister(row.data as unknown as OtherRegisterState, record, randomUUID(), ownerId);
  const saved = await tx.processingGmpWorkspace.updateMany({ where: { ownerId, revision }, data: { data: state as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
  if (!saved.count) throw Error('OTHER_REGISTER_REVISION_CONFLICT');
  return { state, revision: revision + 1 };
 });
}
