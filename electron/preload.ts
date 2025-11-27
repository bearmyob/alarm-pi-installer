import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // SSH operations
  sshConnect: (params: { host: string; username: string; password: string }) =>
    ipcRenderer.invoke('ssh-connect', params),
  
  sshExecute: (params: { host: string; username: string; password: string; command: string }) =>
    ipcRenderer.invoke('ssh-execute', params),
  
  sshDeploy: (params: { host: string; username: string; password: string; config: any }) =>
    ipcRenderer.invoke('ssh-deploy', params),
});

