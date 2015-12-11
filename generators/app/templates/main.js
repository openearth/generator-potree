/*global Potree */
(function () {
  'use strict';
  var onPointCloudLoaded = function (event) {
    // do stuff here that should be executed whenever a point cloud has been loaded.
    // event.pointcloud returns the point cloud object
    console.log('a point cloud has been loaded', event);
  };
  var renderArea = document.getElementById("renderArea");
  var viewer = new Potree.Viewer(document.getElementById('potree_render_area'), {
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
  viewer.addPointCloud('http://5.9.65.151/mschuetz/potree/resources/pointclouds/opentopography/CA13_1.4/cloud.js');
  viewer.loadGUI();


})();
