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
import chankInfo from './parts/chankInfo'

class lwoLoader {
    // コンストラクタ
    constructor(manager, Texloader, _zflg, _isFan) {

        this.manager = (manager !== undefined) ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = (Texloader !== undefined) ? Texloader : new THREE.TextureLoader();
        this.zflg = (_zflg === undefined) ? false : _zflg;
        this.isFan = (_isFan === undefined) ? true : _isFan;
        this.url = "";
        this.baseDir = "";
        // 現在の行読み込みもーど
        this.nowReadMode = lwoFileLoadMode.none;

        this.chankInfos = [];
        this.currentChank = 0;

        //LWOファイルは要素宣言→要素数→要素実体　という並びになるので、要素数宣言を保持する
        this.readOffset = 0;
        this.tgtLength = 0;
        this.nowReaded = 0;

        // { の数（ファイル先頭から
        this.elementLv = 0;

        this.matReadLine = 0;
        this.putMatLength = 0;
        this.Materials = [];
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

        this.tags = [];
        this.tbl_sufToTag = [];
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
    バイナリデータだった場合の読み込み。
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
        this.chankInfos.push(new chankInfo());
        this.mainloop();
    }

    parseASCII() {
        //ねげちぶ！
        this.finalproc();
    }

    mainloop() {

        let EndFlg = false;

        //フリーズ現象を防ぐため、要素10ずつの制御にしている（１行ずつだと遅かった）
        for (let i = 0; i < 500; i++) {
            const skpFlg = this.read();
            if (this.readOffset >= this.lwoData.fileLength) {
                EndFlg = true;
                this.readFinalize();
                setTimeout(() => { this.finalproc() }, 1);
                break;
            }
            if (skpFlg) { break; }
        }
        if (!EndFlg) { setTimeout(() => { this.mainloop() }, 1); }
    }

    finalproc() {
        setTimeout(() => { this.onLoad(this.lwoData) }, 1);
    }

    read() {
        let refFlg = false;
        if (this.nowReadMode <= lwoFileLoadMode.seachChunk) {
            this.readingChank = this.bReader.getString(this.readOffset, 4);
            this.chankInfos[this.currentChank].chankName = this.bReader.getString(this.readOffset, 4);
            this.readOffset += 4;

            this.tgtLength = this.bReader.getUint32(this.readOffset);
            this.chankInfos[this.currentChank].length = this.bReader.getUint32(this.readOffset);
            this.readOffset += 4;
            this.nowReaded = 0;
            this.nowReadMode = lwoFileLoadMode.readData;
        } else {
            const tgtId = this.currentChank > 0 ? this.currentChank - 1 : 0;
            switch (this.chankInfos[this.currentChank].chankName) {
                case 'TAGS':
                    this.objects = new lwoFormData();
                    this.readTags();
                    this.skipChank();
                    break;
                case 'LAYR':
                    this.nowTagName = "default"; //this.bReader.getString(this.readOffset, this.tgtLength);
                    this.nowLayerData = new layerData();
                    //とりあえずレイヤーも頂点以外は虫してる
                    this.skipChank();
                    break;
                case 'PNTS':    //ぱんつ！？
                    //頂点データの読み込み
                    this.nowLayerData.Geometry.vertices.push(new THREE.Vector3(this.bReader.getFloat32(this.readOffset), this.bReader.getFloat32(this.readOffset + 4), this.bReader.getFloat32(this.readOffset + 8)));
                    //console.log('vx:' + this.bReader.getFloat32(this.readOffset) + ':' + this.bReader.getFloat32(this.readOffset + 4) + ':' + this.bReader.getFloat32(this.readOffset + 8));
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
                    this.readPols();
                    this.skipChank();
                    refFlg = true;
                    break;
                case 'PTAG':
                    //こいつは子階層データが許可されてるので、気を付ける
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

    addReadOffset(_v) {
        this.readOffset += _v;
        this.nowReaded += _v;
    }

    skipChank() {
        //飛ばす
        this.readOffset += this.tgtLength;
        this.nowReadMode = lwoFileLoadMode.seachChunk;
    }

    addChank() {
        const chk = new chankInfo();
        chk.set(this.bReader.getString(this.readOffset, 4));
        this.chankInfos.push(chk);
        this.currentChank++;
        this.addReadOffset(4);
    }

    checkEndChank() {
        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = lwoFileLoadMode.seachChunk;
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
    //指定された文字を探す。Offsetは現在の位置以降から
    SeachStr(_tgt, _maxleng) {
        const tgtMax = _maxleng != undefined ? _maxleng : this.lwoData.fileLength;
        for (let i = 0; i < tgtMax; i++) {
            if (this.bReader.getString(this.readOffset + i, _tgt.length) == _tgt) {
                return i;
            }
            if (i + this.readOffset >= this.lwoData.fileLength) { return -1; }
        }
        return -1;
    }

    readTags() {
        const startOffset = this.readOffset;
        let addOffset = 0;
        while (true) {
            const s = this.bReader.getString_Next(startOffset + addOffset, this.tgtLength - addOffset);
            if (s != undefined) {
                if (s[0].length > 0) {
                    this.tags.push(s[0]);
                }
                addOffset += s[1] + 1;
                if (addOffset >= this.tgtLength) { break; }
            } else { break; }
        }
    }

    readPols() {
        //[FACE]を探す
        let getLength = this.SeachStr('FACE', this.tgtLength);
        let nowOffset = 0;
        if (getLength != -1) {
            nowOffset = this.readOffset + getLength + 4;
            while (true) {
                const nextB = this.bReader.getUint16(nowOffset);
                if (nextB != undefined && nextB > 0) {
                    nowOffset += this.readFaces(nowOffset);
                } else {
                    break;
                }
                if (nowOffset >= this.readOffset + this.tgtLength) { break; }
            }
        }
    }

    readFaces(_Offset) {
        //VectexIndexデータ
        let tmpOffset = _Offset;
        //この読み方だと、6万頂点までのデータしか読めない。　……まーそれ以上のデータが来たら、そんとき考えるさ・・っつかンなもんブラウザで表示すんな
        const vCount = this.bReader.getUint16(_Offset);
        tmpOffset += 2;
        //面Indexは、必ず元データとずれることになるので、変換テーブルを用意する
        const indexes = [];

        //1面＝3頂点にしか対応していないので、やや苦しいがこのような構成に
        if (this.isFan) {
            //LW標準？ファン形式での面構成
            const firstOffset = tmpOffset;
            tmpOffset += 2;
            tmpOffset += 2;
            for (let i = 2; i < vCount; i++) {
                indexes.push(this.nowLayerData.Geometry.faces.length);
                this.nowLayerData.Geometry.faces.push(new THREE.Face3(this.bReader.getUint16(firstOffset), this.bReader.getUint16(tmpOffset - 2), this.bReader.getUint16(tmpOffset), new THREE.Vector3(1, 1, 1).normalize()));
                //console.log('face:' + this.bReader.getUint16(firstOffset) + '-' + this.bReader.getUint16(this.readOffset) + '-' + this.bReader.getUint16(this.readOffset + 2));
                tmpOffset += 2;
            }
        } else {
            //オプション。面構成形式がストリップ形式の場合。
            for (let i = 0; i < vCount - 2; i++) {
                indexes.push(this.nowLayerData.Geometry.faces.length);
                this.nowLayerData.Geometry.faces.push(new THREE.Face3(this.bReader.getUint16(tmpOffset), this.bReader.getUint16(tmpOffset + 2), this.bReader.getUint16(tmpOffset + 4), new THREE.Vector3(1, 1, 1).normalize()));
                //console.log('face:' + this.bReader.getUint16(this.readOffset) + '-' + this.bReader.getUint16(this.readOffset + 2) + '-' + this.bReader.getUint16(this.readOffset + 4));
                tmpOffset += 2;
            }
            tmpOffset += 4;
        }
        this.nowLayerData.TriangleFaceIndexes.push(indexes);
        //とりあえず試してみたいので、無理やり終わらせる
        if (this.nowReadMode == lwoFileLoadMode.seachChunk) {
            // this.readOffset = this.lwoData.fileLength;
        }
        return tmpOffset - _Offset;
    }

    readPtag() {
        //[FACE]を探す
        let getLength = this.SeachStr('SURF', this.tgtLength);
        let nowOffset = 0;
        let putCount = 0;
        if (getLength != -1) {
            nowOffset = this.readOffset + getLength + 4;
            while (true) {
                const nextB = this.bReader.getUint16(nowOffset);
                if (nextB != undefined) {
                    nowOffset += this.readPtagSurf(nowOffset);
                    putCount++;
                } else {
                    break;
                }
                if (nowOffset >= this.readOffset + this.tgtLength || putCount >= this.nowLayerData.TriangleFaceIndexes.length) { break; }
            }
        }
    }

    readPtagSurf(_Offset) {
        let tmpOffset = _Offset;
        // 頭のu16の面は　u16のマテリアルに属している　という組み合わせになる
        const tgtFace = this.bReader.getUint16(tmpOffset); tmpOffset += 2;
        const tgtMat = this.bReader.getUint16(tmpOffset); tmpOffset += 2;
        for (let m = 0; m < this.nowLayerData.TriangleFaceIndexes[tgtFace].length; m++) {
            const k = this.nowLayerData.TriangleFaceIndexes[tgtFace][m];
            this.nowLayerData.Geometry.faces[k].materialIndex = tgtMat;
        }
        return 4;
    }

    seachTagID(_s) {
        for (let i = 0; i < this.tags.length; i++) {
            if (this.tags[i] == _s) { return i; }
        }
        return -1;
    }

    readSurface() {
        this.nowMat = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
        let nowDiffuse = 1.0;

        //Suf名称を探す
        const s = this.bReader.getString_Next(this.readOffset, this.tgtLength);
        if (s == null || s[0].length == 0) { return; }
        const tagID = this.seachTagID(s[0]);
        if (tagID == -1) { return; }
        this.tbl_sufToTag[tagID] = this.Materials.length;
        //this.tbl_sufToTag.push(tagID);

        //[CORL]を探す
        let getLength = this.SeachStr('COLR', this.tgtLength);
        let nowOffset = 0;
        if (getLength != -1) {
            nowOffset = this.readOffset + getLength + 4;
            //Color読み
            nowOffset += 2; //長さ。ほぼ固定14なので飛ばす
            this.nowMat.color.r = this.bReader.getFloat32(nowOffset); nowOffset += 4;
            this.nowMat.color.g = this.bReader.getFloat32(nowOffset); nowOffset += 4;
            this.nowMat.color.b = this.bReader.getFloat32(nowOffset); nowOffset += 4;
        }
        //[DIFF]を探す
        getLength = this.SeachStr('DIFF', this.tgtLength);
        if (getLength != -1) {
            nowOffset = this.readOffset + getLength + 4;
            //diff読み
            nowOffset += 2; //長さ。ほぼ固定なので飛ばす
            nowDiffuse = this.bReader.getFloat32(nowOffset);
        }

        //SPEC=スペキュラ
        getLength = this.SeachStr('SPEC', this.tgtLength);
        nowOffset = 0;
        this.nowMat.shininess = 0.4;    //LWはデフォルトが0.4
        if (getLength != -1) {
            nowOffset = this.readOffset + getLength + 4;
            //specular
            nowOffset += 2; //長さ。ほぼ固定なので飛ばす
            const shininess = this.bReader.getFloat32(nowOffset);
            this.nowMat.shininess = shininess;
        }
        //REFL=反射率？
        getLength = this.SeachStr('REFL', this.tgtLength);
        nowOffset = 0;
        if (getLength != -1) {
            nowOffset = this.readOffset + getLength + 4;
            //specular
            nowOffset += 2; //長さ。ほぼ固定なので飛ばす
            const specular = this.bReader.getFloat32(nowOffset);
            this.nowMat.specular.r = specular;
            this.nowMat.specular.g = specular;
            this.nowMat.specular.b = specular;
        }else{  //LWはデフォルトが0.4
            this.nowMat.specular.r = 0.4;
            this.nowMat.specular.g = 0.4;
            this.nowMat.specular.b = 0.4;
        }

        //両面フラグ
        getLength = this.SeachStr('SIDE', this.tgtLength);
        nowOffset = 0;
        if (getLength != -1) {
            nowOffset = this.readOffset + getLength + 4;
            //specular
            nowOffset += 2; //長さ。ほぼ固定なので飛ばす
            const side = this.bReader.getUint16(nowOffset);
            if (side == 3) {
                this.nowMat.side = THREE.DoubleSide;
            }
        }

        this.nowMat.color.r *= nowDiffuse;
        this.nowMat.color.g *= nowDiffuse;
        this.nowMat.color.b *= nowDiffuse;

        this.Materials.push(this.nowMat);
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

            //TAGと出力したマテリアル番号を一致させる。
            for (let i = 0; i < this.nowLayerData.Geometry.faces.length; i++) {
                this.nowLayerData.Geometry.faces[i].materialIndex = this.tbl_sufToTag[this.nowLayerData.Geometry.faces[i].materialIndex];
            }

            const bufferGeometry = new THREE.BufferGeometry();
            this.lwoData.objects.push(new THREE.Mesh(bufferGeometry.fromGeometry(this.nowLayerData.Geometry), new THREE.MultiMaterial(this.Materials)));
        }
    }
};

THREE.lwoLoader.IsUvYReverse = true;