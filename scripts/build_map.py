import pandas as pd, numpy as np, zipcodes, json, openpyxl, html
from openpyxl.styles import Font, PatternFill, Alignment
exec(open('build.py').read().split("wb=openpyxl.load_workbook(src)")[0])  # reuse d (with Region) 
tr={'DFW':2,'Houston':2,'Austin / Central':2,'San Antonio':2,'South TX':3,'Outlier':4}
d['Zip']=d['Zip'].astype(str).str.zfill(5)
d['lat']=[float(zipcodes.matching(z)[0]['lat']) for z in d['Zip']]
d['lon']=[float(zipcodes.matching(z)[0]['long']) for z in d['Zip']]
# offset stores sharing a ZIP so pins don't stack
d['n']=d.groupby('Zip').cumcount(); 
d['lat']+=np.where(d['n']>0,0.004*d['n'],0); d['lon']+=np.where(d['n']>0,0.004*d['n'],0)
import json as _j
H=_j.load(open('have.json'))
OSM={'189190':(27.75643,-97.38984,'OSM address match'),'189523':(29.59094,-95.67708,'OSM CVS store match'),'189926':(26.23017,-98.32266,'OSM CVS store match'),'190024':(29.66198,-95.68694,'OSM CVS store match'),'190031':(32.96545,-96.34001,'OSM CVS store match'),'190033':(33.13282,-97.09509,'OSM CVS store match (FM 2181 = Teasley Ln)'),
'190026':(30.55072,-97.73936,'OSM CVS store match - verify (3000 Sendero Springs Dr)'),'189422':(26.15593,-97.97398,'OSM CVS store match - verify (1602 E 6th St)'),
'189978':(26.34057,-98.17993,'Road only (W Monte Cristo Rd) - approx.'),'189171':(29.80035,-95.83299,'Road only (Franz Rd) - approx.'),'189423':(29.51775,-95.024,'Road only (E League City Pkwy) - approx.'),'189471':(30.7184,-95.56845,'Road only (11th St) - approx.'),'189984':(29.60842,-98.26611,'Road only (Cibolo Valley Dr) - approx.')}
d['acc']='ZIP center - approx.'
for i,r in d.iterrows():
    k=r['CS#']
    if k in H: d.at[i,'lat'],d.at[i,'lon'],d.at[i,'acc']=H[k][0],H[k][1],'Census address match'
    elif k in OSM: d.at[i,'lat'],d.at[i,'lon'],d.at[i,'acc']=OSM[k]
d['deliver']=[np.busday_offset(np.datetime64(m.date()),-3,roll='backward') for m in d['MSD']]
d['ship']=[np.busday_offset(np.datetime64(dv,'D'),-tr[r],roll='backward') for dv,r in zip(d['deliver'],d['Region'])]
d['units']=[int(str(u)[0]) if isinstance(u,(int,float)) and u==u or (isinstance(u,str) and u[0].isdigit()) else 3 for u in d['Unit Configuration']]
d['cfg']=d['Unit Configuration'].apply(lambda u:'TBD' if pd.isna(u) else str(u))
fmt=lambda x:pd.Timestamp(x).strftime('%a %m/%d/%y')
d['Address2']=d['Address'].str.title()+', '+d['City'].str.title()+', '+d['State']+' '+d['Zip']
recs=[dict(cs=r['CS#'],store=int(r['Store #']),addr=r['Address2'],region=r['Region'],msd=fmt(r['MSD']),msdw=pd.Timestamp(r['MSD']).strftime('%m/%d'),deliver=fmt(r['deliver']),ship=fmt(r['ship']),
 status=r['Layout Validation Status'],cfg=r['cfg'],units=int(r['units']),labor=('TBD' if pd.isna(r['MV or Store Labor?']) else r['MV or Store Labor?']),lat=round(r['lat'],5),lon=round(r['lon'],5),acc=r['acc']) for _,r in d.iterrows()]
colors={'DFW':'#1f77b4','Houston':'#d62728','Austin / Central':'#2ca02c','San Antonio':'#ff7f0e','South TX':'#9467bd','Outlier':'#333333'}
# KML
def kml():
    o=['<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Core CMCI - Consultation Room Stores</name>']
    for rg,c in colors.items():
        h=c[1:]; abgr='ff'+h[4:6]+h[2:4]+h[0:2]
        o.append(f'<Style id="{rg[:3]}{len(rg)}"><IconStyle><color>{abgr}</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>')
    for rg in colors:
        o.append(f'<Folder><name>{html.escape(rg)}</name>')
        for x in recs:
            if x['region']!=rg: continue
            desc=f"{x['addr']}<br/>CS# {x['cs']}<br/>MSD: {x['msd']}<br/>Deliver-by: {x['deliver']}<br/>Ship-by: {x['ship']}<br/>Units: {x['units']} (config {x['cfg']})<br/>Labor: {x['labor']}<br/>Layout: {x['status']}<br/>Pin: {x['acc']}"
            o.append(f"<Placemark><name>Store {x['store']} - {html.escape(x['addr'].split(', ')[1])} (MSD {x['msdw']})</name><description><![CDATA[{desc}]]></description><styleUrl>#{rg[:3]}{len(rg)}</styleUrl><Point><coordinates>{x['lon']},{x['lat']},0</coordinates></Point></Placemark>")
        o.append('</Folder>')
    o.append('</Document></kml>'); return ''.join(o)
open('/mnt/user-data/outputs/Core CMCI Store Map.kml','w').write(kml())
# HTML
page='''<!doctype html><html><head><meta charset="utf-8"><title>Core CMCI Store Map</title><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css">
<style>html,body{margin:0;height:100%;font-family:system-ui,Segoe UI,Arial,sans-serif}#map{position:absolute;inset:0}
#panel{position:absolute;z-index:1000;top:10px;right:10px;background:#fff;padding:10px 12px;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,.35);font-size:13px;max-width:230px}
#panel h4{margin:0 0 6px;font-size:14px}#panel label{display:flex;align-items:center;gap:6px;margin:3px 0;cursor:pointer}.dot{width:12px;height:12px;border-radius:50%;display:inline-block}
select{width:100%;margin:6px 0 2px}.note{font-size:11px;color:#666;margin-top:6px}</style></head><body><div id="map"></div>
<div id="panel"><h4>Core CMCI - 65 stores</h4><div id="legend"></div>
<select id="wk"><option value="">All MSD weeks</option></select><div id="cnt"></div>
<div class="note">Pins are placed at ZIP-code centers, so they are approximate (within a few miles). Stores sharing a ZIP are nudged apart. Pin number = store #.</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script><script>
const D=__DATA__,C=__COLORS__;
const map=L.map('map').setView([31.0,-98.0],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const layers={},act=new Set(Object.keys(C));let wk='';
const grp=L.featureGroup().addTo(map);
function draw(){grp.clearLayers();let n=0,u=0;
 D.forEach(s=>{if(!act.has(s.region)||(wk&&s.msdw!==wk))return;n++;u+=s.units;
  const m=L.circleMarker([s.lat,s.lon],{radius:9,color:'#fff',weight:2,fillColor:C[s.region],fillOpacity:.95});
  m.bindTooltip(String(s.store),{permanent:false});
  m.bindPopup(`<b>Store ${s.store}</b> (CS# ${s.cs})<br>${s.addr}<br><b>Region:</b> ${s.region}<br><b>MSD:</b> ${s.msd}<br><b>Deliver-by:</b> ${s.deliver}<br><b>Ship-by:</b> ${s.ship}<br><b>Units:</b> ${s.units} (config ${s.cfg})<br><b>Labor:</b> ${s.labor}<br><b>Layout:</b> ${s.status}`);
  m.addTo(grp);});
 document.getElementById('cnt').textContent=n+' stores, '+u+' units';
 if(n)map.fitBounds(grp.getBounds().pad(.15));}
const lg=document.getElementById('legend');
Object.keys(C).forEach(r=>{const cnt=D.filter(s=>s.region===r).length;const l=document.createElement('label');l.innerHTML=`<input type=checkbox checked><span class=dot style="background:${C[r]}"></span>${r} (${cnt})`;
 l.firstChild.onchange=e=>{e.target.checked?act.add(r):act.delete(r);draw()};lg.appendChild(l)});
const ws=[...new Set(D.map(s=>s.msdw))].sort();const sel=document.getElementById('wk');
ws.forEach(w=>{const o=document.createElement('option');o.value=w;o.textContent='MSD '+w;sel.appendChild(o)});
sel.onchange=e=>{wk=e.target.value;draw()};draw();
</script></body></html>'''
page=page.replace('__DATA__',json.dumps(recs)).replace('__COLORS__',json.dumps(colors))
open('recs.json','w').write(json.dumps(recs))
# add Map Data tab to workbook
p='/mnt/user-data/outputs/Pre-fab Consultation Room - Core CMCI Logistics Plan.xlsx'
wb=openpyxl.load_workbook(p)
if 'Map Data' in wb.sheetnames: del wb['Map Data']
M=wb.create_sheet('Map Data',index=wb.sheetnames.index('Region Summary')+1)
heads=['Region','Store #','CS#','Address','City','State','Zip','Latitude','Longitude','MSD','Location basis']
M.append(heads)
for _,r in d.iterrows(): M.append([r['Region'],int(r['Store #']),r['CS#'],r['Address'].title(),r['City'].title(),r['State'],r['Zip'],round(r['lat'],5),round(r['lon'],5),pd.Timestamp(r['MSD']).to_pydatetime(),r['acc']])
for c in M[1]: c.font=Font(bold=True,color='FFFFFF'); c.fill=PatternFill('solid',fgColor='1F3864'); c.alignment=Alignment(horizontal='center')
for i,w in enumerate([16,9,9,28,16,6,8,11,11,12,20],1): M.column_dimensions[openpyxl.utils.get_column_letter(i)].width=w
for r in range(2,M.max_row+1): M.cell(r,10).number_format='m/d/yy'
M.freeze_panes='A2'; M.auto_filter.ref=f'A1:K{M.max_row}'
wb.save(p)
print(d[['Store #','City','Zip','lat','lon']].head(3)); print(d.units.sum(), len(recs))
