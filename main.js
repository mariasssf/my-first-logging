// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Функція створює нове вікно
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });

  // Завантажуємо сторінку
  win.loadFile('index.html');
};

// Коли Electron готовий — створюємо вікно
app.whenReady().then(() => {
  createWindow();

  // Для macOS — якщо всі вікна закриті, створюємо нове при кліку на іконку
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Закриваємо додаток, коли всі вікна закриті (крім macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});