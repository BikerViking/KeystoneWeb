import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
})
L.Marker.prototype.options.icon = DefaultIcon

const HELLERTOWN = [40.5795, -75.3407] as [number, number]

export function ServiceMap(){
  const [dist, setDist] = React.useState<number|null>(null)
const [fee, setFee] = React.useState<string>('—')
function haversine(a:[number,number], b:[number,number]){
  const R = 3958.8 // miles
  const toRad = (x:number)=> x*Math.PI/180
  const dLat = toRad(b[0]-a[0]); const dLon = toRad(b[1]-a[1])
  const lat1 = toRad(a[0]); const lat2 = toRad(b[0])
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
  return 2*R*Math.asin(Math.sqrt(h))
}
function feeForMiles(m:number){
  if (m<=10) return '$0 travel fee'
  if (m<=20) return '+$20 travel fee'
  if (m<=30) return '+$40 travel fee'
  return 'Call for quote'
}

  const ref = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    if(!ref.current) return
    const map = L.map(ref.current, { zoomControl: false }).setView(HELLERTOWN, 10)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
    L.marker(HELLERTOWN).addTo(map).bindPopup('Hellertown, PA')
    let clientMarker:any = null
    map.on('click', (e:any)=>{
      const where:[number,number] = [e.latlng.lat, e.latlng.lng]
      if (clientMarker) clientMarker.remove()
      clientMarker = L.marker(where, { title: 'Client location' }).addTo(map).bindPopup('Client location').openPopup()
      const miles = haversine(HELLERTOWN, where)
      setDist(miles)
      setFee(feeForMiles(miles))
      L.polyline([HELLERTOWN, where], { color: '#C0C0C0', opacity: 0.6 }).addTo(map)
    })
    // 30-mile radius ≈ 48,280 meters
    L.circle(HELLERTOWN, { radius: 48280, color: '#E5E4E2', fillColor: '#C0C0C0', fillOpacity: 0.15 }).addTo(map)
    const onResize = ()=> map.invalidateSize()
    setTimeout(onResize, 50)
    window.addEventListener('resize', onResize)
// Counties overlay
fetch('/data/counties.geojson').then(r=>r.json()).then(geo=>{
  const layers:any = {}
  L.geoJSON(geo, {
    style: () => ({ color:'#E5E4E2', weight:1, fillOpacity:0.05 }),
    onEachFeature: (f:any, layer:any)=>{
      layer.bindTooltip(f.properties.name)
      layers[f.properties.name] = layer
    }
  }).addTo(map)
  ;(window as any).KeystoneMap_toggleCounty = (name:string, show:boolean)=>{
    if (!layers[name]) return
    if (show) layers[name].addTo(map); else map.removeLayer(layers[name])
  }
})
;(window as any).KeystoneMap_addClient = (where:[number,number], label:string)=>{
  if (clientMarker) clientMarker.remove()
  clientMarker = L.marker(where, { title: 'Client location' }).addTo(map).bindPopup(label).openPopup()
  L.polyline([HELLERTOWN, where], { color: '#C0C0C0', opacity: 0.6 }).addTo(map)
  const miles = haversine(HELLERTOWN, where)
  setDist(miles); setFee(feeForMiles(miles))
}
;(window as any).KeystoneMap_setETA = (miles:number, minutes:number)=>{
  const box = document.getElementById('etaBox')
  if (box) box.textContent = `ETA: ${minutes} min · Distance: ${miles.toFixed(1)} mi`
}

    return ()=> { window.removeEventListener('resize', onResize); map.remove() }
  },[])
  return (
    <section id="map" className="min-h-[80svh] grid place-items-center px-4">
      <div className="w-full max-w-5xl grid gap-4"><div className="grid md:grid-cols-[1fr_auto_auto] gap-3">
  <input id="address" placeholder="Enter address for ETA…" className="rounded border border-white/15 bg-black/40 p-2" />
  <button onClick={async ()=>{
    const addr = (document.getElementById('address') as HTMLInputElement).value
    if(!addr) return
    const r = await fetch('/api/geocode?q='+encodeURIComponent(addr))
    const j = await r.json()
    if(!j.ok){ alert('Address not found'); return }
    // Add marker & polyline
    const where:[number,number] = [j.lat, j.lon]
    ;(window as any).KeystoneMap_addClient(where, j.label)
    const rt = await fetch('/api/route?lat='+where[0]+'&lon='+where[1])
    const rr = await rt.json()
    ;(window as any).KeystoneMap_setETA(rr.miles, rr.minutes)
  }} className="border border-white/15 rounded-lg px-4">Geocode</button>
  <div className="text-muted self-center" id="etaBox">ETA: — · Distance: —</div>
</div>

        <h2 className="text-3xl font-extrabold text-center">Service Area</h2>
        <p className="text-center text-muted">Hellertown HQ with typical radius covering Northampton, Lehigh, and Bucks counties. Need farther? Ask.</p>
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-glass">
          <div ref={ref} style={{height:'60vh', width:'100%'}} />
        </div>
      </div>
          <div className="text-center text-muted">
        <p className="m-0">Click anywhere on the map to estimate distance and travel fee.</p>
        <p className="m-0">Distance: {dist ? dist.toFixed(1) + ' mi' : '—'} · Travel fee estimate: <strong>{fee}</strong></p>
      </div>
    
      <div className="flex gap-2 justify-center mt-3">
        {['Northampton County','Lehigh County','Bucks County'].map(n=> (
          <label key={n} className="text-sm flex items-center gap-2">
            <input type="checkbox" defaultChecked onChange={e=> (window as any).KeystoneMap_toggleCounty(n, (e.target as HTMLInputElement).checked)} /> {n}
          </label>
        ))}
      </div>
    </section>
  )
}
