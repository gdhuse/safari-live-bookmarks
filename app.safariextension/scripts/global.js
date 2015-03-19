'use strict';

//var openTab = function(url) {
//  var tab;
//  if (safari.application.activeBrowserWindow) {
//    tab = safari.application.activeBrowserWindow.openTab('foreground');
//  } else {
//    tab = safari.application.openBrowserWindow().activeTab;
//  }
//  tab.url = url;
//};

window.liveBookmarks = {};
var extension = window.liveBookmarks;
extension.key = 'live-bookmarks-ME4HSHS36L';

/**
 * Setup reflux actions
 */
extension.LiveBookmarkActions = Reflux.createActions([]);


/**
 * Setup reflux store
 */
extension.LiveBookmarkStore = Reflux.createStore({
    listenables: [extension.LiveBookmarkActions],

    // Called whenever bookmarks are changed
    updateBookmarks: function (bookmarks) {
        // Keep in sync with local storage
        localStorage.setItem(extension.key, JSON.stringify(bookmarks));

        this.bookmarks = bookmarks;
        this.trigger(bookmarks);
    },

    // Called once on load
    getInitialState: function () {
        var loadedBookmarks = localStorage.getItem(extension.key);
        if (loadedBookmarks) {
            this.bookmarks = JSON.parse(loadedBookmarks);
        }
        else {
            this.bookmarks = [
                {
                    'id': 1,
                    'name': 'NYTimes.com',
                    'feed': 'http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml',
                    'site': 'http://www.nytimes.com/pages/index.html?partner=rss&emc=rss'
                },
                {
                    'id': 2,
                    'name': 'Hacker News',
                    'feed': 'http://news.ycombinator.com/rss',
                    'site': 'https://news.ycombinator.com/'
                }
            ];
        }

        console.log('Initial state: ' + JSON.stringify(this.bookmarks));
        return this.bookmarks;
    }

});


/**
 * We have to be prepared to initialize whether we're loaded before or after bar.js(x)
 */
_.chain(safari.extension.bars)
    .filter(function (bar) {
        return bar.identifier === 'live-bookmarks' &&
            typeof bar.contentWindow.initializeLiveBookmarksBar === 'function';
    })
    .each(function (bar) {
        bar.contentWindow.initializeLiveBookmarksBar(extension);
    });
