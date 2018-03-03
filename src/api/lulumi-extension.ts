import { app, BrowserWindow, ipcMain, nativeImage, webContents } from 'electron';
import { Buffer } from 'buffer';
import localshortcut from 'electron-localshortcut';
import * as fs from 'fs';
import * as path from 'path';
import generate from 'nanoid/generate';
import * as url from 'url';

import config from '../main/js/constants/config';
import './extensions/listeners';

/* tslint:disable:no-console */
/* tslint:disable:max-line-length */

const globalObjet = global as Lulumi.API.GlobalObject;
let loaded = false;

const objectValues = object => Object.keys(object).map(key => object[key]);

globalObjet.renderProcessPreferences = [];
// extensionId => manifest
const manifestMap: Lulumi.API.ManifestMap = {};
// name => manifest
const manifestNameMap: Lulumi.API.ManifestNameMap = {};

const generateExtensionIdFromName = () => generate('abcdefghijklmnopqrstuvwxyz', 32);

const isWindowOrWebView = (webContents) => {
  const type = webContents.getType();
  return type === 'window' || type === 'webview';
};

// Create or get manifest object from |srcDirectory|.
const getManifestFromPath: (srcDirectory: string) => Lulumi.API.ManifestObject | null =
  (srcDirectory: string): Lulumi.API.ManifestObject | null => {
    let manifest: Lulumi.API.ManifestObject;
    let manifestContent: string;

    try {
      manifestContent = fs.readFileSync(path.join(srcDirectory, 'manifest.json'), 'utf8');
    } catch (readError) {
      console.warn(`Reading ${path.join(srcDirectory, 'manifest.json')} failed.`);
      console.warn(readError.stack || readError);
      throw readError;
    }

    try {
      manifest = JSON.parse(manifestContent);
    } catch (parseError) {
      console.warn(`Parsing ${path.join(srcDirectory, 'manifest.json')} failed.`);
      console.warn(parseError.stack || parseError);
      throw parseError;
    }

    if (!manifestNameMap[manifest.name]) {
      const extensionId = generateExtensionIdFromName();
      manifestMap[extensionId] = manifestNameMap[manifest.name] = manifest;

      let messages = {};
      if (manifest.default_locale) {
        try {
          messages = JSON.parse(fs.readFileSync(
            path.join(srcDirectory, '_locales', manifest.default_locale, 'messages.json'), 'utf8'));
        } catch (readError) {
          console.warn(`${manifest.name}: Reading messages.json failed.`);
          console.warn(readError.stack || readError);
        }
      }
      messages = Object.assign({
        '@@extension_id': { message: extensionId },
        '@@ui_locale': { message: manifest.default_locale || 'en' },
        // tslint:disable-next-line:align
      }, messages);

      Object.assign(manifest, {
        srcDirectory,
        extensionId,
        messages,
        startPage: url.format({
          protocol: 'lulumi-extension',
          slashes: true,
          hostname: extensionId,
          pathname: manifest.devtools_page,
        }),
      });
      return manifest;
    }

    if (manifest && manifest.name) {
      console.warn(`Attempted to load extension "${manifest.name}" that has already been loaded.`);
      return null;
    }
    console.warn('Unable to parse this extension!');
    return null;
  };

// manage the background pages
const backgroundPages: Lulumi.API.BackgroundPages = {};

const startBackgroundPages = (manifest: Lulumi.API.ManifestObject) => {
  if (backgroundPages[manifest.extensionId] || !manifest.background) {
    return;
  }

  let html: Buffer = Buffer.from('');
  let name: string;
  if (manifest.background.page) {
    name = manifest.background.page;
    html = fs.readFileSync(path.join(manifest.srcDirectory, manifest.background.page));
  } else {
    name = '_generated_background_page.html';
    if (manifest.background.scripts) {
      const scripts = manifest.background.scripts.map(name => `<script src="${name}"></script>`).join('');
      html = Buffer.from(`<html><body>${scripts}</body></html>`, 'utf8');
    }
  }

  const contents = (webContents as any).create({
    partition: 'persist:__lulumi_extension',
    isBackgroundPage: true,
    commandLineSwitches: ['--background-page'],
    preload: path.join(config.lulumiPreloadPath, 'extension-preload.js'),
  });
  backgroundPages[manifest.extensionId] = { html, name, webContentsId: contents.id };
  contents.loadURL(url.format({
    protocol: 'lulumi-extension',
    slashes: true,
    hostname: manifest.extensionId,
    pathname: name,
  }));
};

const removeBackgroundPages = (manifest) => {
  const extension = backgroundPages[manifest.extensionId];
  if (extension) {
    const toBeRemovedwebContents
      = (webContents.fromId(extension.webContentsId) as Electron.WebContents);

    ipcMain.once(`lulumi-extension-${manifest.extensionId}-clean-done`, () => {
      (toBeRemovedwebContents as any).destroy();
      delete backgroundPages[manifest.extensionId];
    });
    // notify the extension that itself is going to be removed
    toBeRemovedwebContents.send(`lulumi-extension-${manifest.extensionId}-going-removed`);
  } else {
    // because the extension doesn't have any background page, we should just send an IPC message
    BrowserWindow.getFocusedWindow().webContents.send('remove-non-bg-lulumi-extension', manifest.extensionId);
  }
};

const loadCommands = (window: Electron.BrowserWindow, manifest) => {
  const commands = manifest.commands;
  if (commands) {
    Object.keys(commands).forEach((command) => {
      const suggested_key = commands[command].suggested_key;
      if (suggested_key) {
        localshortcut.register(window, suggested_key.default, () => {
          if (commands[command].suggested_key) {
            if (command === '_execute_page_action') {
              BrowserWindow.getFocusedWindow().webContents.send('lulumi-commands-execute-page-action', manifest.extensionId);
            } else if (command === '_execute_browser_action') {
              BrowserWindow.getFocusedWindow().webContents.send('lulumi-commands-execute-browser-action', manifest.extensionId);
            } else {
              const extension = backgroundPages[manifest.extensionId];
              if (extension) {
                const wc = webContents.fromId(extension.webContentsId);
                if (wc) {
                  wc.send('lulumi-commands-triggered', command);
                }
              }
            }
          }
        });
        ipcMain.once(`lulumi-extension-${manifest.extensionId}-local-shortcut-unregister`, () => {
          localshortcut.unregister(window, suggested_key.default);
        });
      }
    });
  }
};

const injectContentScripts = (manifest, entry) => {
  if (!manifest.content_scripts) {
    return entry;
  }

  const readArrayOfFiles = relativePath => ({
    url: `lulumi-extension://${manifest.extensionId}/${relativePath}`,
    code: String(fs.readFileSync(path.join(manifest.srcDirectory, relativePath))),
  });

  const contentScriptToEntry = script => ({
    matches: script.matches,
    js: script.js ? script.js.map(readArrayOfFiles) : [],
    css: script.css ? script.css.map(readArrayOfFiles) : [],
    runAt: script.run_at || 'document_idle',
  });

  try {
    entry.contentScripts = manifest.content_scripts.map(contentScriptToEntry);
  } catch (readError) {
    console.error('Failed to read content scripts', readError);
  }
  return entry;
};

const removeRenderProcessPreferences = (manifest) => {
  globalObjet.renderProcessPreferences = globalObjet.renderProcessPreferences.filter(el => el.extensionId !== manifest.extensionId);
};

const loadIcons = (manifest, entry) => {
  /*
  const readArrayOfFiles = relativePath => ({
    url: `lulumi-extension://${manifest.extensionId}/${relativePath}`,
    code: String(fs.readFileSync(path.join(manifest.srcDirectory, relativePath))),
  });
  */

  const iconsToEntry = (icons) => {
    const object = {};
    Object.keys(icons).forEach((key) => {
      object[key] = nativeImage.createFromPath(path.join(manifest.srcDirectory, icons[key])).toDataURL();
    });
    return object;
  };

  try {
    if (manifest.icons) {
      entry.icons = iconsToEntry(manifest.icons);
    }
  } catch (readError) {
    console.error('Failed to load icons', readError);
  }
  return entry;
};

const manifestToExtensionInfo = manifest => ({
  startPage: manifest.startPage,
  srcDirectory: manifest.srcDirectory,
  name: manifest.name,
  extensionId: manifest.extensionId,
  exposeExperimentalAPIs: true,
});

// load the extensions for the window
const loadExtension = (manifest) => {
  let entry = manifestToExtensionInfo(manifest);
  startBackgroundPages(manifest);
  entry = injectContentScripts(manifest, entry);
  entry = loadIcons(manifest, entry);
  globalObjet.renderProcessPreferences.push(entry);
};

const loadLulumiExtensions = (win, manifests) => {
  if (!win.devToolsWebContents) {
    return;
  }

  manifests.forEach(loadExtension);

  // const extensionInfoArray = manifests.map(manifestToExtensionInfo);
};

app.on('web-contents-created', (event, webContents) => {
  if (!isWindowOrWebView(webContents)) {
    return;
  }

  webContents.on('dom-ready', () => {
    loadLulumiExtensions(webContents, objectValues(manifestMap));
  });
});

// the lulumi-extension can map a extension URL request to real file path
const lulumiExtensionHandler = (request, callback) => {
  const parsed = url.parse(request.url);
  if (!parsed.hostname || !parsed.path) {
    return callback();
  }

  const manifest = manifestMap[parsed.hostname];
  if (!manifest) {
    return callback();
  }

  const page = backgroundPages[parsed.hostname];
  if (page && parsed.path === `/${page.name}`) {
    return callback({
      mimeType: 'text/html',
      data: page.html,
    });
  }

  fs.readFile(path.join(manifest.srcDirectory, parsed.path), (err, content) => {
    if (err) {
      return callback(-6); // FILE_NOT_FOUND
    }
    return callback(content);
  });
};

app.on(('session-created' as any), (sess: Electron.Session) => {
  sess.protocol.registerBufferProtocol('lulumi-extension', lulumiExtensionHandler, (error) => {
    if (error) {
      console.error(`Unable to register lulumi-extension protocol: ${error}`);
    }
  });
});

// the persistent path of "Lulumi Extensions" preference file
let loadedExtensionsPath: string = '';

app.on('will-quit', () => {
  try {
    const loadedExtensions = objectValues(manifestMap).map(manifest => manifest.srcDirectory);
    if (loadedExtensions.length > 0) {
      try {
        fs.mkdirSync(path.dirname(loadedExtensionsPath));
      } catch (error) {
        // Ignore error
      }
      fs.writeFileSync(loadedExtensionsPath, JSON.stringify(loadedExtensions));
    } else {
      fs.unlinkSync(loadedExtensionsPath);
    }
  } catch (error) {
    // Ignore error
  }
});

app.once('ready', () => {
  // the public API to add/remove extensions
  ((BrowserWindow as any) as Lulumi.BrowserWindow).addLulumiExtension = (srcDirectory: string): string => {
    const manifest = getManifestFromPath(srcDirectory);
    if (manifest !== null) {
      loadExtension(manifest);
      return manifest.name;
    }

    return '';
  };

  ((BrowserWindow as any) as Lulumi.BrowserWindow).removeLulumiExtension = (extensionId: string): string => {
    const manifest = manifestMap[extensionId];
    if (manifest) {
      removeBackgroundPages(manifest);
      removeRenderProcessPreferences(manifest);
      delete manifestMap[manifest.extensionId];
      delete manifestNameMap[manifest.name];
      return manifest.name;
    }
    return '';
  };

  ((BrowserWindow as any) as Lulumi.BrowserWindow).getLulumiExtensions = (): any => {
    const extensions = {};
    Object.keys(manifestNameMap).forEach((name) => {
      const manifest = manifestNameMap[name];
      if (manifest) {
        extensions[name] = { name: manifest.name, version: manifest.version };
      }
    });
    return extensions;
  };
});

// we can not use protocol or BrowserWindow until app is ready,
// and hopefully, this function will be called after app is ready
const loadExtensions = () => {
  if (!loaded) {
    // load persisted extensions
    loadedExtensionsPath = process.env.NODE_ENV === 'development'
      ? path.join(config.devUserData, 'lulumi-extensions')
      : path.join(app.getPath('userData'), 'extensions');
    try {
      const loadedExtensions = JSON.parse(fs.readFileSync(loadedExtensionsPath, 'utf8'));
      if (Array.isArray(loadedExtensions)) {
        for (const srcDirectory of loadedExtensions) {
          // start background pages and set content scripts
          const manifest = getManifestFromPath(srcDirectory);
          if (manifest !== null) {
            loadExtension(manifest);
          }
        }
      }
    } catch (error) {
      // ignore error
    }
    loaded = true;
  }
};

export default {
  manifestMap,
  manifestNameMap,
  backgroundPages,
  loadCommands,
  loadExtensions,
};
