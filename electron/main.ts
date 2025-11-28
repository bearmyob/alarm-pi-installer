import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { Client } from "ssh2";

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: "#0a0a0f",
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Window controls
ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on("window-close", () => mainWindow?.close());

// SSH Connection handler
ipcMain.handle("ssh-connect", async (_, { host, username, password }) => {
  return new Promise((resolve) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.end();
        resolve({ success: true, message: "Connection successful!" });
      })
      .on("error", (err) => {
        resolve({ success: false, message: err.message });
      })
      .connect({ host, port: 22, username, password, readyTimeout: 10000 });
  });
});

// SSH Execute command
ipcMain.handle(
  "ssh-execute",
  async (_, { host, username, password, command }) => {
    return new Promise((resolve) => {
      const conn = new Client();
      let output = "";

      conn
        .on("ready", () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              conn.end();
              resolve({ success: false, message: err.message, output: "" });
              return;
            }
            stream
              .on("close", () => {
                conn.end();
                resolve({ success: true, message: "Command executed", output });
              })
              .on("data", (data: Buffer) => {
                output += data.toString();
              })
              .stderr.on("data", (data: Buffer) => {
                output += data.toString();
              });
          });
        })
        .on("error", (err) => {
          resolve({ success: false, message: err.message, output: "" });
        })
        .connect({ host, port: 22, username, password, readyTimeout: 15000 });
    });
  }
);

// Full deployment
ipcMain.handle(
  "ssh-deploy",
  async (_, { host, username, password, config }) => {
    return new Promise((resolve) => {
      const conn = new Client();

      const alarmInfoContent = `alarminfo = {
    "centre": "${config.site}",
    "loc": "${config.room}",
    "sms_1": "${config.sms1}",
    "sms_2": "${config.sms2}",
    "roomname": "${config.room}",
    "username": "Orchard_Room_Usr",
    "password": "__test_1234__",
    "port": "1883",
    "broker": "137.220.91.114",
    "topic": "message/topic/to/subscribe",
    "clientid": "${config.room}",
    "user": "promisemergencycallsystem@gmail.com",
    "pwd": "promisproject",
    "gpio_pin": ${config.gpioPin},
    "alm1": "${config.email1}",
    "alm2": "${config.email2}",
    "sys": "promisemergencycallsystem@gmail.com",
    "twilio1": "${config.twilioSid || "YOUR_TWILIO_SID"}",
    "twilio2": "${config.twilioToken || "YOUR_TWILIO_TOKEN"}",
    "SENDGRID_API_KEY": "${config.sendgridKey || "YOUR_SENDGRID_KEY"}",
    "sms_from": "+447481360684"
}`;

      const deployScript = `
sudo systemctl stop activepy.service 2>/dev/null
sudo systemctl disable activepy.service 2>/dev/null
sudo rm -rf /home/pi/alarm /home/pi/alarmcall
sudo rm -f /lib/systemd/system/activepy.service /usr/lib/systemd/system/activepy.service
sudo systemctl daemon-reload
mkdir -p /home/pi/alarm
cd /home/pi && git clone https://github.com/rmlefever/alarmcall.git
cp /home/pi/alarmcall/active.py /home/pi/alarm/
cd /home/pi/alarm && python3 -m venv venv
source /home/pi/alarm/venv/bin/activate && pip install twilio sendgrid paho-mqtt RPi.GPIO
cat > /home/pi/alarm/alarminfo.py << 'ALARMEOF'
${alarmInfoContent}
ALARMEOF
`;
      // Continued in next part...
      conn
        .on("ready", () => {
          conn.exec(deployScript, (err, stream) => {
            if (err) {
              conn.end();
              resolve({ success: false, message: err.message });
              return;
            }
            let output = "";
            stream
              .on("close", () => {
                conn.end();
                resolve({ success: true, output });
              })
              .on("data", (d: Buffer) => {
                output += d.toString();
              });
          });
        })
        .on("error", (err) => resolve({ success: false, message: err.message }))
        .connect({ host, port: 22, username, password, readyTimeout: 300000 });
    });
  }
);
