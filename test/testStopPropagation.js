import {cleanDom} from "./useCase1.js";

//todo . test when stopPropagation called inside shadowDom, both normal and slotted.
export const testStopProp = [{
  name: "shadowTorpedo: stopPropagation(true)",
  fun: function(res) {

    const h1 = document.createElement("h1");
    const h2 = document.createElement("h2");
    h1.appendChild(h2);

    // res = "";
      const dom = cleanDom();
  for (let elName in dom) {
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, {});
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, true);
  }

    dom.shadowH1.addEventListener("click", function (e) {
      e.stopPropagation(true);
    });
    dom.shadowH1.dispatchEvent(new Event("click", {composed: true, bubbles: true}));
  },
  expect: "div slot slotRoot slotSpan slotSlot shadowComp shadowRoot shadowH1 shadowH1 shadowComp slotSlot slotSpan slotRoot slot div ",
}, {
  name: "captureTorpedo: stopPropagation(true)",
  fun: function(res) {
    //res = "";
      const dom = cleanDom();
  for (let elName in dom) {
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, {});
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, true);
  }

    dom.div.addEventListener("click", function (e) {
      e.stopPropagation(true);
    }, true);
    dom.shadowH1.dispatchEvent(new Event("click", {composed: true, bubbles: true}));
  },
  expect: "div slotRoot slotSpan slotSlot shadowRoot shadowH1 shadowH1 shadowRoot slotSlot slotSpan slotRoot ",
}, {
  name: "slotTorpedo: stopPropagation(true)",
  fun: function(res) {
    //res = "";
      const dom = cleanDom();
  for (let elName in dom) {
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, {});
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, true);
  }

    dom.slotSlot.addEventListener("click", function (e) {
      e.stopPropagation(true);
    });
    dom.shadowH1.dispatchEvent(new Event("click", {composed: true, bubbles: true}));
  },
  expect: "div slot slotRoot slotSpan slotSlot shadowComp shadowRoot shadowH1 shadowH1 shadowRoot shadowComp slotSlot slot div ",
}, {
  name: "slotCaptureTorpedo: stopPropagation(true)",
  fun: function(res) {
    //res = "";
      const dom = cleanDom();
  for (let elName in dom) {
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, {});
    dom[elName].addEventListener("click", function (e) {
      res.push(elName + " ");
    }, true);
  }

    dom.slotRoot.addEventListener("click", function (e) {
      e.stopPropagation(true);
    }, true);
    dom.shadowH1.dispatchEvent(new Event("click", {composed: true, bubbles: true}));
  },
  expect: "div slot slotRoot shadowComp shadowRoot shadowH1 shadowH1 shadowRoot shadowComp slot div ",
}];

export const testStopProp2 = [{
  name: "shadowTorpedo: addEventListener(.., .., {scoped: true}/{unstoppable: true} )",
  fun: function(res) {
    //res = "";
    const dom = cleanDom();

    dom.div.addEventListener("click", function (e) {
      e.stopPropagation();
    }, true);

    dom.shadowH1.addEventListener("click", function (e) {
      res.push("DifferentScope ");
    }, {scoped: true});

    dom.div.addEventListener("click", function (e) {
      res.push("SameScope ");
    }, {scoped: true});

    dom.div.addEventListener("click", function (e) {
      res.push("unstoppable");
    }, {unstoppable: true});

    dom.shadowH1.dispatchEvent(new Event("click", {composed: true, bubbles: true}));
  },
  expect: "DifferentScope unstoppable",
}, {
  name: "shadowTorpedo: addEventListener(.., .., {scoped: true}/{unstoppable: true} ) 2",
  fun: function(res) {
    //res = "";
    const dom = cleanDom();

    dom.shadowH1.addEventListener("click", function (e) {
      e.stopImmediatePropagation();
    }, true);

    dom.shadowH1.addEventListener("click", function (e) {
      res.push("SameScope");
    }, {scoped: true});

    dom.div.addEventListener("click", function (e) {
      res.push("DifferentScope");
    }, {scoped: true});

    dom.shadowH1.dispatchEvent(new Event("click", {composed: true, bubbles: true}));
  },
  expect: "DifferentScope",
}, {
  name: "shadowTorpedo: Event.isScoped",
  fun: function(res) {
    //res = "";
    const dom = cleanDom();

    dom.div.addEventListener("click", function (e) {
      e.stopPropagation();
    }, true);

    dom.shadowH1.addEventListener("click", function (e) {
      res.push("DifferentScope");
    });
    dom.div.addEventListener("click", function (e) {
      res.push("SameScope");
    });
    const event = new Event("click", {composed: true, bubbles: true});
    // event.isScoped = true;           is always true
    dom.shadowH1.dispatchEvent(event);
  },
  expect: "DifferentScope",

}];