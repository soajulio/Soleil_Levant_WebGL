import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let container, stats;
let camera, scene, renderer;
let controls, water, sun;

init();

function init() {

    container = document.getElementById('container');

    // Creation/Gestion renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setAnimationLoop(animate);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    container.appendChild(renderer.domElement);

    // Creation de la scène
    scene = new THREE.Scene();

    // Creation du brouillard
    scene.fog = new THREE.FogExp2(0xAAAAAA, 0.0025); 

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(30, 30, 100);

    // Creation de la lumière
    sun = new THREE.Vector3();

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Creation de l'eau
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffff99,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    // Skybox
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 0,
        azimuth: 180
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sceneEnv = new THREE.Scene();

    let renderTarget;

    function updateSun() {
        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        if (renderTarget !== undefined) renderTarget.dispose();

        sceneEnv.add(sky);
        renderTarget = pmremGenerator.fromScene(sceneEnv);
        scene.add(sky);

        scene.environment = renderTarget.texture;
    }

    updateSun();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 10, 0);
    controls.minDistance = 40.0;
    controls.maxDistance = 200.0;
    controls.update();

    // Creation des Stats (FPS)
    stats = new Stats();
    container.appendChild(stats.dom);

    // Creation du GUI
    const gui = new GUI();

    const folderSky = gui.addFolder('Sky');
    folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
    folderSky.add(parameters, 'azimuth', -180, 180, 0.1).onChange(updateSun);
    folderSky.open();

    const waterUniforms = water.material.uniforms;
    const waterUniformsTime = water.material.uniforms['time'];

    const folderWater = gui.addFolder('Water');
    folderWater.add(waterUniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
    folderWater.add(waterUniformsTime, 'value', 0, 100, 0.1).name('time');
    folderWater.add(waterUniforms.size, 'value', 0.1, 10, 0.1).name('size');
    folderWater.open();

    const fogUniforms = scene.fog;
    const folderFog = gui.addFolder('Fog');
    folderFog.add(fogUniforms, 'density', 0, 0.06, 0.00025).name('density');
    folderFog.open();

    // Loader pour les fichiers GLTF
    const loader = new GLTFLoader();

    const shipPath = 'models/ship.glb';
    loader.load(shipPath, function (gltf) {
        const ship = gltf.scene;

        // Positionnement
        ship.position.set(0, 0, -400);

        // Rotation
        ship.rotation.y = Math.PI / 2;

        // Redimension
        ship.scale.set(10, 10, 10);

        scene.add(ship);
    }, undefined, function (error) {
        console.error('An error happened during the model ship loading:', error);
    });

    const CoastPath = 'models/coast.glb'; 
    loader.load(CoastPath, function (gltf) {
        const coast = gltf.scene;

        // Positionnement
        coast.position.set(700, 0, -550);

        // Redimension
        coast.scale.set(20, 20, 20);
        
        scene.add(coast);
    }, undefined, function (error) {
        console.error('An error happened during the model coast loading:', error);
    });

    const PierPath = 'models/pier.glb';
    loader.load(PierPath, function (gltf) {
        const pier = gltf.scene;

        // Positionnement
        pier.position.set(400, 0, -500);

        // Redimension
        pier.scale.set(10, 10, 10);

        // Rotation
        pier.rotation.y = Math.PI - 0.7;

        scene.add(pier);
    }, undefined, function (error) {
        console.error('An error happened during the model pier loading:', error);
    });

    const lowBoatPath = 'models/low_boat.glb';
    loader.load(lowBoatPath, function (gltf) {
        const lowBoat = gltf.scene;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('textures/wood.jpg', function (texture) {
            lowBoat.traverse(function (child) {
                if (child.isMesh) {
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                }
            });
        });
        // Positionnement
        lowBoat.position.set(0, 0, 0); 

        // Rotation
        lowBoat.rotation.y = Math.PI;

        // Rotation axe x
        lowBoat.rotation.x = 0.03;

        scene.add(lowBoat);
    }, undefined, function (error) {
        console.error('An error happened during the model low boat loading:', error);
    });

    const menPath = 'models/men.glb';

    loader.load(menPath, function (gltf) {
        const men = gltf.scene;

        // Positionnement
        men.position.set(6, 0, -3);

        // Redimension
        men.scale.set(3, 3, 3);

        // Rotation
        men.rotation.y = Math.PI;

        scene.add(men);
    }, undefined, function (error) {
        console.error('An error happened', error);

    });

    loader.load(shipPath, function (gltf) {
        const ship2 = gltf.scene;

        // Positionnement
        ship2.position.set(-400, 0, -600);

        // Rotation
        ship2.rotation.y = (Math.PI / 2) + 5;

        // Redimension
        ship2.scale.set(10, 10, 10);

        scene.add(ship2);
    }, undefined, function (error) {
        console.error('An error happened during the model ship loading:', error);
    });

    const rockPath = 'models/rock.glb';
    loader.load(rockPath, function (gltf) {
        const rock = gltf.scene;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('textures/rock.jpg', function (texture) {
            rock.traverse(function (child) {
                if (child.isMesh) {
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                }
            });
        });
        // Positionnement
        rock.position.set(-50, 0, -50);

        // Redimension
        rock.scale.set(10, 10, 10);

        scene.add(rock);
    }, undefined, function (error) {
        console.error('An error happened during the model rock loading:', error);
    }); 

    // Gestion taille fenetre
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    render();
    stats.update();
}

function render() {
    const time = performance.now() * 0.001;
    water.material.uniforms['time'].value += 0.1 / 60.0;
    renderer.render(scene, camera);
}