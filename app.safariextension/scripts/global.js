'use strict';

window.liveBookmarks = {};
var extension = window.liveBookmarks;
extension.key = 'live-bookmarks';
extension.bookmarkFields = ['id', 'name', 'url', 'site'];


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
    'mergeBookmarks',           // Merge imported bookmarks

    'triggerRefresh'            // Re-render for any other reason
]);


/**
 * Setup reflux store
 */
extension.LiveBookmarkStore = Reflux.createStore({
    listenables: [extension.LiveBookmarkActions],

    init: function() {
        var bookmarks;

        var loadedBookmarks = localStorage.getItem(extension.key);
        if (loadedBookmarks) {
            bookmarks = JSON.parse(loadedBookmarks);
        }
        else if(safari.extension.settings.bookmarks && 
                safari.extension.settings.bookmarks.length > 0) 
        {
            console.log('Possible local storage corruption, restoring from settings');
            bookmarks = JSON.parse(safari.extension.settings.bookmarks);
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
    },

    getInitialState: function() { return this.state; },

    // Called whenever bookmarks are changed
    updateBookmarks: function() {
        // Keep in sync with local storage
        localStorage.setItem(extension.key, JSON.stringify(this.state.bookmarks));

        // Bookmarks (but not feed data) get sync'd to settings because local storage gets
        // deleted occasionally when Safari crashes
        var settingsBookmarks = JSON.stringify(
            _.map(this.state.bookmarks, function(b) {
                return _.pick(b, extension.bookmarkFields);
            })
        );
        if(safari.extension.settings.bookmarks !== settingsBookmarks) {
            safari.extension.settings.bookmarks = settingsBookmarks;
        }

        this.trigger(this.state);
    },

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

    onAddBookmark: function(bookmark) {
        this.state.bookmarks.push({
            'id': 'bookmark-' + this.randomUUID(),
            'name': bookmark.name,
            'url': bookmark.url,
            'site': bookmark.site
        });
        this.loadFeed(this.state.bookmarks[this.state.bookmarks.length-1]);
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

    onMergeBookmarks: function(toMerge) {
        var self = this;
        var bookmarksByUrl = _.indexBy(this.state.bookmarks, 'url');

        _.each(toMerge, function(bookmark) {
            bookmark = _.pick(bookmark, extension.bookmarkFields);
            var valid = _.every(extension.bookmarkFields, function(field) {
                return _.has(bookmark, field);
            });

            if(valid && !(bookmark.url in bookmarksByUrl)) {
                self.state.bookmarks.push(bookmark);
                self.loadFeed(self.state.bookmarks[self.state.bookmarks.length-1]);
            }
        });

        this.updateBookmarks();
    },

    loadFeed: function(bookmark) {
        var self = this;
        //console.log('Reloading feed for bookmark: ' + bookmark.name);
        jQuery.getFeed({
            url: bookmark.url,
            success: function(feed) {
                // Intersect with existing items to maintain id and visited status
                var existingItems = bookmark.feed ? _.indexBy(bookmark.feed.items, 'link') : {};
                //console.log('Existing items: ' + JSON.stringify(existingItems));
                feed.items = _.chain(feed.items)
                    .map(function(item) {
                        // Use existing item if one is found
                        if(item.link in existingItems) {
                            item = existingItems[item.link];
                            //console.log('Found existing item for \'' + item.link + '\': ' + JSON.stringify(item));
                        }
                        else {
                            item.id = 'feed-item-' + self.randomUUID();
                            //console.log('NO existing item for \'' + item.link + '\'');
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
                bookmark.feedError = false;
                bookmark.updated = moment().toDate();

                extension.LiveBookmarkStore.updateBookmarks();
                //console.log('Loaded ' + feed.items.length + ' feed items for bookmark: ' + bookmark.name);
            },
            error: function(_, msg) {
                bookmark.feedError = true;
                console.log('Error loading feed \'' + bookmark.name + '\': ' + msg);
                extension.LiveBookmarkStore.updateBookmarks();
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
 * Feed detection
 */
extension.LiveBookmarkAvailableFeedsStore = Reflux.createStore({
    init: function() {
        // Listen for toolbar button redraws
        safari.application.addEventListener('validate', this.onValidateEvent, false);

        // Listen for detected bookmarks from each page load
        safari.application.addEventListener('message', this.onMessageEvent, false);

        // Listen for tab activation to set current feeds
        safari.application.addEventListener('activate', this.updateCurrentFeed, true);

        // Detected feeds are kept in an LRU cache.  I tried explicitly maintaining a
        // dictionary of detected feeds using the Safari Windows and Tabs API to
        // prune unneeded entries, but neither the beforeNavigate or beforeSearch
        // events fire when a new URL is entered in the navigation bar directly.
        // This also avoids the need to reference count entries when multiple tabs
        // point to the same URL, etc.
        this.state = {
            urlFeeds: new SimpleLRU(1000),
            currentFeeds: [],
            currentUrl: undefined
        };
    },

    getInitialState: function() { return this.state; },

    forgetFeed: function(url) {
        this.state.urlFeeds.del(url);
    },

    updateCurrentFeed: function() {
        var activeWindow = safari.application.activeBrowserWindow;
        if(activeWindow && activeWindow.activeTab && activeWindow.activeTab.url) {
            var url = activeWindow.activeTab.url;
            this.state.currentUrl = url;
            this.state.currentFeeds = this.state.urlFeeds.get(url) || [];
            this.trigger(this.state);
        }
    },

    onMessageEvent: function(event) {
        if(event.name === 'live-bookmarks-tab-feeds' &&
            event.target instanceof SafariBrowserTab &&
            event.target.url)
        {
            // Respect private browsing
            if(!safari.application.privateBrowsing.enabled) {
                this.state.urlFeeds.set(event.target.url,
                    _.map(event.message, function(feed) {
                        return _.extend(feed, {site: event.target.url});
                    })
                );
                this.updateCurrentFeed();
                this.trigger(this.state);
            }
            else  {
                this.forgetFeed(event.target.url);
                this.updateCurrentFeed();
            }
        }
    },

    onValidateEvent: function(event) {
        if(event.command === 'live-bookmarks-button') {
            this.updateToolbarButtonBadge(event.target);
        }
    },

    updateToolbarButtonBadge: function(button) {
        var activeTab = button.browserWindow.activeTab;
        if(safari.extension.settings.showButtonBadge &&
            activeTab &&
            this.state.urlFeeds.has(activeTab.url))
        {
            button.badge = this.state.urlFeeds.get(activeTab.url).length;
        }
        else {
            button.badge = null;
        }
    },

    updateToolbarButtonBadges: function() {
        return _.chain(safari.extension.toolbarItems)
            .where({identifier: 'live-bookmarks-button'})
            .each(this.updateToolbarButtonBadge);
    }

});


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
    else if(event.key === 'showButtonBadge') {
        extension.LiveBookmarkAvailableFeedsStore.updateToolbarButtonBadges();
    }
}, false);

