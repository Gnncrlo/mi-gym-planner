const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({Date});vm.runInContext(fs.readFileSync('welcome.js','utf8'),ctx);
for(const [hour,minute,expected] of [[0,0,'Buenas noches'],[4,59,'Buenas noches'],[5,0,'Buenos días'],[11,59,'Buenos días'],[12,0,'Buenas tardes'],[18,59,'Buenas tardes'],[19,0,'Buenas noches'],[23,59,'Buenas noches']])assert.equal(ctx.greetingForNow(new Date(2026,10,16,hour,minute)),expected);
for(const value of [undefined,null,'','  ','Mi perfil',' MI PERFIL '])assert.equal(ctx.personName(value),'');
assert.equal(ctx.personName(' Giancarlo  Mariñas '),'Giancarlo');assert.equal(ctx.personName('<b>Ana</b>'),'<b>Ana</b>');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.short_name,'Gym Planner');assert.equal(manifest.display,'standalone');
for(const icon of manifest.icons){assert.ok(!icon.src.startsWith('/'));assert.ok(fs.existsSync(icon.src))}
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180],['favicon-32.png',32]]){const png=fs.readFileSync('icons/'+name);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size)}
console.log('PASS: greeting boundaries, first names, generic/empty names and relative manifest/icon dimensions.');
