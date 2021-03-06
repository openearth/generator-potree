Potree.Viewer = function(domElement, args){
  var scope = this;
  var arguments = args || {};
  var pointCloudLoadedCallback = arguments.onPointCloudLoaded || function(){};

  this.renderArea = domElement;

  this.annotations = [];
  this.fov = 60;
  this.pointSize = 1;
  this.opacity = 1;
  this.sizeType = "Fixed";
  this.pointSizeType = Potree.PointSizeType.FIXED;
  this.pointColorType = null;
  this.clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
  this.quality = "Squares";
  this.isFlipYZ = false;
  this.useDEMCollisions = false;
  this.minNodeSize = 100;
  this.directionalLight;
  this.edlScale = 1;
  this.edlRadius = 3;
  this.useEDL = false;
  this.minimumJumpDistance = 0.2;
  this.jumpDistance = null;
  this.intensityMax = null;
  this.heightMin = null;
  this.heightMax = null;
  this.moveSpeed = 10;

  this.showDebugInfos = false;
  this.showStats = true;
  this.showBoundingBox = false;
  this.freeze = false;

  this.fpControls;
  this.orbitControls;
  this.earthControls;
  this.geoControls;
  this.controls;

  this.progressBar = new ProgressBar();

  var gui;

  this.renderer;
  // instance used to render
  this.rendererInstance;
  this.camera;
  // this.scene;
  this.scenePointCloud;
  this.sceneBG;
  this.cameraBG;
  this.pointclouds = [];
  this.measuringTool;
  this.volumeTool;
  this.transformationTool;

  this.skybox;
  var stats;
  var clock = new THREE.Clock();
  this.showSkybox = false;
  this.referenceFrame;

  //------------------------------------------------------------------------------------
  // Viewer API
  //------------------------------------------------------------------------------------

  this.addPointCloud = function(path, callback){
    callback = callback || function(){};
    var initPointcloud = function(pointcloud){

      if(!scope.mapView){
        if(pointcloud.projection){
          scope.mapView = new Potree.Viewer.MapView(viewer);
          scope.mapView.init(viewer);
        }
      }

      scope.pointclouds.push(pointcloud);

      scope.referenceFrame.add(pointcloud);

      var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);

      scope.referenceFrame.updateMatrixWorld(true);

      if(sg.radius > 50*1000){
        scope.camera.near = 10;
      }else if(sg.radius > 10*1000){
        scope.camera.near = 2;
      }else if(sg.radius > 1000){
        scope.camera.near = 1;
      }else if(sg.radius > 100){
        scope.camera.near = 0.5;
      }else{
        scope.camera.near = 0.1;
      }

      if(scope.pointclouds.length === 1){
        scope.referenceFrame.position.sub(sg.center);
        scope.referenceFrame.updateMatrixWorld(true);
        var moveSpeed = sg.radius / 6;
        scope.setMoveSpeed(moveSpeed);
      }

      scope.zoomTo(pointcloud, 1);


      var hr = scope.getHeightRange();
      if(hr.min === null || hr.max === null){
        var bbWorld = scope.getBoundingBox();

        scope.setHeightRange(bbWorld.min.y, bbWorld.max.y);
      }

      scope.earthControls.pointclouds.push(pointcloud);


      if(scope.pointclouds.length === 1){
        scope.setNavigationMode("Orbit");
        scope.flipYZ();
        scope.zoomTo(pointcloud, 1);
      }



      scope.dispatchEvent({"type": "pointcloud_loaded", "pointcloud": pointcloud});

      callback(pointcloud);
    };
    this.addEventListener("pointcloud_loaded", pointCloudLoadedCallback);

    // load pointcloud
    if(!path){

    }else if(path.indexOf("cloud.js") > 0){

      Potree.POCLoader.load(path, function(geometry){
        pointcloud = new Potree.PointCloudOctree(geometry);

        initPointcloud(pointcloud);
      });
    }else if(path.indexOf(".vpc") > 0){
      Potree.PointCloudArena4DGeometry.load(path, function(geometry){
        pointcloud = new Potree.PointCloudArena4D(geometry);

        initPointcloud(pointcloud);
      });
    }
  };

  this.toLocal = (function(viewer){
    return function(position){
      var scenePos = position.clone().applyMatrix4(viewer.referenceFrame.matrixWorld);

      return scenePos;
    };
  })(this);


  this.toGeo = (function(viewer){
    return function(position){
      var inverse = new THREE.Matrix4().getInverse(viewer.referenceFrame.matrixWorld);
      var geoPos = position.clone().applyMatrix4(inverse);

      return geoPos;
    };
  })(this);

  this.getMinNodeSize = function(){
    return scope.minNodeSize;
  };

  this.setMinNodeSize = function(value){
    if(scope.minNodeSize !== value){
      scope.minNodeSize = value;
      scope.dispatchEvent({"type": "minnodesize_changed", "viewer": scope});
    }
  };

  this.setDescription = function(value){
    $('#potree_description')[0].innerHTML = value;
  };

  this.setNavigationMode = function(value){
    if(value === "Orbit"){
      scope.useOrbitControls();
    }else if(value === "Flight"){
      scope.useFPSControls();
    }else if(value === "Earth"){
      scope.useEarthControls();
    }

  };

  this.setShowBoundingBox = function(value){
    if(scope.showBoundingBox !== value){
      scope.showBoundingBox = value;
      scope.dispatchEvent({"type": "show_boundingbox_changed", "viewer": scope});
    }
  };

  this.getShowBoundingBox = function(){
    return scope.showBoundingBox;
  };

  this.setMoveSpeed = function(value){
    if(scope.moveSpeed !== value){
      scope.moveSpeed = value;
      scope.fpControls.movespeed = value;
      scope.geoControls.movespeed = value;
      scope.dispatchEvent({"type": "move_speed_changed", "viewer": scope, "speed": value});
    }
  };

  this.getMoveSpeed = function(){
    return scope.fpControls.moveSpeed;
  };

  this.setShowSkybox = function(value){
    if(scope.showSkybox !== value){
      scope.showSkybox = value;
      scope.dispatchEvent({"type": "show_skybox_changed", "viewer": scope});
    }
  };

  this.getShowSkybox = function(){
    return scope.showSkybox;
  };

  this.setHeightRange = function(min, max){
    if(scope.heightMin !== min || scope.heightMax !== max){
      scope.heightMin = min || scope.heightMin;
      scope.heightMax = max || scope.heightMax;
      scope.dispatchEvent({"type": "height_range_changed", "viewer": scope});
    }
  };

  this.getHeightRange = function(){
    return {min: scope.heightMin, max: scope.heightMax};
  };

  this.setIntensityMax = function(max){
    if(scope.intensityMax !== max){
      scope.intensityMax = max;
      scope.dispatchEvent({"type": "intensity_max_changed", "viewer": scope});
    }
  };

  this.getIntensityMax = function(){
    return scope.intensityMax;
  };

  this.setFreeze = function(value){
    if(scope.freeze != value){
      scope.freeze = value;
      scope.dispatchEvent({"type": "freeze_changed", "viewer": scope});
    }
  };

  this.getFreeze = function(){
    return scope.freeze;
  };

  this.setPointBudget = function(value){
    if(Potree.pointBudget != value){
      Potree.pointBudget = parseInt(value);
      scope.dispatchEvent({"type": "point_budget_changed", "viewer": scope});
    }
  };

  this.getPointBudget = function(){
    return Potree.pointBudget;
  };

  this.setClipMode = function(clipMode){
    if(scope.clipMode != clipMode){
      scope.clipMode = clipMode;
      scope.dispatchEvent({"type": "clip_mode_changed", "viewer": scope});
    }
  };

  this.getClipMode = function(){
    return scope.clipMode;
  };

  this.setDEMCollisionsEnabled = function(value){
    if(scope.useDEMCollisions !== value){
      scope.useDEMCollisions = value;
      scope.dispatchEvent({"type": "use_demcollisions_changed", "viewer": scope});
    };
  };

  this.getDEMCollisionsEnabled = function(){
    return scope.useDEMCollisions;
  };

  this.setEDLEnabled = function(value){
    if(scope.useEDL != value){
      scope.useEDL = value;
      scope.dispatchEvent({"type": "use_edl_changed", "viewer": scope});
    }
  };

  this.getEDLEnabled = function(){
    return scope.useEDL;
  };

  this.setEDLRadius = function(value){
    if(scope.edlRadius !== value){
      scope.edlRadius = value;
      scope.dispatchEvent({"type": "edl_radius_changed", "viewer": scope});
    }
  };

  this.getEDLRadius = function(){
    return scope.edlRadius;
  };

  this.setEDLStrength = function(value){
    if(scope.edlScale !== value){
      scope.edlScale = value;
      scope.dispatchEvent({"type": "edl_strength_changed", "viewer": scope});
    }
  };

  this.getEDLStrength = function(){
    return scope.edlScale;
  };

  this.setPointSize = function(value){
    if(scope.pointSize !== value){
      scope.pointSize = value;
      scope.dispatchEvent({"type": "point_size_changed", "viewer": scope});
    }
  };

  this.getPointSize = function(){
    return scope.pointSize;
  }

  this.setFOV = function(value){
    if(scope.fov !== value){
      scope.fov = value;
      scope.dispatchEvent({"type": "fov_changed", "viewer": scope});
    }
  };

  this.getFOV = function(){
    return scope.fov;
  };

  this.setOpacity = function(value){
    if(scope.opacity !== value){
      scope.opacity = value;
      scope.dispatchEvent({"type": "opacity_changed", "viewer": scope});
    }
  };

  this.getOpacity = function(){
    return scope.opacity;
  };

  this.setPointSizing = function(value){
    if(scope.sizeType !== value){
      scope.sizeType = value;
      if(value === "Fixed"){
        scope.pointSizeType = Potree.PointSizeType.FIXED;
      }else if(value === "Attenuated"){
        scope.pointSizeType = Potree.PointSizeType.ATTENUATED;
      }else if(value === "Adaptive"){
        scope.pointSizeType = Potree.PointSizeType.ADAPTIVE;
      }

      scope.dispatchEvent({"type": "point_sizing_changed", "viewer": scope});
    }
  };

  this.getPointSizing = function(){
    return scope.sizeType;
  };

  this.setQuality = function(value){
    var oldQuality = scope.quality;
    if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
      scope.quality = "Squares";
    }else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
      scope.quality = "Squares";
    }else{
      scope.quality = value;
    }

    if(oldQuality !== scope.quality){
      scope.dispatchEvent({"type": "quality_changed", "viewer": scope});
    }
  };

  this.getQuality = function(){
    return scope.quality;
  };

  this.setClassificationVisibility = function(key, value){
    var changed = false;
    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];
      var newClass = pointcloud.material.classification;
      var oldValue = newClass[key].w;
      newClass[key].w = value ? 1 : 0;

      if(oldValue !== newClass[key].w){
        changed = true;
      }

      pointcloud.material.classification = newClass;
    }

    if(changed){
      scope.dispatchEvent({"type": "classification_visibility_changed", "viewer": scope});
    }
  };

  this.setMaterial = function(value){
    if(this.material !== value){
      this.material = scope.toMaterialID(value);

      scope.dispatchEvent({"type": "material_changed", "viewer": scope});
    }
  };

  this.getMaterial = function(){
    return scope.pointColorType;
  };

  this.getMaterialName = function(){
    return scope.toMaterialName(scope.pointColorType);
  };

  this.toMaterialID = function(materialName){
    if(materialName === "RGB"){
      scope.pointColorType = Potree.PointColorType.RGB;
    }else if(materialName === "Color"){
      scope.pointColorType = Potree.PointColorType.COLOR;
    }else if(materialName === "Elevation"){
      scope.pointColorType = Potree.PointColorType.HEIGHT;
    }else if(materialName === "Intensity"){
      scope.pointColorType = Potree.PointColorType.INTENSITY;
    }else if(materialName === "Intensity Gradient"){
      scope.pointColorType = Potree.PointColorType.INTENSITY_GRADIENT;
    }else if(materialName === "Classification"){
      scope.pointColorType = Potree.PointColorType.CLASSIFICATION;
    }else if(materialName === "Return Number"){
      scope.pointColorType = Potree.PointColorType.RETURN_NUMBER;
    }else if(materialName === "Source"){
      scope.pointColorType = Potree.PointColorType.SOURCE;
    }else if(materialName === "Tree Depth"){
      scope.pointColorType = Potree.PointColorType.TREE_DEPTH;
    }else if(materialName === "Point Index"){
      scope.pointColorType = Potree.PointColorType.POINT_INDEX;
    }else if(materialName === "Normal"){
      scope.pointColorType = Potree.PointColorType.NORMAL;
    }else if(materialName === "Phong"){
      scope.pointColorType = Potree.PointColorType.PHONG;
    }
  };

  this.toMaterialName = function(materialID){
    if(materialID === Potree.PointColorType.RGB){
      return "RGB";
    }else if(materialID === Potree.PointColorType.COLOR){
      return "Color";
    }else if(materialID === Potree.PointColorType.HEIGHT){
      return "Elevation";
    }else if(materialID === Potree.PointColorType.INTENSITY){
      return "Intensity";
    }else if(materialID === Potree.PointColorType.INTENSITY_GRADIENT){
      return "Intensity Gradient";
    }else if(materialID === Potree.PointColorType.CLASSIFICATION){
      return "Classification";
    }else if(materialID === Potree.PointColorType.RETURN_NUMBER){
      return "Return Number";
    }else if(materialID === Potree.PointColorType.SOURCE){
      return "Source";
    }else if(materialID === Potree.PointColorType.TREE_DEPTH){
      return "Tree Depth";
    }else if(materialID === Potree.PointColorType.POINT_INDEX){
      return "Point Index";
    }else if(materialID === Potree.PointColorType.NORMAL){
      return "Normal";
    }else if(materialID === Potree.PointColorType.PHONG){
      return "Phong";
    }
  };

  this.zoomTo = function(node, factor){
    scope.camera.zoomTo(node, factor);

    var bs;
    if(node.boundingSphere){
      bs = node.boundingSphere;
    }else if(node.geometry && node.geometry.boundingSphere){
      bs = node.geometry.boundingSphere;
    }else{
      bs = node.boundingBox.getBoundingSphere();
    }

    bs = bs.clone().applyMatrix4(node.matrixWorld);

    scope.orbitControls.target.copy(bs.center);

    scope.dispatchEvent({"type": "zoom_to", "viewer": scope});
  };

  this.showAbout = function(){
    $(function() {
      $( "#about-panel" ).dialog();
    });
  };

  this.getBoundingBox = function(pointclouds){
    pointclouds = pointclouds || scope.pointclouds;

    var box = new THREE.Box3();

    scope.scenePointCloud.updateMatrixWorld(true);
    scope.referenceFrame.updateMatrixWorld(true);

    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];

      pointcloud.updateMatrixWorld(true);

      var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
      box.union(boxWorld);
    }

    return box;
  };

  this.getBoundingBoxGeo = function(pointclouds){
    pointclouds = pointclouds || scope.pointclouds;

    var box = new THREE.Box3();

    scope.scenePointCloud.updateMatrixWorld(true);
    scope.referenceFrame.updateMatrixWorld(true);

    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];

      pointcloud.updateMatrixWorld(true);

      var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrix)
      box.union(boxWorld);
    }

    return box;
  };

  this.fitToScreen = function(){
    var box = this.getBoundingBox(scope.pointclouds);

    if(scope.transformationTool.targets.length > 0){
      box = scope.transformationTool.getBoundingBox();
    }

    var node = new THREE.Object3D();
    node.boundingBox = box;

    //scope.camera.zoomTo(node, 1);
    scope.zoomTo(node, 1);
  };

  this.setTopView = function(){
    var box = this.getBoundingBox(scope.pointclouds);

    if(scope.transformationTool.targets.length > 0){
      box = scope.transformationTool.getBoundingBox();
    }

    var node = new THREE.Object3D();
    node.boundingBox = box;

    scope.camera.position.set(0, 1, 0);
    scope.camera.rotation.set(-Math.PI / 2, 0, 0);
    scope.camera.zoomTo(node, 1);
  };

  this.setFrontView = function(){
    var box = this.getBoundingBox(scope.pointclouds);

    if(scope.transformationTool.targets.length > 0){
      box = scope.transformationTool.getBoundingBox();
    }

    var node = new THREE.Object3D();
    node.boundingBox = box;

    scope.camera.position.set(0, 0, 1);
    scope.camera.rotation.set(0, 0, 0);
    scope.camera.zoomTo(node, 1);
  };

  this.setLeftView = function(){
    var box = this.getBoundingBox(scope.pointclouds);

    if(scope.transformationTool.targets.length > 0){
      box = scope.transformationTool.getBoundingBox();
    }

    var node = new THREE.Object3D();
    node.boundingBox = box;

    scope.camera.position.set(-1, 0, 0);
    scope.camera.rotation.set(0, -Math.PI / 2, 0);
    scope.camera.zoomTo(node, 1);
  };

  this.setRightView = function(){
    var box = this.getBoundingBox(scope.pointclouds);

    if(scope.transformationTool.targets.length > 0){
      box = scope.transformationTool.getBoundingBox();
    }

    var node = new THREE.Object3D();
    node.boundingBox = box;

    scope.camera.position.set(1, 0, 0);
    scope.camera.rotation.set(0, Math.PI / 2, 0);
    scope.camera.zoomTo(node, 1);
  };

  this.flipYZ = function(){
    scope.isFlipYZ = !scope.isFlipYZ;

    scope.referenceFrame.matrix.copy(new THREE.Matrix4());
    if(scope.isFlipYZ){
      scope.referenceFrame.applyMatrix(new THREE.Matrix4().set(
        1,0,0,0,
        0,0,1,0,
        0,-1,0,0,
        0,0,0,1
      ));

    }else{
      scope.referenceFrame.applyMatrix(new THREE.Matrix4().set(
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
      ));
    }

    scope.referenceFrame.updateMatrixWorld(true);
    var box = scope.getBoundingBox();
    scope.referenceFrame.position.copy(box.center()).multiplyScalar(-1);
    scope.referenceFrame.position.y = -box.min.y;
    scope.referenceFrame.updateMatrixWorld(true);

    scope.updateHeightRange();


  };

  this.updateHeightRange = function(){
    var bbWorld = scope.getBoundingBox();
    scope.setHeightRange(bbWorld.min.y, bbWorld.max.y);
  };

  this.useEarthControls = function(){
    if(scope.controls){
      scope.controls.enabled = false;
    }

    scope.controls = scope.earthControls;
    scope.controls.enabled = true;
  };

  this.useGeoControls = function(){
    if(scope.controls){
      scope.controls.enabled = false;
    }

    scope.controls = scope.geoControls;
    scope.controls.enabled = true;

    //scope.controls.moveSpeed = scope.pointclouds[0].boundingSphere.radius / 6;
  };

  this.useFPSControls = function(){
    if(scope.controls){
      scope.controls.enabled = false;
    }

    scope.controls = scope.fpControls;
    scope.controls.enabled = true;

    //scope.controls.moveSpeed = scope.pointclouds[0].boundingSphere.radius / 6;
  };

  this.useOrbitControls = function(){
    if(scope.controls){
      scope.controls.enabled = false;
    }

    scope.controls = scope.orbitControls;
    scope.controls.enabled = true;

    if(scope.pointclouds.length > 0){
      scope.controls.target.copy(scope.pointclouds[0].boundingSphere.center.clone().applyMatrix4(scope.pointclouds[0].matrixWorld));
    }
  };

  this.addAnnotation = function(position, args){
    var cameraPosition = args.cameraPosition;
    var cameraTarget = args.cameraTarget || position;
    var description = args.description || null;
    var title = args.title || null;

    var annotation = new Potree.Annotation(scope, {
      "position": position,
      "cameraPosition": cameraPosition,
      "cameraTarget": cameraTarget,
      "title": title,
      "description": description
    });

    scope.annotations.push(annotation);
    scope.renderArea.appendChild(annotation.domElement);

    scope.dispatchEvent({"type": "annotation_added", "viewer": scope});

    return annotation;
  }

  this.getAnnotations = function(){
    return scope.annotations;
  };

  //------------------------------------------------------------------------------------
  // Viewer Internals
  //------------------------------------------------------------------------------------

  this.toggleSidebar = function(){

    var renderArea = $('#potree_render_area');
    var sidebar = $('#potree_sidebar_container');
    var isVisible = renderArea.css("left") !== "0px";

    if(isVisible){
      renderArea.css("left", "0px");
    }else{
      renderArea.css("left", "300px");
    }
  };

  this.toggleMap = function(){
    var map = $('#potree_map');
    map.toggle(100);

  };

  this.loadGUI = function(){
    var sidebarContainer = $('#potree_sidebar_container');
    sidebarContainer.load("../src/viewer/sidebar.html");
    sidebarContainer.css("width", "300px");
    sidebarContainer.css("height", "100%");

    var elProfile = $('<div>').load("../src/viewer/profile.html", function(){
      $('#potree_render_area').append(elProfile.children());
      scope._2dprofile = new Potree.Viewer.Profile(scope, document.getElementById("profile_draw_container"));
    });

  };

  this.createControls = function(){

    var demCollisionHandler =  function(event){

      if(!scope.useDEMCollisions){
        return
      }

      var demHeight = null;

      for(var i = 0; i < scope.pointclouds.length; i++){
        var pointcloud = scope.pointclouds[i];
        pointcloud.generateDEM = true;

        var height = pointcloud.getDEMHeight(event.newPosition);

        if(demHeight){
          demHeight = Math.max(demHeight, height);
        }else{
          demHeight = height;
        }
      }

      if(event.newPosition.y < demHeight){
        event.objections++;
        var counterProposal = event.newPosition.clone();
        counterProposal.y = demHeight;
        event.counterProposals.push(counterProposal);
      }
    };

    { // create FIRST PERSON CONTROLS
      scope.fpControls = new THREE.FirstPersonControls(scope.camera, scope.renderer.domElement);
      scope.fpControls.enabled = false;
      scope.fpControls.addEventListener("proposeTransform", demCollisionHandler);
      scope.fpControls.addEventListener("move_speed_changed", function(event){
        scope.setMoveSpeed(scope.fpControls.moveSpeed);
      });
    }

    { // create GEO CONTROLS
      scope.geoControls = new Potree.GeoControls(scope.camera, scope.renderer.domElement);
      scope.geoControls.enabled = false;
      scope.geoControls.addEventListener("proposeTransform", demCollisionHandler);
      scope.geoControls.addEventListener("move_speed_changed", function(event){
        scope.setMoveSpeed(scope.geoControls.moveSpeed);
      });
    }

    { // create ORBIT CONTROLS
      scope.orbitControls = new Potree.OrbitControls(scope.camera, scope.renderer.domElement);
      scope.orbitControls.enabled = false;
      scope.orbitControls.addEventListener("proposeTransform", demCollisionHandler);
      scope.renderArea.addEventListener("dblclick", function(event){
        if(scope.pointclouds.length === 0){
          return;
        }

        event.preventDefault();

        var rect = scope.renderArea.getBoundingClientRect();

        var mouse =  {
          x: ( (event.clientX - rect.left) / scope.renderArea.clientWidth ) * 2 - 1,
          y: - ( (event.clientY - rect.top) / scope.renderArea.clientHeight ) * 2 + 1
        };

        var pointcloud = null;
        var distance = Number.POSITIVE_INFINITY;
        var I = null;

        for(var i = 0; i < scope.pointclouds.length; i++){
          intersection = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, [scope.pointclouds[i]]);
          if(!intersection){
            continue;
          }

          var tDist = scope.camera.position.distanceTo(intersection);
          if(tDist < distance){
            pointcloud = scope.pointclouds[i];
            distance = tDist;
            I = intersection;
          }
        }

        if(I !== null){

          var targetRadius = 0;
          if(!scope.jumpDistance){
            var camTargetDistance = scope.camera.position.distanceTo(scope.orbitControls.target);

            var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
            vector.unproject(scope.camera);

            var direction = vector.sub(scope.camera.position).normalize();
            var ray = new THREE.Ray(scope.camera.position, direction);

            var nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
            var lastNode = nodes[nodes.length - 1];
            var radius = lastNode.boundingSphere.radius;
            var targetRadius = Math.min(camTargetDistance, radius);
            var targetRadius = Math.max(scope.minimumJumpDistance, targetRadius);
          }else{
            targetRadius = scope.jumpDistance;
          }

          var d = scope.camera.getWorldDirection().multiplyScalar(-1);
          var cameraTargetPosition = new THREE.Vector3().addVectors(I, d.multiplyScalar(targetRadius));
          var controlsTargetPosition = I;

          var animationDuration = 600;

          var easing = TWEEN.Easing.Quartic.Out;

          scope.controls.enabled = false;

          // animate position
          var tween = new TWEEN.Tween(scope.camera.position).to(cameraTargetPosition, animationDuration);
          tween.easing(easing);
          tween.start();

          // animate target
          var tween = new TWEEN.Tween(scope.orbitControls.target).to(I, animationDuration);
          tween.easing(easing);
          tween.onComplete(function(){
            scope.controls.enabled = true;
            scope.fpControls.moveSpeed = radius / 2;
            scope.geoControls.moveSpeed = radius / 2;
          });
          tween.start();
        }
      });
    }

    { // create EARTH CONTROLS
      scope.earthControls = new THREE.EarthControls(scope.camera, scope.renderer, scope.scenePointCloud);
      scope.earthControls.enabled = false;
      scope.earthControls.addEventListener("proposeTransform", demCollisionHandler);
    }
  };


  this.initThree = function(){
    var width = scope.renderArea.clientWidth;
    var height = scope.renderArea.clientHeight;
    var aspect = width / height;
    var near = 0.1;
    var far = 1000*1000;

    // scope.scene = new THREE.Scene();
    scope.scenePointCloud = new THREE.Scene();
    scope.sceneBG = new THREE.Scene();

    scope.camera = new THREE.PerspectiveCamera(scope.fov, aspect, near, far);
    //camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 100000);
    scope.cameraBG = new THREE.Camera();
    scope.camera.rotation.order = 'ZYX';

    scope.referenceFrame = new THREE.Object3D();
    scope.scenePointCloud.add(scope.referenceFrame);

    scope.renderer = new THREE.WebGLRenderer();
    scope.renderer.setSize(width, height);
    scope.renderer.autoClear = false;
    scope.renderArea.appendChild(scope.renderer.domElement);
    scope.renderer.domElement.tabIndex = "2222";
    scope.renderer.domElement.addEventListener("mousedown", function(){scope.renderer.domElement.focus();});
    scope.rendererInstance = new PotreeRenderer(scope);

    this.skybox = Potree.utils.loadSkybox("../resources/textures/skybox/");

    // camera and controls
    scope.camera.position.set(-304, 372, 318);
    scope.camera.rotation.y = -Math.PI / 4;
    scope.camera.rotation.x = -Math.PI / 6;

    this.createControls();

    //scope.useEarthControls();

    // enable frag_depth extension for the interpolation shader, if available
    scope.renderer.context.getExtension("EXT_frag_depth");

    //this.addPointCloud(pointcloudPath);

    var grid = Potree.utils.createGrid(5, 5, 2);
    // scope.scene.add(grid);

    scope.measuringTool = new Potree.MeasuringTool(scope.scenePointCloud, scope.camera, scope.renderer, scope.toGeo);
    scope.profileTool = new Potree.ProfileTool(scope.scenePointCloud, scope.camera, scope.renderer);
    scope.transformationTool = new Potree.TransformationTool(scope.scenePointCloud, scope.camera, scope.renderer);
    scope.volumeTool = new Potree.VolumeTool(scope.scenePointCloud, scope.camera, scope.renderer, scope.transformationTool);

    scope.profileTool.addEventListener("profile_added", function(profileEvent){

      var profileButton = document.createElement("button");
      profileButton.type = "button";
      profileButton.classList.add("btn");
      profileButton.classList.add("btn-primary");
      profileButton.id = "btn_rofile_" + scope.profileTool.profiles.length;
      profileButton.value = "profile " + scope.profileTool.profiles.length;
      profileButton.innerHTML = "profile " + scope.profileTool.profiles.length;

      profileButton.onclick = function(clickEvent){
        scope.profileTool.draw(
          profileEvent.profile,
          $("#profile_draw_container")[0],
          scope.toGeo);
        profileEvent.profile.addEventListener("marker_moved", function(){
          scope.profileTool.draw(
            profileEvent.profile,
            $("#profile_draw_container")[0],
            scope.toGeo);
        });
        profileEvent.profile.addEventListener("width_changed", function(){
          scope.profileTool.draw(
            profileEvent.profile,
            $("#profile_draw_container")[0],
            scope.toGeo);
        });
      };
    });


    // background
    var texture = Potree.utils.createBackgroundTexture(512, 512);

    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;

    var bg = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(2, 2, 0),
      new THREE.MeshBasicMaterial({
        map: texture
      })
    );
    //bg.position.z = -1;
    bg.material.depthTest = false;
    bg.material.depthWrite = false;
    scope.sceneBG.add(bg);

    window.addEventListener( 'keydown', onKeyDown, false );

    scope.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    scope.directionalLight.position.set( 10, 10, 10 );
    scope.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
    scope.scenePointCloud.add( scope.directionalLight );

    var light = new THREE.AmbientLight( 0x555555 ); // soft white light
    scope.scenePointCloud.add( light );

  };

  function onKeyDown(event){
    //console.log(event.keyCode);

    if(event.keyCode === 69){
      // e pressed

      scope.transformationTool.translate();
    }else if(event.keyCode === 82){
      // r pressed

      scope.transformationTool.scale();
    }else if(event.keyCode === 84){
      // r pressed

      scope.transformationTool.rotate();
    }
  };

  this.update = function(delta, timestamp){
    Potree.pointLoadLimit = Potree.pointBudget * 2;

    scope.directionalLight.position.copy(scope.camera.position);
    scope.directionalLight.lookAt(new THREE.Vector3().addVectors(scope.camera.position, scope.camera.getWorldDirection()));

    var visibleNodes = 0;
    var visiblePoints = 0;
    var progress = 0;

    for(var i = 0; i < scope.pointclouds.length; i++){
      var pointcloud = scope.pointclouds[i];
      var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);

      if(!scope.intensityMax){
        var root = pointcloud.pcoGeometry.root;
        if(root != null && root.loaded){
          var attributes = pointcloud.pcoGeometry.root.geometry.attributes;
          if(attributes.intensity){
            var array = attributes.intensity.array;
            var max = 0;
            for(var i = 0; i < array.length; i++){
              max = Math.max(array[i]);
            }

            if(max <= 1){
              scope.intensityMax = 1;
            }else if(max <= 256){
              scope.intensityMax = 255;
            }else{
              scope.intensityMax = max;
            }
          }
        }
      }

      pointcloud.material.clipMode = scope.clipMode;
      pointcloud.material.heightMin = scope.heightMin;
      pointcloud.material.heightMax = scope.heightMax;
      pointcloud.material.intensityMin = 0;
      pointcloud.material.intensityMax = scope.intensityMax;
      pointcloud.showBoundingBox = scope.showBoundingBox;
      pointcloud.generateDEM = scope.useDEMCollisions;
      pointcloud.minimumNodePixelSize = scope.minNodeSize;

      visibleNodes += pointcloud.numVisibleNodes;
      visiblePoints += pointcloud.numVisiblePoints;

      progress += pointcloud.progress;
    }

    if(!scope.freeze){
      var result = Potree.updatePointClouds(scope.pointclouds, scope.camera, scope.renderer);
      visibleNodes = result.visibleNodes.length;
      visiblePoints = result.numVisiblePoints;
    }


    scope.camera.fov = scope.fov;

    if(scope.controls){
      scope.controls.update(delta);
    }

    // update progress bar
    if(scope.pointclouds.length > 0){
      scope.progressBar.progress = progress / scope.pointclouds.length;

      var message;
      if(progress === 0){
        message = "loading";
      }else{
        message = "loading: " + parseInt(progress*100 / scope.pointclouds.length) + "%";
      }
      scope.progressBar.message = message;

      if(progress >= 0.999){
        scope.progressBar.hide();
      }else if(progress < 1){
        scope.progressBar.show();
      }
    }

    scope.volumeTool.update();
    scope.transformationTool.update();
    scope.profileTool.update();


    var clipBoxes = [];

    for(var i = 0; i < scope.profileTool.profiles.length; i++){
      var profile = scope.profileTool.profiles[i];

      for(var j = 0; j < profile.boxes.length; j++){
        var box = profile.boxes[j];
        box.updateMatrixWorld();
        var boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
        clipBoxes.push(boxInverse);
      }
    }

    for(var i = 0; i < scope.volumeTool.volumes.length; i++){
      var volume = scope.volumeTool.volumes[i];

      if(volume.clip){
        volume.updateMatrixWorld();
        var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);

        clipBoxes.push(boxInverse);
      }
    }


    for(var i = 0; i < scope.pointclouds.length; i++){
      scope.pointclouds[i].material.setClipBoxes(clipBoxes);
    }

    {// update annotations
      var distances = [];
      for(var i = 0; i < scope.annotations.length; i++){
        var ann = scope.annotations[i];
        var screenPos = ann.position.clone().project(scope.camera);

        screenPos.x = scope.renderArea.clientWidth * (screenPos.x + 1) / 2;
        screenPos.y = scope.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);

        ann.domElement.style.left = Math.floor(screenPos.x - ann.domElement.clientWidth / 2) + "px";
        ann.domElement.style.top = Math.floor(screenPos.y) + "px";

        //ann.domDescription.style.left = screenPos.x - ann.domDescription.clientWidth / 2 + 10;
        //ann.domDescription.style.top = screenPos.y + 30;

        distances.push({annotation: ann, distance: screenPos.z});

        if(-1 > screenPos.z || screenPos.z > 1){
          ann.domElement.style.display = "none";
        }else{
          ann.domElement.style.display = "initial";
        }
      }
      distances.sort(function(a,b){return b.distance - a.distance});
      for(var i = 0; i < distances.length; i++){
        var ann = distances[i].annotation;
        ann.domElement.style.zIndex = "" + i;
        if(ann.descriptionVisible){
          ann.domElement.style.zIndex += 100;
        }
      }
    }

    if(scope.showDebugInfos){
      scope.infos.set("camera.position", "camera.position: " +
                      viewer.camera.position.x.toFixed(2)
                      + ", " + viewer.camera.position.y.toFixed(2)
                      + ", " + viewer.camera.position.z.toFixed(2)
                     );
    }

    if(scope.mapView){
      scope.mapView.update(delta, scope.camera);
    }

    TWEEN.update(timestamp);

    scope.dispatchEvent({"type": "update", "delta": delta, "timestamp": timestamp});
  }


  scope.initThree();
  // set defaults
  scope.setPointSize(1);
  scope.setFOV(60);
  scope.setOpacity(1);
  scope.setEDLEnabled(false);
  scope.setEDLRadius(2);
  scope.setEDLStrength(1);
  scope.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
  scope.setPointBudget(1*1000*1000);
  scope.setShowBoundingBox(false);
  scope.setFreeze(false);
  scope.setNavigationMode("Orbit");


  function loop(timestamp) {
    requestAnimationFrame(loop.bind(this));
    this.update(clock.getDelta(), timestamp);

    //------------------------------------------------------------------------------------
    // Renderers
    //------------------------------------------------------------------------------------
    // update the renderer if needed
    if(this.useEDL && Potree.Features.SHADER_EDL.isSupported()){
      if(!this.rendererInstance.name !== 'edl'){
        this.rendererInstance  = new EDLRenderer(this);
      }
    }else if(this.quality === "Splats"){
      if(!this.rendererInstance.name !== 'highquality'){
        this.rendererInstance = new HighQualityRenderer(this);
      }
    } else {
      this.rendererInstance = new PotreeRenderer(this);
    }
    this.rendererInstance.render(scope);
  }

  // start rendering!
  requestAnimationFrame(loop.bind(this));
};

Potree.Viewer.prototype = Object.create( THREE.EventDispatcher.prototype );
