/** @jsx React.DOM */

function initializeLiveBookmarksBar(extension) {

    /**
     * A live bookmark feed
     */
    var LiveBookmark = React.createClass({
        handleMouseDown: function(event) {
            if(this.props.isSelected) {
                extension.LiveBookmarkActions.selectionCleared();
            }
            else {
                extension.LiveBookmarkActions.bookmarkSelected(this.props.id);
            }
            event.stopPropagation();
        },

        handleMouseOver: function(event) {
            if(this.props.selectionActive) {
                // Now this bookmark is selected
                extension.LiveBookmarkActions.bookmarkSelected(this.props.id);
            }
            event.stopPropagation();
        },

        render: function() {
            var className = this.props.isSelected ? "selected" : "";
            return (
                <li onMouseDown={this.handleMouseDown}
                    onMouseOver={this.handleMouseOver}
                    className={className}
                >
                    <span className="name">{this.props.name}</span>
                    <span className="arrow">&#9662;</span>
                </li>
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
                <ol id="live-bookmarks">
                    {_.map(this.props.bookmarks, function(bk) {
                        return <LiveBookmark key={bk.id} id={bk.id} name={bk.name}
                            isSelected={self.props.selectedBookmarkId === bk.id}
                            selectionActive={self.props.selectedBookmarkId !== bk.id} />
                    })}
                </ol>
            );
        }
    });


    /**
     * Whole toolbar
     */
    var ExtensionBar = React.createClass({
        mixins: [Reflux.connect(extension.LiveBookmarkStore, 'bookmarkState')],

        clearSelection: function() {
            if(this.state.bookmarkState.selectedBookmarkId !== null) {
                extension.LiveBookmarkActions.selectionCleared();
            }
        },

        render: function() {
            return (
                <div className="container" onMouseDown={this.clearSelection}>
                    <LiveBookmarks bookmarks={this.state.bookmarkState.bookmarks}
                        selectedBookmarkId={this.state.bookmarkState.selectedBookmarkId} />
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
