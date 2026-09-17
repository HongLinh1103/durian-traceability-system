import { PrismaClient, Prisma } from '@prisma/client';

const db = new PrismaClient();

function getSupervisor(raw: string, idx: number): string {
  if (/giám sát ca\s*1/i.test(raw)) return 'Lê Văn Hùng';
  if (/giám sát ca\s*2/i.test(raw)) return 'Trần Minh Đức';
  if (/giám sát ca\s*3/i.test(raw)) return 'Phạm Quốc Bảo';
  const defaultList = ['Lê Văn Hùng', 'Trần Minh Đức', 'Phạm Quốc Bảo'];
  const cleaned = raw.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
  if (!cleaned || /giám sát/i.test(cleaned)) return defaultList[idx % defaultList.length];
  return cleaned;
}

function getInspector(raw: string, idx: number): string {
  if (/nhân viên kcs\s*1/i.test(raw)) return 'Phạm Thị Hương';
  if (/nhân viên kcs\s*2/i.test(raw)) return 'Trần Đình Trọng';
  if (/nhân viên kcs\s*3/i.test(raw)) return 'Vũ Hoàng Mai';
  const defaultList = ['Phạm Thị Hương', 'Trần Đình Trọng', 'Vũ Hoàng Mai'];
  const cleaned = raw.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
  if (!cleaned || /kcs/i.test(cleaned)) return defaultList[idx % defaultList.length];
  return cleaned;
}

function cleanText(raw: unknown): string {
  return String(raw || '').replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
}

async function main() {
  const workspaces = await db.processingGmpWorkspace.findMany();
  console.log(`Found ${workspaces.length} workspace(s).`);

  for (const ws of workspaces) {
    console.log(`\n=== Processing Workspace: ownerId = ${ws.ownerId} ===`);
    const data = structuredClone(ws.data as any);
    let changed = false;

    // 1. Preprocessing
    const preOutputWeights = new Map<string, number>();
    if (Array.isArray(data.records?.preprocessing)) {
      data.records.preprocessing = data.records.preprocessing.map((r: any, idx: number) => {
        const next = { ...r, values: { ...r.values } };
        const lotCode = String(r.lotCode || '');
        const inW = Number(next.values.inputWeight || 0);
        let outW = Number(next.values.outputWeight || 0);

        // Adjust supervisor to real name
        const oldSupervisor = String(next.values.supervisor || '');
        const newSupervisor = getSupervisor(oldSupervisor, idx);
        if (newSupervisor !== oldSupervisor) {
          next.values.supervisor = newSupervisor;
          changed = true;
        }

        // Adjust outputWeight to have minimal or 0 discrepancy with inputWeight
        let targetOut = outW;
        if (ws.ownerId === 'cmsogs6vi000314g3yuvld36x') {
          if (lotCode.includes('0809')) targetOut = 3160; // in: 3162, diff: 2 kg
          else if (lotCode.includes('0509')) targetOut = 1547; // in: 1547, diff: 0 kg
          else if (lotCode.includes('0309')) targetOut = 2302; // in: 2305, diff: 3 kg
          else if (lotCode.includes('0209')) targetOut = 1838; // in: 1838, diff: 0 kg
          else if (lotCode.includes('2908')) targetOut = 4360; // in: 4365, diff: 5 kg
          else if (lotCode.includes('2007')) targetOut = 1109; // in: 1109, diff: 0 kg
        } else if (inW > 0) {
          targetOut = idx % 2 === 0 ? inW : Math.max(1, inW - 2);
        }
        targetOut = Math.min(inW, targetOut);

        if (targetOut !== outW) {
          console.log(`Lot ${lotCode} Preprocessing outputWeight: ${outW} -> ${targetOut} (input: ${inW}, diff: ${inW - targetOut} kg)`);
          next.values.outputWeight = targetOut;
          changed = true;
        }
        preOutputWeights.set(r.id, next.values.outputWeight);
        preOutputWeights.set(lotCode, next.values.outputWeight);

        return next;
      });
    }

    // 2. Packaging
    if (Array.isArray(data.records?.packaging)) {
      data.records.packaging = data.records.packaging.map((r: any, idx: number) => {
        const next = { ...r, values: { ...r.values } };
        const lotCode = String(r.lotCode || '');

        // Adjust supervisor
        const oldSupervisor = String(next.values.supervisor || '');
        const newSupervisor = getSupervisor(oldSupervisor, idx);
        if (newSupervisor !== oldSupervisor) {
          next.values.supervisor = newSupervisor;
          changed = true;
        }

        // Adjust inputWeight to match preprocessing outputWeight
        const matchedOutput = preOutputWeights.get(r.sourceId) || preOutputWeights.get(lotCode);
        if (matchedOutput !== undefined && Number(next.values.inputWeight) !== matchedOutput) {
          console.log(`Lot ${lotCode} Packaging inputWeight: ${next.values.inputWeight} -> ${matchedOutput}`);
          next.values.inputWeight = matchedOutput;
          changed = true;
        }

        return next;
      });
    }

    // 3. Inspection
    if (Array.isArray(data.records?.inspection)) {
      data.records.inspection = data.records.inspection.map((r: any, idx: number) => {
        const next = { ...r, values: { ...r.values } };
        const oldInspector = String(next.values.inspector || '');
        const newInspector = getInspector(oldInspector, idx);
        if (newInspector !== oldInspector) {
          next.values.inspector = newInspector;
          changed = true;
        }
        return next;
      });
    }

    // 4. Sales & Aftersales - clean (minh họa)
    for (const st of ['sales', 'aftersales'] as const) {
      if (Array.isArray(data.records?.[st])) {
        data.records[st] = data.records[st].map((r: any) => {
          const next = { ...r, values: { ...r.values } };
          for (const key of Object.keys(next.values)) {
            if (typeof next.values[key] === 'string' && next.values[key].includes('(minh họa)')) {
              next.values[key] = cleanText(next.values[key]);
              changed = true;
            }
          }
          return next;
        });
      }
    }

    if (changed) {
      await db.processingGmpWorkspace.update({
        where: { ownerId: ws.ownerId },
        data: {
          data: data as Prisma.InputJsonValue,
          revision: { increment: 1 },
        },
      });
      console.log(`Workspace ${ws.ownerId} updated successfully.`);
    } else {
      console.log(`Workspace ${ws.ownerId} had no changes.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
