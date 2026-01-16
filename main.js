const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;
const path = require('path');
const fs = require('fs');

let mainWindow;
let settingsData = {
  city: 'Tunis',
  country: 'Tunisia',
  theme: 'navy',
  language: 'en',
  position: { x: 100, y: 100 }
};

// Load settings from file
function loadSettings() {
  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settingsData = { ...settingsData, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to file
function saveSettings() {
  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

function createWindow() {
  loadSettings();

  mainWindow = new BrowserWindow({
    width: 320,
    height: 560,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    x: settingsData.position.x,
    y: settingsData.position.y,
    icon: path.join(__dirname, 'assets', 'app_icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Affiche le DevTools seulement si --enable-logging est passé en argument
  if (process.argv.includes('--enable-logging')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.loadFile('index.html');

  // Save window position when moved
  mainWindow.on('moved', () => {
    const position = mainWindow.getPosition();
    settingsData.position = { x: position[0], y: position[1] };
    saveSettings();
  });

  // Prevent window from being closed, minimize to tray instead
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
}

// IPC handlers
ipcMain.handle('get-settings', () => {
  return settingsData;
});

ipcMain.handle('save-settings', (event, newSettings) => {
  settingsData = { ...settingsData, ...newSettings };
  saveSettings();
  return settingsData;
});

ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
  mainWindow.hide();
});

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

// Create tray icon (optional)
app.whenReady().then(() => {
  // Add system tray functionality here if needed
});