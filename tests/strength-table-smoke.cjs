const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});const html=fs.readFileSync('index.html','utf8');vm.runInContext(html.slice(html.indexOf('const plan='),html.indexOf('const defaults=')),ctx);
for(const file of ['exercises.js','day-journal.js','progress-tracker.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const state={done:{'3-0-0':true,'4-0-0':false},loads:{'3-0-0':'55','4-0-0':'100'},reps:{'3-0-0':'8'},substitutions:{},closedDays:{},dayHistory:[{id:'a',date:'2026-10-01',week:1,day:0,exercises:[{slot:0,name:'Press de banca',done:true,load:40,reps:10,equipment:'Barra'}]},{id:'b',date:'2026-10-08',week:2,day:0,exercises:[{slot:0,name:'Press de banca',done:true,load:42.5,reps:10,equipment:'Barra'}]}]};
const before=JSON.stringify(state);let rows=ctx.strengthOverviewRows(state);assert.equal(rows.length,2);const bar=rows.find(r=>r.equipment==='Barra');assert.equal(bar.change,2.5);assert.equal(bar.best,42.5);assert.equal(bar.latest.date,'2026-10-08');assert.equal(rows.find(r=>!r.equipment).best,55);assert.equal(JSON.stringify(state),before);
state.dayHistory[1].exercises[0].reps=8;assert.equal(ctx.strengthOverviewRows(state).find(r=>r.equipment==='Barra').change,null);
state.dayHistory[1].exercises[0].equipment='Máquina';assert.equal(ctx.strengthOverviewRows(state).length,3);assert.equal(ctx.strengthOverviewRows({dayHistory:[],loads:{},done:{}}).length,0);
console.log('PASS: strength overview, dates, equipment isolation, equal-rep comparison, incomplete exclusion and unchanged source.');
