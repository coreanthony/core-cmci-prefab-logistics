import re,json
recs=json.load(open('recs.json'))
colors={'DFW':'#2f6fdb','Houston':'#d6402f','Austin / Central':'#2e9e4f','San Antonio':'#f29a1f','South TX':'#8a55c9','Outlier':'#d81b8a'}
states=open('states.json').read()
css=open('node_modules/leaflet/dist/leaflet.css').read()
page='''<title>Core CMCI Store Map</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
__LEAFLET_CSS__
:root{--bg:#e9ecef;--land:#f7f6f2;--land2:#ecebe6;--tx:#fbfaf6;--edge:#b9bdc4;--txedge:#7d8593;--panel:#ffffff;--ink:#1c2430;--mute:#5f6b7a;--line:#dde1e6;--label:#6b7482;--pop:#ffffff;
 --sans:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',Arial,sans-serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#12161c;--land:#1d232c;--land2:#181d25;--tx:#242c37;--edge:#3a4351;--txedge:#8593a8;--panel:#1a2029;--ink:#e8ecf2;--mute:#9aa6b6;--line:#2c3542;--label:#8894a5;--pop:#1a2029}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#12161c;--land:#1d232c;--land2:#181d25;--tx:#242c37;--edge:#3a4351;--txedge:#8593a8;--panel:#1a2029;--ink:#e8ecf2;--mute:#9aa6b6;--line:#2c3542;--label:#8894a5;--pop:#1a2029}
html,body{height:100%}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:13px;overflow:hidden}
#map{position:absolute;inset:0;background:var(--bg);font-family:var(--sans)}
path.st{fill:var(--land2);stroke:var(--edge);stroke-width:1}
path.tx{fill:var(--tx);stroke:var(--txedge);stroke-width:1.4}
.leaflet-container{background:var(--bg)}
.lbl{background:none;border:0;box-shadow:none;color:var(--label);font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;padding:0}
.lbl:before{display:none}
.city{font-size:11px;letter-spacing:.02em;text-transform:none;font-weight:500}
#panel{position:absolute;z-index:1000;top:12px;right:12px;width:250px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px;box-shadow:0 2px 12px rgba(0,0,0,.18)}
#panel h1{margin:0;font-size:15px;font-weight:600}
#panel .sub{color:var(--mute);margin:2px 0 10px}
.row{display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer}
.row input{accent-color:#2f6fdb;margin:0}
.dot{width:11px;height:11px;border-radius:50%;flex:none}
.row .n{margin-left:auto;font-family:var(--mono);color:var(--mute)}
select{width:100%;margin-top:10px;padding:6px 8px;font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px}
#cnt{margin-top:8px;font-family:var(--mono);font-size:12px}
.note{margin-top:8px;color:var(--mute);font-size:11px;line-height:1.4}
.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:var(--pop);color:var(--ink)}
.leaflet-popup-content{font-size:12px;line-height:1.5;margin:12px 14px}
.pt{font-weight:600;font-size:13px}.pt small{font-weight:400;color:var(--mute)}
.kv{display:grid;grid-template-columns:auto 1fr;gap:1px 10px;margin-top:6px}.kv b{color:var(--mute);font-weight:500}
.leaflet-control-zoom a{background:var(--panel);color:var(--ink);border-color:var(--line)}
:focus-visible{outline:2px solid #2f6fdb;outline-offset:2px}
@media (max-width:600px){#panel{top:auto;right:12px;left:12px;bottom:12px;width:auto;max-height:42%;overflow:auto;padding:10px 12px}
 .legend{display:grid;grid-template-columns:1fr 1fr;column-gap:14px}.note{display:none}}
</style>
<div id="map"></div>
<div id="panel"><h1>Core CMCI stores</h1><div class="sub">Consultation room installs, 65 sites</div>
<div class="legend" id="legend"></div>
<label for="wk" style="display:block;margin-top:10px;color:var(--mute)">MSD week</label>
<select id="wk"><option value="">All weeks</option></select><div id="cnt"></div>
<div class="note">Most pins sit on the store address. Pins marked approx. or verify in their popup need a check. Click a pin for details.</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script>
const D=__DATA__,C=__COLORS__,ST=__STATES__;
const map=L.map('map',{zoomSnap:.25,zoomControl:true,attributionControl:false,minZoom:4,maxBounds:[[22,-108],[38,-84]]});
L.geoJSON(ST,{style:f=>({className:f.properties.tx?'st tx':'st'}),interactive:false}).addTo(map);
[['Texas',31.4,-100.2],['Louisiana',31.0,-92.4],['Oklahoma',35.6,-97.5],['New Mexico',33.6,-106.2],['Arkansas',34.8,-92.4]].forEach(([n,a,o])=>L.tooltip({permanent:true,direction:'center',className:'lbl',interactive:false}).setContent(n).setLatLng([a,o]).addTo(map));
[['Dallas-Fort Worth',32.78,-97.1],['Houston',29.76,-95.37],['Austin',30.27,-97.74],['San Antonio',29.42,-98.49],['Corpus Christi',27.8,-97.4],['Rio Grande Valley',26.2,-98.2],['Amarillo',35.22,-101.83],['New Orleans',29.95,-90.07]].forEach(([n,a,o])=>L.tooltip({permanent:true,direction:'right',offset:[14,-14],className:'lbl city',interactive:false}).setContent(n).setLatLng([a,o]).addTo(map));
const act=new Set(Object.keys(C));let wk='';const grp=L.featureGroup().addTo(map);
function draw(){grp.clearLayers();let n=0,u=0;
 D.forEach(s=>{if(!act.has(s.region)||(wk&&s.msdw!==wk))return;n++;u+=s.units;
  const ap=/approx|verify/.test(s.acc);const m=L.circleMarker([s.lat,s.lon],{radius:8,color:ap?'#1c2430':'#ffffff',dashArray:ap?'3 2':null,weight:2,fillColor:C[s.region],fillOpacity:.95});
  m.bindTooltip('Store '+s.store);
  m.bindPopup(`<div class="pt">Store ${s.store} <small>CS# ${s.cs}</small></div>${s.addr}<div class="kv"><b>Region</b><span>${s.region}</span><b>MSD</b><span>${s.msd}</span><b>Deliver-by</b><span>${s.deliver}</span><b>Ship-by</b><span>${s.ship}</span><b>Units</b><span>${s.units} (config ${s.cfg})</span><b>Labor</b><span>${s.labor}</span><b>Layout</b><span>${s.status}</span><b>Pin</b><span>${s.acc}</span></div>`);
  m.addTo(grp);});
 document.getElementById('cnt').textContent=n+' stores / '+u+' units';
 if(n)map.fitBounds(grp.getBounds().pad(.12));}
const lg=document.getElementById('legend');
Object.keys(C).forEach(r=>{const cnt=D.filter(s=>s.region===r).length;const l=document.createElement('label');l.className='row';
 l.innerHTML=`<input type="checkbox" checked><span class="dot" style="background:${C[r]}"></span><span>${r}</span><span class="n">${cnt}</span>`;
 l.firstChild.onchange=e=>{e.target.checked?act.add(r):act.delete(r);draw()};lg.appendChild(l)});
const sel=document.getElementById('wk');
[...new Set(D.map(s=>s.msdw))].sort().forEach(w=>{const o=document.createElement('option');o.value=w;o.textContent='Week of '+w;sel.appendChild(o)});
sel.onchange=e=>{wk=e.target.value;draw()};
map.fitBounds([[25.8,-100.5],[36,-90]]);draw();
</script>'''
page=page.replace('__LEAFLET_CSS__',css).replace('__DATA__',json.dumps(recs)).replace('__COLORS__',json.dumps(colors)).replace('__STATES__',states)
open('artifact.html','w').write(page)
# test copy with local leaflet
t='<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">'+page
open('test.html','w').write(t)
