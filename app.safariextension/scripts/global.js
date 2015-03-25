'use strict';

window.liveBookmarks = {};
var extension = window.liveBookmarks;
extension.key = 'live-bookmarks';


/**
 * Setup reflux actions
 */
extension.LiveBookmarkActions = Reflux.createActions([
    'reloadFeed',               // Fired when a bookmark needs to be reloaded
    'reloadAllFeeds',           // Fired to reload all bookmarks

    'openUrl',                  // Fired when the user chooses to open a link

    'clearVisited',             // Resets the visited state of items in this bookmark
    'markVisited',              // Marks all items in this bookmark visited
    'enableVisited',            // Enable visited link tracking
    'disableVisited',           // Disable visited link tracking

    'addBookmark',              // Add new bookmark
    'editBookmark',             // Edit existing bookmark
    'deleteBookmark',           // Remove bookmark
    'reorderBookmarks',         // Change bookmark ordering

    'triggerRefresh'            // Re-render for any other reason
]);


/**
 * Setup reflux store
 */
extension.LiveBookmarkStore = Reflux.createStore({
    listenables: [extension.LiveBookmarkActions],

    getBookmark: function(bookmarkId) {
        return _.findWhere(this.state.bookmarks, {'id': bookmarkId});
    },

    randomUUID: function() {
        // From: http://stackoverflow.com/a/2117523/2994406
        /*jshint bitwise: false*/
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
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
                    'id': 'bookmark-' + this.randomUUID(),
                    'name': 'The New York Times',
                    'url': 'http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml',
                    'site': 'http://www.nytimes.com'
                },
                {
                    'id': 'bookmark-' + this.randomUUID(),
                    'name': 'Hacker News',
                    'url': 'http://news.ycombinator.com/rss',
                    'site': 'http://news.ycombinator.com'
                },
                {
                    'id': 'bookmark-' + this.randomUUID(),
                    'name': 'Daring Fireball',
                    'url': 'http://daringfireball.net/index.xml',
                    'site': 'http://daringfireball.net'
                }
            ];
        }

        this.state = {
            bookmarks: bookmarks,
            config: {
                visitedTracking: safari.extension.settings.trackVisited
            }
        };

        //console.log('Initial state: ' + JSON.stringify(this.state));
        this.loadAllFeeds();
        return this.state;
    },

    onAddBookmark: function(bookmark) {
        this.state.bookmarks.unshift({
            'id': 'bookmark-' + this.randomUUID(),
            'name': bookmark.name,
            'url': bookmark.url,
            'site': bookmark.site
        });
        this.loadFeed(this.state.bookmarks[0]);
        this.updateBookmarks();
    },

    onEditBookmark: function(bookmark) {
        var existing = this.getBookmark(bookmark.id);
        if(existing) {
            existing.name = bookmark.name;
            existing.site = bookmark.site;

            if(existing.url !== bookmark.url) {
                existing.url = bookmark.url;
                this.loadFeed(existing);
            }


            console.log('Edited bookmark: ' + existing.id);
            this.updateBookmarks();
        }
    },

    onDeleteBookmark: function(bookmarkId) {
        var bookmark = this.getBookmark(bookmarkId);
        if(bookmark) {
            this.state.bookmarks = _.without(this.state.bookmarks, bookmark);
            this.updateBookmarks();
        }
    },

    onReorderBookmarks: function(orderedBookmarkIds) {
        var bookmarksById = _.indexBy(this.state.bookmarks, 'id');
        this.state.bookmarks = _.map(orderedBookmarkIds, function(bookmarkId) {
            return bookmarksById[bookmarkId];
        });
        this.updateBookmarks();
    },

    loadFeed: function(bookmark) {
        var self = this;
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
                            item.id = 'feed-item-' + self.randomUUID();
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
                bookmark.updated = moment().toDate();

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

    onReloadAllFeeds: function() {
        this.loadAllFeeds();
    },

    onOpenUrl: function(bookmarkId, url) {
        if(!url || !url.length) {
            return;
        }

        // Open in tab/window
        var tab;
        var openLink = safari.extension.settings.openLink;
        if(openLink === 'newTabForeground' || openLink === 'newTabBackground') {
            if (safari.application.activeBrowserWindow) {
                tab = safari.application.activeBrowserWindow.openTab(
                    openLink === 'newTabForeground' ? 'foreground' : 'background');
            }
            else {
                tab = safari.application.openBrowserWindow().activeTab;
            }
        }
        else if(openLink === 'newWindow') {
            tab = safari.application.openBrowserWindow().activeTab;
        }
        else {  // Current tab
            if (safari.application.activeBrowserWindow) {
                tab = safari.application.activeBrowserWindow.activeTab;
            }
            else {
                tab = safari.application.openBrowserWindow().activeTab;
            }
        }
        tab.url = url;

        // Updated visited only if tracking is enabled and not in private browsing mode
        if(this.state.config.visitedTracking && !safari.application.privateBrowsing.enabled) {
            var bookmark = this.getBookmark(bookmarkId);
            if(bookmark && bookmark.feed) {
                var feedItem = _.findWhere(bookmark.feed.items, {link: url});
                if(feedItem && !feedItem.visited) {
                    feedItem.visited = true;
                    this.updateBookmarks();
                }
            }
        }
    },

    onClearVisited: function(bookmarkId) {
        var bookmark = this.getBookmark(bookmarkId);
        if (bookmark && bookmark.feed) {
            _.each(bookmark.feed.items, function(item) {
                delete item.visited;
            });

            this.updateBookmarks();
        }
    },

    onMarkVisited: function(bookmarkId) {
        var bookmark = this.getBookmark(bookmarkId);
        if (bookmark && bookmark.feed) {
            _.each(bookmark.feed.items, function(item) {
                item.visited = true;
            });

            this.updateBookmarks();
        }
    },

    enableDisableVisited: function() {
        this.state.config.visitedTracking = safari.extension.settings.trackVisited;

        // Mark all unread
        _.each(this.state.bookmarks, function(bookmark) {
            extension.LiveBookmarkActions.clearVisited(bookmark.id);
        });

        this.updateBookmarks();
    },

    onEnableVisited: function() { this.enableDisableVisited(); },
    onDisableVisited: function() { this.enableDisableVisited(); },

    onTriggerRefresh: function() {
        this.updateBookmarks();
    }
});


/**
 * Auto-reload feeds in a certain interval
 */
var refreshTimer;
var setupRefresh  = function() {
    var userInterval = parseInt(safari.extension.settings.refreshInterval);
    if(isNaN(userInterval)) {
        console.log('Error: Provided refresh interval \'' +
            safari.extension.settings.refreshInterval + '\' is not a number, defaulting to 15 minutes');
        userInterval = 15;
    }

    var interval = 60*1000*userInterval;
    console.log('Reloading live bookmarks every ' + userInterval + ' minutes');

    if(refreshTimer) {
        window.clearInterval(refreshTimer);
    }

    refreshTimer = window.setInterval(function() {
        extension.LiveBookmarkActions.reloadAllFeeds();
    }, interval);
};
setupRefresh();


/**
 * Listen for and handle settings changes
 */
safari.extension.settings.addEventListener('change', function(event) {
    if(event.key === 'refreshInterval') {
        setupRefresh();
    }
    else if(event.key === 'trackVisited') {
        if(safari.extension.settings.trackVisited) {
            extension.LiveBookmarkActions.enableVisited();
        }
        else {
            extension.LiveBookmarkActions.disableVisited();
        }
    }
    else if(event.key === 'toolbarAlignment') {
        // Just refresh
        extension.LiveBookmarkActions.triggerRefresh();
    }
}, false);


/**
 * We have to be prepared to initialize whether we're loaded before or after bar.jsx
 */
_.chain(safari.extension.bars)
    .filter(function (bar) {
        return bar.identifier === 'live-bookmarks' &&
            typeof bar.contentWindow.initializeLiveBookmarksBar === 'function';
    })
    .each(function (bar) {
        bar.contentWindow.initializeLiveBookmarksBar(extension);
    });
