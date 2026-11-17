const fs=require('fs');const d=process.argv[2];
const tr=JSON.parse(fs.readFileSync(d+'/'+(process.argv[3]||'tr-v13.json'),'utf8'));
let t=fs.readFileSync(d+'/prod/en-extra.txt','utf8').replace(/\s+$/,'');
t+='\n'+tr.map(([r,e])=>r+'|||'+e).join('\n')+'\n';
fs.writeFileSync(d+'/prod/en-extra.txt',t,'utf8');console.log('added',tr.length);

