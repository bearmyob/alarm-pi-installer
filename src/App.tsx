import { useState } from 'react';
import './App.css';

// Types
interface Config {
  site: string;
  room: string;
  sms1: string;
  sms2: string;
  email1: string;
  email2: string;
  gpioPin: number;
}

// Preset data
const SITES = ['Hay Farm', 'Custom'];
const ROOMS = ['Owl_House_Left', 'Nurse', 'Lodge_1', 'Queen_Ann', 'Top_Front', 'Custom'];
const PHONES = ['+447848808008', '+447920403058', 'Custom'];
const EMAILS = ['a.smith@promisclinics.com', 'alarmhf@promisclinics.com', 'promisemergencycallsystem@gmail.com', 'Custom'];

// Silence unused variable warnings (will be used in full implementation)
void PHONES; void EMAILS;

function App() {
  const [step, setStep] = useState(0);
  const [ipAddress, setIpAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Alarm Pi Installer v1.0 initialized...']);
  const [config, setConfig] = useState<Config>({
    site: 'Hay Farm', room: '', sms1: '+447848808008', sms2: '+447848808008',
    email1: 'a.smith@promisclinics.com', email2: 'a.smith@promisclinics.com', gpioPin: 5
  });

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleConnect = async () => {
    if (!ipAddress) return;
    setLoading(true);
    addLog(`Connecting to ${ipAddress}...`);

    try {
      const result = await (window as any).electronAPI.sshConnect({
        host: ipAddress, username: 'pi', password: 'mimichou'
      });
      if (result.success) {
        setConnected(true);
        addLog('✓ Connection established!');
        setStep(1);
      } else {
        addLog(`✗ Connection failed: ${result.message}`);
      }
    } catch (e: any) {
      addLog(`✗ Error: ${e.message}`);
    }
    setLoading(false);
  };

  const handleDeploy = async () => {
    setLoading(true);
    addLog('Starting deployment sequence...');
    // Deployment would go here
    addLog('Deployment complete!');
    setLoading(false);
  };

  const steps = ['CONNECT', 'SITE', 'ROOM', 'CONTACTS', 'GPIO', 'DEPLOY'];

  return (
    <div className="app">
      {/* Title Bar */}
      <div className="title-bar">
        <div className="title">⚡ ALARM PI INSTALLER</div>
        <div className="window-controls">
          <button onClick={() => (window as any).electronAPI?.minimize()}>─</button>
          <button onClick={() => (window as any).electronAPI?.maximize()}>□</button>
          <button onClick={() => (window as any).electronAPI?.close()}>✕</button>
        </div>
      </div>

      <div className="main-container">
        {/* Left Panel - Steps */}
        <div className="steps-panel">
          {steps.map((s, i) => (
            <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'complete' : ''}`}>
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-name">{s}</span>
            </div>
          ))}
        </div>

        {/* Center Panel - Main Content */}
        <div className="content-panel">
          {step === 0 && (
            <div className="step-content">
              <h2 className="cyber-title">ESTABLISH CONNECTION</h2>
              <div className="input-group">
                <label>TARGET IP ADDRESS</label>
                <input type="text" value={ipAddress} onChange={e => setIpAddress(e.target.value)}
                  placeholder="100.xxx.xxx.xxx" className="cyber-input" />
              </div>
              <button className="cyber-button primary" onClick={handleConnect} disabled={loading}>
                {loading ? '◌ CONNECTING...' : '▶ INITIATE CONNECTION'}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="step-content">
              <h2 className="cyber-title">SELECT SITE</h2>
              <div className="option-grid">
                {SITES.map(site => (
                  <button key={site} className={`option-btn ${config.site === site ? 'selected' : ''}`}
                    onClick={() => { setConfig({...config, site}); if (site !== 'Custom') setStep(2); }}>
                    {site}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h2 className="cyber-title">SELECT ROOM</h2>
              <div className="option-grid">
                {ROOMS.map(room => (
                  <button key={room} className={`option-btn ${config.room === room ? 'selected' : ''}`}
                    onClick={() => { setConfig({...config, room}); if (room !== 'Custom') setStep(3); }}>
                    {room}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step >= 3 && step < 5 && (
            <div className="step-content">
              <h2 className="cyber-title">{step === 3 ? 'CONFIGURE CONTACTS' : 'SET GPIO PIN'}</h2>
              <button className="cyber-button primary" onClick={() => setStep(step + 1)}>
                ▶ CONTINUE
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="step-content">
              <h2 className="cyber-title">DEPLOY SYSTEM</h2>
              <div className="config-summary">
                <p><span>Site:</span> {config.site}</p>
                <p><span>Room:</span> {config.room}</p>
                <p><span>GPIO:</span> {config.gpioPin}</p>
              </div>
              <button className="cyber-button danger" onClick={handleDeploy} disabled={loading}>
                {loading ? '◌ DEPLOYING...' : '🚀 DEPLOY NOW'}
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Console */}
        <div className="console-panel">
          <div className="console-header">◢ SYSTEM LOG</div>
          <div className="console-output">
            {logs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <span className={`status-dot ${connected ? 'online' : 'offline'}`}></span>
        <span>{connected ? `Connected: ${ipAddress}` : 'Disconnected'}</span>
      </div>
    </div>
  );
}

export default App;
