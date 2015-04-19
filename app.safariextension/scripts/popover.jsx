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

        handleSubmit: function(event) {
            // Validate
            if(this.state.name.length === 0 ||
                this.state.url.length === 0) {
                return false;
            }

            // Update
            var bk = this.props.editBookmark;
            if(bk && bk.id) {
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

            this.props.onSubmitted(event);
            event.preventDefault();
        },

        render: function() {
            var bk = this.props.editBookmark;
            var titleClass = 'form-group ' + (this.state.name.length > 0 ? 'has-success' : 'has-error');
            var urlClass = 'form-group ' + (this.state.url.length > 0 ? 'has-success' : 'has-error');
            return (
                <div id="live-bookmark-edit-form">
                    <h3>{bk && bk.id ? 'Edit Bookmark' : 'New Bookmark'}</h3>
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
                            {bk && bk.id ? 'Update' : 'Add'}
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
            return (
                <li className={className} onClick={this.handleSelection}>
                    <div className="remove">
                        <span className="glyphicon glyphicon-remove-circle" onClick={this.handleRemove}></span>
                    </div>
                    {this.props.bookmark.name}
                </li>
            )
        }
    });

    /**
     * Bookmark list
     */
    var LiveBookmarkList = React.createClass({
        mixins: [SortableMixin],

        // Initial sort order
        getInitialState: function() {
            return {
                items: this.props.bookmarks
            };
        },

        // Update sort order
        componentWillReceiveProps: function(nextProps) {
            this.setState({
                items: nextProps.bookmarks
            });
        },

        handleSort: function(event) {
            var reorder = _.map(this.state.items, function(bk) { return bk.id; });
            extension.LiveBookmarkActions.reorderBookmarks(reorder);
        },

        render: function() {
            var self = this;
            return (
                <ul className="list-group">
                    {_.map(this.state.items, function(bookmark) {
                        return <LiveBookmarkItem key={bookmark.id} bookmark={bookmark}
                            isSelected={self.props.selectedBookmark === bookmark}
                            onSelect={self.props.onSelect} />
                    })}
                </ul>
            )
        }
    });

    /**
     * Sync form
     */
    var SyncForm = React.createClass({
        mixins: [React.addons.LinkedStateMixin],

        // State is initialized from the editBookmark prop and used internally to track unsubmitted form changes
        getInitialState: function() {
            return {
                importText: '',
                error: undefined
            };
        },


        handleSubmit: function(event) {
            try {
                var toMerge = JSON.parse(this.state.importText);
                extension.LiveBookmarkActions.mergeBookmarks(toMerge);

                this.setState({
                    importText: '',
                    error: undefined
                });
            }
            catch(e) {
                this.setState({error: e});
            }

            event.preventDefault();
        },

        render: function() {
            var importClass = 'form-group ' + (this.state.error ? 'has-error' : '');
            var exportText = JSON.stringify(
                _.map(this.props.bookmarks, function(b) {
                    return _.pick(b, extension.bookmarkFields);
                })
            );

            return (
                <form onSubmit={this.handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="syncExport">Export</label>
                        <textarea className="form-control" rows="3" id="syncExport" readOnly={true}
                            value={exportText}></textarea>
                        <span className="help-block">To export, select the text above and copy with &#8984;-c</span>
                    </div>
                    <div className={importClass}>
                        <label htmlFor="syncImport">Import</label>
                        <textarea className="form-control" rows="3" id="syncImport"
                            valueLink={this.linkState('importText')}></textarea>
                        <span className="help-block">
                            To import, paste exported text above using &#8984;-v,
                            then click <strong>Import Bookmarks</strong>.
                            Importing merges bookmarks without deleting
                        </span>
                        <button type="submit" className="btn btn-info">Import Bookmarks</button>
                    </div>
                </form>
            )
        }
    });

    /**
     * Whole popover
     */
    var LiveBookmarkEditor = React.createClass({
        mixins: [
            Reflux.listenTo(extension.LiveBookmarkStore, 'onBookmarksUpdate'),
            Reflux.listenTo(extension.LiveBookmarkAvailableFeedsStore, 'onAvailableFeedsUpdate')
        ],

        getInitialState: function() {
            return {
                selectedBookmark: undefined,
                editingBookmark: undefined,
                bookmarks: [],
                detectedFeeds: []
            };
        },

        onBookmarksUpdate: function(storeState) {
            var newState = {
                selectedBookmark: this.state.selectedBookmark,
                editingBookmark: this.state.editingBookmark,
                bookmarks: storeState.bookmarks
            };

            // Make sure our selected bookmark, if any, still exists
            if(newState.selectedBookmark) {
                var found = _.find(storeState.bookmarks, function(bookmark) {
                    return bookmark.id === newState.selectedBookmark.id;
                });
                if(!found) {
                    newState.selectedBookmark = undefined;
                    newState.editingBookmark = undefined;
                }
            }

            this.setState(newState);
        },

        onAvailableFeedsUpdate: function(availableFeedsState) {
            this.setState({detectedFeeds: availableFeedsState.currentFeeds});
        },

        handleSelection: function(bookmarkId) {
            var bookmark = _.findWhere(this.state.bookmarks, {'id': bookmarkId});
            this.setState({
                selectedBookmark: bookmark,
                editingBookmark: bookmark
            });
        },

        handleAddNew: function(event) {
            this.setState({
                selectedBookmark: undefined,
                editingBookmark: {
                    name: '',
                    url: '',
                    site: ''
                }
            });
            event.preventDefault();
        },

        handleAddDetected: function(feed, event) {
            this.setState({
                selectedBookmark: undefined,
                editingBookmark: {
                    name: feed.name,
                    url: feed.url,
                    site: feed.site
                }
            });
            event.preventDefault();
        },

        render: function() {
            var self = this;

            // Add new feed button with possible detected feeds dropdown menu
            var addButton;
            if(this.state.detectedFeeds.length > 0) {
                addButton = (
                    <div className="btn-group">
                        <button type="button" className="btn btn-info btn-sm dropdown-toggle"
                            data-toggle="dropdown" aria-expanded="false">
                            Add Live Bookmark
                            <span className="badge">{this.state.detectedFeeds.length}</span>
                            <span className="caret"></span>
                        </button>
                        <ul className="dropdown-menu" role="menu">
                            {_.map(this.state.detectedFeeds, function(feed) {
                                return (
                                    <li key={feed.url}>
                                        <a href="#" onClick={self.handleAddDetected.bind(self, feed)}>
                                            {feed.name} ({feed.type === 'rss' ? 'RSS' : 'Atom'})
                                        </a>
                                    </li>
                                );
                            })}
                            <li className="divider"></li>
                            <li><a href="#" onClick={this.handleAddNew}>Add manually</a></li>
                        </ul>
                    </div>
                );
            }
            else {
                addButton = (
                    <button type="button" className="btn btn-info btn-sm" onClick={this.handleAddNew}>
                        Add Live Bookmark
                    </button>
                );
            }

            return (
                <div id="live-bookmarks-popover">
                    <div id="live-bookmarks-popover-content">
                        <ul className="nav nav-tabs" role="tablist">
                            <li role="presentation" className="active">
                                <a href="#live_bookmarks_tab_pane" role="tab" data-toggle="tab">Live Bookmarks</a>
                            </li>
                            <li role="presentation">
                                <a href="#sync_tab_pane" role="tab" data-toggle="tab">Sync</a>
                            </li>
                        </ul>

                        <div className="tab-content">
                            <div role="tabpanel" className="tab-pane active" id="live_bookmarks_tab_pane">
                                <h3>Live Bookmarks</h3>
                                <p className="instructions">
                                    Select a bookmark to edit, drag to reorder, or&nbsp;{addButton}.
                                </p>
                                <div id='live-bookmarks-editor'>
                                    <LiveBookmarkList bookmarks={this.state.bookmarks}
                                        onSelect={this.handleSelection}
                                        selectedBookmark={this.state.selectedBookmark} />
                                    <EditForm editBookmark={this.state.editingBookmark} onSubmitted={this.handleAddNew} />
                                </div>
                            </div>
                            <div role="tabpanel" className="tab-pane" id="sync_tab_pane">
                                <h3>Sync</h3>
                                <p className="instructions">
                                    Sync your Live Bookmarks by copying text from the <strong>Export</strong> box,
                                    pasting it into the <strong>Import</strong> box on another computer.
                                </p>
                                <SyncForm bookmarks={this.state.bookmarks} />
                            </div>
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
        popover.width = 849;
        popover.height = 525;
    }

})();
