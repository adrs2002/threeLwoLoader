
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

    getString_Next(offset, len) {
        let result = "";
        for (let i = offset; i < offset + len; i++) {
            const nowKeyCode = this.getUint8(i);
            if (nowKeyCode != 0) {
                result += String.fromCharCode(this.getUint8(i));
            } else {
                return [result, i - offset];
            }
        }
        return [result, len];
    }


    getUint8(offset) {
        return this.dv.getUint8(offset, false);
    }

    getUint16(offset) {
        return this.dv.getUint16(offset, false);
    }

    getUint32(offset) {
        return this.dv.getUint32(offset, false);
    }

    getInt16(offset) {
        return this.dv.getInt16(offset, false);
    }

    getInt32(offset) {
        return this.dv.getInt32(offset, false);
    }

    getFloat32(offset) {
        return this.dv.getFloat32(offset, false);
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

