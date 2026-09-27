const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file, dependencies={}, extra={}) {
    const exports={};
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(code,{exports,require:name=>dependencies[name]??require(name),Date,console,...extra});
    return exports;
}
const templates=load('src/lib/china-port-notification-templates.ts');
const record={countryNameEn:'Viet Nam',corpNameEn:'Công ty ABC',overseasOfficialRegNo:'VN-00123',regState:'1'};
for(const [event,state,expected]of [
    ['NEW_RECORD','1','Có dữ liệu đăng ký mới'],
    ['STATUS_CHANGED','1','Trạng thái đăng ký thay đổi: Còn hiệu lực'],
    ['STATUS_CHANGED','2','Trạng thái đăng ký thay đổi: Tạm dừng'],
    ['STATUS_CHANGED','3','Trạng thái đăng ký thay đổi: Hết hiệu lực'],
    ['STATUS_CHANGED','unknown','Trạng thái đăng ký thay đổi'],
    ['DATA_CHANGED','1','Thông tin đăng ký thay đổi'],
]) test(`${event} ${state} uses the configured event label and country`,()=>{
    assert.equal(templates.chinaPortNotificationSubject({event,record:{...record,regState:state}}),`[TriViet - China Port] ${expected} - Viet Nam`);
});
test('changed fields stay in the body, with readable dates and escaped HTML',()=>{
    const payload={event:'DATA_CHANGED',record:{...record,corpNameEn:'Công ty <ABC>'},changes:[{label:'Ngày hiệu lực',before:'2026-09-25',after:'2026-09-27'}]};
    const subject=templates.chinaPortNotificationSubject(payload);
    assert.doesNotMatch(subject,/Ngày hiệu lực|25\/09/);
    const html=templates.generateChinaPortNotificationHtml(payload,'https://example.invalid');
    assert.match(html,/Nội dung thay đổi/);assert.match(html,/Công ty &lt;ABC&gt;/);
    assert.match(html,/25\/09\/2026/);assert.match(html,/27\/09\/2026/);
    const text=templates.generateChinaPortNotificationText(payload,'https://example.invalid');
    assert.match(text,/Doanh nghiệp: Công ty <ABC>/);assert.match(text,/Mã đăng ký: VN-00123/);
    assert.match(text,/Ngày hiệu lực: 25\/09\/2026 → 27\/09\/2026/);
});
test('preview returns the event subject without sending any email',async()=>{
    let sends=0;
    const route=load('src/app/api/china-port/test-email/route.ts',{
        'next-auth':{getServerSession:async()=>({user:{role:'ADMIN'}})},
        'next/server':{NextResponse:{json:(data,options)=>({data,status:options?.status||200})}},
        '@/lib/auth':{authOptions:{}},
        '@/lib/email-service':{sendChinaPortEventEmail:async()=>{sends++;}},
        '@/lib/china-port-notification-templates':templates,
    },{process:{env:{NODE_ENV:'production',NEXTAUTH_URL:'https://example.invalid'}}});
    for(const event of ['NEW_RECORD','STATUS_CHANGED','DATA_CHANGED']){
        const result=await route.POST({json:async()=>({event,emails:['preview@example.invalid'],preview:true})});
        assert.equal(result.status,200);
        assert.equal(result.data.subject,templates.chinaPortNotificationSubject({event,record:{...record,regState:event==='STATUS_CHANGED'?'2':'1'}}));
    }
    assert.equal(sends,0);
});
test('the retired staff demo accounts do not reappear in role defaults',()=>{
    const data=load('src/lib/permissions-data.ts');
    for(const role of ['PROCESSING_STAFF','INTAKE_STAFF','DISPATCH_STAFF']){
        assert.equal(data.MOCK_ASSIGNED_USERS[role].length,0);
        assert.equal(data.INITIAL_CUSTOM_ROLES.find(item=>item.key===role).assignedUserIds.length,0);
    }
});
test('SMTP receives the same event subject and before/after content as the preview',async()=>{
    const messages=[];
    const service=load('src/lib/email-service.ts',{
        nodemailer:{createTransport:()=>({sendMail:async message=>{messages.push(message);return{messageId:'test-only',rejected:[]};}})},
        '@/lib/prisma':{prisma:{}},'@/lib/china-port-notification-templates':templates,
    },{process:{env:{NODE_ENV:'production',SMTP_HOST:'smtp.example.invalid',SMTP_USER:'test',SMTP_PASS:'test-only',NEXTAUTH_URL:'https://example.invalid'}}});
    const payload={event:'DATA_CHANGED',record,changes:[{label:'Ngày hiệu lực',before:'2026-09-25',after:'2026-09-27'}]};
    const result=await service.sendChinaPortEventEmail(payload,['recipient@example.invalid']);
    assert.equal(result.success,true);assert.equal(messages.length,1);
    assert.equal(messages[0].subject,templates.chinaPortNotificationSubject(payload));
    assert.match(messages[0].text,/25\/09\/2026 → 27\/09\/2026/);
    assert.match(messages[0].html,/Nội dung thay đổi/);
});
