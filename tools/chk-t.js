const fs=require('fs');const d=process.argv[2];
const app=fs.readFileSync(d+'/prod/app.js','utf8');const dict=JSON.parse(fs.readFileSync(d+'/prod/dict.json','utf8').replace(/^\uFEFF/,''));
const re=/\bTF?\("((?:[^"\\]|\\.)*)"/g;let m,miss=[],n=0;while((m=re.exec(app))){n++;const k=JSON.parse('"'+m[1]+'"');if(!dict[k])miss.push(k);}
console.log('T strings',n,'missing',JSON.stringify(miss));
