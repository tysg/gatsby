exports.testAPIHook = async (n) => {
  async function bar(x) {
    await x;
    throw new Error("Let's have a look...");
  }
  await bar(1);
};