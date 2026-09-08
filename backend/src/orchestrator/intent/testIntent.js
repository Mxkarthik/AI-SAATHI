const { detectIntent } = require("./intentService");

console.log(
  detectIntent("I need money for farming")
);

console.log(
  detectIntent("I want to buy a tractor")
);

console.log(
  detectIntent("I need crop insurance")
);

console.log(
  detectIntent("I want to invest my savings")
);