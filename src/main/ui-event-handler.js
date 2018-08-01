const {ipcMain} = require('electron');
const config = require('config');
const settings = require('./lib/settings-manager');
const filters = require('./lib/filters-manager');
const filterCategories = require('./lib/filters/filters-categories');
const listeners = require('./notifier');
const whitelist = require('./lib/whitelist');
const userrules = require('./lib/userrules');

/**
 * Initializes event listener
 */
module.exports.init = function (win) {

    // Handle messages from renderer process
    ipcMain.on('renderer-to-main', function (event, arg) {

        const message = JSON.parse(arg);
        switch (message.type) {
            case 'initializeOptionsPage':
                event.sender.send('initializeOptionsPageResponse', processInitializeFrameScriptRequest());
                break;
            case 'getFiltersMetadata':
                event.sender.send('getFiltersMetadataResponse', filterCategories.getFiltersMetadata());
                break;
            case 'changeUserSetting':
                settings.setProperty(message.key, message.value);
                break;
            case 'addAndEnableFilter':
                filters.addAndEnableFilters([message.filterId]);
                break;
            case 'disableFilter':
                filters.disableFilters([message.filterId]);
                break;
            case 'addAndEnableFiltersByGroupId':
                filters.addAndEnableFiltersByGroupId(message.groupId);
                break;
            case 'disableAntiBannerFiltersByGroupId':
                filters.disableAntiBannerFiltersByGroupId(message.groupId);
                break;
            case 'getWhiteListDomains':
                const whiteListDomains = whitelist.getWhiteListDomains();
                event.returnValue = {content: whiteListDomains.join('\r\n')};
                break;
            case 'saveWhiteListDomains':
                const domains = message.content.split(/[\r\n]+/);
                whitelist.updateWhiteListDomains(domains);
                break;
            case 'changeDefaultWhiteListMode':
                whitelist.changeDefaultWhiteListMode(message.enabled);
                break;
            case 'getUserRules':
                userrules.getUserRulesText(function (content) {
                    event.sender.send('getUserRulesResponse', {content: content});
                });
                break;
            case 'saveUserRules':
                userrules.updateUserRulesText(message.content);
                break;
        }
    });

};

function eventHandler(win) {
    return function () {
        win.webContents.send('main-to-renderer', {
            type: 'message',
            args: Array.prototype.slice.call(arguments)
        });
    };
}

module.exports.register = (win) => {
    //Retranslate messages to renderer process
    listeners.addListener(eventHandler(win));
};

/**
 * Constructs data object for page presentation
 */
function processInitializeFrameScriptRequest() {

    const enabledFilters = Object.create(null);

    const AntiBannerFiltersId = config.get('AntiBannerFiltersId');

    for (let key in AntiBannerFiltersId) {
        if (AntiBannerFiltersId.hasOwnProperty(key)) {
            const filterId = AntiBannerFiltersId[key];
            const enabled = filters.isFilterEnabled(filterId);
            if (enabled) {
                enabledFilters[filterId] = true;
            }
        }
    }

    return {
        userSettings: settings.getAllSettings(),
        enabledFilters: enabledFilters,
        filtersMetadata: filters.getFilters(),
        requestFilterInfo: filters.getRequestFilterInfo(),
        //syncStatusInfo: adguard.sync.syncService.getSyncStatus(),
        environmentOptions: {
            isMacOs: true,
            Prefs: {
                locale: 'en',
                mobile: false
            }
        },
        constants: {
            AntiBannerFiltersId: AntiBannerFiltersId
        }
    };
}