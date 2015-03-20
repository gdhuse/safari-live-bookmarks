/** @jsx React.DOM */

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
                console.log(event);
            }
        },

        render: function() {
            var className = this.props.isSelected ? "selected" : "";
            return (
                <select value="meta:header" onChange={this.handleSelect}>
                    <option disabled="disabled" value="meta:header">{this.props.name}&nbsp;&#9662;</option>

                    {_.map(this.props.feed ? this.props.feed.items : [], function(item) {
                        return <option key={item.id} title={item.link} value={'link:' + item.link}>&#9679;&nbsp;{item.title}</option>
                    })}

                    <optgroup label="──────────">
                        <option value="meta:reload">Reload Live Bookmark</option>
                    </optgroup>
                </select>
            );
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
                        return <LiveBookmark key={bk.id} id={bk.id} name={bk.name} feed={bk.feed} />
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
                    <LiveBookmarks bookmarks={this.state.bookmarkState.bookmarks} />
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
