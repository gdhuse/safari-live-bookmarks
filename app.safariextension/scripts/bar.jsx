/** @jsx React.DOM */
/*global window: false */

(function() {
  var extensionKey = 'live-bookmarks-ME4HSHS36L';
  var global = window[extensionKey];
  var LiveBookmarkActions = global.LiveBookmarkActions;


  /**
   * A live bookmark feed
   */
  var LiveBookmark = React.createClass({
    handleDestroy: function() {
      LiveBookmarkActions.removeItem(this.props.id);
    },

    render: function() {
      return (
        <li>{this.props.name}</li>
      );
    }

  });


  /**
   * Live bookmarks list
   */
  var LiveBookmarks = React.createClass({
    render: function() {
      return (
        <ol id="live-bookmarks">
          {_.map(this.props.bookmarks, function(bk) {
            return <LiveBookmark id={bk.id} name={bk.name} />
          })}
        </ol>
      );
    }
  });


  /**
   * Render bookmarks
   */
  React.render(<LiveBookmarks/>, document.getElementById('live-bookmarks-container'));

  var bar = 'test';
})();
