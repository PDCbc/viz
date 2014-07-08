/** The Visualizer.
 * This handles most of the 'main part' of the screen.
 */
function Visualizer() {
  'use strict';
  var main = d3.select('#main');

  /** Cleans the entire visualizer section. */
  this.clean = function () {
    main.html('');
  };

  this.home = function () {
    this.clean();
    main.append('p').text('Successfully logged');
  };

  /** Displays a list of queries. */
  this.queries = function () {
    this.clean();
    // Set the title correctly.
    main.append('h1').text('Query List');
    // Make space for the listing.
    // Get the queries and display them in a nice list.
    d3.json(document.api.queries(), function displayQueries(error, data) {
      if (error) { throw "Query failed to be requested."; }
      // Add a row div
      var queries = main.append('div').attr('id', 'listing')
        .selectAll('div').data(data);
      queries.enter()
        // Make a row
        .append('div')
          .classed({ 'panel': true, 'panel-default': true })
        .each(function () {
          // Display information about query.
          d3.select(this)
            .append('div').classed('panel-heading', true)
            .append('h3').classed('panel-title', true)
            .text(function (d) { return d.title; });
          d3.select(this).append('panel-body')
            .text(function (d) { return d.description; });
        })
        .each(function (d) {
          var group = d3.select(this);
          group.append('br');
          // Build buttons
          group.call(buildButton, 'fa-eye', 'View', '#/query/' + d._id);
          group.call(buildButton, 'fa-heart', 'Favourite', function () {
            alert("Favourite not implemented yet");
          });
        });
    });
  };

  /** Displays a single query.
   * @param {string} - The ID of the query.
   */
  this.queryById = function (id) {
    this.clean();
    d3.json(document.api.query(id), function displayQuery(error, data) {
      if (error) { throw error; }
      var charts = [];
      main.append('h1').text(data.title);
      var row = main.append('div').classed('row', true)
        .append('div');
      // Build the chart space.
      var displayArea = row.append('div').classed({ 'panel': true, 'panel-default': true })
        .append('div').attr('id', 'displayArea');

      // Set tabs.
      var tabControls = row.append('ul').classed({ 'nav': true, 'nav-tabs': true, 'nav-justified': true }).call(function (list) {
        list.append('li').classed('active', true).append('a')
          .attr('href', '#info')
          .attr('data-toggle', 'tab')
          .text('Info');
        list.append('li').append('a')
          .attr('href', '#controls')
          .attr('data-toggle', 'tab')
          .text('Customize');
      });
      var tabContent = row.append('div').classed({ 'tab-content': true });
      // Info
      var info = tabContent.append('div').classed({ 'tab-pane': true, 'fade': true, 'active': true, 'in': true }).attr('id', 'info').call(function (info) {
        // Set description.
        info.append('h4').text('Description:');
        info.append('p').attr('id', 'description').classed('panel', true)
          .text(data.description);
        // Some info
        info.append('p').attr('id', 'details').call(function (details) {
          // Author
          details.append('b').text('Author: ');
          details.append('span').attr('id', 'author')
            .text(data.author);
          details.append('br');
          // Date
          details.append('b').text('Date: ');
          details.append('span').attr('id', 'date')
            .text(data.date);
        });
      });

      // Make chart
      // data.charts.map(function (chart, index) {
      //   var width = (chart.width) ? chart.width : 100;
      //   displayArea.append('div').attr('id', "chart-" + index).attr('style', 'width: ' + width + '%; display: inline-block');
      //   chart.bindto = '#chart-' + index;
      //   charts.push(c3.generate(chart));
      // });
      console.log(data);
      displayArea.append('div').attr('id', 'chart');
      data.bindto = '#chart';
      c3.generate(data);
      // Controls
      var controls = tabContent.append('form').classed({ 'tab-pane': true, 'fade': true, 'form-horizontal': true }).attr('id', 'controls').call(function (controls) {
        charts.map(function (chart) {
          buildControls(chart, controls);
          controls.append('div').classed('row', true);
        });
      });
    });
  };


  // Auxilary Methods

  /** Generates the controls for a chart.
   * @param {Object} chart - The C3 object of the Chart.
   * @param {Element} controls - The DOM element to append the controls too.
   */
  function buildControls(chart, controls) {
    var columns = _.pluck(chart.data.targets, 'id');
    // Colours
    function changeColumnColour() {
      var column = $(this).data('column'),
        colour = $(this).val(),
        current = chart.data.colors();
      current[column] = colour;
      chart.data.colors(current);
    }
    var colours = controls.append('div').attr('id', 'colours');
    columns.forEach(function (key) {
      var group = colours.append('div').classed({ 'form-group': true, 'col-xs-2': true });
      var label = group.append('label');
      label.append('span').text(' ' + key);
      group.append('input')
        .classed('form-control', true)
        .attr('type', 'color')
        .attr('data-column', key)
        .property('value', chart.data.colors()[key])
        .on('change', changeColumnColour);
    });
    //
  }

  /** Generates a button (actually an 'a') as a child of the selection.
   * @param {Element} selection - The DOM element to append to.
   * @param {string} icon - An icon selected from Font-Awesome Icons.
   * @param {string} title - The text inside of the button.
   * @param {string|function} action - Either a link target or a function to be executed on click.
   */
  function buildButton(selection, icon, title, action) {
    var button = selection.append('a').classed({ 'btn': true, 'btn-default': true, 'btn-labeled': true })
      .call(function (button) {
        button.append('span').classed('btn-label', true)
          .append('i')
          .classed('fa', true)
          .classed(icon, true);
        button.append('span').text(' ' + title);
      });
      if (typeof action === "function") {
        button.on('click', action);
      } else {
        button.attr('href', action);
      }
  }
}
