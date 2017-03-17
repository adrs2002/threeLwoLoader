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
        this.TriangleFaceIndexes = [];
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

var chankInfo = function () {
    function chankInfo() {
        classCallCheck(this, chankInfo);

        this.chankName = "";
        this.langth = 0;
        this.readed = 0;
    }

    createClass(chankInfo, [{
        key: "set",
        value: function set$$1(_name, _id) {
            this.chankName = _name;
            this.langth = _id;
            this.readed = 0;
        }
    }]);
    return chankInfo;
}();

THREE.lwoLoader = function () {
    function lwoLoader(manager, Texloader, _zflg, _isFan) {
        classCallCheck(this, lwoLoader);

        this.manager = manager !== undefined ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = Texloader !== undefined ? Texloader : new THREE.TextureLoader();
        this.zflg = _zflg === undefined ? false : _zflg;
        this.isFan = _isFan === undefined ? true : _isFan;
        this.url = "";
        this.baseDir = "";
        this.nowReadMode = lwoFileLoadMode$1.none;
        this.chankInfos = [];
        this.currentChank = 0;
        this.readOffset = 0;
        this.tgtLength = 0;
        this.nowReaded = 0;
        this.elementLv = 0;
        this.matReadLine = 0;
        this.putMatLength = 0;
        this.Materials = [];
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
            this.chankInfos.push(new chankInfo());
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
            for (var i = 0; i < 500; i++) {
                var skpFlg = this.read();
                if (this.readOffset >= this.lwoData.fileLength) {
                    EndFlg = true;
                    this.readFinalize();
                    setTimeout(function () {
                        _this2.finalproc();
                    }, 1);
                    break;
                }
                if (skpFlg) {
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
            var refFlg = false;
            if (this.nowReadMode <= lwoFileLoadMode$1.seachChunk) {
                this.readingChank = this.bReader.getString(this.readOffset, 4);
                this.chankInfos[this.currentChank].chankName = this.bReader.getString(this.readOffset, 4);
                this.readOffset += 4;
                this.tgtLength = this.bReader.getUint32(this.readOffset);
                this.chankInfos[this.currentChank].length = this.bReader.getUint32(this.readOffset);
                this.readOffset += 4;
                this.nowReaded = 0;
                this.nowReadMode = lwoFileLoadMode$1.readData;
            } else {
                var tgtId = this.currentChank > 0 ? this.currentChank - 1 : 0;
                switch (this.chankInfos[this.currentChank].chankName) {
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
                        this.readPols();
                        this.skipChank();
                        refFlg = true;
                        break;
                    case 'FACE':
                        if (this.chankInfos[tgtId].chankName == "POLS") {
                            this.readFaces();
                        }
                        break;
                    case 'PTAG':
                        this.readPtag();
                        this.skipChank();
                        refFlg = true;
                        break;
                    case 'SURF':
                        this.readSurface();
                        this.skipChank();
                        refFlg = true;
                        break;
                    default:
                        this.skipChank();
                        break;
                }
            }
            return refFlg;
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
        key: 'addChank',
        value: function addChank() {
            var chk = new chankInfo();
            chk.set(this.bReader.getString(this.readOffset, 4));
            this.chankInfos.push(chk);
            this.currentChank++;
            this.addReadOffset(4);
        }
    }, {
        key: 'checkEndChank',
        value: function checkEndChank() {
            if (this.nowReaded >= this.tgtLength) {
                this.nowReadMode = lwoFileLoadMode$1.seachChunk;
                if (this.chankInfos.length > 1) {
                    this.currentChank--;
                    this.chankInfos[this.chankInfos.length - 2].readed += this.chankInfos[this.chankInfos.length - 1].langth;
                    this.chankInfos.pop();
                    this.tgtLength = this.chankInfos[this.currentChank].langth;
                    this.nowReaded = this.chankInfos[this.currentChank].readed;
                    this.checkEndChank();
                }
                this.readingChank = "";
            }
        }
    }, {
        key: 'SeachStr',
        value: function SeachStr(_tgt, _maxleng) {
            var tgtMax = _maxleng != undefined ? _maxleng : this.lwoData.fileLength;
            for (var i = 0; i < tgtMax; i++) {
                if (this.bReader.getString(this.readOffset + i, _tgt.length) == _tgt) {
                    return i;
                }
                if (i + this.readOffset >= this.lwoData.fileLength) {
                    return -1;
                }
            }
        }
    }, {
        key: 'readPols',
        value: function readPols() {
            var getLength = this.SeachStr('FACE', this.tgtLength);
            var nowOffset = 0;
            if (getLength != -1) {
                nowOffset = this.readOffset + getLength + 4;
                while (true) {
                    var nextB = this.bReader.getUint16(nowOffset);
                    if (nextB != undefined && nextB > 0) {
                        nowOffset += this.readFaces(nowOffset);
                    } else {
                        break;
                    }
                    if (nowOffset >= this.readOffset + this.tgtLength) {
                        break;
                    }
                }
            }
        }
    }, {
        key: 'readFaces',
        value: function readFaces(_Offset) {
            var tmpOffset = _Offset;
            var vCount = this.bReader.getUint16(_Offset);
            tmpOffset += 2;
            var indexes = [];
            if (this.isFan) {
                var firstOffset = tmpOffset;
                tmpOffset += 2;
                tmpOffset += 2;
                for (var i = 2; i < vCount; i++) {
                    indexes.push(this.nowLayerData.Geometry.faces.length);
                    this.nowLayerData.Geometry.faces.push(new THREE.Face3(this.bReader.getUint16(firstOffset), this.bReader.getUint16(tmpOffset - 2), this.bReader.getUint16(tmpOffset), new THREE.Vector3(1, 1, 1).normalize()));
                    tmpOffset += 2;
                }
            } else {
                for (var _i = 0; _i < vCount - 2; _i++) {
                    indexes.push(this.nowLayerData.Geometry.faces.length);
                    this.nowLayerData.Geometry.faces.push(new THREE.Face3(this.bReader.getUint16(tmpOffset), this.bReader.getUint16(tmpOffset + 2), this.bReader.getUint16(tmpOffset + 4), new THREE.Vector3(1, 1, 1).normalize()));
                    tmpOffset += 2;
                }
                tmpOffset += 4;
            }
            this.nowLayerData.TriangleFaceIndexes.push(indexes);
            if (this.nowReadMode == lwoFileLoadMode$1.seachChunk) {}
            return tmpOffset - _Offset;
        }
    }, {
        key: 'readPtag',
        value: function readPtag() {
            var getLength = this.SeachStr('FACE', this.tgtLength);
            var nowOffset = 0;
            if (getLength != -1) {
                nowOffset = this.readOffset + getLength + 4;
                while (true) {
                    var nextB = this.bReader.getUint16(nowOffset);
                    if (nextB != undefined && nextB > 0) {
                        nowOffset += this.readPtagSurf(nowOffset);
                    } else {
                        break;
                    }
                    if (nowOffset >= this.readOffset + this.tgtLength) {
                        break;
                    }
                }
            }
        }
    }, {
        key: 'readPtagSurf',
        value: function readPtagSurf(_Offset) {
            var tmpOffset = _Offset;
            var tgtFace = this.bReader.getUint16(this.readOffset);tmpOffset += 2;
            var tgtMat = this.bReader.getUint16(this.readOffset);tmpOffset += 2;
            for (var i = 0; i < this.nowLayerData.TriangleFaceIndexes.length; i++) {
                for (var m = 0; m < this.nowLayerData.TriangleFaceIndexes[i].length; m++) {
                    var k = this.nowLayerData.TriangleFaceIndexes[i][m];
                    this.nowLayerData.Geometry.faces[k].materialIndex = parseInt(tgtMat);
                }
            }
        }
    }, {
        key: 'readSurface',
        value: function readSurface() {
            this.nowMat = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
            var nowDiffuse = 1.0;
            var getLength = this.SeachStr('CORL', this.tgtLength);
            var nowOffset = 0;
            if (getLength != -1) {
                nowOffset = this.readOffset + getLength + 4;
                nowOffset += 2;
                this.nowMat.color.r = this.bReader.getFloat32(nowOffset);nowOffset += 4;
                this.nowMat.color.g = this.bReader.getFloat32(nowOffset);nowOffset += 4;
                this.nowMat.color.b = this.bReader.getFloat32(nowOffset);nowOffset += 4;
            }
            getLength = this.SeachStr('DIFF', this.tgtLength);
            if (getLength != -1) {
                nowOffset = this.readOffset + getLength + 4;
                nowOffset += 2;
                nowDiffuse = this.bReader.getFloat32(nowOffset);
            }
            getLength = this.SeachStr('SPEC', this.tgtLength);
            nowOffset = 0;
            if (getLength != -1) {
                nowOffset = this.readOffset + getLength + 4;
                nowOffset += 2;
                this.nowMat.specular.r = this.bReader.getFloat32(nowOffset);nowOffset += 4;
                this.nowMat.specular.g = this.bReader.getFloat32(nowOffset);nowOffset += 4;
                this.nowMat.specular.b = this.bReader.getFloat32(nowOffset);nowOffset += 4;
            }
            this.nowMat.color.r *= nowDiffuse;
            this.nowMat.color.g *= nowDiffuse;
            this.nowMat.color.b *= nowDiffuse;
            this.Materials.push(this.nowMat);
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
                this.lwoData.objects.push(new THREE.Mesh(bufferGeometry.fromGeometry(this.nowLayerData.Geometry, this.Materials)));
            }
        }
    }]);
    return lwoLoader;
}();


THREE.lwoLoader.IsUvYReverse = true;
