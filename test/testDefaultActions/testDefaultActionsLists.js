function spoofIsTrusted(e) {
  return new Proxy(e, {
    get(obj, key) {
      if (key === "isTrusted")
        return true;
      const val = Reflect.get(obj, key);   //if we use obj[key], we get an infinite loop
      return val instanceof Function ? val.bind(obj) : val;
    }
  });
}

function printDefaultAction(action) {
  action = Object.assign({}, action);
  if (action.host)
    action.host = action.host.tagName || typeof (action.host);
  if (action.element)
    action.element = action.element.tagName || typeof (action.element);
  action.task = action.task.name;
  return JSON.stringify(action);
}

function printDefaultActions(actions) {
  return "[" + actions.map(act => printDefaultAction(act)).join(", ") + "]";
}

export const setDefaultActionTest = {
  name: "getDefaultActions",
  fun: function (res, usecase, event) {
    const flatPath = usecase().flat(Infinity);
    const origin = flatPath[flatPath.length - 1];
    const target = flatPath[0];

    origin.addEventListener(event.type, function (e) {
      if (!window["getDefaultActions"])
        return e.preventDefault();

      // const actions = getDefaultActions(e);
      const actions = getDefaultActions(spoofIsTrusted(e));
      const str = printDefaultActions(actions);
      console.log(str)//todo remove this log
      res.push(str);
      // e.preventDefault(); //bomb
    });
    target.dispatchEvent(event); //sync dispatch
  }
};