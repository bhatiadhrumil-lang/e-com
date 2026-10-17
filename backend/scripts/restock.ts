import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const stocks: Record<string, number> = {
  "Aurora Wireless Headphones": 42,
  "Nimbus Mechanical Keyboard": 28,
  "Orbit Smartwatch": 19,
  "Lumen Desk Lamp": 55,
  "Drift Laptop Stand": 73,
  "Echo Portable Speaker": 36,
  "Pulse Wireless Mouse": 61,
  "Summit Backpack": 24,
  "Cascade Water Bottle": 90,
  "Nimbus USB-C Hub": 47,
  "Halo Monitor Light Bar": 31,
  "Vertex Gaming Controller": 17,
};

let n = 0;
for (const [name, stock] of Object.entries(stocks)) {
  const r = await prisma.product.updateMany({
    where: { name },
    data: { stock, isActive: true },
  });
  n += r.count;
}
console.log(`restocked ${n} products`);
await prisma.$disconnect();
