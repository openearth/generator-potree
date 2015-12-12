var PotreeRenderer = function(scope){
  this.name = 'potree';
  this.render = function(scope){
    {// resize
      var width = scope.renderArea.clientWidth;
      var height = scope.renderArea.clientHeight;
      var aspect = width / height;

      scope.camera.aspect = aspect;
      scope.camera.updateProjectionMatrix();

      scope.renderer.setSize(width, height);
    }


    // render skybox
    if(scope.showSkybox){
      skybox.camera.rotation.copy(scope.camera.rotation);
      scope.renderer.render(skybox.scene, skybox.camera);
    }else{
      scope.renderer.render(scope.sceneBG, scope.cameraBG);
    }

    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];
      if(pointcloud.originalMaterial){
        pointcloud.material = pointcloud.originalMaterial;
      }

      var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);

      pointcloud.material.size = scope.pointSize;
      pointcloud.material.opacity = scope.opacity;
      pointcloud.material.pointColorType = scope.pointColorType;
      pointcloud.material.pointSizeType = scope.pointSizeType;
      pointcloud.material.pointShape = (scope.quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
      pointcloud.material.interpolate = (scope.quality === "Interpolation");
      pointcloud.material.weighted = false;
    }

    // render scene
    scope.renderer.render(scope.scene, scope.camera);
    scope.renderer.render(scope.scenePointCloud, scope.camera);

    scope.profileTool.render();
    scope.volumeTool.render();

    scope.renderer.clearDepth();
    scope.measuringTool.render();
    scope.transformationTool.render();
  };
};
