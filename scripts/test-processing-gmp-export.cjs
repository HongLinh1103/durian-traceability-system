const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const JSZip = require('jszip');

require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, filename);
};
const { buildRegisterDocx, registerExportPeriod, displayValue } = require('../src/lib/processing-gmp-export.ts');
const { STAGES, REGISTERS } = require('../src/lib/processing-gmp.ts');

async function main() {
    for (const field of REGISTERS.inspection.fields.filter(field => field.type === 'finding')) {
        assert.equal(displayValue(field, 'Có'), 'X');
        assert.equal(displayValue(field, 'Không'), '');
        assert.equal(displayValue(field, undefined), '');
    }
    assert.equal(registerExportPeriod('', '', ''), '');
    assert.equal(registerExportPeriod('2026-09', '', ''), 'Tháng 09/2026');
    assert.equal(registerExportPeriod('', '2026-09-01', ''), 'Từ ngày 01/09/2026');
    assert.equal(registerExportPeriod('', '', '2026-09-19'), 'Đến ngày 19/09/2026');
    const period = registerExportPeriod('2026-09', '2026-09-01', '2026-09-19');
    assert.equal(period, 'Tháng 09/2026 · Từ ngày 01/09/2026 · Đến ngày 19/09/2026');
    for (const stage of STAGES) {
        for (const filter of ['', period]) {
            const longRecord = { id: 'long', sourceId: '', lotCode: 'LH-2026-1909-ABCDEF', season: '2025-2026', values: Object.fromEntries(REGISTERS[stage].fields.filter(f => !f.internal).map(f => [f.key, f.type === 'number' ? 123456789 : f.type === 'date' ? '2026-09-19' : f.type === 'check' ? 'Đ' : f.type === 'finding' ? 'Có' : 'Nguyễn Văn Nam yêu cầu xác nhận'])) };
            for (const records of [[], [{ id: 'test', sourceId: '', lotCode: 'LH-2026-1909', season: '2025-2026', values: { date: '2026-09-19', quantity_boxes: 100, cadmiumOk: 'Đ' } }], [longRecord]]) {
                const zip = await JSZip.loadAsync(await buildRegisterDocx(stage, records, 'Cơ sở kiểm tra', filter));
                const xml = await zip.file('word/document.xml').async('string');
                const beforeTable = xml.slice(0, xml.indexOf('<w:tbl>'));
                const paragraphs = [...beforeTable.matchAll(/<w:t xml:space="preserve">(.*?)<\/w:t>/g)].map(m => m[1]);
                assert.equal(paragraphs[0], 'CƠ SỞ KIỂM TRA');
                if (filter) assert.equal(paragraphs[1], filter);
                assert(!xml.includes('Từ đầu'));
                assert(!xml.includes('Hiện tại'));
                assert(!xml.includes(`${REGISTERS[stage].code} ·`));
                const grid = [...xml.matchAll(/<w:gridCol w:w="(\d+)"/g)].map(m => Number(m[1]));
                const settings = await zip.file('word/settings.xml').async('string');
                const styles = await zip.file('word/styles.xml').async('string');
                assert(settings.includes('<w:autoHyphenation w:val="0"/>'));
                assert(settings.includes('w:name="compatibilityMode"'));
                assert(styles.includes('<w:wordWrap w:val="1"/>'));
                assert(!/[\u00ad\u200b\u2060]/.test(xml));
                assert(!xml.includes('<w:br'));
                assert(xml.includes('<w:pgSz w:w="16838" w:h="11906"'));
                const pageWidth = Number(xml.match(/<w:pgSz w:w="(\d+)"/)[1]);
                assert(xml.includes('w:right="425" w:bottom="850" w:left="425"'));
                const tableWidth = pageWidth - 850;
                assert.equal(grid.reduce((a, b) => a + b, 0), tableWidth);
                assert.equal((xml.match(/<w:tblHeader\/>/g) || []).length, 2);
                for (const row of xml.matchAll(/<w:tr>.*?<\/w:tr>/g)) {
                    const widths = [...row[0].matchAll(/<w:tcW w:w="(\d+)"/g)].map(m => Number(m[1]));
                    assert.equal(widths.reduce((a, b) => a + b, 0), tableWidth);
                }
                for (const paragraph of xml.matchAll(/<w:p>.*?<\/w:p>/g)) {
                    assert(paragraph[0].includes('<w:wordWrap w:val="1"/>'));
                    assert(paragraph[0].includes('<w:suppressAutoHyphens/>'));
                }
                if (['preprocessing', 'packaging'].includes(stage)) {
                    assert(beforeTable.includes('Đ = Đạt; K = Không đạt.'));
                    assert.equal((xml.match(/Đ = Đạt; K = Không đạt\./g) || []).length, 1);
                    const title = stage === 'preprocessing' ? 'TIẾP NHẬN NGUYÊN LIỆU - SƠ CHẾ TRƯỚC KHI ĐÓNG GÓI' : 'THEO DÕI ĐÓNG GÓI/ĐÓNG THÙNG - NHẬP KHO THÀNH PHẨM';
                    assert.equal(xml.split(title).length - 1, 1);
                }
                if (stage === 'inspection') assert(!xml.includes('Đ ='));
                if (stage === 'sales' || stage === 'aftersales') {
                    const fields = REGISTERS[stage].fields.filter(f => !f.internal);
                    for (const key of ['transportOk', 'quantity_boxes', 'cadmiumOk']) {
                        const index = fields.findIndex(f => f.key === key);
                        if (index >= 0) assert(grid[index] >= 650);
                    }
                    assert(xml.includes('<w:wordWrap w:val="1"/>'));
                }
            }
        }
    }
    if (process.argv.includes('--fixtures')) {
        const fixtureDirectory = process.env.GMP_QA_DIR || 'scratch/word-export-qa';
        fs.mkdirSync(fixtureDirectory, { recursive: true });
        const phrases = ['Nguyễn Văn Nam', 'Mã số vùng trồng', 'Điều kiện phương tiện vận chuyển (Đ/K)', 'Số lượng (thùng)', 'Số lượng (quả)', 'Cadmium', 'Địa chỉ người bán'];
        fs.writeFileSync(fixtureDirectory + '/required-phrases.json', JSON.stringify(phrases));
        for (const stage of STAGES) {
            const values = Object.fromEntries(REGISTERS[stage].fields.map(f => [f.key, f.type === 'number' ? 12500 : f.type === 'date' ? '2026-09-19' : f.type === 'check' ? 'Đ' : f.type === 'finding' ? 'Có' : 'Nguyễn Văn Nam']));
            values.notes = phrases.join(' · ');
            values.correction = phrases.join(' · ');
            values.origin = phrases.join(' · ');
            const bytes = await buildRegisterDocx(stage, [{ id: 'qa', sourceId: '', lotCode: 'LH-2026-1909', season: '2025-2026', values }], 'CƠ SỞ KIỂM TRA XUẤT WORD', 'Tháng 09/2026');
            fs.writeFileSync(fixtureDirectory + '/' + stage + '.docx', bytes);
        }
    }
    console.log('PASS: 7 registers, filtered/unfiltered, empty/populated; headings, notes, table geometry and column widths.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
