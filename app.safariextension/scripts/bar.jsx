/** @jsx React.DOM */

// Render width cache
var renderedWidthCache = {};

function initializeLiveBookmarksBar(extension) {

    /**
     * A live bookmark feed
     */
    var LiveBookmark = React.createClass({
        handleSelect: function() {
            if(event.target.value === "meta:reload") {
                extension.LiveBookmarkActions.reloadFeed(this.props.id);
            }
            else if(event.target.value.substr(0,5) === 'link:') {
                extension.LiveBookmarkActions.openUrl(this.props.id, event.target.value.substr(5));
            }

            event.stopPropagation();
        },

        render: function() {
            var self = this;
            var selectStyle = {
                width: this.calculateRenderedWidth(this.props.name) - 10
            };

            // Note: Calculating the option string such that (https://github.com/facebook/react/issues/2620) is avoided
            // is tricky.  Errors occur if HTML entities including &nbsp; are used.  {prefix, item.title} also fails.
            var getOption = function(item) {
                var prefix = '';
                if(self.props.visitedTracking) {
                    prefix = !item.visited ? '\u25CF\u2002' : '\u2002\u2002\u2002';
                }

                return (<option key={item.id} title={item.link} value={'link:' + item.link}>{prefix + item.title}</option>);
            };

            return (
                <select value="meta:header" onChange={this.handleSelect} style={selectStyle}>
                    <option key="meta:header" disabled="disabled" value="meta:header">{this.props.name}&nbsp;&#9662;</option>
                    {_.map(this.props.feed ? this.props.feed.items : [], getOption)}
                    <optgroup key="optgroup" label="──────────">
                        <option key="meta:reload" value="meta:reload">Reload Live Bookmark</option>
                    </optgroup>
                </select>
            );
        },

        /**
         * Calculate the rendered width of the given string as a <select><option>
         * Adapted from: http://stackoverflow.com/a/5047712/2994406
         */
        calculateRenderedWidth: function(str) {
            if(!(str in renderedWidthCache)) {
                var o = jQuery('<select><option>' + str + '</option></select>')
                    .css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden'})
                    .appendTo(jQuery('body'));
                renderedWidthCache[str] = o.width();
                o.remove();
            }

            return renderedWidthCache[str];
        }

    });


    /**
     * Live bookmarks list
     */
    var LiveBookmarks = React.createClass({
        render: function() {
            var self = this;
            return (
                <div id="live-bookmarks">
                    {_.map(this.props.bookmarks, function(bk) {
                        return <LiveBookmark key={bk.id} id={bk.id} name={bk.name} feed={bk.feed}
                            visitedTracking={self.props.visitedTracking} />
                    })}
                </div>
            );
        }
    });


    /**
     * Whole toolbar
     */
    var ExtensionBar = React.createClass({
        mixins: [Reflux.connect(extension.LiveBookmarkStore, 'bookmarkState')],

        render: function() {
            return (
                <div className="container" onMouseDown={this.clearSelection}>
                    <LiveBookmarks bookmarks={this.state.bookmarkState.bookmarks}
                        visitedTracking={this.state.bookmarkState.config.visitedTracking} />
                </div>
            );
        }
    });


    /**
     * Render bookmarks
     */
    React.render(<ExtensionBar />, document.body);

}

/**
 * We have to be prepared to initialize whether we're loaded before or after global.js
 */
(function() {
    var global = safari.extension.globalPage.contentWindow;
    if(global && global.liveBookmarks) {
        // global.js has already been loaded
        initializeLiveBookmarksBar(global.liveBookmarks);
    }

})();
