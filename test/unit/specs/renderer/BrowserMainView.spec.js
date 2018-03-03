import Vue from 'vue';
import Electron from 'vue-electron';
import { Autocomplete } from 'element-ui';

import BrowserMainView from 'components/BrowserMainView';
import config from 'renderer/js/constants/config';

import router from 'renderer/router';
import store from 'shared/store/rendererStore';

import { name } from 'src/../.electron-vue/config';

/* eslint-disable no-unused-expressions */

Vue.prototype.$t = () => {};
Vue.use(Electron);

Vue.config.productionTip = false;
Vue.config.devtools = false;

// Customize Autocomplete component to match out needs
const customAutocomplete = Vue.extend(Autocomplete);
const goodCustomAutocomplete = customAutocomplete.extend({
  data() {
    return {
      lastQueryString: '',
    };
  },
  computed: {
    suggestionVisible() {
      const { suggestions } = this;
      const isValidData = Array.isArray(suggestions) && suggestions.length > 0;
      // Don't show suggestions if we have no input there
      return (isValidData || this.loading) && this.isFocus && this.value;
    },
  },
  methods: {
    setInputSelection(input, startPos, endPos) {
      input.focus();
      if (input.selectionStart !== undefined) {
        input.selectionStart = startPos;
        input.selectionEnd = endPos;
      } else if (document.selection && document.selection.createRange) {
        // IE branch
        input.select();
        const range = document.selection.createRange();
        range.collapse(true);
        range.moveEnd('character', endPos);
        range.moveStart('character', startPos);
        range.select();
      }
    },
    getData(queryString) {
      const el = this.$refs.input.$el.querySelector('.el-input__inner');
      this.loading = true;
      this.fetchSuggestions(queryString, (suggestions) => {
        this.loading = false;
        if (Array.isArray(suggestions)) {
          this.suggestions = suggestions;
          this.highlightedIndex = 0;

          if (el.selectionStart === queryString.length) {
            if (this.lastQueryString !== queryString) {
              const startPos = queryString.length;
              const endPos = this.suggestions[0].value.length;
              this.$nextTick().then(() => {
                this.$refs.input.$refs.input.value = this.suggestions[0].value;
                this.setInputSelection(el, startPos, endPos);
                this.lastQueryString = queryString;
              });
            } else {
              this.lastQueryString = this.lastQueryString.slice(0, -1);
            }
          }
        } else {
          // eslint-disable-next-line no-console
          console.error('autocomplete suggestions must be an array');
        }
      });
    },
    handleChange(value) {
      this.$emit('input', value);
      if (this.isOnComposition || (!this.triggerOnFocus && !value)) {
        this.lastQueryString = '';
        this.suggestions.length = 0;
        return;
      }
      this.getData(value);
    },
    handleFocus(event) {
      event.target.select();
      this.isFocus = true;
      if (this.triggerOnFocus) {
        this.getData(this.value);
      }
    },
    handleKeyEnter(event) {
      if (this.suggestionVisible
        && this.highlightedIndex >= 0
        && this.highlightedIndex < this.suggestions.length) {
        this.select(this.suggestions[this.highlightedIndex]);
      } else {
        this.$parent.$parent.onEnterUrl(event.target.value);
        this.select({
          title: '',
          value: event.target.value,
        });
      }
    },
    highlight(index) {
      let newIndex = index;
      if (!this.suggestionVisible || this.loading) {
        return;
      }
      if (index < 0) {
        newIndex = 0;
      }
      if (index >= this.suggestions.length) {
        newIndex = this.suggestions.length - 1;
      }
      const suggestion
        = this.$refs.suggestions.$el.querySelector('.el-autocomplete-suggestion__wrap');
      const suggestionList = suggestion.querySelectorAll('.el-autocomplete-suggestion__list li');
      const highlightItem = suggestionList[newIndex];
      const { clientHeight, scrollTop } = suggestion;
      const { offsetTop, scrollHeight } = highlightItem;
      if ((offsetTop + scrollHeight) > (scrollTop + clientHeight)) {
        suggestion.scrollTop += scrollHeight;
      }
      if (offsetTop < scrollTop) {
        suggestion.scrollTop -= scrollHeight;
      }
      this.highlightedIndex = newIndex;
      if (newIndex >= 0) {
        this.$refs.input.$refs.input.value
          = this.suggestions[this.highlightedIndex].value;
      }
    },
  },
});
Vue.component('good-custom-autocomplete', goodCustomAutocomplete);

let vm;
describe('BrowserMainView.vue', () => {
  before(async () => {
    const Ctor = Vue.extend(BrowserMainView);
    vm = new Ctor({
      el: document.createElement('div'),
      router,
      store,
    }).$mount();
    vm.onNewTab(undefined, 'https://github.com/LulumiProject/lulumi-browser', true);
    vm.onTabClose(0);
    await vm.$nextTick();
  });

  describe('functions', () => {
    after(() => {
      vm.onTabClose(0);
    });

    describe('computed.tabsOrder()', () => {
      it('has no members in tabsOrder initially', () => {
        expect(vm.tabsOrder).to.be.undefined;
      });
    });

    describe('computed.homepage()', () => {
      it('has correct default homepage', () => {
        expect(vm.homepage).to.equal(config.homepage);
      });
    });

    describe('computed.pdfViewer()', () => {
      it('has correct default pdfViewer', () => {
        expect(vm.pdfViewer).to.equal(config.pdfViewer);
      });
    });

    describe('methods.getWebView()', () => {
      it('has the corresponding webview element', async () => {
        expect(vm.getWebView().getAttribute('src')).to.equal(config.tabConfig.dummyTabObject.url);
      });
    });

    describe('methods.getTab()', () => {
      it('can call navigateTo method from certain tab instance to let the webview navigate to somewhere', () => {
        vm.getTab().navigateTo('https://www.youtube.com/');
        expect(vm.getWebView().getAttribute('src')).to.equal('https://www.youtube.com/');
      });
    });

    describe('methods.getTabObject()', () => {
      it('can call navigateTo method from certain tab instance to let the webview navigate to somewhere', () => {
        vm.getTab().navigateTo('https://github.com/LulumiProject/lulumi-browser');
        expect(vm.getTabObject().url).to.equal('https://github.com/LulumiProject/lulumi-browser');
      });
    });

    describe('methods.onDidFailLoad()', () => {
      it('shows error page when it received did-fail-load event', () => {
        const event = {
          errorCode: -105,
          validatedURL: 'http://test/test/',
          target: {
            getURL: () => 'http://test/test/',
          },
        };
        vm.onDidFailLoad(event, 0);
        expect(vm.getWebView().getAttribute('src')).to.contain('/pages/error/index.html');
      });
    });

    describe('methods.onClickHome()', () => {
      it('redirects to homepage', async () => {
        vm.onClickHome();
        expect(vm.getWebView().getAttribute('src')).to.equal(config.homepage);
      });
    });

    describe('methods.onEnterUrl()', () => {
      it('navigates to specified url', async () => {
        vm.onEnterUrl('https://www.youtube.com/');
        expect(vm.getWebView().getAttribute('src')).to.equal('https://www.youtube.com/');
      });
    });
  });

  describe('Tabs.vue (integrated)', () => {
    it('shows the title of webview.getTitle()', async () => {
      vm.$store.dispatch('pageTitleSet', {
        windowId: -1,
        tabId: vm.getTabObject().id,
        tabIndex: 0,
        title: name,
      });
      await vm.$nextTick();
      expect(vm.$el.querySelector('.chrome-tab-current .chrome-tab-title').innerHTML).to.equal(name);
    });

    it('shows the volume icon when there exists at least one media in the page, and it\'s playing', async () => {
      vm.$store.dispatch('mediaStartedPlaying', {
        windowId: -1,
        tabId: vm.getTabObject().id,
        tabIndex: 0,
        isAudioMuted: false,
      });
      await vm.$nextTick();
      expect(vm.$el.querySelector('svg.volume-up')).to.exist;
    });

    it('shows the volume icon when there exists at least one media in the page, and it\'s not playing', async () => {
      vm.$store.dispatch('mediaStartedPlaying', {
        windowId: -1,
        tabId: vm.getTabObject().id,
        tabIndex: 0,
        isAudioMuted: true,
      });
      await vm.$nextTick();
      expect(vm.$el.querySelector('svg.volume-off')).to.exist;
    });

    it('adds one more tab', async () => {
      vm.onNewTab(undefined, 'https://github.com/LulumiProject/lulumi-browser', true);
      await vm.$nextTick();
      expect(vm.$el.querySelectorAll('.chrome-tab-draggable').length).to.equal(2);
    });

    it('clicks last created tab', async () => {
      vm.$store.dispatch('clickTab', {
        windowId: -1,
        tabId: vm.getTabObject(1).id,
        tabIndex: 1,
      });
      await vm.$nextTick();
      expect(vm.$el.querySelector('.chrome-tab-current').id).to.equal('1');
    });

    it('removes last created tab and moves to adjacent tab', async () => {
      vm.onTabClose(1);
      await vm.$nextTick();
      expect(vm.$el.querySelectorAll('.chrome-tab-draggable').length).to.equal(1);
      expect(vm.$el.querySelector('.chrome-tab-current').id).to.equal('0');
    });
  });

  describe('Navbar.vue (integrated)', () => {
    it('shows the corresponding url to the webview', () => {
      const tabObject = vm.getTabObject(0);
      expect(vm.$el.querySelector('webview.active').src).to.equal(tabObject.url);
    });

    it('has four controls in .control-group', () => {
      expect(vm.$el.querySelector('.ivu-icon-ios-home')).to.exist;
      expect(vm.$el.querySelector('.ivu-icon-arrow-left-c')).to.exist;
      expect(vm.$el.querySelector('.ivu-icon-arrow-right-c')).to.exist;
      expect(vm.$el.querySelector('.ivu-icon-android-refresh')).to.exist;
    });
  });

  describe('Tab.vue (integrated)', () => {
    it('reveals itself when it\'s the current tab', () => {
      const tab = vm.getTab(0);
      expect(tab.isActive).to.equal((vm.currentTabIndex === 0));
    });
  });
});
