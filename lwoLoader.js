var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var bReader = function () {
    function bReader(buffer) {
        classCallCheck(this, bReader);

        this.dv = new DataView(buffer);
    }

    createClass(bReader, [{
        key: "getString",
        value: function getString(offset, len) {
            var result = "";
            for (var i = offset; i < offset + len; i++) {
                result += String.fromCharCode(this.getUint8(i));
            }
            return result;
        }
    }, {
        key: "getUint8",
        value: function getUint8(offset) {
            return this.dv.getUint8(offset, false);
        }
    }, {
        key: "getUint16",
        value: function getUint16(offset) {
            return this.dv.getUint16(offset, false);
        }
    }, {
        key: "getUint32",
        value: function getUint32(offset) {
            return this.dv.getUint32(offset, false);
        }
    }, {
        key: "getInt16",
        value: function getInt16(offset) {
            return this.dv.getInt16(offset, false);
        }
    }, {
        key: "getInt32",
        value: function getInt32(offset) {
            return this.dv.getInt32(offset, false);
        }
    }, {
        key: "getFloat32",
        value: function getFloat32(offset) {
            return this.dv.getFloat32(offset, false);
        }
    }, {
        key: "getUint8Array",
        value: function getUint8Array(offset, len) {
            var arr = new Uint8Array(len);
            var pos = 0;
            for (var i = offset; i < offset + len; i++) {
                arr[pos] = this.getUint8(i);
                pos++;
            }
            return arr;
        }
    }, {
        key: "getUint16Array",
        value: function getUint16Array(offset, len) {
            var arr = new Uint16Array(len / 2);
            var pos = 0;
            for (var i = offset; i < offset + len * 4; i += 4) {
                arr[pos] = this.getUint16(i);
                pos++;
            }
            return arr;
        }
    }, {
        key: "getFloat32Array",
        value: function getFloat32Array(offset, len) {
            var arr = new Float32Array(len);
            var pos = 0;
            for (var i = offset; i < offset + len; i++) {
                arr[pos] = this.getFloat32(i);
                pos++;
            }
            return arr;
        }
    }, {
        key: "getBufferLength",
        value: function getBufferLength() {
            return buffer.byteLength;
        }
    }]);
    return bReader;
}();

var layerData = function () {
    function layerData() {
        classCallCheck(this, layerData);

        this.name = "";
        this.index = 0;
        this.parent = -1;
        this.vertexes = [];
        this.indexes = [];
        this.Geometry = new THREE.Geometry();
        this.pivotPos = null;
    }

    createClass(layerData, [{
        key: "init",
        value: function init(_data) {}
    }]);
    return layerData;
}();

var lwoFormData = function lwoFormData() {
    classCallCheck(this, lwoFormData);

    this.Layers = [];
    this.nowIndex = 0;
    this.Surfaces = [];
};

var lwoFileLoadMode$1 = lwoFileLoadMode = {
    none: 0,
    seachChunk: 1,
    readData: 5,
    readVertex: 11,
    readVertexIndex: 21
};

THREE.lwoLoader = function () {
    function lwoLoader(manager, Texloader, _zflg) {
        classCallCheck(this, lwoLoader);

        this.manager = manager !== undefined ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = Texloader !== undefined ? Texloader : new THREE.TextureLoader();
        this.zflg = _zflg === undefined ? false : _zflg;
        this.url = "";
        this.baseDir = "";
        this.nowReadMode = lwoFileLoadMode$1.none;
        this.readOffset = 0;
        this.tgtLength = 0;
        this.nowReaded = 0;
        this.elementLv = 0;
        this.matReadLine = 0;
        this.putMatLength = 0;
        this.nowMat = null;
        this.readingChank = "";
        this.nowLayerData = null;
        this.tmpUvArray = [];
        this.normalVectors = [];
        this.facesNormal = [];
        this.nowTagName = "";
        this.frameHierarchie = [];
        this.geometry = null;
        this.lwoData = null;
        this.lines = null;
        this.reader = null;
        this.face_size = 0;
        this.bReader = null;
        this.onLoad = null;
    }

    createClass(lwoLoader, [{
        key: 'load',
        value: function load(_arg, onLoad, onProgress, onError) {
            var _this = this;

            var loader = new THREE.FileLoader(this.manager);
            loader.setResponseType('arraybuffer');
            for (var i = 0; i < _arg.length; i++) {
                switch (i) {
                    case 0:
                        this.url = _arg[i];break;
                    case 1:
                        this.zflg = _arg[i];break;
                }
            }
            loader.load(this.url, function (response) {
                _this.parse(response, onLoad);
            }, onProgress, onError);
        }
    }, {
        key: 'isBinary',
        value: function isBinary(binData) {
            this.reader = new DataView(binData);
            this.face_size = 32 / 8 * 3 + 32 / 8 * 3 * 3 + 16 / 8;
            var n_faces = reader.getUint32(80, true);
            var expect = 80 + 32 / 8 + n_faces * face_size;
            if (expect === reader.byteLength) {
                return true;
            }
            var fileLength = reader.byteLength;
            for (var index = 0; index < fileLength; index++) {
                if (reader.getUint8(index, false) > 127) {
                    return true;
                }
            }
            return false;
        }
    }, {
        key: 'ensureBinary',
        value: function ensureBinary(buf) {
            if (typeof buf === "string") {
                var array_buffer = new Uint8Array(buf.length);
                for (var i = 0; i < buf.length; i++) {
                    array_buffer[i] = buf.charCodeAt(i) & 0xff;
                }
                return array_buffer.buffer || array_buffer;
            } else {
                return buf;
            }
        }
    }, {
        key: 'ensureString',
        value: function ensureString(buf) {
            if (typeof buf !== "string") {
                var array_buffer = new Uint8Array(buf);
                var str = '';
                for (var i = 0; i < buf.byteLength; i++) {
                    str += String.fromCharCode(array_buffer[i]);
                }
                return str;
            } else {
                return buf;
            }
        }
    }, {
        key: 'parse',
        value: function parse(data, onLoad) {
            this.onLoad = onLoad;
            return this.parseBinary(data);
        }
    }, {
        key: 'parseBinary',
        value: function parseBinary(data) {
            var baseDir = "";
            if (this.url.lastIndexOf("/") > 0) {
                this.baseDir = this.url.substr(0, this.url.lastIndexOf("/") + 1);
            }
            this.lwoData = {};
            this.lwoData.objects = [];
            this.bReader = new bReader(data);
            this.readOffset = 0;
            var str = this.bReader.getString(this.readOffset, 4);
            this.readOffset += 4;
            if (str !== "FORM") {
                console.log("FORM String not found");
                this.finalproc();
            } else {
                this.lwoData.fileLength = this.bReader.getUint32(this.readOffset);
                this.readOffset += 4;
                this.readOffset += 4;
                this.nowReadMode = lwoFileLoadMode$1.seachChunk;
            }
            this.mainloop();
        }
    }, {
        key: 'parseASCII',
        value: function parseASCII() {
            this.finalproc();
        }
    }, {
        key: 'mainloop',
        value: function mainloop() {
            var _this2 = this;

            var EndFlg = false;
            for (var i = 0; i < 100; i++) {
                this.read();
                if (this.readOffset >= this.lwoData.fileLength) {
                    EndFlg = true;
                    this.readFinalize();
                    setTimeout(function () {
                        _this2.finalproc();
                    }, 1);
                    break;
                }
            }
            if (!EndFlg) {
                setTimeout(function () {
                    _this2.mainloop();
                }, 1);
            }
        }
    }, {
        key: 'finalproc',
        value: function finalproc() {
            var _this3 = this;

            setTimeout(function () {
                _this3.onLoad(_this3.lwoData);
            }, 1);
        }
    }, {
        key: 'read',
        value: function read() {
            if (this.nowReadMode <= lwoFileLoadMode$1.seachChunk) {
                this.readingChank = this.bReader.getString(this.readOffset, 4);
                this.readOffset += 4;
                this.tgtLength = this.bReader.getUint32(this.readOffset);
                this.readOffset += 4;
                this.nowReaded = 0;
                this.nowReadMode = lwoFileLoadMode$1.readData;
            } else {
                switch (this.readingChank) {
                    case 'TAGS':
                        this.nowTagName = "default";
                        this.objects = new lwoFormData();
                        this.skipChank();
                        break;
                    case 'LAYR':
                        this.nowTagName = "default";
                        this.nowLayerData = new layerData();
                        this.skipChank();
                        break;
                    case 'PNTS':
                        this.nowLayerData.Geometry.vertices.push(new THREE.Vector3(this.bReader.getFloat32(this.readOffset), this.bReader.getFloat32(this.readOffset + 4), this.bReader.getFloat32(this.readOffset + 8)));
                        this.addReadOffset(12);
                        this.nowLayerData.Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
                        this.checkEndChank();
                        break;
                    case 'BBOX ':
                        this.skipChank();
                        break;
                    case 'POLS':
                        this.readingChank = this.bReader.getString(this.readOffset, 4);
                        this.addReadOffset(4);
                        break;
                    case 'FACE':
                        var vCount = this.bReader.getUint16(this.readOffset);
                        this.addReadOffset(2);
                        for (var i = 0; i < vCount - 2; i++) {
                            this.nowLayerData.Geometry.faces.push(new THREE.Face3(this.bReader.getUint16(this.readOffset), this.bReader.getUint16(this.readOffset + 2), this.bReader.getUint16(this.readOffset + 4), new THREE.Vector3(1, 1, 1).normalize()));
                            this.addReadOffset(2);
                        }
                        this.addReadOffset(4);
                        this.checkEndChank();
                        if (this.nowReadMode == lwoFileLoadMode$1.seachChunk) {
                            this.readOffset = this.lwoData.fileLength;
                        }
                        break;
                    default:
                        this.skipChank();
                        break;
                }
            }
        }
    }, {
        key: 'addReadOffset',
        value: function addReadOffset(_v) {
            this.readOffset += _v;
            this.nowReaded += _v;
        }
    }, {
        key: 'skipChank',
        value: function skipChank() {
            this.readOffset += this.tgtLength;
            this.nowReadMode = lwoFileLoadMode$1.seachChunk;
        }
    }, {
        key: 'checkEndChank',
        value: function checkEndChank() {
            if (this.nowReaded >= this.tgtLength) {
                this.nowReadMode = lwoFileLoadMode$1.seachChunk;
            }
        }
    }, {
        key: 'readFinalize',
        value: function readFinalize() {
            if (this.nowLayerData.Geometry != null) {
                this.nowLayerData.Geometry.computeBoundingBox();
                this.nowLayerData.Geometry.computeBoundingSphere();
                this.nowLayerData.Geometry.verticesNeedUpdate = true;
                this.nowLayerData.Geometry.normalsNeedUpdate = true;
                this.nowLayerData.Geometry.colorsNeedUpdate = true;
                this.nowLayerData.Geometry.uvsNeedUpdate = true;
                this.nowLayerData.Geometry.groupsNeedUpdate = true;
                var bufferGeometry = new THREE.BufferGeometry();
                this.lwoData.objects.push(new THREE.Mesh(bufferGeometry.fromGeometry(this.nowLayerData.Geometry /*, new THREE.MultiMaterial(this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials*/)));
            }
        }
    }]);
    return lwoLoader;
}();


THREE.lwoLoader.IsUvYReverse = true;
