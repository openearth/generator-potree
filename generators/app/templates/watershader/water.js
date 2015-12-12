Potree.Viewer.prototype.addWater = function () {
  //generate water plane GH
  var parameters = {
    width: 20,
    height: 20,
    widthSegments: 250,
    heightSegments: 250,
    depth: 1500,
    param: 4,
    filterparam: 1
  };

  this.sceneWater = new THREE.Scene();

  var light = new THREE.DirectionalLight(0xffffbb, 1);
  light.position.set(-1, 1, -1);
  this.sceneWater.add(light);
  var waterNormals = new THREE.ImageUtils.loadTexture('resources/watershader/waternormals.jpg');
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

  var water = new THREE.Water(this.renderer, this.camera, this.sceneWater, {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: waterNormals,
    alpha: 1.0,
    sunDirection: light.position.clone().normalize(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 50.0
  });

  var waveGeometry = new THREE.PlaneBufferGeometry(1, 1);

  var mirrorMesh = new THREE.Mesh(waveGeometry, water.material);
  mirrorMesh.add(water);
  mirrorMesh.rotation.x = this.referenceFrame.rotation.x;
  var boundingBox = this.getBoundingBox();
  mirrorMesh.scale.x = boundingBox.max.x;
  mirrorMesh.scale.y = boundingBox.max.y;
  this.sceneWater.add(mirrorMesh);
};
