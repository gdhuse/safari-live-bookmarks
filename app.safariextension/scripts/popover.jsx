/** @jsx React.DOM */


function initializeLiveBookmarksEditor(extension) {

    /**
     * Add/edit form
     */
    var EditForm = React.createClass({
        mixins: [React.addons.LinkedStateMixin],

        // State is initialized from the editBookmark prop and used internally to track unsubmitted form changes
        getInitialState: function() {
            var bk = this.props.editBookmark;
            return {
                name: bk ? bk.name : '',
                url: bk ? bk.url : '',
                site: bk ? bk.site : ''
            }
        },

        // Props change when a new bookmark is selected for editing or "Add..." is chosen
        componentWillReceiveProps: function(nextProps) {
            var bk = nextProps.editBookmark;
            this.setState({
                name: bk ? bk.name : '',
                url: bk ? bk.url : '',
                site: bk ? bk.site : ''
            });
        },

        handleSubmit: function() {
            // Validate
            if(this.state.name.length === 0 ||
                this.state.url.length === 0) {
                return false;
            }

            // Update
            var bk = this.props.editBookmark;
            if(bk) {
                // Update
                extension.LiveBookmarkActions.editBookmark({
                    id: bk.id,
                    name: this.state.name,
                    url: this.state.url,
                    site: this.state.site
                });
            }
            else {
                // Add
                extension.LiveBookmarkActions.addBookmark({
                    name: this.state.name,
                    url: this.state.url,
                    site: this.state.site
                });
            }

            this.props.onSubmitted();
            event.preventDefault();
        },

        render: function() {
            var bk = this.props.editBookmark;
            var titleClass = 'form-group ' + (this.state.name.length > 0 ? 'has-success' : 'has-error');
            var urlClass = 'form-group ' + (this.state.url.length > 0 ? 'has-success' : 'has-error');
            return (
                <div id="live-bookmark-edit-form">
                    <h3>{bk ? 'Edit Bookmark' : 'New Bookmark'}</h3>
                    <form onSubmit={this.handleSubmit}>
                        <div className={titleClass}>
                            <label htmlFor="bookmark-name" className="control-label">Bookmark title</label>
                            <input type="text" className="form-control" id="bookmark-name"
                                placeholder="Displayed bookmark name" valueLink={this.linkState('name')} />
                        </div>
                        <div className={urlClass}>
                            <label htmlFor="bookmark-url" className="control-label">Feed URL</label>
                            <input type="url" className="form-control" id="bookmark-url"
                                placeholder="Location of an RSS or Atom feed" valueLink={this.linkState('url')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="bookmark-url" className="control-label">Site URL (Optional)</label>
                            <input type="url" className="form-control" id="bookmark-site"
                                placeholder="Location of the associated website" valueLink={this.linkState('site')} />
                        </div>
                        <button type="submit" className="btn btn-info">
                            {bk ? 'Update' : 'Add'}
                        </button>
                    </form>
                </div>
            )
        }
    });


    /**
     * Single draggable bookmark
     */
    var LiveBookmarkItem = React.createClass({
        mixins: [SortableItemMixin],

        handleRemove: function() {
            extension.LiveBookmarkActions.deleteBookmark(this.props.bookmark.id);
            event.preventDefault();
            event.stopPropagation();
        },

        handleSelection: function() {
            this.props.onSelect(this.props.bookmark.id);
            event.preventDefault();
        },

        render: function() {
            var className = "list-group-item  " + (this.props.isSelected ? "list-group-item-info" : "");
            return this.renderWithSortable(
                <a className={className} href="#" onClick={this.handleSelection}>
                    <div className="remove">
                        <span className="glyphicon glyphicon-remove-circle" onClick={this.handleRemove}></span>
                    </div>
                    {this.props.bookmark.name}
                </a>
            )
        }
    });

    /**
     * Bookmark list
     */
    var LiveBookmarkList = React.createClass({
        handleSort: function(reorder) {
            extension.LiveBookmarkActions.reorderBookmarks(reorder);
        },

        render: function() {
            var self = this;
            return (
                <div className="list-group">
                    <Sortable onSort={this.handleSort}>
                    {_.map(this.props.bookmarks, function(bookmark) {
                        return <LiveBookmarkItem key={bookmark.id} bookmark={bookmark}
                            sortData={bookmark.id} isDraggable={true}
                            isSelected={self.props.selectedBookmark === bookmark}
                            onSelect={self.props.onSelect} />
                    })}
                    </Sortable>
                </div>
            )
        }
    });

    /**
     * Whole popover
     */
    var LiveBookmarkEditor = React.createClass({
        mixins: [Reflux.listenTo(extension.LiveBookmarkStore, 'onStoreUpdate')],

        getInitialState: function() {
            return {
                selectedBookmark: undefined,
                bookmarks: []
            };
        },

        onStoreUpdate: function(storeState) {
            var newState = {
                selectedBookmark: this.state.selectedBookmark,
                bookmarks: storeState.bookmarks
            };

            // Make sure our selected bookmark, if any, still exists
            if(newState.selectedBookmark) {
                var found = _.find(storeState.bookmarks, function(bookmark) {
                    return bookmark.id === newState.selectedBookmark.id;
                });
                if(!found) {
                    newState.selectedBookmark = undefined;
                }
            }

            this.setState(newState);
        },

        handleSelection: function(bookmarkId) {
            var bookmark = _.findWhere(this.state.bookmarks, {'id': bookmarkId});
            this.setState({
                selectedBookmark: bookmark
            });
        },

        handleAddNew: function() {
            this.setState({selectedBookmark: undefined});
        },

        render: function() {
            return (
                <div id="live-bookmarks-popover">
                    <div id="live-bookmarks-popover-content">
                        <h3>Live Bookmarks</h3>
                        <p className="instructions">
                            Select a bookmark to edit, drag to reorder, or&nbsp;
                            <button type="button" className="btn btn-info btn-sm" onClick={this.handleAddNew}>
                                Add Live Bookmark
                            </button>.
                        </p>
                        <div id='live-bookmarks-editor'>
                            <LiveBookmarkList bookmarks={this.state.bookmarks}
                                onSelect={this.handleSelection}
                                selectedBookmark={this.state.selectedBookmark} />
                            <EditForm editBookmark={this.state.selectedBookmark} onSubmitted={this.handleAddNew} />
                        </div>
                    </div>
                </div>
            );
        }
    });


    /**
     * Render bookmarks
     */
    React.render(<LiveBookmarkEditor />, document.body);

}

/**
 * We have to be prepared to initialize whether we're loaded before or after global.js
 */
(function() {
    var global = safari.extension.globalPage.contentWindow;
    if(global && global.liveBookmarks) {
        // global.js has already been loaded
        initializeLiveBookmarksEditor(global.liveBookmarks);
    }

    var popover = _.find(safari.extension.popovers, function(popover) {
        return popover.identifier === 'live-bookmarks-popover';
    });
    if(popover) {
        popover.width = 800;
        popover.height = 494.427191;
    }

})();
