"use strict";

/**
 * @author Jey-en  https://github.com/adrs2002
 * 
 * this loader repo -> https://github.com/adrs2002/threeLwoLoader
 * 
 * This loader is load model from .lwo file format. (for LightWave3D Model Object).
 *  ! this version are load from [ Model ] format .Lwo only ! not a Scene(and Animation).
 * 
 * Support
 *  - mesh
 *  - texture
 *  - normal / uv
 *  - material
 *  - skinning
 *
 *  Not Support
 *  - material(ditail)
 *  - morph
 *  - scene
 */

import bReader from './parts/binaryReader'
import layerData from './parts/layerData'
import lwoFormData from './parts/lwoFormData'
import lwoFileLoadMode from './parts/lwoFileLoadMode'

class lwoLoader {
    // コンストラクタ
    constructor(manager, Texloader, _zflg) {

        this.manager = (manager !== undefined) ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = (Texloader !== undefined) ? Texloader : new THREE.TextureLoader();
        this.zflg = (_zflg === undefined) ? false : _zflg;

        this.url = "";
        this.baseDir = "";
        // 現在の行読み込みもーど
        this.nowReadMode = lwoFileLoadMode.none;

        //LWOファイルは要素宣言→要素数→要素実体　という並びになるので、要素数宣言を保持する
        this.readOffset = 0;
        this.tgtLength = 0;
        this.nowReaded = 0;

        // { の数（ファイル先頭から
        this.elementLv = 0;

        this.matReadLine = 0;
        this.putMatLength = 0;
        this.nowMat = null;
        this.readingChank = "";

        this.nowLayerData = null;

        //ボーン情報格納用
        // this.BoneInf = new boneInf();

        //UV割り出し用の一時保管配列
        this.tmpUvArray = [];

        //放線割り出し用の一時保管配列
        //Xfileの放線は「頂点ごと」で入っているので、それを面に再計算して割り当てる。面倒だと思う
        this.normalVectors = [];
        this.facesNormal = [];

        //現在読み出し中のTag名称
        this.nowTagName = "";

        //現在読み出し中のフレームの階層構造。
        this.frameHierarchie = [];

        this.geometry = null;

        this.lwoData = null;
        this.lines = null;

        this.reader = null;
        this.face_size = 0;

        this.bReader = null;
        this.onLoad = null;

    }

    //読み込み開始命令部
    load(_arg, onLoad, onProgress, onError) {

        const loader = new THREE.FileLoader(this.manager);
        loader.setResponseType('arraybuffer');

        for (let i = 0; i < _arg.length; i++) {
            switch (i) {
                case 0: this.url = _arg[i]; break;
                case 1: this.zflg = _arg[i]; break;
            }
        }

        loader.load(this.url, (response) => {

            this.parse(response, onLoad);

        }, onProgress, onError);

    }

    isBinary(binData) {
        this.reader = new DataView(binData);
        this.face_size = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
        const n_faces = reader.getUint32(80, true);
        const expect = 80 + (32 / 8) + (n_faces * face_size);

        if (expect === reader.byteLength) {
            return true;
        }

        // some binary files will have different size from expected,
        // checking characters higher than ASCII to confirm is binary
        const fileLength = reader.byteLength;
        for (let index = 0; index < fileLength; index++) {
            if (reader.getUint8(index, false) > 127) {
                return true;
            }
        }
        return false;
    }


    ensureBinary(buf) {

        if (typeof buf === "string") {

            const array_buffer = new Uint8Array(buf.length);
            for (let i = 0; i < buf.length; i++) {

                array_buffer[i] = buf.charCodeAt(i) & 0xff; // implicitly assumes little-endian

            }

            return array_buffer.buffer || array_buffer;

        } else {

            return buf;

        }
    }

    ensureString(buf) {

        if (typeof buf !== "string") {
            const array_buffer = new Uint8Array(buf);
            let str = '';
            for (let i = 0; i < buf.byteLength; i++) {
                str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
            }

            return str;

        } else {

            return buf;

        }
    }

    //解析を行う前に、バイナリファイルかテキストファイルかを判別する。今はテキストファイルしか対応できていないので・・・
    parse(data, onLoad) {
        //const binData = this.ensureBinary(data);
        //this.data = this.ensureString(data);
        this.onLoad = onLoad;
        return this.parseBinary(data);
    }

    /*
    バイナリデータだった場合の読み込み。現在は基本的に未対応
    */
    parseBinary(data) {
        //モデルファイルの元ディレクトリを取得する
        let baseDir = "";
        if (this.url.lastIndexOf("/") > 0) {
            this.baseDir = this.url.substr(0, this.url.lastIndexOf("/") + 1);
        }

        //Lwofileとして分解できたものの入れ物
        this.lwoData = {};
        this.lwoData.objects = [];

        // 返ってきたデータを行ごとに分解
        //初回判別。正しいデータかどうか
        this.bReader = new bReader(data);
        this.readOffset = 0;
        const str = this.bReader.getString(this.readOffset, 4);
        this.readOffset += 4;
        if (str !== "FORM") {
            // "FORM"でない場合は、LWOでは無い
            console.log("FORM String not found");
            this.finalproc();
        }
        else {
            //ファイルの長さがこれでわかる
            this.lwoData.fileLength = this.bReader.getUint32(this.readOffset); // +8; 
            this.readOffset += 4;
            // 次は固定で [ lwo2 か　lwob ]　と入っているはず
            this.readOffset += 4;
            this.nowReadMode = lwoFileLoadMode.seachChunk;
        }
        this.mainloop();
    }

    parseASCII() {
        //ねげちぶ！
        this.finalproc();
    }

    mainloop() {

        let EndFlg = false;

        //フリーズ現象を防ぐため、要素10ずつの制御にしている（１行ずつだと遅かった）
        for (let i = 0; i < 10; i++) {
            this.read();
            if (this.readOffset >= this.lwoData.fileLength) {
                EndFlg = true;
                this.readFinalize();
                setTimeout(() => { this.finalproc() }, 1);
                break;
            }

        }
        if (!EndFlg) { setTimeout(() => { this.mainloop() }, 1); }
    }

    finalproc() {
        setTimeout(() => { this.onLoad(this.lwoData) }, 1);
    }

    read() {
        if (this.nowReadMode <= lwoFileLoadMode.seachChunk) {
            this.readingChank = this.bReader.getString(this.readOffset, 4);
            this.readOffset += 4;

            this.tgtLength = this.bReader.getUint32(this.readOffset);
            this.readOffset += 4;
            this.nowReaded = 0;
            this.nowReadMode = lwoFileLoadMode.readData;
        } else {
            switch (this.readingChank) {
                case 'TAGS':
                    this.nowTagName = "default";//this.bReader.getString(this.readOffset, this.tgtLength);
                    this.objects = new lwoFormData();
                    this.skipChank();
                    break;
                case 'LAYR':
                    this.nowTagName = "default"; //this.bReader.getString(this.readOffset, this.tgtLength);
                    this.nowLayerData = new layerData();
                    //とりあえずレイヤーも頂点以外は虫してる
                    this.skipChank();
                    break;
                case 'PNTS':
                    //頂点データの読み込み
                    this.nowLayerData.Geometry.vertices.push(new THREE.Vector3(this.bReader.getFloat32(this.readOffset), this.bReader.getFloat32(this.readOffset + 4), this.bReader.getFloat32(this.readOffset + 8)));
                    this.addReadOffset(12);
                    this.nowLayerData.Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
                    this.checkEndChank();
                    break;
                case 'BBOX ':
                    //boudingBox…イラネ
                    this.skipChank();
                    break;
                case 'POLS':
                    //こいつは子階層データが許可されてるので、気を付ける
                    this.readingChank = this.bReader.getString(this.readOffset, 4);
                    this.addReadOffset(4);
                    break;
                case 'FACE':
                    //VectexIndexデータ
                    //この読み方だと、6万頂点までのデータしか読めない。　……まーそれ以上のデータが来たら、そんとき考えるさ・・っつかンなもんブラウザで表示すんな
                    const vCount = this.bReader.getUint16(this.readOffset);
                    this.addReadOffset(2);
                    //1面＝3頂点にしか対応していないので、やや苦しいがこのような構成に
                    for (let i = 0; i < vCount - 2; i++) {
                        this.nowLayerData.Geometry.faces.push(new THREE.Face3(this.bReader.getUint16(this.readOffset), this.bReader.getUint16(this.readOffset + 2), this.bReader.getUint16(this.readOffset + 4), new THREE.Vector3(1, 1, 1).normalize()));
                        this.addReadOffset(2);
                    }
                    this.addReadOffset(4);
                    this.checkEndChank();
                    //とりあえず試してみたいので、無理やり終わらせる
                    if (this.nowReadMode == lwoFileLoadMode.seachChunk) {
                        this.readOffset = this.lwoData.fileLength;
                    }
                    break;
                default:
                    this.skipChank();
                    break;
            }
        }
    }

    addReadOffset(_v) {
        this.readOffset += _v;
        this.nowReaded += _v;
    }

    skipChank() {
        //飛ばす
        this.readOffset += this.tgtLength;
        this.nowReadMode = lwoFileLoadMode.seachChunk;
    }

    checkEndChank() {
        if (this.nowReaded >= this.tgtLength) { this.nowReadMode = lwoFileLoadMode.seachChunk; }
    }

    readFinalize() {
        if (this.nowLayerData.Geometry != null) {

            //１つのmesh終了
            this.nowLayerData.Geometry.computeBoundingBox();
            this.nowLayerData.Geometry.computeBoundingSphere();

            this.nowLayerData.Geometry.verticesNeedUpdate = true;
            this.nowLayerData.Geometry.normalsNeedUpdate = true;
            this.nowLayerData.Geometry.colorsNeedUpdate = true;
            this.nowLayerData.Geometry.uvsNeedUpdate = true;
            this.nowLayerData.Geometry.groupsNeedUpdate = true;
            const bufferGeometry = new THREE.BufferGeometry();
            this.lwoData.objects.push(new THREE.Mesh(bufferGeometry.fromGeometry(this.nowLayerData.Geometry /*, new THREE.MultiMaterial(this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials*/)));
        }
    }
};

THREE.lwoLoader.IsUvYReverse = true;