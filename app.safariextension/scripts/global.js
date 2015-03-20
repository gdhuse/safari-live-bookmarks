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
extension.LiveBookmarkActions = Reflux.createActions([
    'reloadFeed',       // Fired when a bookmark needs to be reloaded
]);


/**
 * Setup reflux store
 */
var itemIds = 0;
extension.LiveBookmarkStore = Reflux.createStore({
    listenables: [extension.LiveBookmarkActions],

    getBookmark: function(id) {
        return _.find(this.state.bookmarks, {'id': id});
    },

    // Called whenever bookmarks are changed
    updateBookmarks: function() {
        // Keep in sync with local storage
        // Note: We don't store the feed items persistently
        var toSave = _.map(this.state.bookmarks, function(bk) {
            return _.omit(bk, 'feed');
        });
        localStorage.setItem(extension.key, JSON.stringify(toSave));

        this.trigger(this.state);
    },

    // Called once on load
    getInitialState: function() {
        var bookmarks;

        var loadedBookmarks = localStorage.getItem(extension.key);
        if (loadedBookmarks) {
            bookmarks = JSON.parse(loadedBookmarks);
        }
        else {
            bookmarks = [
                {
                    'id': 1,
                    'name': 'NYTimes.com',
                    'url': 'http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml',
                    'site_url': 'http://www.nytimes.com/pages/index.html?partner=rss&emc=rss'
                },
                {
                    'id': 2,
                    'name': 'Hacker News',
                    'url': 'http://news.ycombinator.com/rss',
                    'site_url': 'https://news.ycombinator.com/'
                }
            ];
        }

        this.state = {
            bookmarks: bookmarks,
        };

        console.log('Initial state: ' + JSON.stringify(this.state));
        this.loadAllFeeds();
        return this.state;
    },

    loadFeed: function(bookmark) {
        console.log('Reloading feed for bookmark: ' + bookmark.name);
        jQuery.getFeed({
            url: bookmark.url,
            success: function(feed) {
                // Set an id on each feed item
                _.each(feed.items, function(item) {
                    if(!item.id) {
                        item.id = 'feed-item-' + itemIds++;
                    }
                });

                bookmark.feed = feed;
                extension.LiveBookmarkStore.updateBookmarks();
                console.log('Loaded ' + feed.items.length + ' feed items for bookmark: ' + bookmark.name);
            }
        });
    },

    loadAllFeeds: function() {
        var self = this;
        _.each(this.state.bookmarks, function(bookmark) {
            self.loadFeed(bookmark);
        });
    },

    onReloadFeed: function(id) {
        var bookmark = this.getBookmark(id);
        if(bookmark) {
            this.loadFeed(bookmark);
        }
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
