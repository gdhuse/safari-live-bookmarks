'use strict';
/*global window: false */

//var openTab = function(url) {
//  var tab;
//  if (safari.application.activeBrowserWindow) {
//    tab = safari.application.activeBrowserWindow.openTab('foreground');
//  } else {
//    tab = safari.application.openBrowserWindow().activeTab;
//  }
//  tab.url = url;
//};

(function(Reflux) {
  var extensionKey = 'live-bookmarks-ME4HSHS36L';
  var global = window[extensionKey] = {};

  /**
   * Setup reflux actions
   */
  global.LiveBookmarkActions = Reflux.createActions([

  ]);


  /**
   * Setup reflux store
   */
  global.LiveBookmarkStore = Reflux.createStore({
    listenables: [global.LiveBookmarkActions],

    // Called whenever bookmarks are changed
    updateBookmarks: function(bookmarks) {
      // Keep in sync with local storage
      localStorage.setItem(extensionKey, JSON.stringify(bookmarks));

      this.bookmarks = bookmarks;
      this.trigger(bookmarks);
    },

    // Called once on load
    getInitialState: function() {
      var loadedBookmarks = localStorage.getItem(extensionKey);
      if(loadedBookmarks) {
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
    }

  });

})(window.Reflux);



