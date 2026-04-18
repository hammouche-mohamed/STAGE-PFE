import prisma from "../src/lib/prisma";

async function test() {
  console.log("Checking prisma models...");
  console.log("prisma.user:", !!prisma.user);
  console.log("prisma.registrationRequest:", !!prisma.registrationRequest);
  console.log("Keys on prisma:", Object.keys(prisma).filter(k => !k.startsWith("_")));
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
