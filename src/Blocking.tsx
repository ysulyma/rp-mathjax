/// <reference types="mathjax" />
import * as React from "react";
import type {ReactChild, ReactNode} from "react";
import * as EventEmitter from "events";

import {Player, Utils} from "ractive-player";
const {attachClickHandler} = Utils.mobile;

import {MJXNonBlocking, MJXTextNonBlocking} from "./NonBlocking";

export class MJXBlocking extends MJXNonBlocking {
  static contextType = Player.Context;
  context: Player;

  async componentDidMount() {
    const player = this.context;

    player.obstruct("canplay", this.ready);
    player.obstruct("canplaythrough", this.ready);

    super.componentDidMount();
  }
}

export class MJXTextBlocking extends MJXTextNonBlocking {
  static contextType = Player.Context;
  context: Player;

  async componentDidMount() {
    const player = this.context;

    player.obstruct("canplay", this.ready);
    player.obstruct("canplaythrough", this.ready);

    super.componentDidMount();
  }
}
