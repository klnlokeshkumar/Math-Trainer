/* Shared pure utilities and deterministic math helpers for Math Practice Hub. */
(function(global){
  "use strict";
  const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1};
  const simplify=(n,d)=>{const g=gcd(n,d);n/=g;d/=g;if(d<0){n=-n;d=-d}return {n,d,text:`${n}/${d}`}};
  const isPrime=n=>{if(!Number.isInteger(n)||n<2)return false;if(n%2===0)return n===2;for(let i=3;i<=Math.sqrt(n);i+=2)if(n%i===0)return false;return true};
  const factorPair=n=>{if(n<2)return null;for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0)return [i,n/i];return null};
  const primesTo=max=>{const sieve=Array(max+1).fill(true);sieve[0]=sieve[1]=false;for(let p=2;p*p<=max;p++)if(sieve[p])for(let j=p*p;j<=max;j+=p)sieve[j]=false;return sieve.map((v,i)=>v?i:null).filter(v=>v!==null)};
  const shuffle=a=>{const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
  const rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
  const fmt=n=>Number.isFinite(n)?String(n):String(n);
  const normalizeDecimal=s=>{const n=Number(String(s).trim().replace(/,/g,""));return Number.isFinite(n)?n:null};
  const sameDecimal=(a,b)=>{const x=normalizeDecimal(a),y=normalizeDecimal(b);return x!==null&&y!==null&&Math.abs(x-y)<1e-9};
  const normFraction=s=>{const m=String(s).trim().match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);if(!m)return null;const n=+m[1],d=+m[2];if(!d)return null;return simplify(n,d)};
  const equivalentFraction=(input,expected)=>{const f=normFraction(input);if(!f)return false;const e=normFraction(expected);return !!e&&f.n===e.n&&f.d===e.d};
  const powerMod=(base,exp,mod)=>{let r=1,m=((base%mod)+mod)%mod,e=exp;while(e>0){if(e%2)r=r*m%mod;m=m*m%mod;e=Math.floor(e/2)}return r};
  const formatTime=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`};
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  global.MathUtils={gcd,simplify,isPrime,factorPair,primesTo,shuffle,rand,fmt,normalizeDecimal,sameDecimal,normFraction,equivalentFraction,powerMod,formatTime,esc};
})(window);
