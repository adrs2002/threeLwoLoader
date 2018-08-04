# THREE.lwoFileLoader
====
# Overview
LWO file(LightWave 3D file) loader for three.js.

## Demo

please look this [demo][] 

[demo]: http://adrs2002.com/sandbox/lwoLoader/lwoTest.html      "Demo"

## Requirement
THREE.js
##how to use　使い方的な。

0. read 2 .js file , 'three.js(three.min.js)', and 'lwoLoader.js' your HTML file.

1.  Declaration  THREE.JS Load Manager, and TextureLoader.  
 like this  
  
        manager = new THREE.LoadingManager();
        var onProgress = function (xhr) {
            if (xhr.lengthComputable) {
                var percentComplete = xhr.loaded / xhr.total * 100;
                console.log(Math.round(percentComplete, 2) + '% downloaded');
            }
        };
        var onError = function (xhr) {
        };

        Texloader = new THREE.TextureLoader();

2. Declaration lwoLoader

        var loader = new THREE.lwoLoader(manager, Texloader);

3. load from URL

        loader.load(['lwo Data URL', true, true], function (object) {
            for (var i = 0; i < object.objects.length; i++) {
                Models.push(object.objects[i]);
                scene.add(Models[i]);
            }
            object = null;
        }, onProgress, onError);


---------------------------------
## LICENCE
 MIT.