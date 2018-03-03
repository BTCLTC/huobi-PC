declare namespace Lulumi {
  import VueI18n from 'vue-i18n';

  export interface BrowserWindow {
    addLulumiExtension(srcDirectory: string): string;
    removeLulumiExtension(extensionId: string): string;
    getLulumiExtensions(): any;
  }

  export namespace Scheme {
    // lulumi:// scheme
    export interface LulumiObject extends Object {
      lulumi: object[];
      preferences: string[][];
      about: string[][];
    }
  }

  export namespace API {
    // extension api
    export interface BackgroundPageObject {
      html: Buffer;
      name: string;
      webContentsId: number;
    }
    export interface BackgroundPages {
      [index: string]: BackgroundPageObject | undefined;
    }
    export interface ManifestObject extends chrome.runtime.Manifest {
      extensionId: string;
    }
    export interface ManifestMap {
      [index: string]: ManifestObject | undefined;
    }
    export interface ManifestNameMap {
      [index: string]: ManifestObject | undefined;
    }
    export interface CustomTabsQueryInfo extends chrome.tabs.QueryInfo {
      webContentsId: number;
    }
    export interface GlobalObject extends NodeJS.Global {
      isOnline: boolean;
      __static: string;
      renderProcessPreferences: any[];
      backgroundPages: BackgroundPages;
      manifestMap: ManifestMap;
      manifestNameMap: ManifestNameMap;
      guestData: Scheme.LulumiObject;
    }
  }

  export namespace Store {
    // store
    export interface TabObject {
      webContentsId: number; // Id of the corresponding webContents
      id: number; // 頁籤的標識符。(某些狀況可能會沒有 id)
      index: number; // 頁籤在所在窗口中的索引，從 0 開始。
      windowId: number; // 頁籤所在窗口的標識符。
      openerTabId?: number; // 使用哪個已存在的頁籤打開指定的網址。
      highlighted: boolean; // 頁籤是否為高亮狀態。
      active: boolean; // 頁籤是否是窗口中的活動頁籤。 （因為視窗不一定是 focus 的狀態。）
      pinned: boolean; // 頁籤是否固定。(指定為tue的頁籤，不能移動，也沒有關閉鈕)
      url: string; // 頁籤中顯示的 URL。需要 "tabs" 權限
      title: string | null; // 頁籤的標題，如果頁籤正在加載它也可能是空字符串。需要 "tabs" 權限
      favIconUrl: string | null; // 頁籤的收藏夾圖標 URL，如果頁籤正在加載它也可能是空字符串。需要 "tabs" 權限
      status: string | null; // "loading"（正在加載）或 "complete"（完成）。
      incognito: boolean; // 頁籤是否在隱身窗口中。
      width?: number; // 頁籤寬度，以像素為單位。
      height?: number; // 頁籤高度，以像素為單位。
      sessionId?: number; // session 標識符。(如果使用 session 匯入 tab 可能導致沒有 tab 的 id 而只有 session 的 id)
      statusText: string | boolean;
      isLoading: boolean;
      isSearching: boolean;
      canGoBack: boolean;
      canGoForward: boolean;
      canRefresh: boolean;
      error: boolean;
      hasMedia: boolean;
      isAudioMuted: boolean;
      pageActionMapping: object;
    }
    export interface TabConfig {
      dummyTabObject: TabObject;
      defaultFavicon: string;
      lulumiFavicon: string;
    }
    export interface SearchEngineObject {
      name: string;
      search: string;
      autocomplete: string;
    }
    export interface TabHistory {
      title: string | null;
      url: string;
      favIconUrl: string | null;
      label: string;
      time: string;
    }
    export interface DownloadItem {
      getReceivedBytes: number;
      totalBytes: number;
      startTime: number;
      webContentsId: number;
      name: string;
      url: string;
      isPaused: boolean;
      canResume: boolean;
      state: string;
      savePath: string | null;
      dataState: string;
    }
    export interface LastOpenedTabObject {
      title: string | VueI18n.LocaleMessageArray | null;
      url: string;
      favIconUrl: string | null;
    }
    export interface CertificateObject {
      certificate: Electron.Certificate;
      verificationResult: string;
      errorCode: number;
    }
    export interface Certificates {
      [index: string]: CertificateObject | undefined;
    }
    export interface LulumiBrowserWindowProperty extends Electron.BrowserWindowConstructorOptions {
      id: number;
      focused?: boolean;
      left: number;
      top: number;
      state: string;
      tabs?: TabObject[];
    }
    export interface State {
      tabId: number;
      tabs: TabObject[];
      tabsOrder: number[][];
      currentTabIndexes: number[];
      searchEngine: SearchEngineObject[];
      currentSearchEngine: SearchEngineObject;
      autoFetch: boolean;
      homepage: string;
      pdfViewer: string;
      tabConfig: TabConfig;
      lang: string;
      downloads: DownloadItem[];
      history: TabHistory[];
      permissions: object;
      lastOpenedTabs: LastOpenedTabObject[];
      certificates: Certificates;
      windows: LulumiBrowserWindowProperty[];
    }
    export interface TabsOrdering {
      tabObjects: Store.TabObject[];
      currentTabIndexes: number[];
    }
  }

  export namespace Main {
    // src/main/index.js
    export interface BrowserWindowSuggestionItem {
      url: string;
      follow: boolean;
    }
  }

  export namespace Renderer {
    // src/renderer/js
    export interface SuggestionItem {
      title?: string;
      value: string;
      url: string;
      icon: string;
    }
    export interface SuggestionMatch {
      indices: number[];
      key: string;
    }
    export interface SuggestionObject {
      item: SuggestionItem;
      matches?: SuggestionMatch[];
    }
    export interface AboutLocationObject {
      title: string;
      url: string;
    }
  }

  export namespace BrowserMainView {
    // BrowserMainView.vue
    export interface Alarm {
      handler: any;
      periodInMinutes?: number;
    }
    export interface AlarmArray {
      [index: string]: Alarm | undefined;
    }
  }

  export namespace Tab {
    // Tab.vue
    export interface FindInPageObject {
      container?: HTMLDivElement;
      input: HTMLInputElement;
      counter: HTMLSpanElement;
      previous: HTMLElement;
      next: HTMLElement;
      endButton: HTMLElement;
      activeWebview: Electron.WebviewTag;
      start(): void;
      end(): void;
    }
  }

  export namespace Navbar {
    // Navbar.vue
    export interface BadgeTextArray {
      [index: string]: string[] | undefined;
    }
    export interface BadgeBackgroundColorArray {
      [index: string]: string[] | undefined;
    }
  }
}
