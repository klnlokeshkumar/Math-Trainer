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
 primetest:{title:"Prime or composite?",kind:"choice",auto:false,options:[{id:"numberMax",label:"Maximum number",type:"select",choices:[["100","Up to 100"],["200","Up to 200"],["500","Up to 500"],["1000","Up to 1000"]],value:"200"}]}
};
function readStoredObject(key){try{const value=JSON.parse(localStorage.getItem(key)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch(e){return {}}}
function writeStoredObject(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function loadHistory(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v:[]}catch(e){return []}}
function saveHistory(v){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(v.slice(-500)))}catch(e){}}
function optionValue(id){const el=$(id);return el?el.value:null}
function setStoredControl(id,value){const el=$(id);if(!el||value===undefined||value===null||value==="")return;if(el.tagName==="SELECT"){if([...el.options].some(o=>o.value===String(value)))el.value=String(value);return;}if(el.type==="number"){const n=Number(value),min=el.min===""?-Infinity:Number(el.min),max=el.max===""?Infinity:Number(el.max);if(Number.isFinite(n)&&n>=min&&n<=max)el.value=String(value);return;}el.value=String(value)}
function loadSharedPrefs(){return readStoredObject(SHARED_PREFS_KEY)}
function applySharedPrefs(kind){const prefs=loadSharedPrefs();if(!Object.prototype.hasOwnProperty.call(prefs,"answerMode")){const defaults={table:"input",multiply2:"input",squares:"input",cubes:"input",fracdec:"input",percent:"input",divisibility:"options",lastdigits:"input",approxdiv:"options",primehunt:"options",primetest:"options"};setStoredControl("answerMode",defaults[kind]||"input");}["answerMode","difficulty","sessionMode","questionCount","duration","perQuestion"].forEach(id=>setStoredControl(id,prefs[id]));}
function saveSharedPrefs(){const prefs=loadSharedPrefs();["answerMode","difficulty","sessionMode","questionCount","duration","perQuestion"].forEach(id=>{const el=$(id);if(el&&el.value!=="")prefs[id]=el.value;});if($("rootMode"))prefs.rootMode=$("rootMode").value;if($("rootPrecision"))prefs.rootPrecision=$("rootPrecision").value;if(app&&(app.kind==="squares"||app.kind==="cubes")&&$("direction")){const direction=$("direction").value;prefs.rootQuestionType=direction==="mixed"?"mixed":direction==="root"?"root":"power";}writeStoredObject(SHARED_PREFS_KEY,prefs)}
function loadTrainerPrefs(){return readStoredObject(TRAINER_PREFS_KEY)}
function saveTrainerPrefs(kind){const all=loadTrainerPrefs(),prefs={...(all[kind]||{})};(configs[kind]?.options||[]).forEach(o=>{const el=$(o.id);if(el&&el.value!=="")prefs[o.id]=el.value;});if(kind==="table"&&$("tableChecks"))prefs.selectedTables=[...$("tableChecks").querySelectorAll("input:checked")].map(el=>+el.value);all[kind]=prefs;writeStoredObject(TRAINER_PREFS_KEY,all)}
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
function divRules(n){const rules=[2,3,4,5,6,8,9,10,11,12,25];return rules.filter(d=>n%d===0)}
function qPool(kind,difficulty,opts){
 const rand=U.rand, shuffle=U.shuffle, q=[];let maxRoot=+opts.maxRoot||50;
 const add=(text,answer,extra={})=>q.push(makeQ(text,answer,extra));
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
  fracs.forEach(([n,d])=>{const s=U.simplify(n,d),pct=n/d*100;if(dir!=="toPercent")add(`${Number(pct.toFixed(4))}% = fraction in simplest form?`,s.text,{kind:"fraction",explain:`${Number(pct.toFixed(4))}% = ${pct}/100 = ${s.text}`});if(dir!=="toFraction")add(`${s.text} = ?%`,Number(pct.toFixed(4)),{kind:"decimal",explain:`${s.text} × 100 = ${Number(pct.toFixed(4))}%`})});
 } else if(kind==="divisibility"){
  const ds=opts.divisorSet==="core"?[2,3,5,9,10]:[2,3,4,5,6,8,9,10,11,12,25];const type=opts.questionType;
  for(let n=100;n<=9999;n+=rand(1,7)){const d=ds[rand(0,ds.length-1)],yes=n%d===0;if(type==="multiple"){const valid=divRules(n).filter(x=>ds.includes(x));add(`Select all rules that divide ${n}`,valid.join(","),{kind:"multi",options:ds.map(String),explain:`Divisors in this rule set: ${valid.join(", ")||"none"}`})}else add(`Is ${n} divisible by ${d}?`,yes?"Yes":"No",{kind:"choice",options:["Yes","No"],explain:yes?`${n} ÷ ${d} is an integer.`:`${n} is not divisible by ${d}.`})}
 } else if(kind==="lastdigits"){
  const mode=opts.digits,baseMax=intOpt("baseMax",30,2,99);for(let b=2;b<=baseMax;b++)for(let e=2;e<=80;e++){if(mode!=="2")add(`Find the unit digit of ${b}^${e}`,String(U.powerMod(b,e,10)),{explain:`Reduce ${b}^${e} modulo 10; answer ${U.powerMod(b,e,10)}.`});if(mode!=="1"&&mode!=="product")add(`Find the last two digits of ${b}^${e}`,String(U.powerMod(b,e,100)).padStart(2,"0"),{explain:`${b}^${e} mod 100 = ${String(U.powerMod(b,e,100)).padStart(2,"0")}.`,kind:"last2"});}
  if(mode==="product")for(let a=2;a<=baseMax;a++)for(let b=2;b<=baseMax;b++)for(let e=2;e<=25;e++)add(`Find the unit digit of ${a}^${e} × ${b}^${e+1}`,String(U.powerMod(a,e,10)*U.powerMod(b,e+1,10)%10),{explain:`Only unit digits matter: ${U.powerMod(a,e,10)} × ${U.powerMod(b,e+1,10)} gives the unit digit.`});
 } else if(kind==="approxdiv"){
  const dmax=intOpt("divisorMax",99,10,500),mode=opts.precision;for(let d=10;d<=dmax;d++)for(let qn=10;qn<=200;qn+=3){const numerator=d*qn+rand(-Math.floor(d/3),Math.floor(d/3));if(numerator<=0)continue;const exact=numerator/d;const answer=mode==="tenth"?(Math.round(exact*10)/10).toFixed(1):String(Math.round(exact));const val=Number(answer);const choices=new Set([val,mode==="tenth"?Math.round((val-0.2)*10)/10:val-2,mode==="tenth"?Math.round((val+0.2)*10)/10:val+2,mode==="tenth"?Math.round((val+0.5)*10)/10:val+1]);add(`${numerator} ÷ ${d} = ?`,answer,{kind:"choice",hint:mode==="tenth"?"(1 Decimal)":"(Nearest Integer)",options:shuffle([...choices].map(String)),explain:`Exact quotient ≈ ${exact.toFixed(3)}; rounded answer ${answer}.`})}
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
 }
 // difficulty filters keep a meaningful finite pool; progressive is mixed and uses all levels.
 const tagged=q.map((item,i)=>({...item,level:kind==="multiply2"?(Math.max(...item.text.match(/\d+/g).map(Number))<35?"easy":Math.max(...item.text.match(/\d+/g).map(Number))<70?"medium":"hard"):i%3===0?"easy":i%3===1?"medium":"hard"}));
 let filtered=tagged;
 if(difficulty==="easy")filtered=tagged.filter(x=>x.level==="easy");
 if(difficulty==="medium")filtered=tagged.filter(x=>x.level==="medium");
 if(difficulty==="hard")filtered=tagged.filter(x=>x.level==="hard");
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
 const correct=String(q.answer),values=[correct];
 const push=v=>{if(v===null||v===undefined||!String(v).trim())return;const text=String(v);if(!values.some(existing=>choiceEquivalent(q,existing,text)))values.push(text)};
 if(q.kind==="fraction"){
  const match=correct.match(/^(-?\d+)\/(\d+)$/);
  if(match){const n=Number(match[1]),d=Number(match[2]);[U.simplify(n+1,d).text,U.simplify(Math.max(0,n-1),d).text,U.simplify(n,d+1).text,U.simplify(n+1,d+1).text,U.simplify(n+2,d).text,U.simplify(n,d+2).text].forEach(push);}
  ["1/2","1/3","1/4","2/3","3/4","1/5","2/5","3/5","4/5","1/8"].forEach(push);
 }else{
  const number=Number(correct);
  if(Number.isFinite(number)){
   const isDecimal=q.kind==="decimal",isLastTwo=q.kind==="last2";
   const decimalPlaces=isDecimal?(correct.split(".")[1]||"").length:0;
   const unit=isDecimal?Math.pow(10,-Math.max(1,decimalPlaces)):1;
   let deltas;
   if(isLastTwo)deltas=[1,-1,2,-2,5,-5,10,-10,20,-20,25,-25];
   else if(isDecimal)deltas=[unit,-unit,2*unit,-2*unit,5*unit,-5*unit,10*unit,-10*unit,0.1,-0.1,1,-1];
   else {const magnitude=Math.pow(10,Math.max(0,String(Math.trunc(Math.abs(number))).length-2));deltas=[1,-1,2,-2,10,-10,magnitude,-magnitude,3,-3,100,-100];}
   deltas.forEach(delta=>{let candidate=number+delta;if(isLastTwo)candidate=((Math.round(candidate)%100)+100)%100;else if(!isDecimal)candidate=Math.round(candidate);if(candidate<0&&number>=0)return;let text=isDecimal?candidate.toFixed(Math.min(6,Math.max(1,decimalPlaces))):isLastTwo?String(Math.round(candidate)).padStart(2,"0"):String(Math.round(candidate));push(text)});
  }
 }
 // Add a few distant candidates as a fallback for answers with a narrow number range.
 if(values.length<4&&Number.isFinite(Number(correct))){const n=Number(correct);for(let k=3;values.length<4&&k<100;k++){const v=q.kind==="decimal"?n+k/100:n+k;if(v>=0)push(q.kind==="decimal"?v.toFixed(Math.min(6,Math.max(1,(correct.split(".")[1]||"").length))):q.kind==="last2"?String(Math.round(v)%100).padStart(2,"0"):String(Math.round(v)));}}
 return U.shuffle(values.slice(0,4));
}
function inputFor(q){
 const host=$("answerControl"),optionsMode=$("answerMode")?.value==="options";host.innerHTML="";
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
  const placeholder=q.kind==="fraction"?"e.g. 3/8":q.kind==="multi"?"e.g. 2, 3, 5":q.kind==="decimal"?"Enter decimal":q.kind==="choice"?"Type your answer":"Your answer";
  const inputMode=(q.kind==="fraction"||q.kind==="multi"||q.kind==="choice")?"text":"decimal";
  host.innerHTML=`${q.kind==="multi"?'<p class="muted tiny">Enter all answers separated by commas (or leave blank if none apply).</p>':""}<input id="answerInput" class="answer-input" type="text" inputmode="${inputMode}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${U.esc(placeholder)}" aria-label="Your answer">`;
 }
 const input=$("answerInput");if(input&&input.type!=="hidden"){input.addEventListener("input",()=>{if(q.kind==="numeric"&&/^-?\d+$/.test(input.value)&&q.autoDigits&&$("answerMode")?.value!=="options"&&input.value.length>=String(q.answer).length)submitCurrent()});input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submitCurrent()}});if(q.kind==="numeric"&&q.autoDigits&&$("answerMode")?.value!=="options")input.dataset.autosubmit="true";input.focus({preventScroll:true})}
 // Single-answer multiple choice submits on selection; multi-select still requires an explicit check.
 submitBtn.classList.toggle("hidden",optionsMode&&q.kind!=="multi");
}
function renderResolvedQuestion(q, shownAnswer, isCorrect, isTimeout=false){
 const node=$("questionText");if(!node)return;node.textContent="";
 const source=String(q.text||"");const idx=source.lastIndexOf("?");
 const before=idx>=0?source.slice(0,idx):source;const after=idx>=0?source.slice(idx+1):"";
 const equationPlaceholder=idx>=0&&(/=\s*$/.test(before));
 const addAnswer=(value,className,del=false)=>{const span=document.createElement("span");span.className=className;span.textContent=String(value);if(del)span.style.textDecoration="line-through";node.appendChild(span)};
 if(equationPlaceholder){
  node.appendChild(document.createTextNode(before));
  if(!isCorrect&&!isTimeout){addAnswer(shownAnswer,"answer-reveal-bad",true);node.appendChild(document.createTextNode(" "));}
  addAnswer(q.answer,"answer-reveal-good");
  if(after)node.appendChild(document.createTextNode(after));
 }else{
  const prompt=idx>=0?source.slice(0,idx).trimEnd():source;
  if(prompt)node.appendChild(document.createTextNode(prompt));
  if(prompt)node.appendChild(document.createTextNode(" — "));
  if(!isCorrect&&!isTimeout){addAnswer(shownAnswer,"answer-reveal-bad",true);node.appendChild(document.createTextNode(" "));}
  addAnswer(q.answer,"answer-reveal-good");
  if(after)node.appendChild(document.createTextNode(after));
 }
}
function compareAnswer(q,raw){
 if(q.kind==="multi"){const normalize=value=>String(value||"").trim().toLowerCase()==="none"?[]:String(value||"").split(/[,;\s]+/).filter(Boolean).map(v=>v.trim()).sort((a,b)=>Number(a)-Number(b));const a=normalize(raw),e=normalize(q.answer);return a.length===e.length&&a.every((v,i)=>v===e[i])}
 if(q.kind==="fraction")return U.equivalentFraction(raw,q.answer);
 if(q.kind==="decimal")return U.sameDecimal(raw,q.answer);
 if(q.kind==="last2"){const normalize=value=>{const text=String(value).trim();return /^\d+$/.test(text)?String(Number(text)):text.replace(/^0+(?=\d)/,"")};return normalize(raw)===normalize(q.answer)}
 if(q.kind==="choice")return String(raw).trim().toLowerCase()===String(q.answer).trim().toLowerCase();
 if(q.kind==="numeric")return String(raw).trim()===String(q.answer);
 return String(raw).trim()===String(q.answer);
}
let app=null;
function mount(kind){
 const cfg=configs[kind];if(!cfg)return;app={kind,cfg,opts:null,pool:[],index:0,records:[],current:null,running:false,locked:false,deadline:0,qStarted:0,qTimer:null,clock:null,sessionStarted:0,target:0,sessionMode:"count",timeLimit:0,wrongOnly:null,streak:0,bestStreak:0};
 applySharedPrefs(kind);bindSharedPrefs();buildOptions(kind);
 const updateMode=()=>{const mode=$("sessionMode").value;$("countWrap").classList.toggle("hidden",mode!=="count");$("durationWrap").classList.toggle("hidden",mode!=="timed");$("setupHint").textContent=mode==="all"?"The selected finite question pool will be tested once, without repeats.":mode==="timed"?"Answer as many as possible before time expires.":"The session ends after the selected number of questions.";};
 $("sessionMode").addEventListener("change",updateMode);updateMode();
 const answerModeHelp=()=>{const node=$("setupHint");if(!node)return;const mode=$("answerMode")?.value;const currentMode=$("sessionMode")?.value||"count";const base=currentMode==="all"?"The selected finite question pool will be tested once, without repeats.":currentMode==="timed"?"Answer as many as possible before time expires.":"The session ends after the selected number of questions.";node.textContent=base+(mode==="options"?" Answer format is multiple-choice.":" Answer format is typed input.")};
 $("answerMode")?.addEventListener("change",answerModeHelp);answerModeHelp();
 $("startBtn").addEventListener("click",()=>start());
 $("answerForm").addEventListener("submit",e=>{e.preventDefault();submitCurrent()});
 $("endBtn").addEventListener("click",()=>{if(app.running)finish("ended")});
 $("restartBtn").addEventListener("click",()=>{ $("practicePanel").scrollIntoView({behavior:"smooth",block:"start"});start()});
 $("retryWrongBtn").addEventListener("click",()=>{const missed=app.records.filter(r=>r.status!=="correct").map(r=>r.q);if(!missed.length)return;start(missed)});
 renderTrainerHistory(kind);
}
function start(overridePool=null){
 saveSharedPrefs();saveTrainerPrefs(app.kind);clearInterval(app.clock);clearTimeout(app.qTimer);app.opts=getOpts(app.kind);app.sessionMode=$("sessionMode").value;app.pool=overridePool?U.shuffle(overridePool.slice()):qPool(app.kind,$("difficulty").value,app.opts);if(!app.pool.length){alert("No questions are available for these settings. Try another range or difficulty.");return}
 app.index=0;app.records=[];app.current=null;app.running=true;app.locked=false;app.sessionStarted=Date.now();app.streak=0;app.bestStreak=0;app.wrongOnly=!!overridePool;
 app.target=app.sessionMode==="count"?Math.max(1,Math.min(10000,intOpt("questionCount",30,1,10000))):app.pool.length;
 app.timeLimit=app.sessionMode==="timed"?Math.max(15000,Math.min(10800000,Number($("duration").value||2)*60000)):0;
 if(app.sessionMode==="timed")app.deadline=Date.now()+app.timeLimit;else app.deadline=0;
 $("resultsArea").classList.add("hidden");$("questionArea").classList.remove("hidden");$("endBtn").disabled=false;$("startBtn").textContent="Restart sprint ↻";$("feedback").className="feedback neutral";$("feedback").textContent="";$("sessionNote").textContent=app.sessionMode==="all"?"Unique question pool: every generated question appears once.":"Correct advances immediately; wrong answers show the answer for 1 second.";
 $("practicePanel").scrollIntoView({behavior:"smooth",block:"start"});if(app.sessionMode==="timed"){updateClock();app.clock=setInterval(updateClock,200)}showQuestion();
}
function updateClock(){if(!app.running)return;const left=app.deadline-Date.now();$("timerStat").textContent=U.formatTime(left);if(left<=0)finish("time");}
function showQuestion(){
 if(!app.running)return;if(app.sessionMode==="timed"&&Date.now()>=app.deadline){finish("time");return}
 const max=app.sessionMode==="count"?app.target:app.sessionMode==="all"?app.pool.length:Infinity;
 if(app.index>=max){finish("complete");return}
 if(app.index>=app.pool.length){
  if(app.sessionMode==="timed"||app.sessionMode==="count"){app.pool=U.shuffle(app.pool);}
  else {finish("complete");return;}
 }
 app.current=app.pool[app.index % app.pool.length];app.locked=false;app.qStarted=Date.now();
 if(app.current.kind==="numeric"&&app.cfg.auto&&/^-?\d+$/.test(String(app.current.answer))&&$("answerMode")?.value!=="options"){app.current.autoDigits=true}else{app.current.autoDigits=false}
 $("questionType").textContent=app.cfg.title.toUpperCase();$("questionText").textContent=app.current.text;$("questionHint").textContent=app.current.hint||"";$("feedback").className="feedback neutral";$("feedback").textContent="";$("targetHint").textContent=Number($("perQuestion").value)>0?`Target: ${$("perQuestion").value} seconds per question`:"";
 inputFor(app.current);updateStats();
 if(Number($("perQuestion").value)>0){const cap=Math.max(1,Number($("perQuestion").value))*1000;app.qTimer=setTimeout(()=>{if(app.running&&!app.locked){recordAnswer("",true,"timeout")}},cap)}
}
function submitCurrent(){if(!app||!app.running||app.locked||!app.current)return;const el=$("answerInput");const raw=el?el.value.trim():"";if(!raw&&app.current.kind!=="multi"){ $("feedback").className="feedback neutral";$("feedback").textContent="Enter or select an answer first.";return }recordAnswer(raw,false)}
function recordAnswer(raw,timeout=false,forcedStatus=null){
 if(!app.running||app.locked)return;app.locked=true;clearTimeout(app.qTimer);const elapsed=Date.now()-app.qStarted;const q=app.current;const correct=!timeout&&compareAnswer(q,raw);const status=forcedStatus||(timeout?"unanswered":correct?"correct":"wrong");
 const optionsMode=$("answerMode")?.value==="options";const autoSingleChoice=optionsMode&&q.kind!=="multi";
 const rec={q,question:q.text,hint:q.hint||"",userAnswer:raw,correctAnswer:q.answer,status,correct,elapsedMs:elapsed,explanation:q.explain||""};app.records.push(rec);if(correct){app.streak++;app.bestStreak=Math.max(app.bestStreak,app.streak)}else app.streak=0;
 if(autoSingleChoice){
  renderResolvedQuestion(q,timeout?q.answer:raw,correct,timeout);
  $("answerControl").querySelectorAll("[data-choice]").forEach(b=>{
   const isRight=compareAnswer(q,b.dataset.choice);const isSelected=!timeout&&b.dataset.choice===String(raw);
   if(isRight)b.classList.add("correct-option");if(isSelected&&!correct)b.classList.add("wrong-option");
  });
 }
 if(timeout){$("feedback").className="feedback bad";$("feedback").textContent=`Time target reached. Correct answer: ${q.answer}.`}
 else if(correct){$("feedback").className="feedback good";$("feedback").textContent="✓ Correct!";}else{$("feedback").className="feedback bad";$("feedback").textContent=`Not quite — correct answer: ${q.answer}${q.explain?" · "+q.explain:""}`}
 $("answerControl").querySelectorAll("input,button").forEach(el=>el.disabled=true);$("submitBtn").disabled=true;updateStats();
 app.index++;
 const delay=autoSingleChoice?1000:(correct?0:1000);
 if(app.sessionMode==="timed"&&Date.now()>=app.deadline){finish("time");return}
 if(delay===0){showQuestion()}else app.qTimer=setTimeout(()=>{if(!app.running)return;if(app.sessionMode==="timed"&&Date.now()>=app.deadline){finish("time");return}showQuestion()},delay);
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
  app.records.push({q:app.current,question:app.current.text,userAnswer:"",correctAnswer:app.current.answer,status:"unanswered",correct:false,elapsedMs:Math.max(0,Date.now()-app.qStarted),explanation:app.current.explain||""});
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
 const history=loadHistory();const entry={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,trainer:app.kind,title:app.cfg.title,date:new Date().toISOString(),reason,mode:app.sessionMode,questions:records.length,correct,wrong,unanswered:skipped,accuracy,elapsedMs:elapsed,avgMs:avg,bestStreak:app.bestStreak,records:records.map(r=>({question:r.question,hint:r.hint,userAnswer:r.userAnswer,correctAnswer:r.correctAnswer,status:r.status,elapsedMs:r.elapsedMs,explanation:r.explanation}))};history.push(entry);saveHistory(history);$("progressBar").style.width="100%";$("submitBtn").disabled=false;$("retryWrongBtn").classList.toggle("hidden",!records.some(r=>r.status!=="correct"));renderTrainerHistory(app.kind);if(global.MathSprintHub&&global.MathSprintHub.refresh)global.MathSprintHub.refresh();
}
function renderTrainerHistory(kind){const h=loadHistory().filter(x=>x.trainer===kind);const node=$("trainerHistory");if(!node)return;if(!h.length){node.textContent="No completed sessions yet.";return}const sessions=h.length,questions=h.reduce((s,x)=>s+x.questions,0),correct=h.reduce((s,x)=>s+x.correct,0),accuracy=questions?Math.round(correct/questions*100):0;node.textContent=`${sessions} session${sessions===1?"":"s"} · ${questions} questions · ${accuracy}% overall accuracy`}
global.MathSprint={mount,loadHistory,saveHistory,configs};
})(window);
