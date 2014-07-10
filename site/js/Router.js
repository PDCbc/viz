/** The Router.
 * This handles routing whenever the `window.location.hash` changes.
 */
function Router() {
  'use strict';
  // Routie http://projects.jga.me/routie/
  // Use Anonymouse functions to avoid needing to use .bind()

  /** Display home */
  routie('/', function () {
    document.visualizer.home();
  });

  /** Get a list of queries. */
  routie('/queries', function () {
    document.visualizer.queries();
  });
  /** Get a specific query. */
  routie('/query/:title', function (title) {
    document.visualizer.queryById(title);
  });
}
