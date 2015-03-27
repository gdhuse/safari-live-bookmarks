'use strict';

/**
 * Detect RSS/Atom feeds in document once on load
 */
(function() {
    // Only capture for the topmost iframe in a tab
    if(document.head && window.top === window) {
        var toArray = Array.prototype.slice;

        var feeds = ['rss', 'atom']
            .map(function(type) {
                var selector = 'link[type="application/' + type + '+xml"]';
                return toArray.call(document.head.querySelectorAll(selector))
                    .map(function(feed) {
                        return {
                            name: feed.title,
                            url: feed.href,
                            type: type
                        };
                    });
            })
            .reduce(function(a,b) { return a.concat(b); });

        safari.self.tab.dispatchMessage('live-bookmarks-tab-feeds', feeds);
    }
})();
