export const dispatchTwice = [{
  name: "dispatchTwice: normal",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => res.push(e.cancelBubble));
    const click = new MouseEvent("click");
    h1.dispatchEvent(click);
    h1.dispatchEvent(click);
  },
  expect: "00"
}, {
  name: "dispatchTwice: stop before the first call",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => res.push(e.cancelBubble, e.count));
    const click = new MouseEvent("click");
    click.stopPropagation();
    click.count = 1;
    h1.dispatchEvent(click);
    click.count = 2;
    h1.dispatchEvent(click);
  },
  expect: "02"
}, {
  name: "dispatchTwice: stop before the second call",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => res.push(e.cancelBubble, e.count));
    const click = new MouseEvent("click");
    click.count = 1;
    h1.dispatchEvent(click);
    click.stopPropagation();
    click.count = 2;
    h1.dispatchEvent(click);
  },
  expect: "01"
}, {
  name: "dispatchTwice: stop during the first propagation",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => res.push(e.cancelBubble, e.count));
    h1.addEventListener("click", e => e.stopPropagation());
    const click = new MouseEvent("click");
    click.count = 1;
    h1.dispatchEvent(click);
    click.stopPropagation();
    click.count = 2;
    h1.dispatchEvent(click);
  },
  expect: "01"
}, {
  name: "dispatchTwice: state between propagations",
  fun: function (res) {
    const h1 = document.createElement("h1");
    h1.addEventListener("click", e => e.stopPropagation());
    const click = new MouseEvent("click");
    h1.dispatchEvent(click);
    res.push(click.cancelBubble)
    click.stopPropagation();
    res.push(click.cancelBubble)
    h1.dispatchEvent(click);
  },
  expect: "01"
}];