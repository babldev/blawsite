var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var texture = THREE.ImageUtils.loadTexture('img/earth.jpg');

var geometry = new THREE.SphereGeometry(1, 32, 32 );
var material = new THREE.MeshBasicMaterial({map: texture});
var cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;
var render = function() {
  requestAnimationFrame(render);
  cube.rotation.x += 0.1;
  cube.rotation.y += 0.1;
  renderer.render(scene, camera);
};

render();
