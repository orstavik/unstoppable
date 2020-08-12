export const testUnstoppable = [{
  name: "unstoppable: stopImmediatePropagation",
  fun: function(res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => e.stopImmediatePropagation());
    h1.addEventListener("click", e => res.push(e.cancelBubble), {unstoppable: true});
    h1.click();
  },
  expect: "1",
}, {
  name: "unstoppable: doesn't overwrite duplicate entries",
  fun: function(res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => e.stopImmediatePropagation());

    function log(e) {
      return res.push(e.cancelBubble);
    }

    h1.addEventListener("click", log);
    h1.addEventListener("click", log, {unstoppable: true});
    h1.click();
  },
  expect: "",
}, {
  name: "unstoppable: stopPropagation, same target, same phase",
  fun: function(res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => e.stopPropagation());
    h1.addEventListener("click", e => res.push(e.cancelBubble), {unstoppable: true});
    h1.click();
  },
  expect: "2",
}, {
  name: "unstoppable: stopPropagation differentPhase",
  fun: function(res) {
    const h1 = document.createElement("h1");
    const h2 = document.createElement("h2");
    h1.appendChild(h2);
    h1.addEventListener("click", function (e) {
      e.stopPropagation();
      res.push(e.cancelBubble);
    }, true);
    h1.addEventListener("click", function (e) {
      res.push(e.cancelBubble);
    }, {unstoppable: true});
    h2.click();
  },
  expect: "21",
}, {
  name: "unstoppable: different phase",
  fun: function(res) {
    //res = "";
    const h1 = document.createElement("h1");
    const span = document.createElement("span");
    h1.appendChild(span);

    function b(e) {
      res.push("b");
    }

    function c(e) {
      res.push("c");
    }

    span.addEventListener("click", e => e.stopPropagation());
    span.addEventListener("click", b);//stopPropagation() doesn't work on the same node
    span.addEventListener("click", c, {unstoppable: true});//unstoppable
    h1.addEventListener("click", b, {unstoppable: true});//unstoppable
    h1.addEventListener("click", c);                            //stoppable and on a different node than stopPropagation()
    span.click();
  },
  expect: "bcb",
}, {
  name: "unstoppable: doesn't open the door for the next listener",
  fun: function(res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => e.stopImmediatePropagation());
    h1.addEventListener("click", e => res.push("a"));
    h1.addEventListener("click", e => res.push("b"), {unstoppable: true});
    h1.addEventListener("click", e => res.push("c"));
    h1.click();
  },
  expect: "b",
}];