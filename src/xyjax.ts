/**
  XyJax shenanigans
*/

import {MathJaxReady} from "./NonBlocking";

export function extendXY() {
  MathJaxReady.then(MathJax => {
    MathJax.Hub.Register.StartupHook("Device-Independent Xy-pic Ready", function () {
      const { xypic } = MathJax.Extension, { AST, memoize } = xypic;
      
      // color
      AST.Modifier.Shape.SetColor = AST.Modifier.Subclass({
        preprocess(context, reversedProcessedModifiers) { },
        modifyShape(context, objectShape, restModifiers, color) {
          objectShape = this.proceedModifyShape(context, objectShape, restModifiers);
          return xypic.Shape.ChangeColorShape(xyDecodeColor(color), objectShape);
        }
      });
      xypic.repositories.modifierRepository.put("color", AST.Modifier.Shape.SetColor());

      // data
      xypic.Graphics.SVG.Augment({
        createChangeDataGroup: function(data) {
          return xypic.Graphics.SVG.ChangeDataGroup(this, data)
        }
      });

      xypic.Graphics.SVG.ChangeDataGroup = xypic.Graphics.SVG.Subclass({
        Init: function (parent, data) {
          this.parent = parent;
          this.drawArea = this.parent.createSVGElement("g");
          Object.assign(this.drawArea.dataset, JSON.parse("{" + fromb52(data) + "}"));
          memoize(this, "getOrigin");
        },
        remove: function () {
          this.drawArea.parentNode.removeChild(this.drawArea);
        },
        extendBoundingBox: function (boundingBox) {
          this.parent.extendBoundingBox(boundingBox);
        },
        getOrigin: function () {
          return this.parent.getOrigin();
        }
      });

      xypic.Shape.ChangeDataShape = xypic.Shape.Subclass({
        Init: function (data, shape) {
          this.data = data;
          this.shape = shape;
          memoize(this, "getBoundingBox");
        },
        draw: function (svg) {
          const g = svg.createChangeDataGroup(this.data);
          this.shape.draw(g);
        },
        getBoundingBox: function () {
          return this.shape.getBoundingBox();
        },
        toString: function () {
          return "" + this.shape + ", data:" + this.data;
        }
      });

      AST.Modifier.Shape.SetData = AST.Modifier.Subclass({
        preprocess(context, reversedProcessedModifiers) {},
        modifyShape(context, objectShape, restModifiers, data) {
          objectShape = this.proceedModifyShape(context, objectShape, restModifiers);
          return xypic.Shape.ChangeDataShape(data, objectShape);
        }
      });
      xypic.repositories.modifierRepository.put("data", AST.Modifier.Shape.SetData());

      // register
      AST.Modifier.Shape.Alphabets.Augment({
        preprocess: function (context, reversedProcessedModifiers) {
          if (this.alphabets.startsWith("color")) {
            return xypic.repositories.modifierRepository.get("color").preprocess(context, reversedProcessedModifiers);
          } else if (this.alphabets.startsWith("data")) {
            return xypic.repositories.modifierRepository.get("data").preprocess(context, reversedProcessedModifiers);
          }
          const modifier = xypic.repositories.modifierRepository.get(this.alphabets);
          if (modifier !== undefined) {
            return modifier.preprocess(context, reversedProcessedModifiers);
          }
          else {}
        },
        modifyShape: function (context, objectShape, restModifiers) {
          if (this.alphabets.startsWith("color")) {
            return xypic.repositories.modifierRepository.get("color").modifyShape(context, objectShape, restModifiers, this.alphabets.substr("color".length));
          } else if (this.alphabets.startsWith("data")) {
            return xypic.repositories.modifierRepository.get("data").modifyShape(context, objectShape, restModifiers, this.alphabets.substr("data".length));
          }
          const modifier = xypic.repositories.modifierRepository.get(this.alphabets);
          if (modifier !== undefined) {
            return modifier.modifyShape(context, objectShape, restModifiers);
          }
        }
      });
    });
  });
}

const MAP = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const to_b58 = function(B,A){let d=[],s="",i,j,c,n;for(i in B){j=0,c=B[i];s+=c||s.length^i?"":1;while(j in d||c){n=d[j];n=n?n*256+c:c;c=n/A.length|0;d[j]=n%A.length;j++}}while(j--)s+=A[d[j]];return s};
const from_b58 = function(S,A){let d=[],b=[],i,j,c,n;for(i in S){j=0,c=A.indexOf(S[i]);if(c<0)return undefined;c||b.length^i?i:b.push(0);while(j in d||c){n=d[j];n=n?n*A.length+c:c;c=n>>8;d[j]=n%256;j++}}while(j--)b.push(d[j]);return new Uint8Array(b)};

export function xyEncodeColor(color: string) {
  return color.toUpperCase().replace(/[#0-9]/g, (char) => {
    if (char === '#')
      return '';
    return String.fromCharCode('G'.charCodeAt(0) + parseInt(char));
  });
}
export function xyDecodeColor(color: string) {
  return '#' + color.replace(/[G-P]/g, (digit) => {
    return (digit.charCodeAt(0) - 'G'.charCodeAt(0)).toString();
  });
}

export function tob52(str: string) {
  const arr = [];
  for (let i = 0; i < str.length; ++i) {
    arr[i] = str.charCodeAt(i);
  }
  return to_b58(new Uint8Array(arr), MAP);
}

export function fromb52(str: string) {
  const arr = from_b58(str, MAP);
  let ret = "";
  for (let i = 0; i < arr.length; ++i) {
    ret += String.fromCharCode(arr[i]);
  }
  return ret;
}
