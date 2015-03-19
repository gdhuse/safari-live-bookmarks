/** @jsx React.DOM */

function initializeLiveBookmarksBar(extension) {

    /**
     * A live bookmark feed
     */
    var LiveBookmark = React.createClass({displayName: "LiveBookmark",
        handleDestroy: function() {
            extension.LiveBookmarkActions.removeItem(this.props.id);
        },

        render: function() {
            return (
                React.createElement("li", null, this.props.name)
            );
        }

    });


    /**
     * Live bookmarks list
     */
    var LiveBookmarks = React.createClass({displayName: "LiveBookmarks",
        mixins: [Reflux.connect(extension.LiveBookmarkStore, 'bookmarks')],

        render: function() {
            return (
                React.createElement("ol", {id: "live-bookmarks"},
                    _.map(this.state.bookmarks, function(bk) {
                        return React.createElement(LiveBookmark, {id: bk.id, name: bk.name})
                    })
                )
            );
        }
    });

    console.log("HELLO!");

    /**
     * Render bookmarks
     */
    React.render(React.createElement(LiveBookmarks, null), document.getElementById('live-bookmarks-container'));

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
