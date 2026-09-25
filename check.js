
const DEFAULT_PIN="9001", KEY="fsd_sabarmati_moisture_final", PINKEY="fsd_sabarmati_pin", PINENKEY="fsd_sabarmati_pin_enabled", SESSION="fsd_sabarmati_session", VIEW="fsd_sabarmati_current_stack";
function getPin(){return localStorage.getItem(PINKEY)||DEFAULT_PIN}
function pinEnabled(){return localStorage.getItem(PINENKEY)!=="0"}
function setPinEnabled(v){localStorage.setItem(PINENKEY,v?"1":"0")}
function pinRequired(){return pinEnabled()}
let db=JSON.parse(localStorage.getItem(KEY)||'{"stacks":[],"history":[]}'), current=null;
function isUnlocked(){return sessionStorage.getItem(SESSION)==='1'}
function unlock(){sessionStorage.setItem(SESSION,'1')}
function restoreView(){const id=sessionStorage.getItem(VIEW); if(id && db.stacks.some(s=>s.id===id)) openStackView(id); else render()}
function backHome(){sessionStorage.removeItem(VIEW); closeModal(); if(location.hash) history.replaceState(null,'',location.pathname+location.search); render(); window.scrollTo({top:0,behavior:'instant'});}

function save(){localStorage.setItem(KEY,JSON.stringify(db));}
function toast(s){let e=document.getElementById('toast');e.textContent=s;e.style.display='block';setTimeout(()=>e.style.display='none',1800)}
function closeModal(){document.getElementById('modal').classList.remove('show');current=null}
function show(html){document.getElementById('sheet').innerHTML=html;document.getElementById('modal').classList.add('show')}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function calc(s){let used=s.entries.reduce((a,e)=>a+Number(e.bags||0),0);let wt=s.entries.reduce((a,e)=>a+Number(e.bags||0)*Number(e.moisture||0),0);let imc=used?wt/used:0;return {used,remaining:Number(s.total)-used,imc,diff:imc-Number(s.rmc)}}
function openStack(id=null){
 let s=id?db.stacks.find(x=>x.id===id):null;
 show(`<div class="mhead"><button class="ghost" onclick="backHome()">← BACK</button><b>${s?'✏️ EDIT STACK':'➕ ADD STACK'}</b><button class="x" onclick="backHome()">×</button></div>
 <div class="grid">
 <div class="field"><label>STACK NUMBER</label><input id="fstack" value="${esc(s?.stack||'')}"></div>
 <div class="field"><label>TOTAL BAGS</label><input id="ftotal" type="number" inputmode="numeric" value="${s?.total??''}"></div>
 <div class="field"><label>RMC % ${s?'🔐 PIN required to change':''}</label><input id="frmc" type="number" min="0" max="15" step="0.01" inputmode="decimal" value="${s?.rmc??''}"></div>
 <div class="field"><label>COMMODITY</label><input type="hidden" id="fcom" value="${esc(s?.commodity||'Rice')}"><button type="button" id="commodityToggle" class="commodity-toggle ${s?.commodity==='Wheat'?'wheat':'rice'}" onclick="toggleCommodity()">${s?.commodity==='Wheat'?'🌾 WHEAT':'🍚 RICE'}</button></div>
 </div><div style="margin-top:10px"><button class="primary wide" onclick="saveStack('${s?.id||''}')">${s?'SAVE CHANGES':'ADD STACK'}</button></div>`);
}
function toggleCommodity(){
 const el=document.getElementById('fcom'), btn=document.getElementById('commodityToggle');
 if(!el||!btn)return;
 const next=el.value==='Rice'?'Wheat':'Rice'; el.value=next;
 btn.textContent=next==='Wheat'?'🌾 WHEAT':'🍚 RICE';
 btn.classList.toggle('wheat',next==='Wheat'); btn.classList.toggle('rice',next==='Rice');
}
function saveStack(id){
 let stack=document.getElementById('fstack').value.trim(), total=Number(document.getElementById('ftotal').value), rmc=Number(document.getElementById('frmc').value), com=document.getElementById('fcom').value;
 if(!stack||!total||rmc<0||rmc>15){toast(rmc>15?'RMC cannot be more than 15%':'Please fill all stack details');return}
 if(id){
   let s=db.stacks.find(x=>x.id===id), old=s.rmc;
   if(old!==rmc){ askPin('RMC CHANGE',()=>finishSaveStack(id,stack,total,rmc,com)); return; }
   finishSaveStack(id,stack,total,rmc,com);
 }else finishSaveStack(id,stack,total,rmc,com);
}
function finishSaveStack(id,stack,total,rmc,com){
 if(id){let s=db.stacks.find(x=>x.id===id);s.stack=stack;s.total=total;s.rmc=rmc;s.commodity=com;}
 else db.stacks.push({id:Date.now().toString(),stack,total,rmc,commodity:com,entries:[],created:Date.now()});
 save();closeModal();toast('Stack saved');render();
}
function askPin(label,onOk){
 if(!pinRequired()){onOk();return;}
 show(`<div class="mhead"><button class="ghost" onclick="closeModal()">← BACK</button><b>🔐 ${label}</b><button class="x" onclick="closeModal()">×</button></div><div class="pin-inline-box" style="margin:18px auto"><div style="font-size:34px">🔐</div><div style="font-size:15px;font-weight:900;margin:3px 0">PIN Verification</div><div style="font-size:12px;color:var(--mut);margin-bottom:7px">Enter your PIN to continue</div><input id="actionPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" autofocus placeholder="ENTER PIN"><button class="primary wide" style="margin-top:10px;padding:12px" onclick="verifyActionPin()">VERIFY PIN</button><button class="ghost wide" style="margin-top:6px" onclick="closeModal()">CANCEL</button></div>`);
 window._pinCallback=onOk; setTimeout(()=>document.getElementById('actionPin')?.focus(),80);
 document.getElementById('actionPin').addEventListener('keydown',e=>{if(e.key==='Enter')verifyActionPin()});
}
function verifyActionPin(){let el=document.getElementById('actionPin');if(!el)return;if(el.value===getPin()){let cb=window._pinCallback;window._pinCallback=null;closeModal();if(cb)cb();}else{el.value='';el.focus();toast('Wrong PIN');}}
function deleteStack(id){askPin('DELETE STACK',()=>{db.stacks=db.stacks.filter(s=>s.id!==id);save();render();toast('Stack deleted')});}
function openStackView(id){
 const s0=db.stacks.find(x=>x.id===id); if(!s0){backHome();return;}
 current=id; sessionStorage.setItem(VIEW,id); location.hash='stack-'+id;
 closeModal();
 render();
 const s=db.stacks.find(x=>x.id===id); if(!s)return;
 const c=calc(s);
 const main=document.querySelector('main');
 const old=document.getElementById('selectedStackView'); if(old)old.remove();
 const wrap=document.createElement('div');
 wrap.id='selectedStackView';
 wrap.innerHTML=`<div class="card" style="padding:7px 8px">
   <button class="primary wide" style="margin:0" onclick="openMoisture('${s.id}')">💧 UPDATE MOISTURE</button>
 </div>
 <div class="card"><div class="section">SAVED MOISTURE ENTRIES <span class="count">${s.entries.length}</span></div>
   <div class="entries">${entriesHtml(s)}</div>
   ${c.remaining<=50&&c.remaining>=-100 ? `<div style="display:flex;gap:7px;margin-top:8px"><button class="primary wide complete" style="flex:1" onclick="completeStack('${s.id}')">✅ COMPLETE STACK</button><button class="ghost" style="min-width:92px" onclick="openStackDetails('${s.id}')">📋 DETAILS</button></div>` : ''}
 </div>`;
 const underCard=document.getElementById('under')?.closest('.card');
 if(underCard) underCard.insertAdjacentElement('afterend',wrap); else main.appendChild(wrap);
 wrap.scrollIntoView({behavior:'smooth',block:'start'});
}

function openHistoryDetails(id){
 const s=db.history.find(x=>x.id===id); if(!s){render();return;}
 current=null; sessionStorage.removeItem(VIEW); location.hash='history-details-'+id;
 closeModal(); render();
 const c=calc(s), main=document.querySelector('main');
 const old=document.getElementById('selectedStackView'); if(old)old.remove();
 const wrap=document.createElement('div'); wrap.id='selectedStackView';
 const diffColor=c.diff<0?'#c62828':'#087b35';
 const hasTruck=s.entries.some(e=>String(e.truck||'').trim()!=='');
 const rows=s.entries.length?s.entries.map((e,i)=>`<div class="entry ${s.commodity==='Wheat'?'saved-wheat':'saved-rice'}${hasTruck?' has-truck':' no-truck'}"><span>${i+1}</span>${hasTruck?`<span>${esc(e.truck||'')}</span>`:''}<span>${e.bags}</span><span>${Number(e.moisture).toFixed(2)}%</span><span style="display:flex;align-items:center;justify-content:center;gap:2px"><span class="slip-pill ${e.slip?'slip-yes':'slip-no'}">${e.slip?'YES':'NO'}</span>${entryDateTime(e)}</span></div>`).join(''):'<div class="empty">No moisture entry saved.</div>';
 const head=`<div class="entry${hasTruck?' has-truck':' no-truck'} entryhead"><span>#</span>${hasTruck?'<span>Truck</span>':''}<span>Bags</span><span>Moist.</span><span>Slip</span></div>`;
 wrap.innerHTML=`<div class="card"><div class="mhead"><button class="ghost" onclick="render();window.scrollTo({top:0,behavior:'instant'})">← BACK</button><b>📋 COMPLETED STACK DETAILS</b><span class="badge">COMPLETED</span></div><div class="summary"><div class="sum">STACK<b>${esc(s.stack)}</b></div><div class="sum">${esc(s.commodity)}<b>${s.entries.length} ENTRIES</b></div></div><div class="summary"><div class="sum">TOTAL BAGS<b>${s.total}</b></div><div class="sum">UPDATED BAGS<b>${c.used}</b></div><div class="sum">${s.remaining<0?"GP":s.remaining>0?"GR":"BALANCE"}<b>${Math.abs(s.remaining)}</b></div></div><div class="summary"><div class="sum">RMC<b>${Number(s.rmc).toFixed(2)}%</b></div><div class="sum">CURRENT IMC<b>${c.imc.toFixed(2)}%</b></div><div class="sum">DIFFERENCE<b style="color:${diffColor}">${c.diff>=0?'+':''}${c.diff.toFixed(2)}%</b></div></div></div><div class="card"><div class="section">SAVED MOISTURE ENTRIES <span class="count">${s.entries.length}</span></div><div class="entries">${head}${rows}</div></div>`;
 const underCard=document.getElementById('under')?.closest('.card'); if(underCard)underCard.insertAdjacentElement('afterend',wrap); else main.appendChild(wrap);
 wrap.scrollIntoView({behavior:'smooth',block:'start'});
}

function openStackDetails(id){
 const s=db.stacks.find(x=>x.id===id); if(!s){backHome();return;}
 current=id; sessionStorage.setItem(VIEW,id); location.hash='details-'+id;
 closeModal(); render();
 const c=calc(s), main=document.querySelector('main');
 const old=document.getElementById('selectedStackView'); if(old)old.remove();
 const wrap=document.createElement('div'); wrap.id='selectedStackView';
 const diffColor=c.diff<0?'#c62828':'#087b35';
 const hasTruck=s.entries.some(e=>String(e.truck||'').trim()!=='');
 const rows=s.entries.length?s.entries.map((e,i)=>`<div class="entry ${s.commodity==='Wheat'?'saved-wheat':'saved-rice'}${hasTruck?' has-truck':' no-truck'}"><span>${i+1}</span>${hasTruck?`<span>${esc(e.truck||'')}</span>`:''}<span>${e.bags}</span><span>${Number(e.moisture).toFixed(2)}%</span><span style="display:flex;align-items:center;justify-content:center;gap:2px"><span class="slip-pill ${e.slip?'slip-yes':'slip-no'}">${e.slip?'YES':'NO'}</span>${entryDateTime(e)}</span><span><button class="ghost" style="padding:4px 7px;font-size:11px" onclick="editEntry('${s.id}',${i})">VIEW / EDIT</button></span></div>`).join(''):'<div class="empty">No moisture entry yet.</div>';
 const head=`<div class="entry${hasTruck?' has-truck':' no-truck'} entryhead"><span>#</span>${hasTruck?'<span>Truck</span>':''}<span>Bags</span><span>Moist.</span><span>Slip</span><span>Action</span></div>`;
 wrap.innerHTML=`<div class="card"><div class="mhead"><button class="ghost" onclick="openStackView('${s.id}')">← BACK</button><b>📋 STACK DETAILS</b><button class="ghost" onclick="openStack('${s.id}')">✏️</button></div><div class="summary"><div class="sum">STACK<b>${esc(s.stack)}</b></div><div class="sum">${esc(s.commodity)}<b>${s.entries.length} ENTRIES</b></div></div><div class="summary"><div class="sum">TOTAL BAGS<b>${s.total}</b></div><div class="sum">UPDATED BAGS<b>${c.used}</b></div><div class="sum">REMAINING<b>${c.remaining}</b></div></div><div class="summary"><div class="sum">RMC<b>${Number(s.rmc).toFixed(2)}%</b></div><div class="sum">CURRENT IMC<b>${c.imc.toFixed(2)}%</b></div><div class="sum">DIFFERENCE<b style="color:${diffColor}">${c.diff>=0?'+':''}${c.diff.toFixed(2)}%</b></div></div></div><div class="card"><div class="section">MOISTURE ENTRY DETAILS <span class="count">${s.entries.length}</span></div><div class="entries">${head}${rows}</div></div>`;
 const underCard=document.getElementById('under')?.closest('.card'); if(underCard)underCard.insertAdjacentElement('afterend',wrap); else main.appendChild(wrap);
 wrap.scrollIntoView({behavior:'smooth',block:'start'});
}

function entryDateTime(e){
 const d=e&&e.date?new Date(e.date):null;
 if(!d || Number.isNaN(d.getTime())) return '';
 const date=d.toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'2-digit'});
 const time=d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
 return `<span class="slip-time">${date}<br>${time}</span>`;
}
function entriesHtml(s){
 const hasTruck=s.entries.some(e=>String(e.truck||'').trim()!=='');
 const cols=hasTruck?' has-truck':' no-truck';
 let head=`<div class="entry${cols} entryhead"><span>#</span>${hasTruck?'<span>Truck</span>':''}<span>Bags</span><span>Moist.</span><span>Slip</span><span>Date / Time</span><span>Action</span></div>`;
 if(!s.entries.length)return head+'<div class="empty">No moisture entry yet.</div>';
 let rows=s.entries.map((e,i)=>{
   const slip=e.slip
     ? '<span class="slip-pill slip-yes">YES</span>'
     : '<span class="slip-pill slip-no">NO</span>';
   const dt=entryDateTime(e);
   const rowClass=s.commodity==='Wheat'?'saved-wheat':'saved-rice';
   return `<div class="entry ${rowClass}${cols}"><span>${i+1}</span>${hasTruck?`<span>${esc(e.truck||'')}</span>`:''}<span>${e.bags}</span><span>${Number(e.moisture).toFixed(2)}%</span><span style="display:flex;align-items:center;justify-content:center"><button class="slip-btn" style="border:0;background:transparent;padding:0" onclick="toggleSlip('${s.id}',${i})">${slip}</button></span><span class="entry-date">${dt}</span><span><button class="ghost" style="padding:3px 5px;font-size:9px" onclick="editEntry('${s.id}',${i})">EDIT</button> <button class="danger" style="padding:3px 5px;font-size:9px" onclick="deleteEntry('${s.id}',${i})">DEL</button></span></div>`;
 }).join('');
 const total=calc(s);
 const diffColor=total.diff<0?'#c62828':'#087b35';
 const summary=`<div class="stack-moisture-summary"><div class="sms-item"><span class="sms-label">RMC</span><span class="sms-value">${Number(s.rmc).toFixed(2)}%</span></div><div class="sms-item"><span class="sms-label">IMC</span><span class="sms-value">${total.imc.toFixed(2)}%</span></div><div class="sms-item"><span class="sms-label">DIFFERENCE</span><span class="sms-value" style="color:${diffColor}">${total.diff>=0?'+':''}${total.diff.toFixed(2)}%</span></div><div class="sms-item"><span class="sms-label">REMAINING BAGS</span><span class="sms-value">${total.remaining}</span></div></div>`;
 return head+rows+summary;
}
function openMoisture(id,idx=null){
 let s=db.stacks.find(x=>x.id===id), e=idx==null?null:s.entries[idx], c=calc(s);
 show(`<div class="mhead"><button class="back-highlight" onclick="openStackView('${id}')">← BACK</button><b>💧 ${e?'EDIT':'UPDATE'} MOISTURE</b><button class="x" onclick="openStackView('${id}')">×</button></div>
 <div class="summary"><div class="sum">STACK<b>${esc(s.stack)}</b></div><div class="rmc-tap" onclick="unlockPopupRmc('${id}',${idx==null?'null':idx})">RMC <b id="popupRmc">${Number(s.rmc).toFixed(2)}%</b><small style="font-size:9px;color:#68756d">Tap to edit</small></div><div class="sum">REMAINING<b id="rem">${c.remaining}</b></div></div>
 <div id="mdiff" class="diff" style="margin-top:7px">&nbsp;</div>
 <div class="field" style="margin-top:7px"><label>TRUCK NUMBER (OPTIONAL)</label><input id="mtruck" value="${esc(e?.truck||'')}" placeholder="Optional" oninput="this.value=this.value.toUpperCase()"></div>
 <div class="grid moistgrid" style="margin-top:8px"><div class="field moist-bags"><label>UPDATE BAGS</label><input id="mbags" type="number" inputmode="numeric" value="${e?.bags??''}" oninput="preview('${id}',${idx==null?'null':idx})"></div><div class="field moist-m"><label>MOISTURE %</label><input id="mmoist" type="number" step="0.01" inputmode="decimal" value="${e?.moisture??''}" oninput="preview('${id}',${idx==null?'null':idx})"></div></div>
 <input id="mrmc" type="hidden" value="${Number(s.rmc).toFixed(2)}">
 <button class="primary wide" style="margin-top:10px" onclick="saveMoisture('${id}',${idx==null?'null':idx})">💾 SAVE UPDATE</button>`);
 preview(id,idx);
}
function unlockPopupRmc(id,idx){
 const old=document.getElementById('inlineRmcPin'); if(old)old.remove();
 const d=document.createElement('div');d.id='inlineRmcPin';d.className='pin-inline';
 d.innerHTML='<div class="pin-inline-box"><b>🔐 EDIT RMC</b><div style="font-size:11px;color:#68756d;margin-top:5px">Enter 4-digit PIN</div><input id="inlineRmcPinInput" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="PIN"><button class="primary wide" onclick="verifyInlineRmc(\''+id+'\','+(idx==null?'null':idx)+')">VERIFY</button><button class="ghost wide" style="margin-top:6px" onclick="document.getElementById(\'inlineRmcPin\')?.remove()">CANCEL</button></div>';
 document.body.appendChild(d);setTimeout(()=>document.getElementById('inlineRmcPinInput')?.focus(),60);
}
function verifyInlineRmc(id,idx){
 const el=document.getElementById('inlineRmcPinInput');if(!el)return;
 if(el.value!==getPin()){el.value='';el.focus();toast('Wrong PIN');return}
 document.getElementById('inlineRmcPin')?.remove();
 const card=document.querySelector('.rmc-tap');
 if(card){card.innerHTML='<label style="display:block;font-size:10px;font-weight:800;color:var(--mut);margin-bottom:3px">RMC %</label><input id="mrmcEdit" type="number" min="0" max="15" step="0.01" inputmode="decimal" value="'+Number(db.stacks.find(x=>x.id===id).rmc).toFixed(2)+'" style="width:100%;padding:6px;border:1px solid #b9d9c5;border-radius:8px;font-size:15px;font-weight:900;text-align:center;background:#fff" oninput="document.getElementById(\'mrmc\').value=this.value" onclick="event.stopPropagation()">';
  const inp=document.getElementById('mrmcEdit');inp?.focus();inp?.select();
 }
}
function preview(id,idx){
 let s=db.stacks.find(x=>x.id===id), bags=Number(document.getElementById('mbags')?.value||0), m=Number(document.getElementById('mmoist')?.value||0);
 let old=idx==null?0:Number(s.entries[idx]?.bags||0), entries=s.entries.filter((_,i)=>i!==idx); entries.push({bags,moisture:m});
 let c=calc({...s,entries}); let d=document.getElementById('mdiff');if(!d)return;
 if(!bags||!m){d.innerHTML='&nbsp;';d.className='diff';return} d.textContent='Difference Projection: '+(c.diff>=0?'+':'')+c.diff.toFixed(2)+'%';d.className='diff '+(c.diff>0?'pos':c.diff<0?'neg':'');
}
function saveMoisture(id,idx){
 let s=db.stacks.find(x=>x.id===id), bags=Number(document.getElementById('mbags').value), m=Number(document.getElementById('mmoist').value), truck=document.getElementById('mtruck').value.trim().toUpperCase(), newRmc=Number(document.getElementById('mrmcEdit')?.value||document.getElementById('mrmc').value), oldRmc=Number(s.rmc), slip=idx==null ? true : (s.entries[idx]?.slip!==false);
 let max=s.commodity==='Wheat'?14:15;
 if(!bags||bags<0||m<0||m>max||!Number.isFinite(newRmc)||newRmc<0||newRmc>15){alert(newRmc>15?'RMC cannot be more than 15%':`${s.commodity} maximum moisture is ${max}%`);return}
 const finish=()=>{s.rmc=newRmc;let e={bags,moisture:m,truck,slip,date:new Date().toISOString()};if(idx==null)s.entries.push(e);else s.entries[idx]=e;save();openStackView(id);toast('Moisture saved')};
 if(newRmc!==oldRmc){askPin('RMC CHANGE',finish);return}
 finish();
}
function editEntry(id,i){openMoisture(id,i)}
function deleteEntry(id,i){if(!confirm('Delete this moisture entry?'))return;db.stacks.find(s=>s.id===id).entries.splice(i,1);save();openStackView(id)}
function toggleSlip(id,i){
 let s=db.stacks.find(x=>x.id===id); if(!s||!s.entries[i])return;
 s.entries[i].slip = s.entries[i].slip===true ? false : true;
 save();
 toast(s.entries[i].slip?'Slip: YES':'Slip: NO');
 openStackView(id);
}
function completeStack(id){
 let s=db.stacks.find(x=>x.id===id), c=calc(s);if(!(c.remaining<=50&&c.remaining>=-100))return;
 if(!confirm(`Complete stack ${s.stack} and move it to History?`))return;
 db.history.unshift({...s,completedAt:new Date().toISOString(),remaining:c.remaining});db.stacks=db.stacks.filter(x=>x.id!==id);save();closeModal();toast('Stack moved to History');
}
function deleteHistoryStack(id){askPin('DELETE HISTORY STACK',()=>{if(!confirm('Delete this completed stack from History?'))return;db.history=db.history.filter(s=>s.id!==id);save();render();toast('History stack deleted')});}
function pinAction(type){
 askPin(type==='history'?'CLEAR HISTORY':'ACTION',()=>{
   if(type==='history'){if(!confirm('Clear all History?'))return;db.history=[];save();render();toast('History cleared');}
 });
}
function render(){
 document.getElementById("selectedStackView")?.remove();
 let u=document.getElementById('under'),h=document.getElementById('history');document.getElementById('ucount').textContent=db.stacks.length;document.getElementById('hcount').textContent=db.history.length;
 u.innerHTML=db.stacks.length?db.stacks.map(s=>{let c=calc(s);let diff=c.diff;return `<div class="stack ${s.commodity==='Wheat'?'w':'r'}"><div><div class="stackname">${esc(s.stack)} · ${s.commodity}</div><div class="under-summary"><span>RMC <b>${Number(s.rmc).toFixed(2)}%</b></span><span>IMC <b>${c.imc.toFixed(2)}%</b></span><span>Diff <b style="color:${diff<0?'#c62828':'#087b35'}">${diff>=0?'+':''}${diff.toFixed(2)}%</b></span><span>Remaining <b>${c.remaining}</b></span></div></div><div class="actions"><button class="ghost" onclick="openStackView('${s.id}')">OPEN</button><button class="ghost" onclick="openStack('${s.id}')">EDIT</button><button class="danger" onclick="deleteStack('${s.id}')">DELETE</button></div></div>`}).join(''):'<div class="empty">No Under Issue Stack</div>';
 const all=document.getElementById('savedAll'); if(all) all.innerHTML='';
 h.innerHTML=db.history.length?db.history.map(s=>{let c=calc(s);return `<div class="stack ${s.commodity==='Wheat'?'w':'r'}"><div><div class="stackname">${esc(s.stack)} · ${s.commodity}</div><div class="meta">Total ${s.total} | Remaining ${s.remaining} | RMC ${Number(s.rmc).toFixed(2)}% | Entries ${s.entries.length}</div></div><div class="actions"><span class="badge">COMPLETED</span><button class="ghost" onclick="openHistoryDetails('${s.id}')">📋 DETAILS</button><button class="danger" onclick="deleteHistoryStack('${s.id}')">DEL</button></div></div>`}).join(''):'<div class="empty">No History</div>';
}
function login(){if(!pinRequired()){unlock();document.getElementById('login').style.display='none';restoreView();return} if(document.getElementById('loginpin').value===getPin()){unlock();document.getElementById('login').style.display='none';restoreView()}else{document.getElementById('loginpin').value='';document.getElementById('loginpin').focus();toast('Wrong PIN')}}
window.addEventListener('popstate',()=>{if(isUnlocked()){sessionStorage.removeItem(VIEW);closeModal();render()}});
window.addEventListener('hashchange',()=>{if(isUnlocked() && !location.hash){sessionStorage.removeItem(VIEW);closeModal();render()}});
window.addEventListener('popstate',()=>{if(isUnlocked()){sessionStorage.removeItem(VIEW);closeModal();render()}});
window.addEventListener('hashchange',()=>{if(isUnlocked() && !location.hash){sessionStorage.removeItem(VIEW);closeModal();render()}});
function openPinSettings(){
 show(`<div class="mhead"><button class="ghost" onclick="closeModal()">← BACK</button><b>🔐 PIN SETTINGS</b><button class="x" onclick="closeModal()">×</button></div>
 <div class="pin-inline-box" style="margin:8px auto;width:min(380px,100%)"><div style="font-size:36px">🛡️</div><div style="font-size:16px;font-weight:900">PIN Security</div><div style="font-size:12px;color:var(--mut);margin:4px 0 12px">PIN protects delete, clear, and RMC changes.</div>
 <button class="primary wide" style="padding:12px" onclick="changePinStart()">🔑 CHANGE PIN</button>
 <button class="${pinEnabled()?'danger':'primary'} wide" style="margin-top:7px;padding:12px" onclick="togglePinSecurity()">${pinEnabled()?'🔓 TURN PIN OFF':'🔒 TURN PIN ON'}</button>
 <div style="font-size:11px;color:#68756d;margin-top:10px">Current status: <b>${pinEnabled()?'ON':'OFF'}</b></div></div>`);
}
function changePinStart(){
 askPin('CHANGE PIN',()=>{show(`<div class="mhead"><button class="ghost" onclick="openPinSettings()">← BACK</button><b>🔑 NEW PIN</b><button class="x" onclick="closeModal()">×</button></div><div class="pin-inline-box" style="margin:18px auto"><div style="font-size:34px">🔑</div><div style="font-size:13px;color:var(--mut)">Create a new numeric PIN</div><input id="newPin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="NEW PIN"><input id="newPin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="CONFIRM PIN"><button class="primary wide" style="margin-top:5px;padding:12px" onclick="saveNewPin()">SAVE NEW PIN</button></div>`);setTimeout(()=>document.getElementById('newPin1')?.focus(),80);});
}
function saveNewPin(){let a=document.getElementById('newPin1').value,b=document.getElementById('newPin2').value;if(!/^\d{4,8}$/.test(a)){toast('PIN must be 4-8 digits');return}if(a!==b){toast('PINs do not match');return}localStorage.setItem(PINKEY,a);setPinEnabled(true);unlock();closeModal();toast('PIN changed successfully')}
function togglePinSecurity(){if(pinEnabled()){askPin('TURN PIN OFF',()=>{setPinEnabled(false);unlock();closeModal();toast('PIN security turned OFF')})}else{show(`<div class="mhead"><button class="ghost" onclick="openPinSettings()">← BACK</button><b>🔒 TURN PIN ON</b><button class="x" onclick="closeModal()">×</button></div><div class="pin-inline-box" style="margin:18px auto"><div style="font-size:34px">🔒</div><div style="font-size:13px;color:var(--mut)">Set a PIN before turning security on</div><input id="enablePin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="NEW PIN"><input id="enablePin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="CONFIRM PIN"><button class="primary wide" style="margin-top:5px;padding:12px" onclick="enablePinNow()">TURN ON PIN</button></div>`);setTimeout(()=>document.getElementById('enablePin1')?.focus(),80)}}
function enablePinNow(){let a=document.getElementById('enablePin1').value,b=document.getElementById('enablePin2').value;if(!/^\d{4,8}$/.test(a)){toast('PIN must be 4-8 digits');return}if(a!==b){toast('PINs do not match');return}localStorage.setItem(PINKEY,a);setPinEnabled(true);sessionStorage.removeItem(SESSION);closeModal();document.getElementById('login').style.display='flex';document.getElementById('loginpin').value='';setTimeout(()=>document.getElementById('loginpin')?.focus(),80);toast('PIN security turned ON')}
function init(){if(!pinRequired()||isUnlocked()){document.getElementById('login').style.display='none';restoreView()}else{document.getElementById('login').style.display='flex';render()}}
document.getElementById('loginpin').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
init();
