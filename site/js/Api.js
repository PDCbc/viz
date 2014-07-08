/** The API.
 * This handles all API calls, in case they need to be changed. Don't call the API except through this, otherwise maintenance nightmare!
 */
function Api() {
  'use strict';
  this.version = '/v1';
  this.root = '/api';

  /** Authenticates the user.
   * TODO: Improve this interface. It's awkward.
   * @param {Object} opts - The options object, contains `identity` and `password`.
   * @returns - A Jquery XHR request object.
   */
  this.auth = function (opts) {
    // Must include username and password.
    if (!(opts.identity && opts.password)) {
      throw 'A identity and password are both required.';
    }
    return $.get(this.root + this.version + '/auth', opts);
  };

  /** Returns the URI for getting a list of queries.
   * TODO: List all possible opts.
   * @param {Object} opts - The options for the query.
   * @returns {string} - The URI to access.
   */
  this.queries = function (opts) {
    var url = this.root + this.version + '/queries';
    if (opts) {
      url += '?' + $.param(opts);
    }
    return url;
  };

  /** Returns the URI for getting the full details of a specific query.
   * TODO: List all possible opts.
   * @param {string} id - The ID of the query.
   * @param {Object} opts - The options for the request.
   * @returns {string} - The URI to access.
   */
  this.query = function (id, opts) {
    if (!id) { throw "An id must be provided."}
    var url = this.root + this.version + '/query/' + id;
    if (opts) {
      url += '?' + $.param(opts);
    }
    return url;
  }

  /** Returns a URI used to query the API.
   * TODO: List all possible opts.
   * @param {Object} opts - The options for the request.
   * @returns {string} - The URI to access.
   */
  this.favouriteQueries = function (opts) {
    var url = this.root + this.version + '/favourites/queries';
    if (opts) {
      url += '?' + $.param(opts);
    }
    return url;
  };

  /** Returns a URI used to unfavourite a query.
   * TODO
   */
  this.unfavoriteQuery = function (id) {
    // TODO: Add favouriting functionality.
    console.log("TODO");
  };
}
