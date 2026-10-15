/* Shared session engine: robust timer boundaries, grading, result review and local history. */
(function(global){
"use strict";
const U=global.MathUtils, STORAGE_KEY="mathSprintHistoryV1";
const $=id=>document.getElementById(id);
const configs={
 table:{title:"Tables 20 × 20",kind:"numeric",auto:true,options:[
  {id:"operation",label:"Operation",type:"select",choices:[["mixed","Mixed × and ÷"],["multiply","Multiplication"],["divide","Division"]],value:"mixed"},
  {id:"tables",label:"Tables",type:"select",choices:[["all","All tables 1–20"],["custom","Choose tables"]],value:"all"},
  {id:"rangeStart",label:"Factor start",type:"number",min:1,max:1000,value:1},{id:"rangeEnd",label:"Factor end",type:"number",min:1,max:1000,value:20}
 ]},
 multiply2:{title:"Two-digit multiplication",kind:"numeric",auto:true,options:[{id:"operandMin",label:"Minimum operand",type:"number",min:10,max:99,value:10},{id:"operandMax",label:"Maximum operand",type:"number",min:10,max:99,value:99}]},
 squares:{title:"Squares and square roots",kind:"numeric",auto:true,options:[{id:"maxRoot",label:"Maximum root",type:"number",min:5,max:100,value:50},{id:"direction",label:"Question type",type:"select",choices:[["mixed","Mixed"],["square","Find square"],["root","Find square root"]],value:"mixed"}]},
 cubes:{title:"Cubes and cube roots",kind:"numeric",auto:true,options:[{id:"maxRoot",label:"Maximum root",type:"number",min:3,max:50,value:20},{id:"direction",label:"Question type",type:"select",choices:[["mixed","Mixed"],["cube","Find cube"],["root","Find cube root"]],value:"mixed"}]},
 fracdec:{title:"Fractions to decimals",kind:"decimal",auto:false,options:[{id:"precision",label:"Decimal mode",type:"select",choices:[["exact","Exact decimal (≤2 places)"],["round","Round to 2 places"]],value:"exact"},{id:"fractionDifficulty",label:"Fraction set",type:"select",choices:[["common","Common fractions"],["wide","Wider fractions"]],value:"common"}]},
 percent:{title:"Percentages ↔ fractions",kind:"mixed",auto:false,options:[{id:"direction",label:"Direction",type:"select",choices:[["mixed","Mixed"],["toFraction","Percent → fraction"],["toPercent","Fraction → percent"]],value:"mixed"}]},
 divisibility:{title:"Divisibility rules",kind:"choice",auto:false,options:[{id:"divisorSet",label:"Rule set",type:"select",choices:[["core","Core: 2, 3, 5, 9, 10"],["full","Full: 2,3,4,5,6,8,9,10,11,12,25"]],value:"full"},{id:"questionType",label:"Question type",type:"select",choices:[["yesno","Divisible? Yes / no"],["multiple","Which rules apply? (select all)"]],value:"yesno"}]},
 lastdigits:{title:"Unit and last two digits",kind:"numeric",auto:true,options:[{id:"digits",label:"Find",type:"select",choices:[["1","Unit digit"],["2","Last two digits"],["mixed","Mixed"],["product","Product of powers (unit digit)"]],value:"mixed"},{id:"baseMax",label:"Maximum base",type:"number",min:2,max:99,value:30}]},
 approxdiv:{title:"Approximate division",kind:"choice",auto:false,options:[{id:"precision",label:"Estimate to",type:"select",choices:[["integer","Nearest integer"],["tenth","Nearest tenth"]],value:"integer"},{id:"divisorMax",label:"Maximum divisor",type:"number",min:10,max:500,value:99}]},
 primehunt:{title:"Prime hunt: 1–200",kind:"choice",auto:false,options:[{id:"gridSize",label:"Numbers per round",type:"select",choices:[["20","20 numbers"],["50","50 numbers"],["200","Full 1–200 grid"]],value:"20"}]},
 primetest:{title:"Prime or composite?",kind:"choice",auto:false,options:[{id:"numberMax",label:"Maximum number",type:"select",choices:[["100","Up to 100"],["200","Up to 200"],["500","Up to 500"],["1000","Up to 1000"]],value:"200"}]}
};
function loadHistory(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v:[]}catch(e){return []}}
function saveHistory(v){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(v.slice(-500)))}catch(e){}}
function optionValue(id){const el=$(id);return el?el.value:null}
function intOpt(id,def,min=1,max=100000){const v=parseInt(optionValue(id),10);return Number.isFinite(v)?Math.min(max,Math.max(min,v)):def}
function selectOption(label,choices,value){return `<label>${U.esc(label)}<select data-option="${U.esc(value.id)}" id="${U.esc(value.id)}">${value.choices.map(c=>`<option value="${U.esc(c[0])}" ${c[0]===value.value?"selected":""}>${U.esc(c[1])}</option>`).join("")}</select></label>`}
function buildOptions(kind){const cfg=configs[kind];const host=$("trainerOptions");host.innerHTML="";cfg.options.forEach(o=>{let el;if(o.type==="select")el=selectOption(o.label,o.choices,o);else el=`<label>${U.esc(o.label)}<input data-option="${o.id}" id="${o.id}" type="number" min="${o.min}" max="${o.max}" value="${o.value}"></label>`;host.insertAdjacentHTML("beforeend",el)});
 if(kind==="table"){const box=document.createElement("div");box.className="option-group";box.id="tableChecks";box.style.gridColumn="1/-1";box.innerHTML=Array.from({length:20},(_,i)=>`<label><input type="checkbox" value="${i+1}" ${i>=1&&i<=9?"checked":""}>${i+1}</label>`).join("");host.append(box);const mode=$("tables");const update=()=>box.classList.toggle("hidden",mode.value!=="custom");mode.addEventListener("change",update);update();}
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
  const dir=opts.direction;const max=intOpt("maxRoot",50,5,100);for(let n=1;n<=max;n++){if(dir!=="root")add(`${n}² = ?`,n*n,{explain:`${n} × ${n} = ${n*n}`});if(dir!=="square")add(`√${n*n} = ?`,n,{explain:`${n}² = ${n*n}, so √${n*n} = ${n}`})}
 } else if(kind==="cubes"){
  const dir=opts.direction;const max=intOpt("maxRoot",20,3,50);for(let n=1;n<=max;n++){if(dir!=="root")add(`${n}³ = ?`,n*n*n,{explain:`${n} × ${n} × ${n} = ${n*n*n}`});if(dir!=="cube")add(`∛${n*n*n} = ?`,n,{explain:`${n}³ = ${n*n*n}, so ∛${n*n*n} = ${n}`})}
 } else if(kind==="fracdec"){
  const common=[[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,8],[3,8],[5,8],[7,8],[1,10],[3,10],[7,10],[9,10],[1,20],[3,20],[7,20],[9,20],[11,20],[13,20],[17,20],[19,20],[1,25],[7,25],[9,25],[11,25],[13,25],[1,40],[3,40]];
  const wide=[];for(let d=2;d<=40;d++)for(let n=1;n<d;n++)if((n/d*100)%1===0||d<=20)wide.push([n,d]);
  const arr=opts.fractionDifficulty==="wide"?wide:common;const mode=opts.precision;
  arr.forEach(([n,d])=>{const val=n/d;const answer=mode==="round"?(Math.round((val+Number.EPSILON)*100)/100).toFixed(2):String(Number(val.toFixed(2)));if(mode==="exact"&&Math.abs(val-Math.round(val*100)/100)>1e-9)return;add(`${n}/${d} = ?`,answer,{kind:"decimal",explain:`${n} ÷ ${d} = ${answer}`})});
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
  const dmax=intOpt("divisorMax",99,10,500),mode=opts.precision;for(let d=10;d<=dmax;d++)for(let qn=10;qn<=200;qn+=3){const numerator=d*qn+rand(-Math.floor(d/3),Math.floor(d/3));if(numerator<=0)continue;const exact=numerator/d;const answer=mode==="tenth"?(Math.round(exact*10)/10).toFixed(1):String(Math.round(exact));const val=Number(answer);const choices=new Set([val,mode==="tenth"?Math.round((val-0.2)*10)/10:val-2,mode==="tenth"?Math.round((val+0.2)*10)/10:val+2,mode==="tenth"?Math.round((val+0.5)*10)/10:val+1]);add(`Estimate ${numerator} ÷ ${d} to the nearest ${mode==="tenth"?"tenth":"integer"}`,answer,{kind:"choice",options:shuffle([...choices].map(String)),explain:`Exact quotient ≈ ${exact.toFixed(3)}; rounded answer ${answer}.`})}
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
function inputFor(q){
 const host=$("answerControl");host.innerHTML="";$("submitBtn").classList.remove("hidden");
 if(q.kind==="choice"){
  host.innerHTML=`<div class="answer-options">${q.options.map((v,i)=>`<button type="button" data-choice="${U.esc(v)}">${U.esc(v)}</button>`).join("")}</div><input type="hidden" id="answerInput" value="">`;
  host.querySelectorAll("[data-choice]").forEach(b=>b.addEventListener("click",()=>{host.querySelectorAll("[data-choice]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("answerInput").value=b.dataset.choice;if(q.options.length===2)submitCurrent()}));
 } else if(q.kind==="multi"){
  host.innerHTML=`<div class="answer-options">${q.options.map(v=>`<button type="button" data-multi="${U.esc(v)}" aria-pressed="false">${U.esc(v)}</button>`).join("")}</div><p class="muted tiny">Select all that apply, then press Check answer.</p><input type="hidden" id="answerInput" value="">`;
  const selected=new Set();host.querySelectorAll("[data-multi]").forEach(b=>b.addEventListener("click",()=>{const v=b.dataset.multi;if(selected.has(v)){selected.delete(v);b.classList.remove("selected");b.setAttribute("aria-pressed","false")}else{selected.add(v);b.classList.add("selected");b.setAttribute("aria-pressed","true")}$("answerInput").value=[...selected].sort((a,b)=>+a-+b).join(",")}));
 } else {
  host.innerHTML=`<input id="answerInput" class="answer-input" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${q.kind==="fraction"?"e.g. 3/8":q.kind==="decimal"?"Enter decimal":"Your answer"}" aria-label="Your answer">`;
 }
 const input=$("answerInput");if(input&&input.type!=="hidden"){input.addEventListener("input",()=>{if(q.kind==="numeric"&&/^-?\d+$/.test(input.value)&&q.autoDigits&&input.value.length>=String(q.answer).length)submitCurrent();});input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submitCurrent()}});if(q.kind==="numeric"&&q.autoDigits){input.dataset.autosubmit="true"}input.focus({preventScroll:true})}
 $("submitBtn").textContent=q.kind==="choice"&&q.options.length===2?"Check answer":"Check answer";
 $("submitBtn").classList.toggle("hidden",q.kind==="choice"&&q.options.length===2);
}
function compareAnswer(q,raw){
 if(q.kind==="multi"){const a=String(raw||"").split(",").filter(Boolean).map(String).sort((a,b)=>+a-+b);const e=String(q.answer||"").split(",").filter(Boolean).map(String).sort((a,b)=>+a-+b);return a.length===e.length&&a.every((v,i)=>v===e[i])}
 if(q.kind==="fraction")return U.equivalentFraction(raw,q.answer);
 if(q.kind==="decimal")return U.sameDecimal(raw,q.answer);
 if(q.kind==="last2")return String(raw).trim().replace(/^0+/,"")===String(q.answer).replace(/^0+/,"");
 if(q.kind==="choice")return String(raw).trim().toLowerCase()===String(q.answer).trim().toLowerCase();
 if(q.kind==="numeric")return String(raw).trim()===String(q.answer);
 return String(raw).trim()===String(q.answer);
}
let app=null;
function mount(kind){
 const cfg=configs[kind];if(!cfg)return;app={kind,cfg,opts:null,pool:[],index:0,records:[],current:null,running:false,locked:false,deadline:0,qStarted:0,qTimer:null,clock:null,sessionStarted:0,target:0,sessionMode:"count",timeLimit:0,wrongOnly:null,streak:0,bestStreak:0};
 buildOptions(kind);
 const updateMode=()=>{const mode=$("sessionMode").value;$("countWrap").classList.toggle("hidden",mode!=="count");$("durationWrap").classList.toggle("hidden",mode!=="timed");$("setupHint").textContent=mode==="all"?"The selected finite question pool will be tested once, without repeats.":mode==="timed"?"Answer as many as possible before time expires.":"The session ends after the selected number of questions.";};
 $("sessionMode").addEventListener("change",updateMode);updateMode();
 $("startBtn").addEventListener("click",()=>start());
 $("answerForm").addEventListener("submit",e=>{e.preventDefault();submitCurrent()});
 $("endBtn").addEventListener("click",()=>{if(app.running)finish("ended")});
 $("restartBtn").addEventListener("click",()=>{ $("practicePanel").scrollIntoView({behavior:"smooth",block:"start"});start()});
 $("retryWrongBtn").addEventListener("click",()=>{const missed=app.records.filter(r=>r.status!=="correct").map(r=>r.q);if(!missed.length)return;start(missed)});
 renderTrainerHistory(kind);
}
function start(overridePool=null){
 clearInterval(app.clock);clearTimeout(app.qTimer);app.opts=getOpts(app.kind);app.sessionMode=$("sessionMode").value;app.pool=overridePool?U.shuffle(overridePool.slice()):qPool(app.kind,$("difficulty").value,app.opts);if(!app.pool.length){alert("No questions are available for these settings. Try another range or difficulty.");return}
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
 if(app.current.kind==="numeric"&&app.cfg.auto&&/^-?\d+$/.test(String(app.current.answer))){app.current.autoDigits=true}
 $("questionType").textContent=app.cfg.title.toUpperCase();$("questionText").textContent=app.current.text;$("questionHint").textContent=app.current.hint||"";$("feedback").className="feedback neutral";$("feedback").textContent="";$("targetHint").textContent=Number($("perQuestion").value)>0?`Target: ${$("perQuestion").value} seconds per question`:"";
 inputFor(app.current);updateStats();
 if(app.current.kind==="choice"&&app.current.options.length===2){/* button selection auto checks */}
 if(Number($("perQuestion").value)>0){const cap=Math.max(1,Number($("perQuestion").value))*1000;app.qTimer=setTimeout(()=>{if(app.running&&!app.locked){recordAnswer("",true,"timeout")}},cap)}
}
function submitCurrent(){if(!app||!app.running||app.locked||!app.current)return;const el=$("answerInput");const raw=el?el.value.trim():"";if(!raw&&app.current.kind!=="multi"){ $("feedback").className="feedback neutral";$("feedback").textContent="Enter or select an answer first.";return }recordAnswer(raw,false)}
function recordAnswer(raw,timeout=false,forcedStatus=null){
 if(!app.running||app.locked)return;app.locked=true;clearTimeout(app.qTimer);const elapsed=Date.now()-app.qStarted;const q=app.current;const correct=!timeout&&compareAnswer(q,raw);const status=forcedStatus||(timeout?"unanswered":correct?"correct":"wrong");
 const rec={q,question:q.text,userAnswer:raw,correctAnswer:q.answer,status,correct,elapsedMs:elapsed,explanation:q.explain||""};app.records.push(rec);if(correct){app.streak++;app.bestStreak=Math.max(app.bestStreak,app.streak)}else app.streak=0;
 if(timeout){$("feedback").className="feedback bad";$("feedback").textContent=`Time target reached. Correct answer: ${q.answer}.`}
 else if(correct){$("feedback").className="feedback good";$("feedback").textContent="✓ Correct!";}else{$("feedback").className="feedback bad";$("feedback").textContent=`Not quite — correct answer: ${q.answer}${q.explain?" · "+q.explain:""}`}
 $("answerControl").querySelectorAll("input,button").forEach(el=>el.disabled=true);$("submitBtn").disabled=true;updateStats();
 app.index++;
 const delay=correct?0:1000;
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
 $("reviewBody").innerHTML=records.map((r,i)=>`<tr><td>${i+1}</td><td>${U.esc(r.question)}${r.explanation?`<div class="muted tiny">${U.esc(r.explanation)}</div>`:""}</td><td>${U.esc(r.userAnswer||"—")}</td><td>${U.esc(r.correctAnswer)}</td><td class="${r.status==="correct"?"result-good":r.status==="wrong"?"result-bad":"result-skip"}">${r.status==="correct"?"Correct":r.status==="wrong"?"Wrong":"Unanswered"}</td><td>${(r.elapsedMs/1000).toFixed(1)}s</td></tr>`).join("");
 const history=loadHistory();const entry={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,trainer:app.kind,title:app.cfg.title,date:new Date().toISOString(),reason,mode:app.sessionMode,questions:records.length,correct,wrong,unanswered:skipped,accuracy,elapsedMs:elapsed,avgMs:avg,bestStreak:app.bestStreak,records:records.map(r=>({question:r.question,userAnswer:r.userAnswer,correctAnswer:r.correctAnswer,status:r.status,elapsedMs:r.elapsedMs,explanation:r.explanation}))};history.push(entry);saveHistory(history);$("progressBar").style.width="100%";$("submitBtn").disabled=false;$("retryWrongBtn").classList.toggle("hidden",!records.some(r=>r.status!=="correct"));renderTrainerHistory(app.kind);if(global.MathSprintHub&&global.MathSprintHub.refresh)global.MathSprintHub.refresh();
}
function renderTrainerHistory(kind){const h=loadHistory().filter(x=>x.trainer===kind);const node=$("trainerHistory");if(!node)return;if(!h.length){node.textContent="No completed sessions yet.";return}const sessions=h.length,questions=h.reduce((s,x)=>s+x.questions,0),correct=h.reduce((s,x)=>s+x.correct,0),accuracy=questions?Math.round(correct/questions*100):0;node.textContent=`${sessions} session${sessions===1?"":"s"} · ${questions} questions · ${accuracy}% overall accuracy`}
global.MathSprint={mount,loadHistory,saveHistory,configs};
})(window);
