# Live Bookmarks for Safari

This is a browser extension that brings my favorite Firefox feature, [Live Bookmarks](https://support.mozilla.org/en-US/kb/Live%20Bookmarks), to Safari. Live Bookmarks are a lightweight way to consume RSS/Atom feeds in the browser. This extension adds a toolbar similar to the Safari Favorites Bar where each item is an RSS or Atom feed and can be expanded to view or visit current headlines.

## Using the extension

See http://gdhuse.github.io/safari-live-bookmarks for features, screenshots, and installation instructions.

## Development

### Getting started
After cloning the project and before buliding for the first time, from the `safari-live-bookmarks` directory:
 1. Install grunt and npm dependencies: `npm install`
 2. Install bower dependencies: `bower install`

### Building
Build extension to the `dist.safariextension/` directory:
```bash
$ grunt
```

Watch for changes:
```bash
$ grunt debug
```

## License
Published under the [MIT](https://github.com/gdhuse/safari-live-bookmarks/blob/master/LICENSE?raw=true) license.

## Credits

This project is built on many fantastic tools and libraries.  Special thanks to:
* [The Safari Extensions API](https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/Introduction/Introduction.html)
* [React](https://facebook.github.io/react/): One-way data binding for reactive UIs
* [Reflux](http://github.com/spoike/refluxjs): An excellent React [Flux](http://facebook.github.io/react/blog/2014/05/06/flux.html) implementation used for managing the data model and storage.
* [jFeed](https://github.com/jfhovinne/jFeed): RSS & Atom feed parsing ([forked](https://github.com/gdhuse/jFeed))
* [Sortable](http://rubaxa.github.io/Sortable/): Excellent React-compatible UI library for drag-and-drop sorting 
* [simple-lru](https://github.com/smagch/simple-lru): Simple LRU cache in JavaScript
* [Bootstrap](http://getbootstrap.com): Theme, components, and [glyphicons](http://glyphicons.com/)
* [feedicons.com](http://www.feedicons.com): RSS feed icons
* [Safari Extension Generator](https://github.com/lanceli/generator-safari-extension): Yeoman generator for Safari Extensions
