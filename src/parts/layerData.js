
export default class layerData {

    constructor() {
        this.name = "";
        this.index = 0;
        this.parent = -1;
        this.vertexes = [];
        this.indexes = [];
        this.Geometry = new THREE.Geometry();
        this.pivotPos = null;
        this.TriangleFaceIndexes = [];
    }    
    
    init(_data)
    {

    }

}