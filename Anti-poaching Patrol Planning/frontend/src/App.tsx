import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Play, StepForward, AlertTriangle, Square, Activity, Crosshair, Navigation, Info } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, CircleMarker, Tooltip, Polygon } from 'react-leaflet';
import L from 'leaflet';
import './index.css';

// Fix leafet default icon issue
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Types
interface Node {
  id: string;
  lat: number;
  lng: number;
  belief: number; // 0 to 1
}

interface Edge {
  source: string;
  target: string;
}

interface AppState {
  nodes: Node[];
  edges: Edge[];
  rangerLocation: string | null;
  patrolRoute: string[];
  cameras: string[];
  patrolStatus: {
    active: boolean;
    currentStep: number;
    totalSteps: number;
    distance: number;
    maxDistance: number;
  };
  events: { time: string; title?: string; text: string; type?: string }[];
}

const MOCK_STATE: AppState = {
  nodes: [
    { id: '0_0', lat: 0, lng: 0, belief: 0.1 },
    { id: '0_1', lat: 10, lng: -5, belief: 0.3 },
    { id: '1_0', lat: 5, lng: 15, belief: 0.8 },
    { id: '1_1', lat: 20, lng: 5, belief: 0.2 },
    { id: '2_2', lat: -10, lng: 10, belief: 0.5 },
  ],
  edges: [
    { source: '0_0', target: '0_1' },
    { source: '0_0', target: '1_0' },
    { source: '0_1', target: '1_1' },
    { source: '1_0', target: '1_1' },
    { source: '1_0', target: '2_2' },
  ],
  rangerLocation: '0_0',
  patrolRoute: ['0_0', '1_0', '1_1'],
  cameras: ['0_1', '2_2'],
  patrolStatus: {
    active: false,
    currentStep: 0,
    totalSteps: 3,
    distance: 0,
    maxDistance: 10,
  },
  events: [
    { time: '20:42', title: 'Risk increased', text: 'Zone 6 probability increased to 80%.', type: 'risk' },
    { time: '20:21', title: 'Camera Alert', text: 'Possible movement detected near Zone 13.', type: 'alert' },
  ],
};

const API_BASE = 'http://localhost:8000/api';

// Hardcoded friendly names and environmental context for up to 25 nodes (5x5 grid)
const NODE_INFO_MAP: Record<string, { name: string, type: string }> = {
  '0_0': { name: 'Ranger Base', type: 'base' },
  '0_1': { name: 'North Grassland', type: 'grassland' },
  '0_2': { name: 'Northern Pass', type: 'trail' },
  '0_3': { name: 'Dry Scrub', type: 'brush' },
  '0_4': { name: 'Rocky Outcrop', type: 'rock' },
  '1_0': { name: 'River Crossing', type: 'water' },
  '1_1': { name: 'Watering Hole', type: 'water' },
  '1_2': { name: 'Central Meadow', type: 'grassland' },
  '1_3': { name: 'Elephant Path', type: 'trail' },
  '1_4': { name: 'East Boundary', type: 'boundary' },
  '2_0': { name: 'Dense Canopy', type: 'forest' },
  '2_1': { name: 'Bamboo Forest', type: 'forest' },
  '2_2': { name: 'Heart of Reserve', type: 'forest' },
  '2_3': { name: 'Old Baobab', type: 'landmark' },
  '2_4': { name: 'Acacia Grove', type: 'forest' },
  '3_0': { name: 'Southwest Basin', type: 'water' },
  '3_1': { name: 'Mud Flats', type: 'water' },
  '3_2': { name: 'Observation Point', type: 'checkpoint' },
  '3_3': { name: 'Leopard Ridge', type: 'rock' },
  '3_4': { name: 'Valley Edge', type: 'trail' },
  '4_0': { name: 'Southern Gate', type: 'boundary' },
  '4_1': { name: 'Dry Riverbed', type: 'trail' },
  '4_2': { name: 'Poachers Trail', type: 'danger' },
  '4_3': { name: 'Hidden Cave', type: 'rock' },
  '4_4': { name: 'Deep Thicket', type: 'forest' },
};

function getRiskColor(belief: number) {
  if (belief < 0.2) return '#10C882'; // Green
  if (belief < 0.4) return '#F4B942'; // Yellow/Amber
  if (belief < 0.6) return '#F97316'; // Orange
  if (belief < 0.8) return '#E85D04'; // Red-Orange
  return '#EF4444'; // Critical Red
}

function getRiskLabel(belief: number) {
  if (belief < 0.2) return 'Low';
  if (belief < 0.4) return 'Moderate';
  if (belief < 0.6) return 'Elevated';
  if (belief < 0.8) return 'High';
  return 'Critical';
}

function formatNodeId(id: string) {
  if (!id) return '';
  const parts = id.split('_');
  if (parts.length === 2) {
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (!isNaN(x) && !isNaN(y)) {
      return `Zone ${x * 5 + y + 1}`;
    }
  }
  return id.startsWith('Zone') ? id : `Zone ${id}`;
}

function App() {
  const [state, setState] = useState<AppState>(MOCK_STATE);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchState = async () => {
    try {
      const res = await axios.get(`${API_BASE}/state`);
      // The backend returns graph_nodes (array of ids), belief (dict).
      // We must construct the Node[] array and Edge[] array if not provided directly.
      if (res.data.graph_nodes && res.data.belief) {
        // Build nodes array from API format
        const nodesList: Node[] = res.data.graph_nodes.map((id: string) => {
          const parts = id.split('_');
          const x = parseInt(parts[0] || '0');
          const y = parseInt(parts[1] || '0');
          return {
            id,
            // Scale grid coordinates to lat/lng for visual map
            lat: y * 5 - 10,
            lng: x * 5 - 10,
            belief: res.data.belief[id] || 0
          };
        });
        
        // Build edges (derive a simple grid if not provided, or fetch if available)
        // Since backend might not return edges explicitly, we derive grid edges
        const edgesList: Edge[] = [];
        nodesList.forEach(n => {
          const parts = n.id.split('_');
          const x = parseInt(parts[0]);
          const y = parseInt(parts[1]);
          // Connect to x+1, y and x, y+1
          if (res.data.graph_nodes.includes(`${x+1}_${y}`)) {
            edgesList.push({ source: n.id, target: `${x+1}_${y}` });
          }
          if (res.data.graph_nodes.includes(`${x}_${y+1}`)) {
            edgesList.push({ source: n.id, target: `${x}_${y+1}` });
          }
        });

        setState(s => ({
          ...s,
          nodes: nodesList,
          edges: edgesList,
          rangerLocation: res.data.ranger_location,
          patrolRoute: res.data.current_route || [],
          patrolStatus: {
            ...s.patrolStatus,
            active: res.data.patrol_active
          }
        }));
      } else {
        // If it matches exactly AppState (e.g. from a different backend version)
        setState(res.data);
      }
      setLastUpdate(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    } catch (err) {
      console.log('Failed to fetch from API, using mock data.');
      // Keep using mock data if API fails
      setLastUpdate(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartPatrol = async () => {
    try {
      await axios.post(`${API_BASE}/patrol/start`, {
        max_distance: 10,
        start_location: state.rangerLocation || state.nodes[0]?.id || '0_0',
      });
      fetchState();
    } catch (e) {
      console.warn('API Start Failed, mocking update');
      setState(s => ({
        ...s,
        patrolStatus: { ...s.patrolStatus, active: true, currentStep: 1 },
      }));
    }
  };

  const handleMove = async () => {
    try {
      await axios.post(`${API_BASE}/patrol/move`);
      fetchState();
    } catch (e) {
      console.warn('API Move Failed, mocking update');
      setState(s => {
        if (!s.patrolStatus.active) return s;
        const nextStep = s.patrolStatus.currentStep + 1;
        const nextLoc = s.patrolRoute[nextStep - 1] || s.rangerLocation;
        return {
          ...s,
          rangerLocation: nextLoc,
          patrolStatus: {
            ...s.patrolStatus,
            currentStep: nextStep,
            active: nextStep <= s.patrolStatus.totalSteps,
          }
        };
      });
    }
  };

  const handleEndPatrol = async () => {
    try {
      await axios.post(`${API_BASE}/patrol/end`);
      fetchState();
    } catch(e) {
      setState(s => ({
        ...s,
        patrolStatus: { ...s.patrolStatus, active: false, currentStep: 0 },
        patrolRoute: []
      }));
    }
  };

  const submitObservation = async (obs: 'suspicious' | 'clear') => {
    try {
      await axios.post(`${API_BASE}/observations`, {
        zone_id: state.rangerLocation,
        evidence_type: obs === 'suspicious' ? 'human_detected' : 'no_activity',
        positive_evidence: obs === 'suspicious',
        tick_time: true
      });
      fetchState();
    } catch (e) {
      console.warn('API Observation Failed, mocking event');
      setState(s => ({
        ...s,
        events: [
          { time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: 'Patrol Event', text: `Ranger marked ${formatNodeId(s.rangerLocation || '')} as ${obs}` },
          ...s.events
        ]
      }));
    }
  };

  const getNodeCoords = (id: string) => {
    const node = state.nodes.find(n => n.id === id);
    return node ? [node.lat, node.lng] as [number, number] : [0, 0] as [number, number];
  };

  const getOverallRisk = () => {
    const maxBelief = Math.max(...state.nodes.map(n => n.belief), 0);
    return { level: getRiskLabel(maxBelief), color: getRiskColor(maxBelief) };
  };

  // Environmental areas (Mock polygons for visual representation)
  const envFeatures = useMemo(() => {
    return [
      { type: 'water', bounds: [[0, 10], [10, 20], [5, 25]] as [number, number][], color: '#168AAD' },
      { type: 'forest', bounds: [[-5, -5], [-15, 0], [-10, 15], [0, 5]] as [number, number][], color: '#237A4B' }
    ];
  }, []);

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading command center...</div>;

  const overall = getOverallRisk();

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="map-container">
          <MapContainer 
            center={[0, 5]} 
            zoom={6} 
            style={{ height: '100%', width: '100%', background: 'var(--bg-dark)' }}
            attributionControl={false}
            zoomControl={true}
          >
            {/* Environmental Features */}
            {envFeatures.map((f, i) => (
              <Polygon key={`env-${i}`} positions={f.bounds} pathOptions={{ fillColor: f.color, color: f.color, fillOpacity: 0.1, weight: 1 }} />
            ))}

            {/* Edges / Routes */}
            {state.edges.map((e, idx) => {
              const start = getNodeCoords(e.source);
              const end = getNodeCoords(e.target);
              // Midpoint for distance tooltip
              const mid = [(start[0] + end[0])/2, (start[1] + end[1])/2] as [number, number];
              return (
                <div key={`edge-${idx}`}>
                  <Polyline 
                    positions={[start, end]} 
                    color="var(--border)" 
                    weight={2} 
                    dashArray="6, 6" 
                  />
                  <CircleMarker center={mid} radius={0} opacity={0}>
                    <Tooltip permanent direction="center" className="map-label" offset={[0,0]} opacity={0.6}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>2.4 km</span>
                    </Tooltip>
                  </CircleMarker>
                </div>
              );
            })}

            {/* Active Patrol Route */}
            {state.patrolStatus.active && state.patrolRoute.length > 1 && (
              <Polyline
                positions={state.patrolRoute.map(id => getNodeCoords(id))}
                color="var(--primary)"
                weight={4}
                opacity={0.8}
              />
            )}

            {/* Nodes / Zones */}
            {state.nodes.map(n => {
              const info = NODE_INFO_MAP[n.id] || { name: `Zone ${n.id}`, type: 'zone' };
              const color = getRiskColor(n.belief);
              return (
                <CircleMarker
                  key={`node-${n.id}`}
                  center={[n.lat, n.lng]}
                  radius={18}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.6,
                    color: color,
                    weight: 2
                  }}
                >
                  <Tooltip permanent direction="bottom" offset={[0, 15]} className="map-label">
                    <div>{info.name}</div>
                    <div className="label-id">{formatNodeId(n.id)}</div>
                  </Tooltip>
                  <Popup className="custom-popup">
                    <div style={{ padding: '0.5rem', minWidth: '150px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#111F1B' }}>{info.name} ({formatNodeId(n.id)})</h3>
                      <p style={{ margin: '0 0 0.2rem 0', fontWeight: 'bold', color: color }}>
                        Risk: {(n.belief * 100).toFixed(1)}% ({getRiskLabel(n.belief)})
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem' }}>Type: {info.type.toUpperCase()}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Ranger Location Marker */}
            {state.rangerLocation && (
              <Marker 
                position={getNodeCoords(state.rangerLocation)}
                icon={L.divIcon({
                  className: 'custom-marker-icon',
                  html: `
                    <div class="patrol-marker">
                      <div class="patrol-pulse"></div>
                      <div class="patrol-dot"></div>
                    </div>
                  `,
                  iconSize: [30, 30],
                  iconAnchor: [15, 15]
                })}
              >
                <Popup>PATROL UNIT 01<br/>Current Location: {NODE_INFO_MAP[state.rangerLocation]?.name || state.rangerLocation}</Popup>
              </Marker>
            )}
          </MapContainer>
          
          {/* Legend */}
          <div className="map-legend">
            <div className="legend-section">
              <div className="legend-title">Risk Level</div>
              <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--primary)'}}></div> Low (0-20%)</div>
              <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--warning)'}}></div> Moderate (20-40%)</div>
              <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--high-risk)'}}></div> Elevated (40-60%)</div>
              <div className="legend-item"><div className="legend-color" style={{backgroundColor: '#E85D04'}}></div> High (60-80%)</div>
              <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--critical)'}}></div> Critical (80-100%)</div>
            </div>
            <div className="legend-section">
              <div className="legend-title">Environment</div>
              <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--water-blue)', borderRadius: 0}}></div> Water Body</div>
              <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--forest-green)', borderRadius: 0}}></div> Dense Forest</div>
            </div>
            <div className="legend-section">
              <div className="legend-title">Routes</div>
              <div className="legend-item"><div className="legend-line" style={{borderTop: '2px dashed var(--border)'}}></div> Trail</div>
              <div className="legend-item"><div className="legend-line" style={{borderTop: '2px solid var(--primary)'}}></div> Active Patrol</div>
              <div className="legend-item">
                <div style={{position: 'relative', width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                  <div style={{width:'8px', height:'8px', backgroundColor:'var(--primary)', borderRadius:'50%', border:'1px solid #000'}}></div>
                </div> 
                Patrol Unit
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar">
        {/* Belief State Panel */}
        <div className="panel">
          <h2 className="panel-title"><Activity size={18} /> Belief State</h2>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Overall Risk</span>
            <span style={{ fontWeight: 'bold', color: overall.color, letterSpacing: '1px' }}>{overall.level.toUpperCase()}</span>
          </div>
          
          <div style={{ paddingRight: '0.5rem' }}>
            {state.nodes.sort((a,b) => b.belief - a.belief).slice(0, 10).map(n => {
              const info = NODE_INFO_MAP[n.id] || { name: `Zone ${n.id}` };
              return (
                <div className="belief-bar-container" key={n.id}>
                  <div className="belief-header">
                    <span>{info.name} <span style={{color: 'var(--text-main)', fontSize:'0.85rem', fontWeight:'bold', marginLeft:'0.3rem'}}>({formatNodeId(n.id)})</span></span>
                    <span style={{color: getRiskColor(n.belief)}}>{(n.belief * 100).toFixed(0)}%</span>
                  </div>
                  <div className="belief-track">
                    <div 
                      className="belief-fill" 
                      style={{ width: `${n.belief * 100}%`, backgroundColor: getRiskColor(n.belief) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Last Updated: {lastUpdate}
          </div>
        </div>

        {/* Patrol Status Panel */}
        <div className="panel">
          <h2 className="panel-title"><Navigation size={18} /> Patrol Status</h2>
          <div className="stat-row">
            <span className="stat-label">STATUS</span>
            <span className="stat-value" style={{ color: state.patrolStatus.active ? 'var(--primary)' : 'var(--text-muted)'}}>
              ● {state.patrolStatus.active ? 'READY / ACTIVE' : 'STANDBY'}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">CURRENT LOCATION</span>
            <span className="stat-value">
              {state.rangerLocation ? (
                <>
                  {NODE_INFO_MAP[state.rangerLocation]?.name || ''} 
                  <span style={{ color: 'var(--text-main)', opacity: 0.8, fontSize: '0.85rem' }}> ({formatNodeId(state.rangerLocation)})</span>
                </>
              ) : '—'}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">ROUTE</span>
            <span className="stat-value" style={{ fontSize: '0.8rem', textAlign: 'right', maxWidth: '60%' }}>
              {state.patrolRoute.length > 0 ? state.patrolRoute.map(formatNodeId).join(' → ') : '—'}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">PROGRESS</span>
            <span className="stat-value">{state.patrolRoute.length > 0 ? 1 : 0} / {state.patrolRoute.length} checkpoints</span>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            {!state.patrolStatus.active ? (
              <button className="btn btn-primary" onClick={handleStartPatrol}>
                <Play size={16} /> Start Patrol
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleMove} disabled={state.patrolRoute.length <= 1}>
                  <StepForward size={16} /> Proceed to Next
                </button>
                <button className="btn btn-danger" onClick={handleEndPatrol}>
                  <Square size={16} /> End Patrol
                </button>
                
                <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px' }}>
                  <h3 style={{ fontSize: '0.8rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Field Observations</h3>
                  <button className="btn btn-outline" onClick={() => submitObservation('suspicious')} style={{ borderColor: 'var(--high-risk)', color: 'var(--high-risk)' }}>
                    <AlertTriangle size={16} /> Report Suspicious
                  </button>
                  <button className="btn btn-outline" onClick={() => submitObservation('clear')}>
                    <Crosshair size={16} /> Report Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Event Feed Panel */}
        <div className="event-feed">
          <h2 className="panel-title"><Info size={18} /> Event Feed</h2>
          {state.events.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No recent events.</div>
          )}
          {state.events.map((ev, i) => (
            <div className="event-item" key={i}>
              <div className="event-time">{ev.time}</div>
              {ev.title && <div className="event-title">{ev.title}</div>}
              <div className="event-desc">{ev.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
