import * as React from "react";

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  display?: boolean;
  resize?: boolean;
  renderer?: "HTML-CSS" | "CommonHTML" | "PreviewHTML" | "NativeMML" | "SVG" | "PlainSource";
}

export class MJXNonBlocking extends React.Component<Props, {}> {}

export class MJXBlocking extends MJXNonBlocking {}

export class MJX extends MJXNonBlocking {}

export const MathJaxReady: Promise<typeof MathJax>;
