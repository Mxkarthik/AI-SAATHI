const { understandWithGemini } = require("./geminiProvider");

const testMessages = [
  "నాకుI want to buy a tractor for my farm. I need about 4 lakh rupees. "
];

const runTests = async () => {
  for (const message of testMessages) {
    console.log("\n========================================");
    console.log("INPUT:");
    console.log(message);

    try {
      const result = await understandWithGemini(message);

      console.log("\nOUTPUT:");
      console.dir(result, { depth: null });
    } catch (error) {
      console.error("\nERROR:");
      console.error(error.message);
    }
  }
};

runTests();