var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(10, window.innerWidth/window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer({antialiasing: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var earthTexture = THREE.ImageUtils.loadTexture('img/earth.jpg');
var spaceTexture = THREE.ImageUtils.loadTexture('img/space.jpg');
spaceTexture.minFilter = THREE.LinearFilter;

var bg = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(2, 2, 0),
  new THREE.MeshBasicMaterial({map: spaceTexture})
);

// The bg plane shouldn't care about the z-buffer.
bg.material.depthTest = false;
bg.material.depthWrite = false;

var bgScene = new THREE.Scene();
var bgCam = new THREE.Camera();
bgScene.add(bgCam);
bgScene.add(bg);

var geometry = new THREE.SphereGeometry(1, 128, 128);
var material = new THREE.MeshLambertMaterial({map: earthTexture});
var earth = new THREE.Mesh(geometry, material);
earth.rotation.x = 1.0;
earth.position.x -= 1.0;
scene.add(earth);

var light = new THREE.PointLight( 0xffffff, 1, 1000000 );
light.position.set( 1000, 1000, 23490 );
scene.add( light );

// camera.position.y = 1.0;
camera.position.z = 10.0;
camera.rotation.z = 3.14/2*3;
var render = function() {
  requestAnimationFrame(render);

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(bgScene, bgCam);

  camera.position.z += 0.001;
  earth.rotation.y += 0.0002;
  renderer.render(scene, camera);
};

render();
