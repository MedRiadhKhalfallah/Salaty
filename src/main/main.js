const { app, BrowserWindow } = require('electron');
const path = require('path');
const ipcHandlers = require('./ipc-handlers');

let mainWindow;

function createWindow() {
  // Load settings
  ipcHandlers.loadSettings();

  mainWindow = new BrowserWindow({
    width: 320,
    height: 540,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    x: ipcHandlers.settingsData.position.x,
    y: ipcHandlers.settingsData.position.y,
    icon: path.join(__dirname, '../assets/icons/app_icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webviewTag: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    minWidth: 320,
    minHeight: 540,
    show: false
  });

  // Load main page
  mainWindow.loadFile(path.join(__dirname, '../renderer/pages/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('moved', () => {
    const position = mainWindow.getPosition();
    ipcHandlers.settingsData.position = { x: position[0], y: position[1] };
    ipcHandlers.saveSettings();
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Setup IPC handlers
  ipcHandlers.setupHandlers(mainWindow);
}

app.whenReady().then(() => {
  try {
    createWindow();
  } catch (error) {
    console.error('Error creating window:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});