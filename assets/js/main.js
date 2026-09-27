(function(){

  // logo oficial
  (function(){const i=new Image();i.onload=()=>document.documentElement.classList.add('has-logo');i.src='assets/img/logo.png';})();
  const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

  function copyText(text, btn, label){
    const done=()=>{ if(!btn) return; const old=btn.textContent; btn.textContent=label||'Copiado'; btn.classList.add('done'); setTimeout(()=>{btn.textContent=old;btn.classList.remove('done')},1400)};
    try{ navigator.clipboard.writeText(text).then(done).catch(()=>fallback()); }catch(e){ fallback(); }
    function fallback(){ const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); try{document.execCommand('copy');done()}catch(e){} t.remove(); }
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-copy]'); if(b) copyText(b.dataset.copy,b);});

  // swatches
  const sw=[
    {n:'Negro Extracto',h:'#111111',u:'Logo, títulos, fondos de campaña'},
    {n:'Blanco',h:'#FFFFFF',u:'Fondos de producto y piezas'},
    {n:'Gris niebla',h:'#F6F6F4',u:'Fondos secundarios'},
    {n:'Gris línea',h:'#DCDCD8',u:'Divisores y bordes'},
    {n:'Gris texto',h:'#4A4A48',u:'Textos secundarios'},
    {n:'Ámbar',h:'#9A6B2F',u:'Acento puntual, máximo 5%'}
  ];
  $('#swatches').innerHTML=sw.map(s=>`<div class="sw"><div class="chip" style="background:${s.h}"></div><div class="meta"><b>${s.n}</b><button class="copy" data-copy="${s.h}">${s.h}</button><small>${s.u}</small></div></div>`).join('');

  // pillars
  const pil=[
    ['La fragancia',30,'Notas, ocasiones de uso, el frasco'],
    ['Cultura olfativa',20,'Familias, cómo aplicar, cómo elegir'],
    ['Prueba social',20,'Reseñas, clientes, los +600.000'],
    ['Vende Extracto',15,'Captar y mostrar revendedores'],
    ['Tendencias',15,'Formatos y audios del momento']
  ];
  $('#pillars').innerHTML=pil.map(p=>`<div class="pillar"><div><b style="font-size:15px">${p[0]}</b><small>${p[2]}</small></div><div class="bar"><i style="width:${p[1]/30*100}%"></i></div><div class="pct">${p[1]}%</div></div>`).join('')
    +`<p style="font-size:13px;color:var(--ink-3);padding-top:14px;border-top:1px solid var(--rule)">Las barras se comparan contra el pilar más grande. TikTok abre en noviembre con 3 publicaciones por semana.</p>`;
  $('#b-pilar').innerHTML=pil.map(p=>`<option>${p[0]}</option>`).join('');

  // pauta mode
  $('#pautaMode').addEventListener('change',e=>document.body.classList.toggle('pauta',e.target.checked));

  // brief
  const f=$('#briefForm');
  function addBusinessDays(d,n){const r=new Date(d); let a=0; while(a<n){r.setDate(r.getDate()+1); const w=r.getDay(); if(w!==0&&w!==6)a++;} return r;}
  const iso=d=>d.toISOString().slice(0,10);
  const fmt=s=>{ if(!s) return 'sin definir'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`;};
  const today=new Date(); today.setHours(12,0,0,0);
  $('#b-fecha').value=iso(addBusinessDays(today,4));
  function renderBrief(){
    const v=id=>$('#'+id).value.trim();
    const tipo=$('#b-tipo'); const tipoTxt=tipo.options[tipo.selectedIndex].text;
    const need = tipo.value==='std'?3:(tipo.value==='tpl'?1:0);
    const st=$('#b-status');
    if(v('b-fecha')){
      const due=new Date(v('b-fecha')+'T12:00:00'); const min=addBusinessDays(today,need);
      if(tipo.value==='urg'){st.className='status warn';st.textContent='Urgencia: descuenta 1 del cupo de 2 por semana. Necesita el visto de Matías.';}
      else if(due<min){st.className='status bad';st.textContent=`La fecha no llega al plazo. Lo más temprano posible es el ${fmt(iso(min))}, o pedilo como urgencia.`;}
      else{st.className='status ok';st.textContent='La fecha entra en el plazo.';}
    } else {st.className='status';st.textContent='';}
    $('#b-out').textContent=
`BRIEF · ${v('b-pieza')||'Sin nombre'}
Tipo: ${tipoTxt}
Formato: ${v('b-formato')}
Pilar: ${v('b-pilar')}
Entrega: ${fmt(v('b-fecha'))}
Códigos: ${v('b-codigos')||'—'}

OBJETIVO
${v('b-objetivo')||'—'}

TEXTOS
${v('b-textos')||'—'}

REFERENCIAS
${v('b-ref')||'—'}

Recordatorio: en anuncios pagos, solo código y notas.`;
  }
  f.addEventListener('input',renderBrief); f.addEventListener('change',renderBrief);
  f.addEventListener('submit',e=>e.preventDefault());
  f.addEventListener('reset',()=>setTimeout(renderBrief,0));
  $('#b-copy').addEventListener('click',e=>copyText($('#b-out').textContent,e.currentTarget,'Brief copiado'));
  renderBrief();

  // checklist
  const phases=[
    ['T-30','un mes antes',['Confirmar código, notas, familia olfativa y precio','Definir concepto y mensaje principal','Coordinar stock y fecha con las otras áreas','Agendar la producción de fotos y video']],
    ['T-21','3 semanas',['Brief a la diseñadora y a la CM','Producción de fotos y video','Guiones de reels y teaser']],
    ['T-14','2 semanas',['Piezas aprobadas: post, historias, anuncios, banner web','Kit para revendedores armado','Textos de WhatsApp y respuestas frecuentes']],
    ['T-7','1 semana',['Aviso anticipado a revendedores con el kit','Carga del producto en el sitio (oculto)','Campañas pagas armadas y en revisión']],
    ['T-2','2 días',['Teaser con el número oculto','Cuenta regresiva en historias']],
    ['T0','lanzamiento',['Revelación en Instagram y TikTok','Producto visible en el sitio','Difusión por WhatsApp a clientes y revendedores','Pauta activa']],
    ['T+1','días 1 a 10',['Sostén: reseñas, reels de uso, respuestas a comentarios','Primer control de ventas y de la pauta']],
    ['T+30','un mes después',['Informe: ventas, alcance, pauta y aprendizajes','Decidir si la fragancia entra al calendario fijo']]
  ];
  const KEY='extracto-checklist-v1'; let state=store.get(KEY)||{};
  $('#checklist').innerHTML=phases.map((p,i)=>`<div class="phase"><div class="t">${p[0]}<small>${p[1]}</small></div><ul>${p[2].map((it,j)=>`<li><label for="ck-${i}-${j}"><input type="checkbox" id="ck-${i}-${j}" data-k="${i}-${j}"><span>${it}</span></label></li>`).join('')}</ul></div>`).join('');
  const boxes=$$('#checklist input');
  function upd(){const n=boxes.filter(b=>b.checked).length; $('#c-count').textContent=`${n} de ${boxes.length} tareas`; $('#c-bar').style.width=(n/boxes.length*100)+'%';}
  boxes.forEach(b=>{b.checked=!!state[b.dataset.k]; b.addEventListener('change',()=>{state[b.dataset.k]=b.checked; store.set(KEY,state); upd();});});
  $('#c-reset').addEventListener('click',()=>{boxes.forEach(b=>b.checked=false); state={}; store.set(KEY,state); upd();});
  upd();

  // snippets
  const snips=[
    ['Bio de Instagram','Perfumes de equivalencia con la precisión de un original.\n+600.000 vendidos · Envíos a todo el país\nRevendé Extracto 👇'],
    ['¿Cuánto tarda el envío?','¡Hola! En CABA llega en 24 h hábiles por moto. En GBA, de 2 a 3 días hábiles, y al interior, de 3 a 5 días hábiles por OCA. Te pasamos el seguimiento apenas sale.'],
    ['¿Cómo puedo pagar?','Podés pagar con Mercado Pago, con débito o crédito hasta en 3 cuotas sin interés, o por transferencia con un descuento especial.'],
    ['¿Cuánto dura?','Son extractos de alta concentración, por eso tienen buena fijación en la piel. La duración depende de cada fragancia y de tu piel. Si querés, te recomiendo las que más duran según lo que te guste.'],
    ['Quiero revender','¡Genial! Tenemos precios especiales para revendedores, +200 fragancias en stock y te acompañamos con soporte y material para vender. Te paso con la línea de revendedores para contarte cómo empezar.'],
    ['Posventa, día 3','¡Hola! ¿Ya te llegó tu Extracto? Queríamos saber qué te pareció. Si tenés cualquier duda, escribinos por acá.']
  ];
  $('#snips').innerHTML=snips.map((s,i)=>`<div class="snip"><header><b>${s[0]}</b><button class="copy" data-copy-i="${i}">Copiar</button></header><p>${s[1]}</p></div>`).join('');
  $$('[data-copy-i]').forEach(b=>b.addEventListener('click',()=>copyText(snips[+b.dataset.copyI][1],b)));

  // nav
  const secs=$$('main section');
  $('#nav').innerHTML=secs.map((s,i)=>`<li><a href="#${s.id}" data-id="${s.id}"><small>${i===0?'—':String(i).padStart(2,'0')}</small>${s.dataset.title}</a></li>`).join('');
  const links=$$('#nav a');
  const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle('on',l.dataset.id===e.target.id)); const on=$('#nav a.on'); if(on&&window.innerWidth<=900) on.scrollIntoView({block:'nearest',inline:'center'});}})},{rootMargin:'-20% 0px -70% 0px'});
  secs.forEach(s=>obs.observe(s));

  // search
  $('#q').addEventListener('input',e=>{
    const q=e.target.value.trim().toLowerCase(); let any=false;
    $$('.hit').forEach(h=>h.classList.remove('hit'));
    secs.forEach((s,i)=>{
      const m=!q||s.textContent.toLowerCase().includes(q)||[...s.querySelectorAll('input,textarea')].some(x=>x.value.toLowerCase().includes(q));
      s.hidden=!m; links[i].parentElement.hidden=!m; if(m) any=true;
      if(q&&m){ $$('h3,.cell p,li,.tone-row span,.lexicon span,td,.snip p',s).filter(el=>el.textContent.toLowerCase().includes(q)).slice(0,6).forEach(el=>el.classList.add('hit')); }
    });
    $('#empty').style.display=any?'none':'block';
  });

  // theme
  const root=document.documentElement;
  const saved=store.get('extracto-theme'); if(saved) root.dataset.theme=saved;
  $('#themeBtn').addEventListener('click',()=>{
    const dark = root.dataset.theme ? root.dataset.theme==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark?'light':'dark'; store.set('extracto-theme',root.dataset.theme);
  });
})();
