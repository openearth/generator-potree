// high quality rendering using splats

var HighQualityRenderer = function(scope){

  this.name = 'highquality';
  var depthMaterial = null;
  var attributeMaterial = null;
  var normalizationMaterial = null;

  var rtDepth;
  var rtNormalize;

  var initHQSPlats = function(){
    if(depthMaterial != null){
      return;
    }

    depthMaterial = new Potree.PointCloudMaterial();
    attributeMaterial = new Potree.PointCloudMaterial();

    depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
    depthMaterial.pointShape = Potree.PointShape.CIRCLE;
    depthMaterial.interpolate = false;
    depthMaterial.weighted = false;
    depthMaterial.minSize = 2;

    attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
    attributeMaterial.interpolate = false;
    attributeMaterial.weighted = true;
    attributeMaterial.minSize = 2;

    rtDepth = new THREE.WebGLRenderTarget( 1024, 1024, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    } );

    rtNormalize = new THREE.WebGLRenderTarget( 1024, 1024, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    } );

    var uniformsNormalize = {
      depthMap: { type: "t", value: rtDepth },
      texture: { type: "t", value: rtNormalize }
    };

    normalizationMaterial = new THREE.ShaderMaterial({
      uniforms: uniformsNormalize,
      vertexShader: Potree.Shaders["normalize.vs"],
      fragmentShader: Potree.Shaders["normalize.fs"]
    });
  }

  var resize = function(width, height){
    if(rtDepth.width == width && rtDepth.height == height){
      return;
    }

    rtDepth.dispose();
    rtNormalize.dispose();

    scope.camera.aspect = width / height;
    scope.camera.updateProjectionMatrix();

    scope.renderer.setSize(width, height);
    rtDepth.setSize(width, height);
    rtNormalize.setSize(width, height);
  };

  // render with splats
  this.render = function(scope){
    var renderer = scope.renderer;
    var width = scope.renderArea.clientWidth;
    var height = scope.renderArea.clientHeight;

    initHQSPlats();

    resize(width, height);


    scope.renderer.clear();
    if(scope.showSkybox){
      skybox.camera.rotation.copy(scope.camera.rotation);
      scope.renderer.render(skybox.scene, skybox.camera);
    }else{
      scope.renderer.render(scope.sceneBG, scope.cameraBG);
    }
    scope.renderer.render(scope.scene, scope.camera);

    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];

      depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
      attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;

      var originalMaterial = pointcloud.material;

      {// DEPTH PASS
        depthMaterial.size = scope.pointSize;
        depthMaterial.pointSizeType = scope.pointSizeType;
        depthMaterial.screenWidth = width;
        depthMaterial.screenHeight = height;
        depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
        depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
        depthMaterial.fov = scope.camera.fov * (Math.PI / 180);
        depthMaterial.spacing = pointcloud.pcoGeometry.spacing;
        depthMaterial.near = scope.camera.near;
        depthMaterial.far = scope.camera.far;
        depthMaterial.heightMin = scope.heightMin;
        depthMaterial.heightMax = scope.heightMax;
        depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
        depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
        depthMaterial.bbSize = pointcloud.material.bbSize;
        depthMaterial.treeType = pointcloud.material.treeType;
        depthMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;

        scope.scenePointCloud.overrideMaterial = depthMaterial;
        scope.renderer.clearTarget( rtDepth, true, true, true );
        scope.renderer.render(scope.scenePointCloud, scope.camera, rtDepth);
        scope.scenePointCloud.overrideMaterial = null;
      }

      {// ATTRIBUTE PASS
        attributeMaterial.size = scope.pointSize;
        attributeMaterial.pointSizeType = scope.pointSizeType;
        attributeMaterial.screenWidth = width;
        attributeMaterial.screenHeight = height;
        attributeMaterial.pointColorType = scope.pointColorType;
        attributeMaterial.depthMap = rtDepth;
        attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
        attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
        attributeMaterial.fov = scope.camera.fov * (Math.PI / 180);
        attributeMaterial.uniforms.blendHardness.value = pointcloud.material.uniforms.blendHardness.value;
        attributeMaterial.uniforms.blendDepthSupplement.value = pointcloud.material.uniforms.blendDepthSupplement.value;
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

        scope.scenePointCloud.overrideMaterial = attributeMaterial;
        scope.renderer.clearTarget( rtNormalize, true, true, true );
        scope.renderer.render(scope.scenePointCloud, scope.camera, rtNormalize);
        scope.scenePointCloud.overrideMaterial = null;

        pointcloud.material = originalMaterial;
      }
    }

    if(scope.pointclouds.length > 0){
      {// NORMALIZATION PASS
        normalizationMaterial.uniforms.depthMap.value = rtDepth;
        normalizationMaterial.uniforms.texture.value = rtNormalize;
        Potree.utils.screenPass.render(scope.renderer, normalizationMaterial);
      }

      scope.volumeTool.render();
      scope.renderer.clearDepth();
      scope.profileTool.render();
      scope.measuringTool.render();
      scope.transformationTool.render();
    }

  }
};
