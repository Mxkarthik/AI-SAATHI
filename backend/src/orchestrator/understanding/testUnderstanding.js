const {
  understandMessage
} = require("./understandingService");

const testMessages = [
  "నాకు వ్యవసాయం కోసం డబ్బు కావాలి.",
  "నాకు వరి పంట కోసం యాభై వేల రూపాయలు కావాలి.",
  "I need money for farming.",
  "I want to buy a tractor."
];

const runTests = async () => {
  for (const message of testMessages) {
    const result = await understandMessage(message);

    console.log("\nInput:", message);
    console.log("Output:", result);
  }
};

runTests();