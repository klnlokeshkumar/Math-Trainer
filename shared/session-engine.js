/* Shared session engine: robust timer boundaries, grading, result review and local history. */
(function(global){
"use strict";
const U=global.MathUtils, STORAGE_KEY="mathSprintHistoryV1";
const SHARED_PREFS_KEY="mathSprintSharedPrefsV1", TRAINER_PREFS_KEY="mathSprintTrainerPrefsV1";
const $=id=>document.getElementById(id);
const configs={
 table:{title:"Tables 20 × 20",kind:"numeric",auto:true,options:[
  {id:"operation",label:"Operation",type:"select",choices:[["mixed","Mixed × and ÷"],["multiply","Multiplication"],["divide","Division"]],value:"mixed"},
  {id:"tables",label:"Tables",type:"select",choices:[["all","All tables 1–20"],["custom","Choose tables"]],value:"all"},
  {id:"rangeStart",label:"Factor start",type:"number",min:1,max:1000,value:1},{id:"rangeEnd",label:"Factor end",type:"number",min:1,max:1000,value:20}
 ]},
 multiply2:{title:"Two-digit multiplication",kind:"numeric",auto:true,options:[{id:"operandMin",label:"Minimum operand",type:"number",min:10,max:99,value:10},{id:"operandMax",label:"Maximum operand",type:"number",min:10,max:99,value:99}]},
 squares:{title:"Squares and square roots",kind:"numeric",auto:true,options:[
  {id:"maxRoot",label:"Maximum root",type:"number",min:5,max:100,value:50},
  {id:"direction",label:"Question type",type:"select",choices:[["mixed","Mixed"],["square","Find square"],["root","Find square root"]],value:"mixed"},
  {id:"rootMode",label:"Root questions",type:"select",choices:[["perfect","Perfect roots only"],["approx","Include approximations"]],value:"perfect",showWhen:[{id:"direction",notValue:"square"}]},
  {id:"rootPrecision",label:"Round approximate roots to",type:"select",choices:[["1","1 decimal place"],["2","2 decimal places"],["3","3 decimal places"]],value:"2",showWhen:[{id:"direction",notValue:"square"},{id:"rootMode",value:"approx"}]}
 ]},
 cubes:{title:"Cubes and cube roots",kind:"numeric",auto:true,options:[
  {id:"maxRoot",label:"Maximum root",type:"number",min:3,max:50,value:20},
  {id:"direction",label:"Question type",type:"select",choices:[["mixed","Mixed"],["cube","Find cube"],["root","Find cube root"]],value:"mixed"},
  {id:"rootMode",label:"Root questions",type:"select",choices:[["perfect","Perfect roots only"],["approx","Include approximations"]],value:"perfect",showWhen:[{id:"direction",notValue:"cube"}]},
  {id:"rootPrecision",label:"Round approximate roots to",type:"select",choices:[["1","1 decimal place"],["2","2 decimal places"],["3","3 decimal places"]],value:"2",showWhen:[{id:"direction",notValue:"cube"},{id:"rootMode",value:"approx"}]}
 ]},
 fracdec:{title:"Fractions to decimals",kind:"decimal",auto:false,options:[{id:"precision",label:"Decimal mode",type:"select",choices:[["exact","Exact decimals (up to 2 places)"],["round","Include approximations (round to 2 places)"]],value:"exact"},{id:"fractionDifficulty",label:"Fraction set",type:"select",choices:[["common","Common fractions"],["wide","Wider fractions"]],value:"common"}]},
 percent:{title:"Percentages ↔ fractions",kind:"mixed",auto:false,options:[{id:"direction",label:"Direction",type:"select",choices:[["mixed","Mixed"],["toFraction","Percent → fraction"],["toPercent","Fraction → percent"]],value:"mixed"}]},
 divisibility:{title:"Divisibility rules",kind:"choice",auto:false,options:[{id:"divisorSet",label:"Rule set",type:"select",choices:[["core","Core: 2, 3, 5, 9, 10"],["full","Full: 2,3,4,5,6,8,9,10,11,12,25"]],value:"full"},{id:"questionType",label:"Question type",type:"select",choices:[["yesno","Divisible? Yes / no"],["multiple","Which rules apply? (select all)"]],value:"yesno"}]},
 lastdigits:{title:"Unit and last two digits",kind:"numeric",auto:true,options:[{id:"digits",label:"Find",type:"select",choices:[["1","Unit digit"],["2","Last two digits"],["mixed","Mixed"],["product","Product of powers (unit digit)"]],value:"mixed"},{id:"baseMax",label:"Maximum base",type:"number",min:2,max:99,value:30}]},
 approxdiv:{title:"Approximate division",kind:"choice",auto:false,options:[{id:"precision",label:"Estimate to",type:"select",choices:[["integer","Nearest integer"],["tenth","Nearest tenth"]],value:"integer"},{id:"divisorMax",label:"Maximum divisor",type:"number",min:10,max:500,value:99}]},
 primehunt:{title:"Prime hunt: 1–200",kind:"choice",auto:false,options:[{id:"gridSize",label:"Numbers per round",type:"select",choices:[["20","20 numbers"],["50","50 numbers"],["200","Full 1–200 grid"]],value:"20"}]},
 primetest:{title:"Prime or composite?",kind:"choice",auto:false,options:[{id:"numberMax",label:"Maximum number",type:"select",choices:[["100","Up to 100"],["200","Up to 200"],["500","Up to 500"],["1000","Up to 1000"]],value:"200"}]},
 alphabetreasoning:{title:"Alphabet–number reasoning",kind:"choice",auto:false,options:[
  {id:"questionType",label:"Question type",type:"select",choices:[["letterToNumber","Letter → number (A–Z = 1–26)"],["numberToLetter","Number → letter (1–32)"]],value:"letterToNumber"}
 ]}
};
function readStoredObject(key){try{const value=JSON.parse(localStorage.getItem(key)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch(e){return {}}}
function writeStoredObject(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function loadHistory(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v:[]}catch(e){return []}}
function saveHistory(v){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(v.slice(-500)))}catch(e){}}
function optionElement(id){
 const host=$("trainerOptions");
 if(host){
  const scoped=[...host.querySelectorAll("[data-option]")].find(el=>el.dataset.option===String(id));
  if(scoped)return scoped;
 }
 return $(id);
}
function optionValue(id){const el=optionElement(id);return el?el.value:null}
function setStoredControl(id,value){const el=optionElement(id);if(!el||value===undefined||value===null||value==="")return;if(el.tagName==="SELECT"){if([...el.options].some(o=>o.value===String(value)))el.value=String(value);return;}if(el.type==="number"){const n=Number(value),min=el.min===""?-Infinity:Number(el.min),max=el.max===""?Infinity:Number(el.max);if(Number.isFinite(n)&&n>=min&&n<=max)el.value=String(value);return;}el.value=String(value)}
function loadSharedPrefs(){return readStoredObject(SHARED_PREFS_KEY)}
function applySharedPrefs(kind){const prefs=loadSharedPrefs();if(!Object.prototype.hasOwnProperty.call(prefs,"answerMode")){const defaults={table:"input",multiply2:"input",squares:"input",cubes:"input",fracdec:"input",percent:"input",divisibility:"options",lastdigits:"input",approxdiv:"options",primehunt:"options",primetest:"options",alphabetreasoning:"input"};setStoredControl("answerMode",defaults[kind]||"input");}["answerMode","difficulty","sessionMode","questionCount","duration","perQuestion"].forEach(id=>setStoredControl(id,prefs[id]));}
function saveSharedPrefs(){const prefs=loadSharedPrefs();["answerMode","difficulty","sessionMode","questionCount","duration","perQuestion"].forEach(id=>{const el=$(id);if(el&&el.value!=="")prefs[id]=el.value;});if(optionElement("rootMode"))prefs.rootMode=optionElement("rootMode").value;if(optionElement("rootPrecision"))prefs.rootPrecision=optionElement("rootPrecision").value;if(app&&(app.kind==="squares"||app.kind==="cubes")&&optionElement("direction")){const direction=optionElement("direction").value;prefs.rootQuestionType=direction==="mixed"?"mixed":direction==="root"?"root":"power";}writeStoredObject(SHARED_PREFS_KEY,prefs)}
function loadTrainerPrefs(){return readStoredObject(TRAINER_PREFS_KEY)}
function saveTrainerPrefs(kind){const all=loadTrainerPrefs(),prefs={...(all[kind]||{})};(configs[kind]?.options||[]).forEach(o=>{const el=optionElement(o.id);if(el&&el.value!=="")prefs[o.id]=el.value;});if(kind==="table"&&$("tableChecks"))prefs.selectedTables=[...$("tableChecks").querySelectorAll("input:checked")].map(el=>+el.value);all[kind]=prefs;writeStoredObject(TRAINER_PREFS_KEY,all)}
function bindSharedPrefs(){["answerMode","difficulty","sessionMode","questionCount","duration","perQuestion"].forEach(id=>{const el=$(id);if(!el)return;el.addEventListener("change",saveSharedPrefs);if(el.type==="number")el.addEventListener("input",saveSharedPrefs);});}
function intOpt(id,def,min=1,max=100000){const v=parseInt(optionValue(id),10);return Number.isFinite(v)?Math.min(max,Math.max(min,v)):def}
function selectOption(label,choices,value,attrs=""){return `<label ${attrs}>${U.esc(label)}<select data-option="${U.esc(value.id)}" id="${U.esc(value.id)}">${value.choices.map(c=>`<option value="${U.esc(c[0])}" ${c[0]===value.value?"selected":""}>${U.esc(c[1])}</option>`).join("")}</select></label>`}
function updateConditionalOptions(host){host.querySelectorAll("[data-show-when]").forEach(label=>{let conditions=[];try{conditions=JSON.parse(label.dataset.showWhen||"[]")}catch(e){}const visible=conditions.every(c=>{const val=optionValue(c.id);return c.notValue!==undefined?val!==c.notValue:val===c.value});label.classList.toggle("hidden",!visible)})}
function buildOptions(kind){const cfg=configs[kind];const host=$("trainerOptions");const stored=(loadTrainerPrefs()[kind]||{}),shared=loadSharedPrefs();host.innerHTML="";cfg.options.forEach(base=>{const o={...base};if(Object.prototype.hasOwnProperty.call(stored,o.id))o.value=stored[o.id];if((o.id==="rootMode"||o.id==="rootPrecision")&&Object.prototype.hasOwnProperty.call(shared,o.id))o.value=shared[o.id];if(o.id==="direction"&&Object.prototype.hasOwnProperty.call(shared,"rootQuestionType")){o.value=shared.rootQuestionType==="mixed"?"mixed":shared.rootQuestionType==="root"?"root":(kind==="squares"?"square":"cube");}let el;const attrs=o.showWhen?`data-show-when='${U.esc(JSON.stringify(o.showWhen))}'`:"";if(o.type==="select")el=selectOption(o.label,o.choices,o,attrs);else el=`<label ${attrs}>${U.esc(o.label)}<input data-option="${U.esc(o.id)}" id="${U.esc(o.id)}" type="number" min="${o.min}" max="${o.max}" value="${U.esc(o.value)}"></label>`;host.insertAdjacentHTML("beforeend",el)});
 host.querySelectorAll("select").forEach(el=>el.addEventListener("change",()=>{updateConditionalOptions(host);saveTrainerPrefs(kind);if(el.id==="rootMode"||el.id==="rootPrecision"||el.id==="direction")saveSharedPrefs()}));
 host.querySelectorAll('input[data-option]').forEach(el=>{el.addEventListener("change",()=>saveTrainerPrefs(kind));el.addEventListener("input",()=>saveTrainerPrefs(kind));});updateConditionalOptions(host);
 if(kind==="table"){const box=document.createElement("div");box.className="option-group";box.id="tableChecks";box.style.gridColumn="1/-1";const savedTables=stored.selectedTables;box.innerHTML=Array.from({length:20},(_,i)=>{const value=i+1,checked=Array.isArray(savedTables)?savedTables.includes(value):(i>=1&&i<=9);return `<label><input type="checkbox" value="${value}" ${checked?"checked":""}>${value}</label>`}).join("");host.append(box);const mode=$("tables");const update=()=>box.classList.toggle("hidden",mode.value!=="custom");mode.addEventListener("change",()=>{update();saveTrainerPrefs(kind)});box.querySelectorAll('input[type="checkbox"]').forEach(el=>el.addEventListener("change",()=>saveTrainerPrefs(kind)));update();}
}
function getOpts(kind){const o={};configs[kind].options.forEach(c=>o[c.id]=optionValue(c.id));if(kind==="table"){o.selectedTables=$("tables")?.value==="custom"?[...$("tableChecks").querySelectorAll("input:checked")].map(i=>+i.value):Array.from({length:20},(_,i)=>i+1)}return o}
function makeQ(text,answer,extra={}){return {text:String(text),answer:String(answer),kind:"numeric",...extra}}
function questionSubtext(q){return [q&&q.instruction,q&&q.hint].filter(v=>String(v||"").trim()).map(v=>String(v).trim()).join(" · ")}
function divRules(n){const rules=[2,3,4,5,6,8,9,10,11,12,25];return rules.filter(d=>n%d===0)}
function qPool(kind,difficulty,opts){
 const rand=U.rand, shuffle=U.shuffle, q=[];let maxRoot=+opts.maxRoot||50;
 const add=(text,answer,extra={})=>q.push(makeQ(text,answer,{trainer:kind,...extra}));
 if(kind==="table"){
  const start=intOpt("rangeStart",1,1,1000),end=intOpt("rangeEnd",20,1,1000);if(start>end)throw new Error("Factor start must be less than or equal to factor end.");
  const op=opts.operation, tables=opts.selectedTables;if(opts.tables==="custom"&&!tables.length)throw new Error("Select at least one table.");
  tables.forEach(t=>{for(let n=start;n<=end;n++){if(op!=="divide")add(`${t} × ${n} = ?`,t*n,{explain:`${t} × ${n} = ${t*n}`});if(op!=="multiply")add(`${t*n} ÷ ${t} = ?`,n,{explain:`${t*n} ÷ ${t} = ${n}`})}});
  if(op==="mixed"){} // The pool includes both operations when mixed.
 } else if(kind==="multiply2"){
  let lo=intOpt("operandMin",10,10,99),hi=intOpt("operandMax",99,10,99);if(lo>hi)throw new Error("Minimum operand must not exceed maximum operand.");
  const span=hi-lo+1;for(let a=lo;a<=hi;a++)for(let b=a;b<=hi;b++)add(`${a} × ${b} = ?`,a*b,{explain:`${a} × ${b} = ${a*b}`});
 } else if(kind==="squares"){
  const dir=opts.direction;const max=intOpt("maxRoot",50,5,100);const rootMode=opts.rootMode||"perfect";const precision=Math.min(3,Math.max(1,parseInt(opts.rootPrecision||"2",10)||2));
  for(let n=1;n<=max;n++){if(dir!=="root")add(`${n}² = ?`,n*n,{explain:`${n} × ${n} = ${n*n}`});if(dir!=="square")add(`√${n*n} = ?`,n,{explain:`${n}² = ${n*n}, so √${n*n} = ${n}`})}
  if(dir!=="square"&&rootMode==="approx")for(let bucket=1;bucket<max;bucket++){const first=bucket*bucket+1,last=(bucket+1)*(bucket+1)-1,span=last-first+1,samples=Math.min(10,span);for(let i=0;i<samples;i++){const value=first+(samples===1?0:Math.round(i*(span-1)/(samples-1)));const rounded=Math.sqrt(value).toFixed(precision);add(`√${value} = ?`,rounded,{kind:"decimal",hint:`(${precision} Decimal${precision===1?"":"s"})`,explain:`√${value} ≈ ${Math.sqrt(value).toFixed(5)}; rounded to ${precision} decimal place${precision===1?"":"s"}: ${rounded}.`})}}
 } else if(kind==="cubes"){
  const dir=opts.direction;const max=intOpt("maxRoot",20,3,50);const rootMode=opts.rootMode||"perfect";const precision=Math.min(3,Math.max(1,parseInt(opts.rootPrecision||"2",10)||2));
  for(let n=1;n<=max;n++){if(dir!=="root")add(`${n}³ = ?`,n*n*n,{explain:`${n} × ${n} × ${n} = ${n*n*n}`});if(dir!=="cube")add(`∛${n*n*n} = ?`,n,{explain:`${n}³ = ${n*n*n}, so ∛${n*n*n} = ${n}`})}
  if(dir!=="cube"&&rootMode==="approx")for(let bucket=1;bucket<max;bucket++){const first=bucket*bucket*bucket+1,last=(bucket+1)*(bucket+1)*(bucket+1)-1,span=last-first+1,samples=Math.min(10,span);for(let i=0;i<samples;i++){const value=first+(samples===1?0:Math.round(i*(span-1)/(samples-1)));const rounded=Math.cbrt(value).toFixed(precision);add(`∛${value} = ?`,rounded,{kind:"decimal",hint:`(${precision} Decimal${precision===1?"":"s"})`,explain:`∛${value} ≈ ${Math.cbrt(value).toFixed(5)}; rounded to ${precision} decimal place${precision===1?"":"s"}: ${rounded}.`})}}
 } else if(kind==="fracdec"){
  const common=[[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6],[1,7],[2,7],[3,7],[1,8],[3,8],[5,8],[7,8],[1,9],[2,9],[4,9],[5,9],[7,9],[8,9],[1,10],[3,10],[7,10],[9,10],[1,12],[5,12],[7,12],[11,12],[1,20],[3,20],[7,20],[9,20],[11,20],[13,20],[17,20],[19,20],[1,25],[7,25],[9,25],[11,25],[13,25],[1,40],[3,40]];
  const wide=[];for(let d=2;d<=40;d++)for(let n=1;n<d;n++)if((n/d*100)%1===0||d<=20)wide.push([n,d]);
  const arr=opts.fractionDifficulty==="wide"?wide:common;const mode=opts.precision;
  arr.forEach(([n,d])=>{const val=n/d;const answer=mode==="round"?(Math.round((val+Number.EPSILON)*100)/100).toFixed(2):String(Number(val.toFixed(2)));if(mode==="exact"&&Math.abs(val-Math.round(val*100)/100)>1e-9)return;const prompt=`${n}/${d} = ?`;const hint=mode==="round"?"(2 Decimals)":"(Exact Decimal)";const expanded=val.toFixed(6).replace(/0+$/,"").replace(/\.$/,"");add(prompt,answer,{kind:"decimal",hint,explain:`${n} ÷ ${d} = ${expanded}${mode==="round"?`; rounded to 2 decimal places: ${answer}`:""}.`})});
 } else if(kind==="percent"){
  const dir=opts.direction;const fracs=[[1,2],[1,3],[1,4],[1,5],[1,6],[1,8],[1,10],[1,12],[1,16],[3,4],[2,5],[3,5],[7,8],[3,8],[5,8],[7,20],[9,20],[11,20],[13,20],[17,20],[1,25],[3,25],[7,25],[9,25]];
  fracs.forEach(([n,d])=>{const s=U.simplify(n,d),pct=n/d*100,shownPct=Number(pct.toFixed(4)),hasExactDisplay=Math.abs(pct-shownPct)<1e-9;if(dir!=="toPercent"&&hasExactDisplay)add(`${shownPct}% = ?`,s.text,{kind:"fraction",instruction:dir==="mixed"?"Fraction in simplest form?":"",explain:`${shownPct}% = ${shownPct}/100 = ${s.text}`});if(dir!=="toFraction")add(`${s.text} = ?%`,shownPct,{kind:"decimal",hint:hasExactDisplay?"":"(Round to 4 Decimals)",explain:`${s.text} × 100 = ${pct.toFixed(6).replace(/0+$/,'').replace(/\.$/,'')}%; ${hasExactDisplay?"":"rounded to 4 decimal places: "+shownPct}`})});
 } else if(kind==="divisibility"){
  const ds=opts.divisorSet==="core"?[2,3,5,9,10]:[2,3,4,5,6,8,9,10,11,12,25];const type=opts.questionType;
  for(let n=100;n<=9999;n+=rand(1,7)){const d=ds[rand(0,ds.length-1)],yes=n%d===0;if(type==="multiple"){const valid=divRules(n).filter(x=>ds.includes(x));add(`Select all rules that divide ${n}`,valid.join(","),{kind:"multi",options:ds.map(String),explain:`Divisors in this rule set: ${valid.join(", ")||"none"}`})}else add(`Is ${n} divisible by ${d}?`,yes?"Yes":"No",{kind:"choice",options:["Yes","No"],explain:yes?`${n} ÷ ${d} is an integer.`:`${n} is not divisible by ${d}.`})}
 } else if(kind==="lastdigits"){
  const mode=opts.digits,baseMax=intOpt("baseMax",30,2,99);for(let b=2;b<=baseMax;b++)for(let e=2;e<=80;e++){if(mode!=="2")add(`Find the unit digit of ${b}^${e}`,String(U.powerMod(b,e,10)),{explain:`Reduce ${b}^${e} modulo 10; answer ${U.powerMod(b,e,10)}.`});if(mode!=="1"&&mode!=="product")add(`Find the last two digits of ${b}^${e}`,String(U.powerMod(b,e,100)).padStart(2,"0"),{explain:`${b}^${e} mod 100 = ${String(U.powerMod(b,e,100)).padStart(2,"0")}.`,kind:"last2"});}
  if(mode==="product")for(let a=2;a<=baseMax;a++)for(let b=2;b<=baseMax;b++)for(let e=2;e<=25;e++)add(`Find the unit digit of ${a}^${e} × ${b}^${e+1}`,String(U.powerMod(a,e,10)*U.powerMod(b,e+1,10)%10),{explain:`Only unit digits matter: ${U.powerMod(a,e,10)} × ${U.powerMod(b,e+1,10)} gives the unit digit.`});
 } else if(kind==="approxdiv"){
  const dmax=intOpt("divisorMax",99,10,500),mode=opts.precision;for(let d=10;d<=dmax;d++)for(let qn=10;qn<=200;qn+=3){let offset=rand(-Math.floor(d/3),Math.floor(d/3));if(offset===0)offset=rand(0,1)?1:-1;const numerator=d*qn+offset;if(numerator<=0)continue;const exact=numerator/d;const answer=mode==="tenth"?(Math.round(exact*10)/10).toFixed(1):String(Math.round(exact));const divisorOffUp=numerator/(d+1),divisorOffDown=numerator/(d-1);const groups=mode==="tenth"?[[Math.floor(exact*10)/10,Math.ceil(exact*10)/10],[Math.round(exact),Math.floor(exact)],[Math.round(divisorOffUp*10)/10,Math.round(divisorOffDown*10)/10],[Number(answer)-0.1,Number(answer)+0.1]]:[[Math.floor(exact),Math.ceil(exact)],[Math.round(divisorOffUp),Math.round(divisorOffDown)],[Math.round(exact/10)*10,Math.round(exact/5)*5],[Number(answer)-1,Number(answer)+1]];const choices=[String(answer)];for(const group of groups){if(choices.length>=4)break;for(const raw of shuffle(group)){const candidate=mode==="tenth"?Number(raw).toFixed(1):String(Math.round(raw));if(!choices.some(x=>Number(x)===Number(candidate))){choices.push(candidate);break}}}for(let step=1;choices.length<4&&step<10;step++){for(const raw of mode==="tenth"?[Number(answer)-step/10,Number(answer)+step/10]:[Number(answer)-step,Number(answer)+step]){const candidate=mode==="tenth"?raw.toFixed(1):String(Math.round(raw));if(!choices.some(x=>Number(x)===Number(candidate))&&choices.length<4)choices.push(candidate)}}add(`${numerator} ÷ ${d} = ?`,answer,{kind:"choice",hint:mode==="tenth"?"(1 Decimal)":"(Nearest Integer)",options:shuffle(choices),explain:`Exact quotient ≈ ${exact.toFixed(3)}; rounded answer ${answer}.`})}
 } else if(kind==="primehunt"){
  const size=+opts.gridSize||20;const nums=Array.from({length:200},(_,i)=>i+1);
  const rounds=size===200?1:Math.min(100,Math.max(30,Math.floor(200/size)*6));
  const seen=new Set();
  for(let r=0;r<rounds;r++){
   let selected=size===200?nums:shuffle(nums).slice(0,size);
   let key=selected.slice().sort((a,b)=>a-b).join(",");
   let tries=0;while(seen.has(key)&&tries++<20&&size!==200){selected=shuffle(nums).slice(0,size);key=selected.slice().sort((a,b)=>a-b).join(",")}
   seen.add(key);
   const correct=U.primesTo(200).filter(n=>selected.includes(n)).join(",");
   add(`Select every prime in this set: ${selected.join(", ")}`,correct,{kind:"multi",options:selected.map(String),explain:`Prime numbers in this set: ${correct||"none"}`});
  }
 } else if(kind==="primetest"){
  const max=+(opts.numberMax||200);for(let n=2;n<=max;n++){const p=U.isPrime(n),pair=U.factorPair(n);add(`Is ${n} prime or composite?`,p?"Prime":"Composite",{kind:"choice",options:["Prime","Composite"],explain:p?`${n} has no divisor from 2 through √${n}.`: `${n} = ${pair[0]} × ${pair[1]}.`})}
 } else if(kind==="alphabetreasoning"){
  const mode=opts.questionType==="numberToLetter"?"numberToLetter":"letterToNumber";
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const addReasoning=(text,answer,options,explain)=>add(text,answer,{kind:"choice",options:U.shuffle(options),explain});
  const unique=(values)=>[...new Set(values)];
  // Letter → number only uses the ordinary alphabet positions 1–26.
  if(mode==="letterToNumber"){
   for(let n=1;n<=26;n++){
    const letter=alphabet[n-1];
    const candidates=unique([n-1,n+1,n-2,n+2,((n-1+13)%26)+1,27-n,((n-1+7)%26)+1])
      .filter(v=>Number.isInteger(v)&&v>=1&&v<=26&&v!==n);
    const options=unique([n,...candidates]).slice(0,4);
    for(let fallback=1;options.length<4&&fallback<=26;fallback++)if(!options.includes(fallback))options.push(fallback);
    addReasoning(`${letter} = ?`,String(n),options.map(String),`Alphabet position: ${letter} is letter ${n} (A = 1, Z = 26).`);
   }
  } else {
   // Number → letter covers 1–32 exactly, so it includes the wrap Z26 → A27 through F32.
   for(let n=1;n<=32;n++){
    const idx=(n-1)%26,letter=alphabet[idx];
    const candidateIndexes=unique([idx-1,idx+1,idx+2,idx-2,idx+13].map(v=>(v+26)%26).filter(v=>v!==idx));
    const options=unique([letter,...candidateIndexes.map(i=>alphabet[i])]).slice(0,4);
    for(let i=0;options.length<4&&i<26;i++)if(!options.includes(alphabet[i]))options.push(alphabet[i]);
    addReasoning(`${n} = ?`,letter,options,`${n} maps to ${letter}: 1 = A, 26 = Z, 27 = A, 28 = B, and 32 = F.`);
   }
  }
 }
 // difficulty filters keep a meaningful finite pool; progressive is mixed and uses all levels.
 const tagged=q.map((item,i)=>({...item,level:kind==="multiply2"?(Math.max(...item.text.match(/\d+/g).map(Number))<35?"easy":Math.max(...item.text.match(/\d+/g).map(Number))<70?"medium":"hard"):i%3===0?"easy":i%3===1?"medium":"hard"}));
 let filtered=tagged;
 if(difficulty==="easy")filtered=tagged.filter(x=>x.level==="easy");
 if(difficulty==="medium")filtered=tagged.filter(x=>x.level==="medium");
 if(difficulty==="hard")filtered=tagged.filter(x=>x.level==="hard");
 // Tiny or constrained pools may not contain every difficulty tier. Do not strand the learner
 // on an empty sprint; use the available pool instead of failing to start.
 if(!filtered.length)filtered=tagged;
 return shuffle(filtered);
}
function choiceEquivalent(q,a,b){
 const x=String(a).trim(),y=String(b).trim();
 if(q.kind==="fraction")return U.equivalentFraction(x,y);
 if(q.kind==="decimal")return U.sameDecimal(x,y);
 if(q.kind==="last2")return Number(x)===Number(y);
 if(q.kind==="choice")return x.toLowerCase()===y.toLowerCase();
 return x===y;
}
function generatedOptions(q){
 if(Array.isArray(q.options)&&q.options.length)return U.shuffle(q.options.map(String));
 const text=String(q.text||""),trainer=q.trainer||"",correct=String(q.answer);
 const groups=[];
 const pushGroup=(...values)=>groups.push(values);
 const asFraction=(n,d)=>{if(!Number.isFinite(n)||!Number.isFinite(d)||d===0)return null;return U.simplify(Math.trunc(n),Math.trunc(d)).text};
 const fractionToPercentHint=trainer==="percent"&&/^\s*\d+\s*\/\s*\d+\s*=\s*\?%/.test(text);
 const decimalPlaces=(()=>{const m=String(q.hint||"").match(/\((\d+) Decimal/i);if(m)return Math.max(1,Math.min(6,+m[1]));if(trainer==="fracdec")return 2;const existing=(correct.split(".")[1]||"").length;if(fractionToPercentHint)return Math.min(6,existing);return Math.min(6,existing||2)})();
 const fmt=(v)=>{
  if(v===null||v===undefined)return null;
  if(q.kind==="fraction")return String(v);
  if(!Number.isFinite(Number(v)))return null;
  const n=Number(v);
  if(q.kind==="last2")return String(((Math.round(n)%100)+100)%100).padStart(2,"0");
  if(trainer==="lastdigits"&&q.kind==="numeric"&&/unit digit/i.test(text))return String(((Math.round(n)%10)+10)%10);
  if(q.kind==="decimal"&&(trainer==="fracdec"||/\(\d+ Decimal/i.test(String(q.hint||""))||fractionToPercentHint))return n.toFixed(decimalPlaces);
  if(q.kind==="decimal")return String(Number(n.toFixed(Math.max(1,decimalPlaces))));
  if(Number.isInteger(n))return String(n);
  return String(Number(n.toFixed(2)));
 };
 const rootMatch=text.match(/[√∛]\s*(\d+)\s*=\s*\?/);
 const multMatch=text.match(/(\d+)\s*×\s*(\d+)\s*=\s*\?/);
 const divMatch=text.match(/(\d+)\s*÷\s*(\d+)\s*=\s*\?/);
 const squareMatch=text.match(/(\d+)\s*²\s*=\s*\?/);
 const cubeMatch=text.match(/(\d+)\s*³\s*=\s*\?/);
 const unitProduct=text.match(/unit digit of\s+(\d+)\^(\d+)\s*×\s*(\d+)\^(\d+)/i);
 const powerMatch=text.match(/(?:unit digit|last two digits) of\s+(\d+)\^(\d+)/i);
 const fracMatch=text.match(/^\s*(\d+)\s*\/\s*(\d+)\s*=\s*\?/);
 const pctToFraction=text.match(/^\s*([\d.]+)%\s*=\s*fraction/i);
 const fractionToPct=text.match(/^\s*(\d+)\s*\/\s*(\d+)\s*=\s*\?%/);
 const rootDecimal=q.kind==="decimal"&&rootMatch&&(/[√∛]/.test(text));
 const exactSquareRoot=!!rootMatch&&q.kind!=="decimal"&&!text.includes("∛");

 // Root estimates: deliberately target rounding slips, coarser rounding, and neighbouring roots.
 if(rootDecimal){
  const rad=Number(rootMatch[1]),actual=text.includes("∛")?Math.cbrt(rad):Math.sqrt(rad),p=decimalPlaces,scale=10**p,rounded=Number(correct);
  pushGroup(rounded-1/scale,rounded+1/scale);
  const coarseScale=10**Math.max(0,p-1);
  pushGroup(Number((Math.round(actual*coarseScale)/coarseScale).toFixed(p)),Number((Math.floor(actual*coarseScale)/coarseScale).toFixed(p)));
  pushGroup(Math.round(actual),Math.floor(actual*10)/10);
  pushGroup(rounded-2/scale,rounded+2/scale);
 }
 // Fractions -> decimals: common denominator/numerator reversal, place-value shifts, and early rounding.
 else if(q.kind==="decimal"&&fracMatch&&trainer==="fracdec"){
  const n=+fracMatch[1],d=+fracMatch[2],actual=n/d;
  pushGroup(Math.round(actual*10)/10,Math.floor(actual*10)/10);
  pushGroup(d/n,actual*10,actual/10);
  pushGroup(Math.round(actual*100)/100,(Math.round(actual*100)+1)/100,(Math.round(actual*100)-1)/100);
  pushGroup((n/(10**String(d).length)),(d/(10**String(n).length)));
 }
 // Fraction -> percent: forgetting ×100, multiplying by 10 only, or reversing the fraction.
 else if(q.kind==="decimal"&&fractionToPct&&trainer==="percent"){
  const n=+fractionToPct[1],d=+fractionToPct[2],actual=n/d*100;
  pushGroup(n/d,n/d*10);
  pushGroup(d/n*100,100/(n/d));
  pushGroup(n, d, actual/10, actual*10);
  pushGroup(actual-1,actual+1);
 }
 // Integer percent -> fraction: scale by 10 instead of 100, reverse the ratio, or use the percent as a whole number.
 else if(q.kind==="fraction"&&pctToFraction&&trainer==="percent"){
  const p=Number(pctToFraction[1]),f=U.normFraction(correct);if(f){
   pushGroup(asFraction(f.d,f.n));
   pushGroup(asFraction(Math.round(p*10),100),asFraction(Math.round(p),10));
   pushGroup(asFraction(Math.round(p),10),asFraction(Math.round(p),1000));
   pushGroup(asFraction(f.n+1,f.d),asFraction(Math.max(1,f.n-1),f.d));
   pushGroup(asFraction(f.n,f.d+1),asFraction(f.n,Math.max(1,f.d-1)));
  }
 }
 // Plain fractions: one-number changes, numerator/denominator reversal and denominator scaling errors.
 else if(q.kind==="fraction"){
  const f=U.normFraction(correct);if(f){pushGroup(asFraction(f.d,f.n));pushGroup(asFraction(f.n+1,f.d),asFraction(Math.max(0,f.n-1),f.d));pushGroup(asFraction(f.n,f.d+1),asFraction(f.n,Math.max(1,f.d-1)));pushGroup(asFraction(f.n*2,f.d),asFraction(f.n,f.d*2));}
 }
 // Squares: neighbouring square numbers and the classic error of doubling instead of squaring.
 else if(squareMatch){
  const n=+squareMatch[1];pushGroup((n-1)**2,(n+1)**2);pushGroup(2*n);pushGroup(n*(n-1),n*(n+1));
 }
 // Cubes: confusing cube with square or triple, plus neighbouring cubes.
 else if(cubeMatch){
  const n=+cubeMatch[1];pushGroup(n*n,3*n);pushGroup((n-1)**3,(n+1)**3);pushGroup(n*n*(n-1),n*n*(n+1));
 }
 // Exact square/cube roots: adjacent perfect powers / adjacent integer roots.
 else if(rootMatch&&q.kind!=="decimal"){
  const rad=+rootMatch[1],isCube=text.includes("∛"),actual=isCube?Math.round(Math.cbrt(rad)):Math.round(Math.sqrt(rad));
  pushGroup(actual-1,actual+1);
  if(isCube){pushGroup(Math.round(Math.sqrt(rad)),actual*actual,3*actual);pushGroup(actual-2,actual+2);}
  else {pushGroup(-actual);pushGroup(actual-2,actual+2);}
 }
 // Last digits: use common exponent/modulo mistakes (only the unit digit, wrong exponent, or multiplication).
 else if(unitProduct){
  const a=+unitProduct[1],e=+unitProduct[2],b=+unitProduct[3],f=+unitProduct[4];
  pushGroup(U.powerMod(a,e,10));pushGroup(U.powerMod(b,f,10));
  pushGroup(((a%10)*(b%10))%10,((a*e)%10)*((b*f)%10)%10);
  pushGroup(U.powerMod(a,e-1,10)*U.powerMod(b,f,10)%10,U.powerMod(a,e,10)*U.powerMod(b,f-1,10)%10);
  pushGroup((U.powerMod(a,e,10)+U.powerMod(b,f,10))%10);
 }
 else if(powerMatch){
  const base=+powerMatch[1],exp=+powerMatch[2],mod=text.includes("last two digits")?100:10;
  pushGroup(U.powerMod(base,exp,10));
  pushGroup((base*exp)%mod);
  pushGroup(U.powerMod(base,Math.max(1,exp-1),mod),U.powerMod(base,exp+1,mod));
  if(mod===100)pushGroup(base%100,U.powerMod(base,2,100),U.powerMod(base,Math.max(1,exp-2),100));
  else pushGroup(base%10,(base+exp)%10);
 }
 // Multiplication: neighbouring factors and (for two-digit products) an omitted-place-value partial product.
 else if(multMatch){
  const a=+multMatch[1],b=+multMatch[2];
  pushGroup(a*(b-1),a*(b+1));pushGroup((a-1)*b,(a+1)*b);
  if(trainer==="multiply2"&&a>=10&&b>=10){const omittedCross=Math.floor(a/10)*10*b+(a%10)*(b%10);pushGroup(omittedCross,Math.floor(a/10)*Math.floor(b/10)*100+(a%10)*(b%10));pushGroup((a%10)*(b%10),a*(Math.floor(b/10)*10));}
  else {pushGroup(a*(b-2),a*(b+2));pushGroup((a-2)*b,(a+2)*b);}
 }
 // Division table facts: off-by-one quotient/multiple and common operation/remainder confusions.
 else if(divMatch){
  const a=+divMatch[1],b=+divMatch[2],answer=Number(correct),exact=a/b;
  pushGroup(answer-1,answer+1);pushGroup(Math.round(a/(b-1)),Math.round(a/(b+1)));
  pushGroup(Math.round(answer/2),answer*2);pushGroup(Math.floor(exact),Math.ceil(exact));
 }
 // Generic numerical questions: first use place-value or rounding errors, then scale-aware nearby values.
 else if(Number.isFinite(Number(correct))){
  const n=Number(correct),isDecimal=q.kind==="decimal",scale=isDecimal?10**decimalPlaces:1;
  pushGroup(Math.round(n*scale)/scale+1/scale,Math.round(n*scale)/scale-1/scale);
  pushGroup(Math.round(n/10)*10,Math.round(n/100)*100);
  pushGroup(n*10,n/10);
  pushGroup(n+1,n-1,n+2,n-2);
 }

 const values=[];
 const push=v=>{const textValue=fmt(v);if(textValue===null||!String(textValue).trim())return;if(q.kind!=="last2"&&Number(textValue)<0&&Number(correct)>=0&&!exactSquareRoot)return;if(q.kind!=="last2"&&trainer!=="lastdigits"&&Number(textValue)===0&&Number(correct)>0&&!exactSquareRoot)return;if(values.some(existing=>choiceEquivalent(q,existing,textValue)))return;values.push(textValue)};
 push(correct);
 // One representative from each misconception family creates varied, interpretable distractors.
 for(const group of groups){if(values.length>=4)break;for(const candidate of U.shuffle(group)){const before=values.length;push(candidate);if(values.length>before)break;}}
 // If a misconception family collapses to duplicates (small roots or powers of ten),
 // reuse distinct candidates from the existing domain-specific families before falling back.
 if(values.length<4){for(const group of groups){if(values.length>=4)break;for(const candidate of U.shuffle(group)){push(candidate);if(values.length>=4)break;}}}
 // Last-resort completion is scale-aware and used only for degenerate cases (e.g. powers of ten).
 if(values.length<4&&Number.isFinite(Number(correct))){const n=Number(correct),step=q.kind==="decimal"?10**-decimalPlaces:1;for(let k=1;values.length<4&&k<100;k++){push(n-k*step);if(values.length<4)push(n+k*step)}}
 // Unit-digit questions can only have answers 0–9. Keep all four options in that domain,
 // preferring the misconception-based candidates above and filling from the remaining digits.
 const isUnitDigit=trainer==="lastdigits"&&q.kind==="numeric"&&/unit digit/i.test(text);
 if(isUnitDigit){
  const digits=values.filter(v=>/^[0-9]$/.test(String(v)));
  for(const v of U.shuffle(Array.from({length:10},(_,i)=>String(i)))){
   if(digits.length>=4)break;
   if(!digits.some(existing=>choiceEquivalent(q,existing,v)))digits.push(v);
  }
  return U.shuffle(digits.slice(0,4));
 }
 return U.shuffle(values.slice(0,4));
}
function createAutoInputPlan(q){
 if(!q||$("answerMode")?.value==="options"||q.kind==="multi"||q.kind==="fraction")return null;
 const answer=String(q.answer??"").trim(),trainer=q.trainer||app?.kind||"";
 const numeric=/^-?\d+(?:\.\d+)?$/.test(answer);
 if(q.kind==="last2")return {type:"digits",count:2,label:"two digits"};
 if(q.kind==="numeric"&&app?.cfg?.auto&&/^-?\d+$/.test(answer)){
  if(trainer==="lastdigits"&&/unit digit/i.test(String(q.text||"")))return {type:"digits",count:1,label:"one digit"};
  return {type:"digits",count:answer.replace(/\D/g,"").length,label:`${answer.replace(/\D/g,"").length} digit${answer.replace(/\D/g,"").length===1?"":"s"}`};
 }
 // Exact binary/text classification answers have a closed vocabulary, so the input can
 // submit as soon as one complete accepted token has been entered.
 if(trainer==="alphabetreasoning"&&!numeric)return {type:"token",tokens:Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ",v=>v.toLowerCase())};
 if(q.kind==="choice"&&Array.isArray(q.options)&&q.options.length&&q.options.every(v=>!Number.isFinite(Number(v)))){
  return {type:"token",tokens:q.options.map(v=>String(v).trim().toLowerCase())};
 }
 if((q.kind==="decimal"||q.kind==="choice")&&numeric){
  const rounded=String(q.hint||"").match(/(?:\((\d+) Decimal|Round to (\d+) Decimal)/i);
  if(rounded){const places=Number(rounded[1]||rounded[2]);if(Number.isInteger(places)&&places>=1&&places<=6)return {type:"decimal",places,label:`${places} decimal place${places===1?"":"s"}`};}
  const count=answer.length;
  if(count>0)return {type:"length",count,label:`${count} characters`};
 }
 return null;
}
function autoInputIsComplete(q,plan,value){
 if(!plan||!String(value||"").trim())return false;
 const input=String(value).trim();
 if(plan.type==="digits")return /^\d+$/.test(input)&&input.length>=plan.count;
 if(plan.type==="decimal"){
  const m=input.match(/^\d+(?:\.(\d*))?$/);
  return !!m&&(m[1]||"").length>=plan.places;
 }
 if(plan.type==="length")return /^-?\d+(?:\.\d+)?$/.test(input)&&input.length>=plan.count;
 if(plan.type==="token")return plan.tokens.includes(input.toLowerCase());
 return false;
}
function shouldHideSubmit(q,optionsMode){return optionsMode?q.kind!=="multi":!!q.autoInputPlan}
function inputFor(q){
 const host=$("answerControl"),optionsMode=$("answerMode")?.value==="options";host.classList.remove("hidden");host.innerHTML="";
 const form=$("answerForm");form.classList.toggle("wide-answer",optionsMode&&q.kind==="multi");
 const submitBtn=$("submitBtn");submitBtn.disabled=false;submitBtn.textContent="Check answer";let displayOptions=[];
 if(optionsMode){
  displayOptions=generatedOptions(q);
  if(q.kind==="multi"){
   host.innerHTML=`<div class="answer-options multi-options">${displayOptions.map(v=>`<button type="button" data-multi="${U.esc(v)}" aria-pressed="false">${U.esc(v)}</button>`).join("")}</div><p class="muted tiny">Select all that apply, then press Check answer.</p><input type="hidden" id="answerInput" value="">`;
   const selected=new Set();host.querySelectorAll("[data-multi]").forEach(b=>b.addEventListener("click",()=>{const v=b.dataset.multi;if(selected.has(v)){selected.delete(v);b.classList.remove("selected");b.setAttribute("aria-pressed","false")}else{selected.add(v);b.classList.add("selected");b.setAttribute("aria-pressed","true")}$("answerInput").value=[...selected].sort((a,b)=>Number(a)-Number(b)).join(",")}));
  }else{
   host.innerHTML=`<div class="answer-options">${displayOptions.map(v=>`<button type="button" data-choice="${U.esc(v)}">${U.esc(v)}</button>`).join("")}</div><input type="hidden" id="answerInput" value="">`;
   host.querySelectorAll("[data-choice]").forEach(b=>b.addEventListener("click",()=>{
    if(app&&app.locked)return;
    host.querySelectorAll("[data-choice]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("answerInput").value=b.dataset.choice;
    submitCurrent();
   }));
  }
 }else{
  const numericAnswer=/^-?\d+(?:\.\d+)?$/.test(String(q.answer??""));
  const placeholder=q.trainer==="alphabetreasoning"?(numericAnswer?"Enter number (1–26)":"Enter letter (A–Z)"):q.kind==="fraction"?"e.g. 3/8":q.kind==="multi"?"e.g. 2, 3, 5":q.kind==="decimal"?"Enter decimal":q.kind==="choice"?(numericAnswer?"Enter estimate":"Type your answer"):"Your answer";
  const inputMode=q.trainer==="alphabetreasoning"?(numericAnswer?"numeric":"text"):(q.kind==="fraction"||q.kind==="multi"||(q.kind==="choice"&&!numericAnswer))?"text":"decimal";
  host.innerHTML=`${q.kind==="multi"?'<p class="muted tiny">Enter all answers separated by commas (or leave blank if none apply).</p>':""}<input id="answerInput" class="answer-input" type="text" inputmode="${inputMode}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${U.esc(placeholder)}" aria-label="Your answer">`;
 }
 const input=$("answerInput");if(input&&input.type!=="hidden"){input.addEventListener("input",()=>{if(app?.locked)return;if(autoInputIsComplete(q,q.autoInputPlan,input.value))submitCurrent()});input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submitCurrent()}});if(q.autoInputPlan)input.dataset.autosubmit=q.autoInputPlan.type;input.focus({preventScroll:true})}
 // Hide Check answer only when a single choice auto-submits or typed input has a safe completion rule.
 // Multi-select and free-form fraction answers still require explicit confirmation.
 submitBtn.classList.toggle("hidden",shouldHideSubmit(q,optionsMode));
}
function renderResolvedQuestion(q, shownAnswer, isCorrect, isTimeout=false){
 const node=$("questionText");if(!node)return;node.textContent="";
 const source=String(q.text||"");const idx=source.lastIndexOf("?");
 const before=idx>=0?source.slice(0,idx):source;const after=idx>=0?source.slice(idx+1):"";
 const equationPlaceholder=idx>=0&&/=\s*$/.test(before);
 const inlinePlaceholder=idx>=0&&q.inlineAnswer===true;
 const addAnswer=(value,className,del=false)=>{const span=document.createElement("span");span.className=className;span.textContent=String(value);if(del)span.style.textDecoration="line-through";node.appendChild(span)};
 const wrongValue=String(shownAnswer??"").trim()||"No answer";
 if(equationPlaceholder){
  node.appendChild(document.createTextNode(before));
  if(!isCorrect&&!isTimeout){addAnswer(wrongValue+after,"answer-reveal-bad",true);node.appendChild(document.createTextNode(" "));}
  addAnswer(String(q.answer??"")+(String(q.answer??"").trim()?after:""),"answer-reveal-good");
 }else if(inlinePlaceholder){
  node.appendChild(document.createTextNode(before));
  if(!isCorrect&&!isTimeout){addAnswer(wrongValue,"answer-reveal-bad",true);node.appendChild(document.createTextNode(" "));}
  addAnswer(String(q.answer??"").trim()||"None","answer-reveal-good");
  node.appendChild(document.createTextNode(after));
 }else{
  node.appendChild(document.createTextNode(source));
  node.appendChild(document.createTextNode(" — "));
  if(!isCorrect&&!isTimeout){addAnswer(wrongValue,"answer-reveal-bad",true);node.appendChild(document.createTextNode(" "));}
  addAnswer(String(q.answer??"").trim()||"None","answer-reveal-good");
 }
}
function compareAnswer(q,raw){
 if(q.kind==="multi"){const normalize=value=>String(value||"").trim().toLowerCase()==="none"?[]:String(value||"").split(/[,;\s]+/).filter(Boolean).map(v=>v.trim()).sort((a,b)=>Number(a)-Number(b));const a=normalize(raw),e=normalize(q.answer);return a.length===e.length&&a.every((v,i)=>v===e[i])}
 if(q.kind==="fraction")return U.equivalentFraction(raw,q.answer);
 if(q.kind==="decimal")return U.sameDecimal(raw,q.answer);
 if(q.kind==="last2"){const normalize=value=>{const text=String(value).trim();return /^\d+$/.test(text)?String(Number(text)):text.replace(/^0+(?=\d)/,"")};return normalize(raw)===normalize(q.answer)}
 if(q.kind==="choice"){
  const input=String(raw).trim(),expected=String(q.answer).trim();
  if(/^-?\d+(?:\.\d+)?$/.test(input)&&/^-?\d+(?:\.\d+)?$/.test(expected))return Math.abs(Number(input)-Number(expected))<1e-9;
  return input.toLowerCase()===expected.toLowerCase();
 }
 if(q.kind==="numeric"){
  const input=String(raw).trim(),expected=String(q.answer).trim();
  if(/^-?\d+$/.test(input)&&/^-?\d+$/.test(expected))return Number(input)===Number(expected);
  return input===expected;
 }
 return String(raw).trim()===String(q.answer);
}
let app=null;
function mount(kind){
 const cfg=configs[kind];if(!cfg)return;app={kind,cfg,opts:null,pool:[],index:0,records:[],current:null,running:false,locked:false,deadline:0,qStarted:0,qTimer:null,clock:null,sessionStarted:0,target:0,sessionMode:"count",timeLimit:0,wrongOnly:null,streak:0,bestStreak:0};
 applySharedPrefs(kind);bindSharedPrefs();buildOptions(kind);
 const updateMode=()=>{const mode=$("sessionMode").value;$("countWrap").classList.toggle("hidden",mode!=="count");$("durationWrap").classList.toggle("hidden",mode!=="timed");$("setupHint").textContent=mode==="all"?"The selected finite question pool will be tested once, without repeats.":mode==="timed"?"Answer as many as possible before time expires.":"The session ends after the selected number of questions.";$("setupHint").style.color="";};
 $("sessionMode").addEventListener("change",updateMode);updateMode();
 const answerModeHelp=()=>{const node=$("setupHint");if(!node)return;const mode=$("answerMode")?.value;const currentMode=$("sessionMode")?.value||"count";const base=currentMode==="all"?"The selected finite question pool will be tested once, without repeats.":currentMode==="timed"?"Answer as many as possible before time expires.":"The session ends after the selected number of questions.";node.textContent=base+(mode==="options"?" Single-answer choices submit on selection; select-all questions need Check answer.":" Fixed-length numeric answers and complete Yes/No or Prime/Composite tokens auto-submit. Fractions and select-all answers need Check answer; Enter is also available.");node.style.color=""};
 $("answerMode")?.addEventListener("change",answerModeHelp);answerModeHelp();
 $("startBtn").addEventListener("click",()=>start());
 $("answerForm").addEventListener("submit",e=>{e.preventDefault();submitCurrent()});
 $("endBtn").addEventListener("click",()=>{if(app.running)finish("ended")});
 $("restartBtn").addEventListener("click",()=>{
  saveSharedPrefs();saveTrainerPrefs(app.kind);
  $("startBtn").textContent="Start sprint →";
  $("setupHint").textContent="Settings are ready. Adjust the question type if needed, then start a new sprint.";
  $("setupHint").style.color="";
  document.querySelector(".setup-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
  $("questionArea").classList.add("hidden");$("resultsArea").classList.remove("hidden");
 });
 $("retryWrongBtn").addEventListener("click",()=>{const missed=app.records.filter(r=>r.status!=="correct").map(r=>r.q);if(!missed.length)return;start(missed)});
 renderTrainerHistory(kind);
}
function start(overridePool=null){
 saveSharedPrefs();saveTrainerPrefs(app.kind);
 // Keep the live settings controls mounted across sprints. Rebuilding them here can
 // reset the user's current selection when browser storage is unavailable.
 let nextOpts,nextMode,nextPool;
 try{
  nextOpts=getOpts(app.kind);nextMode=$("sessionMode").value;
  nextPool=overridePool?U.shuffle(overridePool.slice()):qPool(app.kind,$("difficulty").value,nextOpts);
 }catch(error){
  const hint=$("setupHint");if(hint){hint.textContent=error&&error.message?error.message:"These settings could not generate questions. Please review them and try again.";hint.style.color="var(--bad)";}
  return;
 }
 if(!nextPool.length){const hint=$("setupHint");if(hint){hint.textContent="No questions are available for these settings. Try another range or difficulty.";hint.style.color="var(--bad)";}return}
 const setupHint=$("setupHint");if(setupHint)setupHint.style.color="";
 clearInterval(app.clock);clearTimeout(app.qTimer);app.running=false;app.locked=false;
 app.opts=nextOpts;app.sessionMode=nextMode;app.pool=nextPool;
 app.index=0;app.records=[];app.current=null;app.running=true;app.locked=false;app.sessionStarted=Date.now();app.streak=0;app.bestStreak=0;app.wrongOnly=!!overridePool;
 app.target=app.sessionMode==="count"?Math.max(1,Math.min(10000,intOpt("questionCount",30,1,10000))):app.pool.length;
 app.timeLimit=app.sessionMode==="timed"?Math.max(15000,Math.min(10800000,Number($("duration").value||2)*60000)):0;
 if(app.sessionMode==="timed")app.deadline=Date.now()+app.timeLimit;else app.deadline=0;
 $("resultsArea").classList.add("hidden");$("questionArea").classList.remove("hidden");$("endBtn").disabled=false;$("startBtn").textContent="Restart sprint ↻";$("feedback").className="feedback neutral";$("feedback").textContent="";$("sessionNote").textContent=app.sessionMode==="all"?"Unique question pool: every generated question appears once.":"Correct and incorrect answers stay visible for 1 second before the next question.";
 $("practicePanel").scrollIntoView({behavior:"smooth",block:"start"});if(app.sessionMode==="timed"){updateClock();app.clock=setInterval(updateClock,200)}showQuestion();
}
function updateClock(){if(!app||!app.running)return;const left=app.deadline-Date.now();$("timerStat").textContent=U.formatTime(left);if(left<=0&&!app.locked)finish("time");}
function showQuestion(){
 if(!app.running)return;if(app.sessionMode==="timed"&&Date.now()>=app.deadline){finish("time");return}
 const max=app.sessionMode==="count"?app.target:app.sessionMode==="all"?app.pool.length:Infinity;
 if(app.index>=max){finish("complete");return}
 if(app.index>=app.pool.length){
  if(app.sessionMode==="timed"||app.sessionMode==="count"){app.pool=U.shuffle(app.pool);}
  else {finish("complete");return;}
 }
 app.current=app.pool[app.index % app.pool.length];app.locked=false;app.qStarted=Date.now();
 app.current.autoInputPlan=createAutoInputPlan(app.current);
 $("questionCategory").textContent=app.cfg.title.toUpperCase();$("questionText").textContent=app.current.text;$("questionHint").textContent=questionSubtext(app.current);$("questionHint").classList.toggle("hidden",!questionSubtext(app.current));$("feedback").className="feedback neutral";$("feedback").textContent="";$("targetHint").textContent=Number($("perQuestion").value)>0?`Target: ${$("perQuestion").value} seconds per question`:"";
 inputFor(app.current);updateStats();
 if(Number($("perQuestion").value)>0){const cap=Math.max(1,Number($("perQuestion").value))*1000;app.qTimer=setTimeout(()=>{if(app.running&&!app.locked){recordAnswer("",true,"timeout")}},cap)}
}
function submitCurrent(){if(!app||!app.running||app.locked||!app.current)return;const el=$("answerInput");const raw=el?el.value.trim():"";if(!raw&&app.current.kind!=="multi"){ $("feedback").className="feedback neutral";$("feedback").textContent="Enter or select an answer first.";return }recordAnswer(raw,false)}
function recordAnswer(raw,timeout=false,forcedStatus=null){
 if(!app.running||app.locked)return;app.locked=true;clearTimeout(app.qTimer);const elapsed=Date.now()-app.qStarted;const q=app.current;const correct=!timeout&&compareAnswer(q,raw);const status=timeout?"unanswered":(forcedStatus||(correct?"correct":"wrong"));
 const optionsMode=$("answerMode")?.value==="options";
 const rec={q,question:q.text,hint:questionSubtext(q),userAnswer:raw,correctAnswer:q.answer,status,correct,elapsedMs:elapsed,explanation:q.explain||""};app.records.push(rec);if(correct){app.streak++;app.bestStreak=Math.max(app.bestStreak,app.streak)}else app.streak=0;
 // Resolve every question inline, regardless of trainer, answer format, or sprint mode.
 renderResolvedQuestion(q,timeout?"":raw,correct,timeout);
 if(optionsMode){
  if(q.kind==="multi"){
   const expected=new Set(String(q.answer||"").split(/[,;\s]+/).filter(Boolean));
   $("answerControl").querySelectorAll("[data-multi]").forEach(b=>{
    const v=String(b.dataset.multi);const isRight=expected.has(v);const isSelected=!timeout&&String(raw||"").split(/[,;\s]+/).filter(Boolean).includes(v);
    if(isRight)b.classList.add("correct-option");if(isSelected&&!isRight)b.classList.add("wrong-option");
   });
  }else{
   $("answerControl").querySelectorAll("[data-choice]").forEach(b=>{
    const isRight=compareAnswer(q,b.dataset.choice);const isSelected=!timeout&&b.dataset.choice===String(raw);
    if(isRight)b.classList.add("correct-option");if(isSelected&&!correct)b.classList.add("wrong-option");
   });
  }
 }else $("answerControl").classList.add("hidden");
 if(timeout){$("feedback").className="feedback bad";$("feedback").textContent="Time target reached."}
 else if(correct){$("feedback").className="feedback good";$("feedback").textContent="✓ Correct!";}
 else{$("feedback").className="feedback bad";$("feedback").textContent=`Not quite.${q.explain?" "+q.explain:""}`}
 $("answerControl").querySelectorAll("input,button").forEach(el=>el.disabled=true);$("submitBtn").disabled=true;$("submitBtn").classList.add("hidden");updateStats();
 app.index++;
 // Always leave the resolved answer visible for one full second, including correct answers.
 app.qTimer=setTimeout(()=>{if(!app.running)return;if(app.sessionMode==="timed"&&Date.now()>=app.deadline){finish("time");return}showQuestion()},1000);
}
function updateStats(){
 const done=app.records.length;const correct=app.records.filter(r=>r.status==="correct").length;const denominator=app.sessionMode==="count"?app.target:app.sessionMode==="all"?app.pool.length:Math.max(done+1,1);
 $("questionStat").textContent=`${Math.min(done+1,denominator)} / ${app.sessionMode==="timed"?"∞":denominator}`;$("correctStat").textContent=correct;$("accuracyStat").textContent=done?`${Math.round(correct/done*100)}%`:"—";
 if(app.sessionMode!=="timed")$("timerStat").textContent=app.sessionMode==="all"?"ALL": "—";
 $("progressBar").style.width=app.sessionMode==="timed"?"0%":`${Math.min(100,done/Math.max(1,denominator)*100)}%`;
}
function finish(reason){
 if(!app||!app.running)return;
 if((reason==="time"||reason==="ended")&&app.current&&!app.locked){
  app.records.push({q:app.current,question:app.current.text,hint:questionSubtext(app.current),userAnswer:"",correctAnswer:app.current.answer,status:"unanswered",correct:false,elapsedMs:Math.max(0,Date.now()-app.qStarted),explanation:app.current.explain||""});
 }
 app.running=false;app.locked=true;clearInterval(app.clock);clearTimeout(app.qTimer);$("endBtn").disabled=true;
 // Ensure no next question can be shown after a timer/finish event.
 $("questionArea").classList.add("hidden");$("resultsArea").classList.remove("hidden");$("timerStat").textContent=reason==="time"?"00:00":reason==="complete"?"Done":"Ended";
 const records=app.records.slice();const correct=records.filter(r=>r.status==="correct").length;const wrong=records.filter(r=>r.status==="wrong").length;const skipped=records.filter(r=>r.status==="unanswered").length;const answered=correct+wrong;const accuracy=answered?Math.round(correct/answered*100):0;const elapsed=Date.now()-app.sessionStarted;const totalMs=records.reduce((s,r)=>s+r.elapsedMs,0);const avg=records.length?totalMs/records.length:0;
 $("resultsTitle").textContent=reason==="time"?"Time is up!":reason==="ended"?"Session ended":"Sprint complete!";
 $("resultsSummary").textContent=`${records.length} questions recorded · ${U.formatTime(elapsed)} elapsed · ${reason==="time"?"Time limit reached":reason==="ended"?"Ended by you":"Session target reached"}.`;
 $("resultsMetrics").innerHTML=[["Accuracy",`${accuracy}%`],["Correct",correct],["Wrong",wrong],["Unanswered",skipped],["Avg. response",`${(avg/1000).toFixed(1)}s`],["Best streak",app.bestStreak],["Questions/min",elapsed?Math.round(records.length/(elapsed/60000)):0],["Answered",answered]].map(([l,v])=>`<div class="metric-card"><small>${l}</small><strong>${v}</strong></div>`).join("");
 const slow=records.filter(r=>r.status!=="correct").length;const insight=slow?`${slow} question${slow===1?" needs":"s need"} another look. Retry missed questions to reinforce the exact skills that slowed you down.`:"Great work — all recorded answers were correct. Increase difficulty or shorten your target time to build speed.";
 $("analysisInsight").textContent=insight;
 $("reviewBody").innerHTML=records.map((r,i)=>`<tr><td>${i+1}</td><td>${U.esc(r.question)}${r.hint?`<div class="muted tiny">${U.esc(r.hint)}</div>`:""}${r.explanation?`<div class="muted tiny">${U.esc(r.explanation)}</div>`:""}</td><td>${U.esc(r.userAnswer||"—")}</td><td>${U.esc(r.correctAnswer)}</td><td class="${r.status==="correct"?"result-good":r.status==="wrong"?"result-bad":"result-skip"}">${r.status==="correct"?"Correct":r.status==="wrong"?"Wrong":"Unanswered"}</td><td>${(r.elapsedMs/1000).toFixed(1)}s</td></tr>`).join("");
 const history=loadHistory();const entry={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,trainer:app.kind,title:app.cfg.title,date:new Date().toISOString(),reason,mode:app.sessionMode,questions:records.length,correct,wrong,unanswered:skipped,accuracy,elapsedMs:elapsed,avgMs:avg,bestStreak:app.bestStreak,records:records.map(r=>({question:r.question,hint:r.hint,userAnswer:r.userAnswer,correctAnswer:r.correctAnswer,status:r.status,elapsedMs:r.elapsedMs,explanation:r.explanation}))};history.push(entry);saveHistory(history);$("progressBar").style.width="100%";$("submitBtn").disabled=false;$("startBtn").textContent="Start sprint →";$("retryWrongBtn").classList.toggle("hidden",!records.some(r=>r.status!=="correct"));renderTrainerHistory(app.kind);if(global.MathSprintHub&&global.MathSprintHub.refresh)global.MathSprintHub.refresh();
}
function renderTrainerHistory(kind){const h=loadHistory().filter(x=>x.trainer===kind);const node=$("trainerHistory");if(!node)return;if(!h.length){node.textContent="No completed sessions yet.";return}const sessions=h.length,questions=h.reduce((s,x)=>s+x.questions,0),correct=h.reduce((s,x)=>s+x.correct,0),accuracy=questions?Math.round(correct/questions*100):0;node.textContent=`${sessions} session${sessions===1?"":"s"} · ${questions} questions · ${accuracy}% overall accuracy`}
global.MathSprint={mount,loadHistory,saveHistory,configs};
})(window);
