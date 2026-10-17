import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedProduct = {
  name: string;
  description: string;
  priceCents: number;
  category: string;
  stock: number;
  imageUrl: string;
};

const products: SeedProduct[] = [
  {
    name: "Aurora Wireless Headphones",
    description:
      "Over-ear wireless headphones with active noise cancellation, 30-hour battery life, and plush memory-foam ear cushions for all-day comfort.",
    priceCents: 19999,
    category: "Audio",
    stock: 42,
    imageUrl: "/products/headphones.svg",
  },
  {
    name: "Nimbus Mechanical Keyboard",
    description:
      "Compact 75% mechanical keyboard with hot-swappable switches, PBT keycaps, and per-key RGB lighting. Wired and Bluetooth modes.",
    priceCents: 14999,
    category: "Accessories",
    stock: 28,
    imageUrl: "/products/keyboard.svg",
  },
  {
    name: "Orbit Smartwatch",
    description:
      "Fitness-focused smartwatch with heart-rate tracking, GPS, sleep insights, and a 7-day battery. Water resistant to 5 ATM.",
    priceCents: 24999,
    category: "Wearables",
    stock: 19,
    imageUrl: "/products/smartwatch.svg",
  },
  {
    name: "Lumen Desk Lamp",
    description:
      "Architect desk lamp with stepless color temperature tuning, USB-C charging port, and a solid aluminium arm.",
    priceCents: 7999,
    category: "Home Office",
    stock: 55,
    imageUrl: "/products/lamp.svg",
  },
  {
    name: "Drift Laptop Stand",
    description:
      "Anodised aluminium laptop stand that raises your screen to eye level, improves airflow, and folds flat for travel.",
    priceCents: 5999,
    category: "Home Office",
    stock: 73,
    imageUrl: "/products/laptop-stand.svg",
  },
  {
    name: "Echo Portable Speaker",
    description:
      "Pocket-sized Bluetooth speaker with surprisingly deep bass, 12-hour playtime, and IPX7 waterproofing.",
    priceCents: 8999,
    category: "Audio",
    stock: 36,
    imageUrl: "/products/speaker.svg",
  },
  {
    name: "Pulse Wireless Mouse",
    description:
      "Ultra-light 58g wireless gaming mouse with a 26K DPI sensor, silent switches, and 70-hour battery life.",
    priceCents: 6999,
    category: "Accessories",
    stock: 61,
    imageUrl: "/products/mouse.svg",
  },
  {
    name: "Summit Backpack",
    description:
      "Weather-resistant 22L commuter backpack with a padded 16-inch laptop sleeve, magnetic buckles, and a luggage pass-through.",
    priceCents: 12999,
    category: "Bags",
    stock: 24,
    imageUrl: "/products/backpack.svg",
  },
  {
    name: "Cascade Water Bottle",
    description:
      "Double-wall insulated 750ml stainless bottle that keeps drinks cold for 24 hours or hot for 12. Leak-proof twist cap.",
    priceCents: 3499,
    category: "Lifestyle",
    stock: 90,
    imageUrl: "/products/bottle.svg",
  },
  {
    name: "Nimbus USB-C Hub",
    description:
      "7-in-1 USB-C hub with 4K HDMI, 100W passthrough charging, SD card readers, and two USB-A 3.0 ports.",
    priceCents: 5499,
    category: "Accessories",
    stock: 47,
    imageUrl: "/products/hub.svg",
  },
  {
    name: "Halo Monitor Light Bar",
    description:
      "Screen-mounted LED light bar with auto-dimming ambient sensor and zero screen glare. USB powered.",
    priceCents: 8999,
    category: "Home Office",
    stock: 31,
    imageUrl: "/products/light-bar.svg",
  },
  {
    name: "Vertex Gaming Controller",
    description:
      "Low-latency wireless controller with Hall-effect thumbsticks, remappable back paddles, and multi-device pairing.",
    priceCents: 15999,
    category: "Gaming",
    stock: 17,
    imageUrl: "/products/controller.svg",
  },
];

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("demo-password-123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Demo Admin",
      passwordHash,
      role: "ADMIN",
      cart: { create: {} },
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      name: "Demo Customer",
      passwordHash,
      role: "CUSTOMER",
      cart: { create: {} },
    },
  });

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: { ...p } });
    } else {
      await prisma.product.create({ data: p });
    }
  }

  const count = await prisma.product.count();
  console.log(`Seeded ${count} products.`);
  console.log(`Admin login:    admin@example.com / demo-password-123 (${admin.id})`);
  console.log(`Customer login: customer@example.com / demo-password-123 (${customer.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
