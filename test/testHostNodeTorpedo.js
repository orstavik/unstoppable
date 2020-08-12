class ClosedComp extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({mode: "closed"});
    shadow.innerHTML = `<span>Hello</span> sunshine!`;
    this._hello = shadow.children[0];
  }
}

customElements.define("closed-comp", ClosedComp);

class OpenComp extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({mode: "open"});
    shadow.innerHTML = `<span>Hello</span> sunshine!`;
    this._hello = shadow.children[0];
  }
}

customElements.define("open-comp", OpenComp);

export const testHostNodeTorpedo = [{
  name: "HostNodeTorpedo: open-mode, host node as target",
  fun: function (res) {
    const open = document.createElement("open-comp");
    open.addEventListener("click", e => res.push("one"), true);
    open.addEventListener("click", e => e.stopPropagation(), true);
    open.addEventListener("click", e => res.push("two"), false);
    open.click();
  },
  expect: "onetwo",
}, {
  name: "HostNodeTorpedo: open-mode, on inner target",
  fun: function (res) {
    const open = document.createElement("open-comp");
    open.addEventListener("click", e => res.push("one"), true);
    open.addEventListener("click", e => e.stopPropagation(), true);
    open.addEventListener("click", e => res.push("two"), false);
    open._hello.click();
  },
  expect: "one",
}, {
  name: "HostNodeTorpedo: closed-mode, host node as target",
  fun: function (res) {
    const closed = document.createElement("closed-comp");
    closed.addEventListener("click", e => res.push("one"), true);
    closed.addEventListener("click", e => e.stopPropagation(), true);
    closed.addEventListener("click", e => res.push("two"), false);
    closed.click();
  },
  expect: "onetwo",
}, {
  name: "MUST FAIL!! HostNodeTorpedo: closed-mode, on inner target",
  fun: function (res) {
    const closed = document.createElement("closed-comp");
    closed.addEventListener("click", e => res.push("one"), true);
    closed.addEventListener("click", e => e.stopPropagation(), true);
    closed.addEventListener("click", e => res.push("two"), false);
    closed._hello.click();
  },
  expect: "one",
}];