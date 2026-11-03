// Dibuat otomatis dari audit tema SWA Predict. Dijalankan di dalam halaman (page.evaluate).
const ANALYZE = `(() => {
  const parse = c => { const m=(c||'').match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const over=(t,b)=>{const a=t.a+b.a*(1-t.a); if(a===0) return {r:0,g:0,b:0,a:0}; return {r:(t.r*t.a+b.r*b.a*(1-t.a))/a,g:(t.g*t.a+b.g*b.a*(1-t.a))/a,b:(t.b*t.a+b.b*b.a*(1-t.a))/a,a}};
  const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
  const contrast=(a,b)=>{const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)};
  const sat=c=>{const mx=Math.max(c.r,c.g,c.b),mn=Math.min(c.r,c.g,c.b);return mx===0?0:(mx-mn)/mx};
  const hex=c=>'#'+[c.r,c.g,c.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  const gradColor=(bi)=>{const ms=[...bi.matchAll(/rgba?\\([^)]+\\)/g)].map(m=>parse(m[0])).filter(Boolean); if(!ms.length) return null; const n=ms.length; return {r:ms.reduce((s,x)=>s+x.r,0)/n,g:ms.reduce((s,x)=>s+x.g,0)/n,b:ms.reduce((s,x)=>s+x.b,0)/n,a:Math.max(...ms.map(x=>x.a))};};
  const base=(()=>{const h=parse(getComputedStyle(document.documentElement).backgroundColor); const b=parse(getComputedStyle(document.body).backgroundColor); let r={r:255,g:255,b:255,a:1}; if(h&&h.a>0) r=over(h,r); if(b&&b.a>0) r=over(b,r); return r;})();
  function ownBg(el){const cs=getComputedStyle(el); let c=parse(cs.backgroundColor); if(c&&c.a===0) c=null; if(cs.backgroundImage&&cs.backgroundImage!=='none'&&/gradient/.test(cs.backgroundImage)){const g=gradColor(cs.backgroundImage); if(g) c=c?over(g,c):g;} return c;}
  function effBg(el){const chain=[];let n=el;while(n&&n.nodeType===1){const c=ownBg(n); if(c) chain.push(c); n=n.parentElement;} let r=base; for(let i=chain.length-1;i>=0;i--) r=over(chain[i],r); return r;}
  function visible(el){const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return false; let n=el; while(n&&n.nodeType===1){const cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.1) return false; n=n.parentElement;} return true;}
  const sig=el=>{const cls=(typeof el.className==='string'?el.className:(el.getAttribute('class')||'')).replace(/\\s+/g,' ').trim(); return el.tagName.toLowerCase()+(cls?'.'+cls.slice(0,110):'');};
  const darkPanels=[],lowContrast=[],controls=[];
  const seen=new Set();
  for(const el of document.querySelectorAll('body *')){
    if(!visible(el)) continue;
    const cs=getComputedStyle(el); const r=el.getBoundingClientRect();
    // panel gelap
    const own=ownBg(el);
    if(own && r.width>=48 && r.height>=20 && el.tagName!=='CANVAS'){
      const eb=effBg(el); const L=lum(eb);
      if(L<0.12 || (L<0.22 && sat(eb)<0.4) || (own.a>=0.3 && own.a<1 && lum(own)<0.1)){const k='P|'+sig(el); if(!seen.has(k)){seen.add(k); darkPanels.push({sel:sig(el),bg:hex(eb),lum:+L.toFixed(3),w:Math.round(r.width),h:Math.round(r.height),text:(el.innerText||'').trim().slice(0,50)});}}
    }
    // kontras teks
    let direct=''; for(const ch of el.childNodes) if(ch.nodeType===3) direct+=ch.textContent; direct=direct.trim();
    if(direct.length>0){
      const bg=effBg(el); let fg=parse(cs.color); if(!fg) continue; if(fg.a===0||/text/.test(cs.webkitBackgroundClip||cs.backgroundClip||'')) continue; fg=over(fg,bg);
      const cr=contrast(fg,bg); const fs=parseFloat(cs.fontSize); const bold=parseInt(cs.fontWeight)>=700; const large=fs>=24||(fs>=18.66&&bold);
      const need=large?3:4.5;
      if(cr<need){const k='C|'+sig(el)+'|'+direct.slice(0,24); if(!seen.has(k)){seen.add(k); lowContrast.push({sel:sig(el),text:direct.slice(0,48),fg:hex(fg),bg:hex(bg),ratio:+cr.toFixed(2),need,fs:Math.round(fs)});}}
    }
    if(['INPUT','SELECT','TEXTAREA'].includes(el.tagName)){const bg=effBg(el); controls.push({tag:el.tagName.toLowerCase(),type:el.type||'',bg:hex(bg),color:hex(over(parse(cs.color),bg)),colorScheme:cs.colorScheme,border:cs.borderColor});}
  }
  return {url:location.pathname,htmlClass:document.documentElement.className,base:hex(base),darkPanels,lowContrast,controls};
})()`;



export default ANALYZE;
