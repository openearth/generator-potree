/*global Potree */
// make this global
var viewer;
(function () {
  'use strict';

  // fix for missing attributes
  var onPointCloudLoaded = function (event) {
    // do stuff here that should be executed whenever a point cloud has been loaded.
    // event.pointcloud returns the point cloud object
    console.log('a point cloud has been loaded', event);
  };
  viewer = new Potree.Viewer(document.getElementById('potree_render_area'), {
    onPointCloudLoaded: onPointCloudLoaded
  });

  viewer.setEDLEnabled(false);
  viewer.setPointSize(3);
  viewer.setMaterial('RGB');
  viewer.setFOV(60);
  viewer.setPointSizing('Fixed');
  viewer.setQuality('Squares');
  viewer.setPointBudget(1 * 1000 * 1000);
  viewer.setDescription('');
  viewer.addPointCloud('<%= pointcloud %>');
  viewer.loadGUI();
    <% if (includeWater) { %>
  viewer.addWater();
    <% } %>
  $('#potree_menu_toggle').click(viewer.toggleSidebar);
  $('#potree_map_toggle').click(viewer.toggleMap);


})();
