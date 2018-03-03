import { Menu, BrowserWindow } from 'electron';
import { is } from 'electron-util';
import i18n from '../../i18n';
const { openProcessManager } = require('electron-process-manager');

const getTemplate = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: i18n.t('edit.title') as string,
      submenu: [
        {
          label: i18n.t('edit.undo') as string,
          role: 'undo',
        },
        {
          label: i18n.t('edit.redo') as string,
          role: 'redo',
        },
        {
          type: 'separator',
        },
        {
          label: i18n.t('edit.cut') as string,
          role: 'cut',
        },
        {
          label: i18n.t('edit.copy') as string,
          role: 'copy',
        },
        {
          label: i18n.t('edit.paste') as string,
          role: 'paste',
        },
        is.macos ? {
          label: i18n.t('edit.pasteAndMatchStyle') as string,
          role: 'pasteandmatchstyle',
        } : {},
        {
          label: i18n.t('edit.delete') as string,
          role: 'delete',
        },
        {
          label: i18n.t('edit.selectAll') as string,
          role: 'selectall',
        },
        {
          type: 'separator',
        },
        {
          label: i18n.t('edit.find') as string,
          accelerator: 'CmdOrCtrl+F',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('start-find-in-page'),
        },
        {
          label: i18n.t('edit.speech.title') as string,
          submenu: [
            {
              label: i18n.t('edit.speech.startSpeaking') as string,
              role: 'startspeaking',
            },
            {
              label: i18n.t('edit.speech.stopSpeaking') as string,
              role: 'stopspeaking',
            },
          ],
        },
      ],
    },
    {
      label: i18n.t('view.title') as string,
      submenu: [
        {
          label: i18n.t('view.reload') as string,
          accelerator: 'CmdOrCtrl+R',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('reload'),
        },
        {
          label: i18n.t('view.forceReload') as string,
          accelerator: 'Shift+CmdOrCtrl+R',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('force-reload'),
        },
        {
          type: 'separator',
        },
        {
          label: i18n.t('view.toggleFullscreen') as string,
          role: 'togglefullscreen',
        },
        {
          label: i18n.t('view.resetZoom') as string,
          role: 'resetzoom',
        },
        {
          label: i18n.t('view.zoomIn') as string,
          role: 'zoomin',
        },
        {
          label: i18n.t('view.zoomOut') as string,
          role: 'zoomout',
        },
        {
          type: 'separator',
        },
        {
          label: i18n.t('view.viewSource') as string,
          accelerator: is.macos ? 'Alt+Command+U' : 'Ctrl+U',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('view-source'),
        },
        {
          label: i18n.t('view.toggleDevTools') as string,
          accelerator: is.macos ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('toggle-dev-tools'),
        },
        {
          label: i18n.t('view.javascriptPanel') as string,
          accelerator: is.macos ? 'Alt+Command+J' : 'Ctrl+Shift+J',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('javascript-panel'),
        },
      ],
    },
    {
      label: i18n.t('window.title') as string,
      role: 'window',
      submenu: [
        {
          label: i18n.t('window.minimize') as string,
          role: 'minimize',
        },
        {
          label: i18n.t('window.close') as string,
          role: 'close',
        },
        is.macos ? {
          type: 'separator',
        } : {},
        is.macos ? {
          label: i18n.t('window.front') as string,
          role: 'front',
        } : {},
        is.macos ? {
          type: 'separator',
        } : {},
        {
          label: i18n.t('window.processManager') as string,
          click: () => openProcessManager(),
        },
      ],
    },
  ];

  if (is.macos) {
    const appName = require('electron').app.getName();
    template.unshift({
      label: i18n.t('file.title') as string,
      submenu: [
        {
          label: i18n.t('file.newTab') as string,
          accelerator: 'CmdOrCtrl+T',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('new-tab'),
        },
        {
          label: i18n.t('file.newWindow') as string,
          accelerator: 'CmdOrCtrl+N',
          click: () => (BrowserWindow as any).createWindow(),
        },
        is.macos ? {
          type: 'separator',
        } : {},
        {
          label: i18n.t('file.closeTab') as string,
          accelerator: 'CmdOrCtrl+W',
          click: () => BrowserWindow.getFocusedWindow().webContents.send('tab-close'),
        },
      ],
    });
    template.unshift({
      label: appName,
      submenu: [
        {
          label: i18n.t('app.about', { appName }) as string,
          click: () => BrowserWindow.getFocusedWindow().webContents.send('new-tab', {
            url: 'about:lulumi',
            follow: true,
          }),
        },
        {
          type: 'separator',
        },
        {
          label: i18n.t('app.services.title') as string,
          role: 'services',
          submenu: [],
        },
        {
          type: 'separator',
        },
        {
          label: i18n.t('app.hide', { appName }) as string,
          role: 'hide',
        },
        {
          label: i18n.t('app.hideOthers') as string,
          role: 'hideothers',
        },
        {
          label: i18n.t('app.unhide') as string,
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          label: i18n.t('app.quit', { appName }) as string,
          role: 'quit',
        },
      ],
    });
    template.push({
      label: i18n.t('help.title') as string,
      role: 'help',
      submenu: [
        {
          label: i18n.t('help.reportIssue') as string,
          click: () => BrowserWindow.getFocusedWindow().webContents.send('new-tab', {
            url: 'https://github.com/LulumiProject/lulumi-browser/issues',
            follow: true,
          }),
        },
        {
          label: i18n.t('help.forceReload') as string,
          click: () => BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache(),
        },
        {
          label: i18n.t('help.toggleDevTools') as string,
          click: () => BrowserWindow.getFocusedWindow().webContents.toggleDevTools(),
        },
      ],
    });
  }

  return Menu.buildFromTemplate((template as any));
};

export default {
  init() {
    Menu.setApplicationMenu(getTemplate());
  },
  setLocale(locale) {
    i18n.locale = locale;
  },
};
