import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, MapPin, ExternalLink } from 'lucide-react';

// Fix for default marker icon
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface BusinessMapProps {
  companies: any[];
  onSelectCompany: (id: number) => void;
}

export default function BusinessMap({ companies, onSelectCompany }: BusinessMapProps) {
  // Filter companies with addresses and mock coordinates
  // In a real app, we would geocode these or have lat/lng in the DB
  const companiesWithLocation = companies
    .filter(c => c.address)
    .map((c, idx) => {
      // Mock coordinates around Abidjan (5.36, -4.00)
      const lat = 5.36 + (Math.random() - 0.5) * 0.1;
      const lng = -4.00 + (Math.random() - 0.5) * 0.1;
      return { ...c, lat, lng };
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
          <MapPin size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Carte des entreprises</h2>
          <p className="text-slate-500 text-sm font-medium">Visualisez les entreprises à proximité</p>
        </div>
      </div>

      <div className="h-[400px] w-full rounded-[32px] overflow-hidden border border-slate-100 shadow-sm z-0">
        <MapContainer 
          center={[5.36, -4.00]} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {companiesWithLocation.map(company => (
            <Marker key={company.id} position={[company.lat, company.lng]}>
              <Popup>
                <div className="p-2 space-y-2 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary overflow-hidden">
                      {company.logoUrl ? <img src={company.logoUrl} className="w-full h-full object-cover" /> : <Building2 size={16} />}
                    </div>
                    <h4 className="font-bold text-slate-900 m-0">{company.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 m-0">{company.address}</p>
                  <button 
                    onClick={() => onSelectCompany(company.id)}
                    className="w-full py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    Voir profil <ExternalLink size={10} />
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
