export const cancelBubbleStopPropagationTests = [{
  name: "cancelBubble: stopPropagation() beforeDispatch",
  fun: function (res) {
    const click = new MouseEvent("click");
    click.stopPropagation();
    res.push(click.cancelBubble);
  },
  expect: "1",
}, {
  name: "cancelBubble: stopPropagation() same listener",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.stopPropagation();
      res.push(e.cancelBubble);
    });
    h1.click();
  },
  expect: "2",
}, {
  name: "cancelBubble: stopPropagation() same event target and phase, different listener",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    });
    h1.click();
  },
  expect: "2",
}, {
  name: "cancelBubble: stopPropagation() same event target and same capture phase",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.stopPropagation();
    }, true);
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    });
    h1.click();
  },
  expect: "2",
}, {
  name: "cancelBubble: stopPropagation() same event target, different event phase and same capture phase",
  fun: function (res) {
    const h1 = document.createElement("h1");
    const h2 = document.createElement("h2");
    h1.appendChild(h2);
    h1.addEventListener("click", function (e) {
      e.stopPropagation();
    }, true);
    h1.addEventListener("click", function (e) {
      res.push("listener should have been stopped");
    });
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h2.dispatchEvent(click);
  },
  expect: "",
}, {
  name: "cancelBubble: stopPropagation() is reset after dispatch completed",
  fun: function (res) {
    const h1 = document.createElement("h1");
    const h2 = document.createElement("h2");
    h1.appendChild(h2);
    h1.addEventListener("click", function (e) {
      e.stopPropagation();
      res.push(e.cancelBubble);
    }, true);
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h2.dispatchEvent(click);
    res.push(click.cancelBubble);
  },
  expect: "20",
}];

export const cancelBubbleEqualTrueTests = [{
  name: "cancelBubble: cancelBubble = true beforeDispatch",
  fun: function (res) {
    const click = new MouseEvent("click");
    click.cancelBubble = true;
    res.push(click.cancelBubble);
  },
  expect: "1",
}, {
  name: "cancelBubble: cancelBubble = true same listener",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.cancelBubble = true;
      res.push(e.cancelBubble);
    });
    h1.click();
  },
  expect: "2",
}, {
  name: "cancelBubble: cancelBubble = true same event target and phase, different listener",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.cancelBubble = true;
    });
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    });
    h1.click();
  },
  expect: "2",
}, {
  name: "cancelBubble: cancelBubble = true same event target and same capture phase",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.cancelBubble = true;
    }, true);
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    });
    h1.click();
  },
  expect: "2",
}, {
  name: "cancelBubble: cancelBubble = true same event target, different event phase and same capture phase",
  fun: function (res) {
    const h1 = document.createElement("h1");
    const h2 = document.createElement("h2");
    h1.appendChild(h2);
    h1.addEventListener("click", function (e) {
      e.cancelBubble = true;
    }, true);
    h1.addEventListener("click", function (e) {
      res.push("listener should have been stopped");
    });
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h2.dispatchEvent(click);
  },
  expect: "",
}, {
  name: "cancelBubble: cancelBubble = true is reset after dispatch completed",
  fun: function (res) {
    const h1 = document.createElement("h1");
    const h2 = document.createElement("h2");
    h1.appendChild(h2);
    h1.addEventListener("click", function (e) {
      e.cancelBubble = true;
      res.push(e.cancelBubble);
    }, true);
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h2.dispatchEvent(click);
    res.push(click.cancelBubble);
  },
  expect: "20",
}];

export const cancelBubbleStopImmediateTests = [{
  name: "cancelBubble: stopImmediatePropagation() beforeDispatch",
  fun: function (res) {
    const click = new MouseEvent("click");
    click.stopImmediatePropagation();
    res.push(click.cancelBubble);
  },
  expect: "1",
}, {
  name: "cancelBubble: stopImmediatePropagation() same listener",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.stopImmediatePropagation();
      res.push(e.cancelBubble);
    });
    h1.click();
  },
  expect: "1",
}, {
  name: "cancelBubble: stopImmediatePropagation() same event target, but different event listeners",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.stopImmediatePropagation();
    }, true);
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    });
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h1.dispatchEvent(click);
  },
  expect: "",
}, {
  name: "cancelBubble: stopImmediatePropagation() same event target, but different phase",
  fun: function (res) {
    const h1 = document.createElement("h1");
    const h2 = document.createElement("h2");
    h1.appendChild(h2);
    h1.addEventListener("click", function (e) {
      e.stopImmediatePropagation();
    });
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble); //this should never run
    });
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h2.dispatchEvent(click);
  },
  expect: "",
}, {
  name: "cancelBubble: stopImmediatePropagation() after stopPropagation()",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      res.push(e.cancelBubble);
    });
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h1.dispatchEvent(click);
  },
  expect: "1",
}, {
  name: "cancelBubble: stopImmediatePropagation() is reset when propagation ends",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      e.stopImmediatePropagation();
      res.push(e.cancelBubble);
    });
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h1.dispatchEvent(click);
    res.push(click.cancelBubble);
  },
  expect: "10",
}, {
  name: "cancelBubble: stopImmediatePropagation(), dispatch twice, one listener runs, one is stopped",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    });
    h1.addEventListener("click", function (e) {
      e.stopImmediatePropagation();
    });
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    });
    let click = new MouseEvent("click", {composed: true, bubbles: true});
    h1.dispatchEvent(click);
    h1.dispatchEvent(click);
    res.push(click.cancelBubble);
  },
  expect: "000",
}];