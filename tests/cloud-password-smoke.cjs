const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const calls=[],uid='11111111-1111-4111-8111-111111111111';
const context=vm.createContext({URL,URLSearchParams,AbortController,setTimeout,clearTimeout,atob,fetch:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({id:uid})}}});
vm.runInContext(fs.readFileSync('cloud-api.js','utf8'),context);
const client=context.createGymCloudClient({url:'https://example.supabase.co',publishableKey:'sb_publishable_fixture',redirectUrl:'https://gnncrlo.github.io/mi-gym-planner/'});
(async()=>{
 await client.requestPasswordReset('ana@example.com');assert.ok(calls[0].url.includes('/recover?redirect_to='));assert.deepEqual(JSON.parse(calls[0].options.body),{email:'ana@example.com'});
 await assert.rejects(()=>client.updatePassword('token','short'),/8 caracteres/);
 await client.updatePassword('fixture-access-token','new-password-123');assert.equal(calls[1].options.method,'PUT');assert.deepEqual(JSON.parse(calls[1].options.body),{password:'new-password-123'});
 const state={done:{keep:true},loads:{keep:50}},storage=new Map(),history=[];
 const ctx=vm.createContext({URLSearchParams,S:state,cloudAccountEpoch:0,cloudController:null,cloudAuthView:'',cloudFormMessage:'',cloudError:'',cloudErrorText:e=>e.message,render:()=>{},window:{location:{hash:'#type=recovery&access_token=SECRET&refresh_token=OTHER',pathname:'/mi-gym-planner/',search:''},history:{replaceState:(...args)=>history.push(args)}}});
 vm.runInContext(fs.readFileSync('cloud-password.js','utf8'),ctx);ctx.capturePasswordRecovery();assert.equal(vm.runInContext('passwordRecoveryToken',ctx),'SECRET');assert.equal(history[0][2],'/mi-gym-planner/');
 vm.runInContext('passwordRecoveryClient=()=>({getUser:async()=>({id:"one"}),updatePassword:async()=>({id:"one"})})',ctx);
 const form={querySelector:()=>({value:'new-password-123'})};const before=JSON.stringify(state);await ctx.resetPlannerPassword(form);assert.equal(vm.runInContext('passwordRecoveryToken',ctx),'');assert.deepEqual(state.done,{keep:true});assert.equal(state.loads.keep,50);assert.equal(storage.size,0);assert.equal(state.tab,'mas');
 console.log('PASS: recovery endpoints, password validation, fragment removal, memory-only token and preserved progress.');
})().catch(error=>{console.error(error);process.exitCode=1});
