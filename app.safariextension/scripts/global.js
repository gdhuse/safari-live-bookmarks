'use strict';

window.liveBookmarks = {};
var extension = window.liveBookmarks;
extension.key = 'live-bookmarks-ME4HSHS36L';

/**
 * Setup reflux actions
 */
extension.LiveBookmarkActions = Reflux.createActions([
    'reloadFeed',       // Fired when a bookmark needs to be reloaded
    'openUrl',          // Fired when the user chooses to open a link
]);


/**
 * Setup reflux store
 */
extension.LiveBookmarkStore = Reflux.createStore({
    listenables: [extension.LiveBookmarkActions],

    getBookmark: function(bookmarkId) {
        return _.findWhere(this.state.bookmarks, {'id': bookmarkId});
    },

    // Called whenever bookmarks are changed
    updateBookmarks: function() {
        // Keep in sync with local storage
        localStorage.setItem(extension.key, JSON.stringify(this.state.bookmarks));

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
                    'name': 'The New York Times',
                    'url': 'http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml',
                    'site_url': 'http://www.nytimes.com/pages/index.html?partner=rss&emc=rss'
                },
                {
                    'id': 2,
                    'name': 'Hacker News',
                    'url': 'http://news.ycombinator.com/rss',
                    'site_url': 'https://news.ycombinator.com/'
                },
                {
                    'id': 3,
                    'name': 'Daring Fireball',
                    'url': 'http://daringfireball.net/index.xml',
                    'site_url': 'http://daringfireball.net'
                }
            ];
        }

        this.state = {
            bookmarks: bookmarks,
            config: {
                visitedTracking: true
            }
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
                // Intersect with existing items to maintain id and visited status
                var existingItems = bookmark.feed ? _.indexBy(bookmark.feed.items, 'link') : {};
                feed.items = _.chain(feed.items)
                    .map(function(item) {
                        // Use existing item if one is found
                        if(item.link in existingItems) {
                            item = existingItems[item.link];
                        }
                        else {
                            // From: http://stackoverflow.com/a/2117523/2994406
                            /*jshint bitwise: false*/
                            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                                var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
                                return v.toString(16);
                            });
                            item.id = 'feed-item-' + uuid;
                        }

                        return _.pick(item, 'id', 'title', 'link', 'visited');
                    })
                    .filter(function(item) {
                        // Sanity checking
                        if(!item.title || item.title.length === 0) {
                            console.log('Excluding feed item with no title: ' + JSON.stringify(item));
                            return false;
                        }
                        else if(!item.link || item.title.link === 0) {
                            console.log('Excluding feed item with no link: ' + JSON.stringify(item));
                            return false;
                        }
                        return true;
                    })
                    .uniq(function(item) {
                        // This happens if there are two items with the same link URL -- we only display the most recent
                        return item.id;
                    })
                    .value();

                bookmark.feed = feed;
                bookmark.updated = moment();

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

    onReloadFeed: function(bookmarkId) {
        var bookmark = this.getBookmark(bookmarkId);
        if(bookmark) {
            this.loadFeed(bookmark);
        }
    },

    onOpenUrl: function(bookmarkId, url) {
        // TODO: Option to open in same, tab, window
        if(true) {
            var tab;
            if (safari.application.activeBrowserWindow) {
                tab = safari.application.activeBrowserWindow.openTab('foreground');
            } else {
                tab = safari.application.openBrowserWindow().activeTab;
            }
            tab.url = url;
        }

        // TODO: Visited tracking should be optional
        if(true && !(safari.privateBrowsing && safari.privateBrowsing.enabled)) {
            var bookmark = this.getBookmark(bookmarkId);
            if(bookmark && bookmark.feed) {
                var feedItem = _.findWhere(bookmark.feed.items, {link: url});
                if(feedItem && !feedItem.visited) {
                    feedItem.visited = true;
                    this.updateBookmarks();
                }
            }
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
