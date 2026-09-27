const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,dependencies={}){
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>{if(!(name in dependencies))throw Error('Unexpected dependency '+name);return dependencies[name];},console,Map,Set,Date});
 return exports;
}
const retired=['PROCESSING_STAFF','INTAKE_STAFF','DISPATCH_STAFF'];
test('retired roles and accounts stay absent after restarting the role service',async()=>{
 for(let restart=0;restart<2;restart++){
  const data=load('src/lib/permissions-data.ts');
  const realOwner={id:'real-owner',fullName:'Existing processing owner',phone:'test-phone',role:'PROCESSING_FACILITY',accountStatus:'APPROVED'};
  const service=load('src/lib/role-service.ts',{'@/lib/permissions-data':data,'@/lib/prisma':{prisma:{user:{findMany:async()=>[realOwner]},rolePermissionConfig:{findMany:async()=>[]}}}});
  const result=await service.getAllRolesData();
  assert.equal(result.roles.length,data.SYSTEM_ROLES.length);
  for(const key of retired){
   assert.equal(result.roles.some(role=>role.key===key),false);
   assert.equal(data.MOCK_ASSIGNED_USERS[key],undefined);
  }
  assert.equal(result.allUsers.length,1);
  assert.equal(result.roles.find(role=>role.key==='PROCESSING_FACILITY').assignedUsers[0].id,realOwner.id);
 }
});
test('removing demo defaults does not hide genuine custom roles stored in the database',async()=>{
 const data=load('src/lib/permissions-data.ts');
 const service=load('src/lib/role-service.ts',{'@/lib/permissions-data':data,'@/lib/prisma':{prisma:{user:{findMany:async()=>[]},rolePermissionConfig:{findMany:async()=>[{roleKey:'QUALITY_MANAGER',roleName:'Quản lý chất lượng',permissions:[]}]}}}});
 const result=await service.getAllRolesData();
 assert.ok(result.roles.some(role=>role.key==='QUALITY_MANAGER'));
 assert.equal(result.roles.some(role=>retired.includes(role.key)),false);
});
