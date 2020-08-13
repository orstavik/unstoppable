class AA extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = "<slot></slot>";
    this.addEventListener("click", function(e){

      if(this.hasAttribute("href"))
        e.addDefault && e.addDefault(this.requestNavigate.bind(this), this, {additive: false, irreversible: false, native: "kinda"});
    })
  }

  requestNavigate(targetWindow){
    const href = new URL(this.getAttribute("href"));
    document.open(href, targetWindow);
  }
}

customElements.define("a-a", AA);


//useCase aaH1
// Flattened DOM                   | DOM context
//----------------------------------------------------------------
//  a-a[href=#sunshine]            | 1. main
//    aaRoot                       | A. aaRoot
//      aaSlot                     | A. aaRoot
//        h1                       | 1. main

//<a-a href=#sunshine>
//  <h1></h1>
//</a-a>

export function aaH1() {
  const aa = document.createElement("a-a");
  aa.setAttribute("href", "#sunshine")
  const h1 = document.createElement("h1");
  aa.appendChild(h1);

  const aaRoot = aa.shadowRoot;
  const aaSlot = aaRoot.children[0];

  const usecase = [
    h1,
    [
      aaSlot,
      aaRoot
    ],
    aa
  ];
  Object.freeze(usecase, true);
  return usecase;
}

//useCase aaCheckbox
// Flattened DOM                   | DOM context
//----------------------------------------------------------------
//  a-a[href=#sunshine]            | 1. main
//    aaRoot                       | A. aaRoot
//      aaSlot                     | A. aaRoot
//        input[type=checkbox]     | 1. main

//<a-a href=#sunshine>
//  <input type=checkbox>
//</a-a>

export function aaCheckbox() {
  const aa = document.createElement("a-a");
  aa.setAttribute("href", "#sunshine")
  const input = document.querySelector("input");
  input.setAttribute("type", "checkbox")
  aa.appendChild(input);

  const aaRoot = aa.shadowRoot;
  const aaSlot = aaRoot.children[0];

  const usecase = [
    input,
    [
      aaSlot,
      aaRoot
    ],
    aa
  ];
  Object.freeze(usecase, true);
  return usecase;
}