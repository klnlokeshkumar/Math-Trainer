(function(){
"use strict";const KEY="mathSprintHistoryV1";const $=id=>document.getElementById(id);
function history(){try{const a=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(a)?a:[]}catch(e){return []}}
function refresh(){const h=history();const sessions=h.length,questions=h.reduce((s,x)=>s+(x.questions||0),0),correct=h.reduce((s,x)=>s+(x.correct||0),0),acc=questions?Math.round(correct/questions*100):0,best=h.reduce((s,x)=>Math.max(s,x.bestStreak||0),0);$("homeSessions").textContent=sessions;$("homeQuestions").textContent=questions;$("homeAccuracy").textContent=questions?acc+"%":"—";$("homeStreak").textContent=best;
 const host=$("homeHistory");if(!h.length){host.innerHTML='<p class="muted small">No sessions saved yet. Complete a sprint and your progress will appear here.</p>';return}
 const by={};h.forEach(s=>{const b=by[s.trainer]||(by[s.trainer]={title:s.title,sessions:0,questions:0,correct:0,last:s.date,best:0});b.sessions++;b.questions+=s.questions||0;b.correct+=s.correct||0;b.best=Math.max(b.best,s.accuracy||0);if(s.date>b.last)b.last=s.date});
 host.innerHTML='<div class="history-list">'+Object.values(by).sort((a,b)=>b.last.localeCompare(a.last)).map(x=>`<div class="history-item"><strong>${esc(x.title)}</strong><span>${x.sessions} session${x.sessions===1?"":"s"} · ${x.questions} Q</span><span>${x.questions?Math.round(x.correct/x.questions*100):0}% accuracy · best ${x.best}%</span></div>`).join("")+'</div>';
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
document.addEventListener("DOMContentLoaded",()=>{
 const search=$("trainerSearch");search.addEventListener("input",()=>{const v=search.value.toLowerCase();document.querySelectorAll(".trainer-card").forEach(c=>c.classList.toggle("hidden",!c.dataset.search.includes(v)))});
 $("exportHistory").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(history(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="math-practice-history.json";a.click();URL.revokeObjectURL(url);$("historyMessage").textContent="History export downloaded."});
 $("clearHistory").addEventListener("click",()=>{if(confirm("Delete all locally saved Math Practice Hub history from this browser? This cannot be undone.")){localStorage.removeItem(KEY);refresh();$("historyMessage").textContent="Local history cleared."}});
 refresh();window.MathSprintHub={refresh};
});
})();