
//バイナリの中身をDataViewで読み込み、いい感じに返すクラス

export default class bReader {

    constructor(buffer) {
        this.dv = new DataView(buffer);
    }    
    
    getString(offset, len) {
        let result = "";
        for (let i = offset; i < offset + len; i++) {
            result += String.fromCharCode(this.getUint8(i));
        }
        return result;
    }

    getUint8(offset) {
        return this.dv.getUint8(offset, true);
    }

    getUint16(offset) {
        return this.dv.getUint16(offset, true);
    }

    getUint32(offset) {
        return this.dv.getUint32(offset, true);
    }

    getInt16(offset) {
        return this.dv.getInt16(offset, true);
    }

    getInt32(offset) {
        return this.dv.getInt32(offset, true);
    }

    getFloat32(offset) {
        return this.dv.getFloat32(offset, true);
    }

    getUint8Array(offset, len) {
        const arr = new Uint8Array(len);
        let pos = 0;
        for (let i = offset; i < offset + len; i++) {
            arr[pos] = this.getUint8(i);
            pos++;
        }
        return arr;
    }

    getUint16Array(offset, len) {
        const arr = new Uint16Array(len / 2);
        let pos = 0;
        for (let i = offset; i < offset + len * 4; i += 4) {
            arr[pos] = this.getUint16(i);
            pos++;
        }
        return arr;
    }

    getFloat32Array(offset, len) {
        const arr = new Float32Array(len);
        let pos = 0;
        for (let i = offset; i < offset + len; i++) {
            arr[pos] = this.getFloat32(i);
            pos++;
        }
        return arr;
    }

    getBufferLength() {
        return buffer.byteLength;
    }
}

