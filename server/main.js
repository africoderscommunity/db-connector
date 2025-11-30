import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { DbEngine } from './database/dbngin/dbEngineController.js'
import { loadEventHandlers } from '../server/route.js'

// Recreate __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import dotenv from 'dotenv'
dotenv.config()

let mainWindow
const isDev = process.env.NODE_ENV === 'development'
 

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // icon: path.join(__dirname, '../build/icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
loadEventHandlers( mainWindow)

}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('before-quit', async (event) => {
  event.preventDefault();
  await DbEngine.cleanup();
  app.exit(0);
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
 