import * as React from "react";
import {Player, Utils} from "ractive-player";
const {attachClickHandler} = Utils.mobile;

export {MathJaxReady, RenderGroup, typeset, recursiveMap} from "../lib/MathJax";
export {extendXY, tob52, fromb52, xyEncodeColor, xyDecodeColor} from "../lib/MathJax";

import {MJX as MJXNonBlocking, MJXText as MJXTextNonBlocking} from "../lib/MathJax";

class MJXBlocking extends MJXNonBlocking {
  static contextType = Player.Context;
  context: Player;

  async componentDidMount() {
    const player = this.context;

    player.obstruct("canplay", this.ready);
    player.obstruct("canplaythrough", this.ready);

    super.componentDidMount();
  }
}

class MJXTextBlocking extends MJXTextNonBlocking {
  static contextType = Player.Context;
  context: Player;

  async componentDidMount() {
    const player = this.context;

    player.obstruct("canplay", this.ready);
    player.obstruct("canplaythrough", this.ready);

    super.componentDidMount();
  }
}

export {
  MJXBlocking as MJX, MJXBlocking, MJXNonBlocking,
  MJXTextBlocking as MJXText, MJXTextNonBlocking
};

/// <reference types="mathjax" />
import * as EventEmitter from "events";
import * as React from "react";
import {ReactChild, ReactNode} from "react";

/* this module is a hot mess */
import {bind} from "@webu/utils/misc";

export const MathJaxReady = new Promise<typeof MathJax>((resolve, reject) => {
  const script = document.getElementById("js-async-mathjax") as HTMLScriptElement;
  if (!script) return;

  if (window.hasOwnProperty("MathJax")) {
    MathJax.Hub.Register.StartupHook("LoadHead Ready", () => resolve(MathJax));
  } else {
    script.addEventListener("load", () => MathJax.Hub.Register.StartupHook("LoadHead Ready", () => resolve(MathJax)));
  }
});

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  display?: boolean;
  resize?: boolean;
  renderer?: "HTML-CSS" | "CommonHTML" | "PreviewHTML" | "NativeMML" | "SVG" | "PlainSource";
}

export class MJX extends React.Component<Props, {}> {
  private resolveReady: () => void;
  domElement: HTMLSpanElement;
  jax: MathJax.ElementJax;

  hub: EventEmitter;
  ready: Promise<void>;

  static defaultProps = {
    display: false,
    resize: false
  }

  constructor(props: Props) {
    super(props);
    this.hub = new EventEmitter();
    // hub will have lots of listeners, turn off warning
    this.hub.setMaxListeners(0);
    
    this.ready = new Promise((resolve, reject) => this.resolveReady = resolve);

    for (const method of ["Rerender", "Text", "Typeset"]) {
      this[method] = this[method].bind(this);
    }
  }

  async componentDidMount() {
    await MathJaxReady;

    this.Typeset()
    .then(() => this.jax = MathJax.Hub.getAllJax(this.domElement)[0])
    .then(this.resolveReady);
    
    if (this.props.resize) {
      window.addEventListener("resize", this.Rerender);
      onFullScreenChange(this.Rerender);
    }
  }

  shouldComponentUpdate(nextProps: Props) {
    const text = this.props.children instanceof Array ? this.props.children.join("") : this.props.children,
          nextText = nextProps.children instanceof Array ? nextProps.children.join("") : nextProps.children;

    // rerender?
    if (this.jax && text !== nextText) {
      this.Text(nextProps.children as string);
    }

    // classes changed?
    if (this.props.className !== nextProps.className) {
      const classes = this.props.className ? this.props.className.split(" ") : [],
            newClasses = nextProps.className ? nextProps.className.split(" ") : [];

      const add = newClasses.filter(_ => !classes.includes(_)),
            remove = classes.filter(_ => !newClasses.includes(_));

      for (const _ of remove)
        this.domElement.classList.remove(_);
      for (const _ of add)
        this.domElement.classList.add(_);
    }

    // style attribute changed?
    if (JSON.stringify(this.props.style) !== JSON.stringify(nextProps.style)) {
      (Object.keys(this.props.style || {}) as (keyof React.CSSProperties)[])
      .filter(_ => !(nextProps.style || {}).hasOwnProperty(_))
      .forEach(_ => this.props.style[_] = null);
      Object.assign(this.domElement.style, nextProps.style);
    }

    return false;
  }

  Rerender() {
    MathJax.Hub.Queue(["Rerender", MathJax.Hub, this.domElement]);
    MathJax.Hub.Queue(() => this.hub.emit("Rerender"));
  }

  Text(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tasks = [];

      if (this.props.renderer) {
        const renderer = MathJax.Hub.config.menuSettings.renderer;
        tasks.push(["setRenderer", MathJax.Hub, this.props.renderer]);
        tasks.push(["Text", this.jax, text]);
        tasks.push(["setRenderer", MathJax.Hub, renderer]);
      } else {
        tasks.push(["Text", this.jax, text]);
      }

      tasks.push(() => this.hub.emit("Text"));
      tasks.push(resolve);

      MathJax.Hub.Queue(...tasks);
    });
  }

  Typeset(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tasks = [];

      if (this.props.renderer) {
        const renderer = MathJax.Hub.config.menuSettings.renderer;
        tasks.push(["setRenderer", MathJax.Hub, this.props.renderer]);
        tasks.push(["Typeset", MathJax.Hub, this.domElement]);
        tasks.push(["setRenderer", MathJax.Hub, renderer]);
      } else {
        tasks.push(["Typeset", MathJax.Hub, this.domElement]);
      }

      tasks.push(() => this.hub.emit("Typeset"));
      tasks.push(resolve);

      MathJax.Hub.Queue(...tasks);
    });
  }

  render() {
    const {children, display, resize, ...attrs} = this.props;

    const [open, close] = display ? ["\\[", "\\]"] : ["\\(", "\\)"];

    // Google Chrome fails without this
    if (display) {
      if (!attrs.style)
        attrs.style = {};
      attrs.style.display = "block";
    }

    return (
      <span {...attrs} ref={node => this.domElement = node}>{open + children + close}</span>
    );
  }
}

interface MJXTextProps {
  tagName?: keyof HTMLElementTagNameMap & JSX.IntrinsicElements;
}

export class MJXText extends React.Component<MJXTextProps> {
  private resolveReady: () => void;
  private ref: React.RefObject<HTMLElement>;

  ready: Promise<void>;

  constructor(props: MJXTextProps) {
    super(props);

    this.ready = new Promise((resolve, reject) => this.resolveReady = resolve);

    this.ref = React.createRef<HTMLElement>();
  }

  async componentDidMount() {
    await MathJaxReady;

    typeset(this.ref.current)
    .then(this.resolveReady);
  }

  render() {
    const {tagName = "p", children, ...attrs} = this.props;
    return React.createElement(tagName, {...attrs, ref: this.ref}, children);
  }
}

// wait for a whole bunch of things to be rendered
export class RenderGroup extends React.Component {
  private promises: Promise<void>[];

  ready: Promise<void>;

  componentDidMount() {
    this.ready = Promise.all(this.promises).then(() => {});
  }

  render() {
    this.promises = [];

    return recursiveMap(this.props.children, node => {
      if (shouldInspect(node)) {
        const originalRef = node.ref;
        return React.cloneElement(node, {
          ref: (ref: MJX) => {
            if (!ref) return;
            this.promises.push(ref.ready);
            if (typeof originalRef === "function") {
              originalRef(ref);
            } else if (originalRef && typeof originalRef === "object") {
              (originalRef as React.MutableRefObject<MJX>).current = ref;
            }
          }
        });
      }

      return node;
    });
  }
}

function shouldInspect(node: ReactNode): node is React.ReactElement & React.RefAttributes<MJX> {
  return React.isValidElement(node) && typeof node.type === "function" && node.type.prototype instanceof MJX;
}

// get rid of the stupid focus rule
function killCSS() {
  for (const style of Array.from(document.querySelectorAll("style"))) {
    if (!style.textContent.match(/.MathJax:focus/)) continue;

    const sheet = style.sheet as CSSStyleSheet;
    
    for (let i = 0; i < sheet.cssRules.length; ++i) {
      const rule = sheet.cssRules[i];

      if (!isStyleRule(rule)) continue;

      if (rule.selectorText.match(".MathJax:focus")) {
        sheet.deleteRule(i);
        break;
      }
    }
  }
}
MathJaxReady.then(killCSS);

// promisified MathJax
export function typeset(node: HTMLElement): Promise<void> {
  return new Promise(async (resolve, reject) => {
    await MathJaxReady;
    
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, node]);
    MathJax.Hub.Queue(resolve);
  });
};

/* helper functions */
function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.type === rule.STYLE_RULE;
}

function onFullScreenChange(callback: EventListener) {
  for (const event of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"])
    document.addEventListener(event, callback);
}

// belongs in a separate file, but currently only used here
// (as well as in ractive-player, but that can"t be helped)
export function recursiveMap(
  children: ReactNode,
  fn: (child: ReactNode) => ReactNode
) {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    if ("children" in child.props) {
      child = React.cloneElement(child, {
        children: recursiveMap(child.props.children, fn)
      });
    }

    return fn(child);
  });
}

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

export function xyEncodeColor(color) {
  return color.toUpperCase().replace(/[#0-9]/g, (char) => {
    if (char === '#')
      return '';
    return String.fromCharCode('G'.charCodeAt(0) + parseInt(char));
  });
}
export function xyDecodeColor(color) {
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
