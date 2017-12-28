class UiSettingsService {
  constructor(
    $rootScope,
    socketService,
    $state,
    mockService,
    $log,
    themeManager,
    $document,
    $translate,
    $http,
    $q
  ) {
    'ngInject';
    this.socketService = socketService;
    this.themeManager = themeManager;
    this.$document = $document;
    this.$log = $log;
    this.$translate = $translate;
    this.$http = $http;
    this.$q = $q;
    this.$state = $state;

    console.log("ui settings service");

    this.currentTheme = themeManager.theme;
    this.uiSettings = undefined;

    this.defaultUiSettings = {
      backgroundImg: 'default bkg'
    };

    console.log("this.uiSettings 0");
    console.log(this.uiSettings);

    $rootScope.$on('socket:init', () => {
      console.log("UiSettingsService on socket:init");
      this.init();
    });
    $rootScope.$on('socket:reconnect', () => {
      this.initService();
    });

    console.log("this.uiSettings 1");
    console.log(this.uiSettings);
  }

  init() {
    console.log("this.uiSettings 2");
    console.log(this.uiSettings);

    this.registerListner();

    console.log("this.uiSettings 3");
    console.log(this.uiSettings);

    this.initService();

    this.defaultThumbnailBackgroundUrl = `${
      this.socketService.host
    }/app/themes/${this.themeManager.theme}/assets/graphics/thumb-${
      this.themeManager.theme
    }-bg.jpg`;
    this.defaultBackgroundUrl = `${this.socketService.host}/app/themes/${
      this.themeManager.theme
    }/assets/graphics/${this.themeManager.theme}-bg.jpg`;
  }

  setBackground() {
    if (this.uiSettings.color) {
      this.$document[0].body.style.background = '';
      this.$document[0].body.style.backgroundColor = this.uiSettings.color;
    } else {
      if (this.uiSettings.background.title === 'Default') {
        this.$document[0].body.style.background = `#333 url(${
          this.defaultBackgroundUrl
        }) repeat top left`;
        this.$document[0].body.style.backgroundSize = 'auto';
      } else {
        this.$document[0].body.style.background = `#333 url(${
          this.uiSettings.background.path
        }) no-repeat center center`;
        this.$document[0].body.style.backgroundSize = 'cover';
      }
    }
  }

  setLanguage(lang = null) {
    console.log("setLanguage");
    if (lang) {
      this.$translate.use(lang);
      return;
    }
    //TODO GET FROM DB
    if (!this.socketService.isSocketAvalaible()) {
      this.$translate.use(this.getBrowserDefaultLanguage());
      return;
    }
    if (~location.href.indexOf('wizard')) {
      this.browserLanguage = this.getBrowserDefaultLanguage();
    } else {
      console.log("ui settings service set language");
      console.log(this.uiSettings);
      this.$translate.use(this.uiSettings.language);
    }
  }

  getBrowserDefaultLanguage() {
    const browserLanguagePropertyKeys = [
      'languages',
      'language',
      'browserLanguage',
      'userLanguage',
      'systemLanguage'
    ];
    let langArray = [];
    browserLanguagePropertyKeys.forEach(prop => {
      if (prop in window.navigator) {
        if (angular.isArray(window.navigator[prop])) {
          langArray.push(...window.navigator[prop]);
        } else {
          langArray.push(window.navigator[prop]);
        }
      }
    });
    this.$log.debug('Navigator defaultLanguage', langArray[0]);
    return langArray[0].substr(0, 2) || 'en';
  }

  registerListner() {
    console.log("SETTING SERVICE register listener");

    this.socketService.on('pushUiSettings', data => {
      console.log("SETTING SERVICE on pushUiSettings");
      if (data.background) {
        delete this.uiSettings.color;
        if (data.background.path.indexOf(this.socketService.host) === -1) {
          var bg = `${this.socketService.host}/backgrounds/${data.background.path}`;
          data.background.path = bg;
        }
      }

      // Page title
      this.defaultPageTitle =
        this.uiSettings.pageTitle || 'Audiophile music player';

      //Check for language switch
      if (
        this.uiSettings.language &&
        this.uiSettings.language !== data.language
      ) {
        location.reload();
      }

      angular.merge(this.uiSettings, data);

      this.$log.debug('pushUiSettings', this.uiSettings);
      this.setLanguage();
      this.setBackground();
    });

    this.socketService.on('pushBackgrounds', data => {
      console.log("SETTING SERVICE on pushBackgrounds");
      this.$log.debug('pushBackgrounds', data);
      this.backgrounds = data;
      this.backgrounds.list = data.available.map(background => {
        background.path = `${this.socketService.host}/backgrounds/${background.path}`;
        background.thumbnail = `${this.socketService.host}/backgrounds/${background.thumbnail}`;
        return background;
      });
      this.setBackground();
    });

    this.socketService.on('pushWizard', data => {
      console.log("SETTING SERVICE on pushWizard");
      this.$log.debug('pushWizard', data);
      if (data.openWizard) {
        this.$state.go('volumio.wizard');
      }
    });
  }

  initService() {
    console.log("SETTING SERVICE init service");
    let settingsUrl = `/app/themes/${this.themeManager.theme}/assets/variants/${this.themeManager.variant}`;
    settingsUrl += `/${this.themeManager.variant}-settings.json`;
    // Return pending promise or cached results
    /*   
        ------ 28/12/17 BUG. This caching mechanism stops the execution if this.uiSettings is already assigned,
        and this happens at first boot of the app (still don't know why) -----

    if (this.uiSettings) {
      console.log("SETTING SERVICE case this.uiSettings");
      console.log(this.uiSettings);
      return this.$q.resolve(this.uiSettings);
    } 
    if (this.settingsPromise) {
      console.log("SETTING SERVICE case this.settingsPromise");
      return this.settingsPromise;
    }
    */
    this.settingsPromise = this.$http
      .get(settingsUrl)
      .then(response => {
        this.uiSettings = response.data;
        this.$log.debug('Variant settings', response.data);
        return this.uiSettings;
      })
      .finally(() => {
        console.log("SETTING SERVICE emit getUiSettings PRE");
        if (this.socketService.isSocketAvalaible()) {
          console.log("SETTING SERVICE emit getUiSettings");
          this.socketService.emit('getUiSettings');
          this.socketService.emit('getWizard');
        }
      });
    return this.settingsPromise;
  }
}

export default UiSettingsService;