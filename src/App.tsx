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
const ROOMS = ['Owl_House_Left', 'Nurse', 'Lodge_1', 'Queen_Ann', 'Top_Front', 'Four_Poster', 'Custom'];
const PHONES = ['+447848808008', '+447920403058', 'Custom'];
const EMAILS = ['a.smith@promisclinics.com', 'alarmhf@promisclinics.com', 'promisemergencycallsystem@gmail.com', 'Custom'];

function App() {
  const [step, setStep] = useState(0);
  const [ipAddress, setIpAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Alarm Pi Installer v1.1 initialized...']);
  const [config, setConfig] = useState<Config>({
    site: 'Hay Farm', room: '', sms1: '+447920403058', sms2: '+447920403058',
    email1: 'alarmhf@promisclinics.com', email2: 'promisemergencycallsystem@gmail.com', gpioPin: 5
  });
  const [customRoom, setCustomRoom] = useState('');

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // Parse alarminfo.py content to extract config values
  const parseAlarmInfo = (content: string): Partial<Config> => {
    const parsed: Partial<Config> = {};
    const centreMatch = content.match(/"centre":\s*"([^"]+)"/);
    const locMatch = content.match(/"loc":\s*"([^"]+)"/);
    const sms1Match = content.match(/"sms_1":\s*"([^"]+)"/);
    const sms2Match = content.match(/"sms_2":\s*"([^"]+)"/);
    const alm1Match = content.match(/"alm1":\s*"([^"]+)"/);
    const alm2Match = content.match(/"alm2":\s*"([^"]+)"/);
    const gpioMatch = content.match(/"gpio_pin":\s*(\d+)/);

    if (centreMatch) parsed.site = centreMatch[1];
    if (locMatch) parsed.room = locMatch[1];
    if (sms1Match) parsed.sms1 = sms1Match[1];
    if (sms2Match) parsed.sms2 = sms2Match[1];
    if (alm1Match) parsed.email1 = alm1Match[1];
    if (alm2Match) parsed.email2 = alm2Match[1];
    if (gpioMatch) parsed.gpioPin = parseInt(gpioMatch[1]);

    return parsed;
  };

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

        // Check for existing alarm installation
        addLog('Checking for existing alarm installation...');
        const checkResult = await (window as any).electronAPI.sshExecute({
          host: ipAddress, username: 'pi', password: 'mimichou',
          command: 'cat /home/pi/alarm/alarminfo.py 2>/dev/null || echo "NO_ALARM_FOUND"'
        });

        if (checkResult.success && !checkResult.output.includes('NO_ALARM_FOUND')) {
          setEditMode(true);
          addLog('✓ Existing alarm found! Loading configuration...');
          const parsed = parseAlarmInfo(checkResult.output);
          setConfig(prev => ({ ...prev, ...parsed }));
          if (parsed.room && !ROOMS.includes(parsed.room)) {
            setCustomRoom(parsed.room);
          }
          addLog(`  Site: ${parsed.site || 'Unknown'}`);
          addLog(`  Room: ${parsed.room || 'Unknown'}`);
          addLog(`  SMS 1: ${parsed.sms1 || 'Unknown'}`);
          addLog(`  SMS 2: ${parsed.sms2 || 'Unknown'}`);
          addLog(`  Email 1: ${parsed.email1 || 'Unknown'}`);
          addLog(`  Email 2: ${parsed.email2 || 'Unknown'}`);
          addLog(`  GPIO: ${parsed.gpioPin || 5}`);
          addLog('📝 EDIT MODE - Modify settings and redeploy');
        } else {
          setEditMode(false);
          addLog('No existing alarm found - Fresh install mode');
        }
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
    const roomName = config.room === 'Custom' ? customRoom : config.room;
    addLog(`${editMode ? '📝 Updating' : '🚀 Deploying'} alarm configuration...`);
    addLog(`  Site: ${config.site}, Room: ${roomName}`);

    try {
      const result = await (window as any).electronAPI.sshDeploy({
        host: ipAddress, username: 'pi', password: 'mimichou',
        config: { ...config, room: roomName }
      });
      if (result.success) {
        addLog('✓ Configuration deployed successfully!');
        addLog('Restarting alarm service...');
        await (window as any).electronAPI.sshExecute({
          host: ipAddress, username: 'pi', password: 'mimichou',
          command: 'sudo systemctl restart activepy.service && sleep 2 && sudo systemctl status activepy.service'
        });
        addLog('✓ Alarm service restarted!');
      } else {
        addLog(`✗ Deployment failed: ${result.message}`);
      }
    } catch (e: any) {
      addLog(`✗ Error: ${e.message}`);
    }
    setLoading(false);
  };

  const steps = ['CONNECT', 'SITE', 'ROOM', 'CONTACTS', 'GPIO', 'DEPLOY'];

  return (
    <div className="app">
      {/* Title Bar */}
      <div className="title-bar">
        <div className="title">⚡ ALARM PI INSTALLER {editMode && <span className="edit-badge">EDIT MODE</span>}</div>
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
            <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'complete' : ''}`}
              onClick={() => i < step && setStep(i)}>
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
              <p className="step-desc">Enter Pi IP address to connect. Existing alarms will be detected automatically.</p>
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
                  <button key={room} className={`option-btn ${config.room === room || (room === 'Custom' && customRoom && !ROOMS.slice(0,-1).includes(config.room)) ? 'selected' : ''}`}
                    onClick={() => {
                      if (room === 'Custom') { setConfig({...config, room: 'Custom'}); }
                      else { setConfig({...config, room}); setStep(3); }
                    }}>
                    {room === 'Custom' && customRoom ? `Custom: ${customRoom}` : room}
                  </button>
                ))}
              </div>
              {config.room === 'Custom' && (
                <div className="input-group" style={{marginTop: '1rem'}}>
                  <input type="text" value={customRoom} onChange={e => setCustomRoom(e.target.value)}
                    placeholder="Enter custom room name" className="cyber-input" />
                  <button className="cyber-button primary" onClick={() => customRoom && setStep(3)}
                    disabled={!customRoom} style={{marginTop: '0.5rem'}}>
                    ▶ CONTINUE
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <h2 className="cyber-title">CONFIGURE CONTACTS</h2>
              <div className="input-group">
                <label>SMS NUMBER 1</label>
                <select className="cyber-input" value={config.sms1} onChange={e => setConfig({...config, sms1: e.target.value})}>
                  {PHONES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>SMS NUMBER 2</label>
                <select className="cyber-input" value={config.sms2} onChange={e => setConfig({...config, sms2: e.target.value})}>
                  {PHONES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>EMAIL 1</label>
                <select className="cyber-input" value={config.email1} onChange={e => setConfig({...config, email1: e.target.value})}>
                  {EMAILS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>EMAIL 2</label>
                <select className="cyber-input" value={config.email2} onChange={e => setConfig({...config, email2: e.target.value})}>
                  {EMAILS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <button className="cyber-button primary" onClick={() => setStep(4)}>▶ CONTINUE</button>
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <h2 className="cyber-title">SET GPIO PIN</h2>
              <div className="input-group">
                <label>GPIO PIN (BCM)</label>
                <input type="number" value={config.gpioPin} onChange={e => setConfig({...config, gpioPin: parseInt(e.target.value) || 5})}
                  className="cyber-input" min="2" max="27" />
              </div>
              <p className="step-desc">Default: GPIO 5 (BCM numbering)</p>
              <button className="cyber-button primary" onClick={() => setStep(5)}>▶ CONTINUE</button>
            </div>
          )}

          {step === 5 && (
            <div className="step-content">
              <h2 className="cyber-title">{editMode ? 'UPDATE CONFIGURATION' : 'DEPLOY SYSTEM'}</h2>
              <div className="config-summary">
                <p><span>Site:</span> {config.site}</p>
                <p><span>Room:</span> {config.room === 'Custom' ? customRoom : config.room}</p>
                <p><span>SMS 1:</span> {config.sms1}</p>
                <p><span>SMS 2:</span> {config.sms2}</p>
                <p><span>Email 1:</span> {config.email1}</p>
                <p><span>Email 2:</span> {config.email2}</p>
                <p><span>GPIO:</span> {config.gpioPin}</p>
              </div>
              <button className="cyber-button danger" onClick={handleDeploy} disabled={loading}>
                {loading ? '◌ DEPLOYING...' : editMode ? '📝 UPDATE CONFIG' : '🚀 DEPLOY NOW'}
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
        {editMode && <span className="edit-indicator">📝 Editing existing alarm</span>}
      </div>
    </div>
  );
}

export default App;
