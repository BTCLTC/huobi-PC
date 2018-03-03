import Vue from 'vue';
import VueI18n from 'vue-i18n';

import enElement from 'element-ui/lib/locale/lang/en';
import zhElement from 'element-ui/lib/locale/lang/zh-CN';
import zhTWElement from 'element-ui/lib/locale/lang/zh-TW';

import * as enUS from '../../../helper/i18n/en-US';
import * as zhCN from '../../../helper/i18n/zh-CN';
import * as zhTW from '../../../helper/i18n/zh-TW';

declare const ipcRenderer: Electron.IpcRenderer;

const lang = ipcRenderer.sendSync('request-lang');

Vue.use(VueI18n);

export default new VueI18n({
  locale: lang,
  messages: {
    'en-US': Object.assign(enElement, enUS.guest),
    'zh-CN': Object.assign(zhElement, zhCN.guest),
    'zh-TW': Object.assign(zhTWElement, zhTW.guest),
  },
});
