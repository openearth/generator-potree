var EDLRenderer = function(scope){
  this.name = 'EDL';
  var edlMaterial = null;
  var attributeMaterials = [];

  var rtColor = null;
  var gl = scope.renderer.context;

  var initEDL = function(){
    if(edlMaterial != null){
      return;
    }

    edlMaterial = new Potree.EyeDomeLightingMaterial();


    rtColor = new THREE.WebGLRenderTarget( 1024, 1024, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    } );

  };

  var resize = function(){
    var width = scope.renderArea.clientWidth;
    var height = scope.renderArea.clientHeight;
    var aspect = width / height;

    var needsResize = (rtColor.width != width || rtColor.height != height);

    // disposal will be unnecessary once this fix made it into three.js master:
    // https://github.com/mrdoob/three.js/pull/6355
    if(needsResize){
      rtColor.dispose();
    }

    scope.camera.aspect = aspect;
    scope.camera.updateProjectionMatrix();

    scope.renderer.setSize(width, height);
    rtColor.setSize(width, height);
  };

  this.render = function(scope){

    initEDL();

    resize();

    scope.renderer.clear();
    if(scope.showSkybox){
      skybox.camera.rotation.copy(scope.camera.rotation);
      scope.renderer.render(skybox.scene, skybox.camera);
    }else{
      scope.renderer.render(scope.sceneBG, scope.cameraBG);
    }
    // scope.renderer.render(scope.scene, scope.camera);

    var originalMaterials = [];
    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];
      var width = scope.renderArea.clientWidth;
      var height = scope.renderArea.clientHeight;

      if(attributeMaterials.length <= i ){
        var attributeMaterial = new Potree.PointCloudMaterial();
        attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
        attributeMaterial.interpolate = false;
        attributeMaterial.weighted = false;
        attributeMaterial.minSize = 2;
        attributeMaterial.useLogarithmicDepthBuffer = false;
        attributeMaterial.useEDL = true;
        attributeMaterials.push(attributeMaterial);
      }
      var attributeMaterial = attributeMaterials[i];

      var octreeSize = pointcloud.pcoGeometry.boundingBox.size().x;

      originalMaterials.push(pointcloud.material);

      scope.renderer.clearTarget( rtColor, true, true, true );

      {// COLOR & DEPTH PASS
        attributeMaterial = pointcloud.material;
        attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
        attributeMaterial.interpolate = false;
        attributeMaterial.weighted = false;
        attributeMaterial.minSize = 2;
        attributeMaterial.useLogarithmicDepthBuffer = false;
        attributeMaterial.useEDL = true;

        attributeMaterial.size = scope.pointSize;
        attributeMaterial.pointSizeType = scope.pointSizeType;
        attributeMaterial.screenWidth = width;
        attributeMaterial.screenHeight = height;
        attributeMaterial.pointColorType = scope.pointColorType;
        attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
        attributeMaterial.uniforms.octreeSize.value = octreeSize;
        attributeMaterial.fov = scope.camera.fov * (Math.PI / 180);
        attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
        attributeMaterial.near = scope.camera.near;
        attributeMaterial.far = scope.camera.far;
        attributeMaterial.heightMin = scope.heightMin;
        attributeMaterial.heightMax = scope.heightMax;
        attributeMaterial.intensityMin = pointcloud.material.intensityMin;
        attributeMaterial.intensityMax = pointcloud.material.intensityMax;
        attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
        attributeMaterial.clipMode = pointcloud.material.clipMode;
        attributeMaterial.bbSize = pointcloud.material.bbSize;
        attributeMaterial.treeType = pointcloud.material.treeType;
        attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;

        pointcloud.material = attributeMaterial;
        for(var j = 0; j < pointcloud.visibleNodes.length; j++){
          var node = pointcloud.visibleNodes[j];
          if(pointcloud instanceof Potree.PointCloudOctree){
            node.sceneNode.material = attributeMaterial;
          }else if(pointcloud instanceof Potree.PointCloudArena4D){
            node.material = attributeMaterial;
          }
        }
      }

    }

    scope.renderer.render(scope.scenePointCloud, scope.camera, rtColor);
    // bit of a hack here. The EDL pass will mess up the text of the volume tool
    // so volume tool is rendered again afterwards
    scope.volumeTool.render(rtColor);

    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];
      var originalMaterial = originalMaterials[i];
      pointcloud.material = originalMaterial;
      for(var j = 0; j < pointcloud.visibleNodes.length; j++){
        var node = pointcloud.visibleNodes[j];
        if(pointcloud instanceof Potree.PointCloudOctree){
          node.sceneNode.material = originalMaterial;
        }else if(pointcloud instanceof Potree.PointCloudArena4D){
          node.material = originalMaterial;
        }
      }
    }

    if(scope.pointclouds.length > 0){
      { // EDL OCCLUSION PASS
        edlMaterial.uniforms.screenWidth.value = width;
        edlMaterial.uniforms.screenHeight.value = height;
        edlMaterial.uniforms.near.value = scope.camera.near;
        edlMaterial.uniforms.far.value = scope.camera.far;
        edlMaterial.uniforms.colorMap.value = rtColor;
        edlMaterial.uniforms.expScale.value = scope.camera.far;
        edlMaterial.uniforms.edlScale.value = scope.edlScale;
        edlMaterial.uniforms.radius.value = scope.edlRadius;
        edlMaterial.uniforms.opacity.value = scope.opacity;
        edlMaterial.depthTest = true;
        edlMaterial.depthWrite = true;
        edlMaterial.transparent = true;

        Potree.utils.screenPass.render(scope.renderer, edlMaterial);
      }

      // scope.renderer.render(scope.scene, scope.camera);

      scope.profileTool.render();
      scope.volumeTool.render();
      scope.renderer.clearDepth();
      scope.measuringTool.render();
      scope.transformationTool.render();
    }


  };
};
