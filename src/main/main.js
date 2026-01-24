const { app, BrowserWindow, Tray, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const ipcHandlers = require('./ipc-handlers');

// Configure logging
autoUpdater.logger = console;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Set App User Model ID for Windows Notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('Salaty');
}

let mainWindow;
let tray = null;

function createWindow() {
  // Load settings
  ipcHandlers.loadSettings();

  // Get settings after loading
  const settings = ipcHandlers.getSettingsData();

  mainWindow = new BrowserWindow({
    width: 320,
    height: 555,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    x: settings.position.x,
    y: settings.position.y,
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
    minHeight: 555,
    show: false
  });

  // Affiche le DevTools seulement si --enable-logging est passé en argument
  if (process.argv.includes('--enable-logging')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Load main page
  mainWindow.loadFile(path.join(__dirname, '../renderer/pages/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('moved', () => {
    const position = mainWindow.getPosition();
    // Use the savePosition
    ipcHandlers.savePosition(position[0], position[1]);
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Ajout du Tray
  if (!tray) {
    tray = new Tray(path.join(__dirname, '../assets/icons/app_icon.ico'));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Afficher Salaty',
        click: () => {
          mainWindow.show();
        }
      },
      {
        label: 'Quitter',
        click: () => {
          tray.destroy();
          app.quit();
        }
      }
    ]);
    tray.setToolTip('Salaty');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      mainWindow.show();
    });
  }

  // Setup IPC handlers
  ipcHandlers.setupHandlers(mainWindow);
}

// Update handling
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Mise à jour disponible',
    message: `Une nouvelle version (${info.version}) est disponible. Voulez-vous la télécharger maintenant ?`,
    buttons: ['Oui', 'Non']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'question',
    title: 'Mise à jour prête',
    message: 'La mise à jour a été téléchargée. Voulez-vous redémarrer l\'application pour l\'installer maintenant ?',
    buttons: ['Installer et redémarrer', 'Plus tard']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater', err);
  // Optional: Notify user about error only if logging is enabled or critical
});

app.whenReady().then(() => {
  try {
    createWindow();
    // Check for updates after window creation
    // Adding a small delay to ensure window is ready
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 3000);

    // Check for updates every 12 hours
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 12 * 60 * 60 * 1000);

    // Démarrage automatique avec Windows
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: []
    });
  } catch (error) {
    console.error('Error creating window:', error);
  }
});

app.on('window-all-closed', () => {
  // Ne quitte pas l'app si le tray existe
  if (process.platform !== 'darwin' && !tray) {
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