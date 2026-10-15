const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Product = require("./models/product.model");

const sampleProducts = [
  {
    name: "Noise Cancelling Headphones",
    description: "Wireless over-ear headphones with active noise cancellation, 40-hour battery life, and plush memory foam ear cushions for all-day listening comfort.",
    price: 4999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    stock: 25,
  },
  {
    name: "Mechanical Keyboard RGB",
    description: "Custom mechanical gaming keyboard with hot-swappable tactile switches, per-key RGB backlighting, and durable anodized aluminum frame.",
    price: 2999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
    stock: 12,
  },
  {
    name: "Ultra HD 4K Action Camera",
    description: "Compact waterproof action camera featuring 4K 60fps recording, dual screens, and ultra-smooth optical image stabilization for extreme sports.",
    price: 8499,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
    stock: 8,
  },
  {
    name: "Classic Denim Jacket",
    description: "Timeless vintage washed trucker denim jacket crafted with premium heavy-duty cotton denim and brass hardware accents.",
    price: 2499,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80",
    stock: 18,
  },
  {
    name: "Minimalist Leather Watch",
    description: "Sleek Scandinavian design analog wristwatch featuring genuine Italian calfskin leather strap and sapphire crystal scratch-resistant glass.",
    price: 3899,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    stock: 15,
  },
  {
    name: "Urban Knit Running Sneakers",
    description: "Ultra-lightweight athletic running shoes engineered with responsive foam cushioning and breathable flexible knit upper mesh.",
    price: 3299,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    stock: 22,
  },
  {
    name: "Clean Architecture by Robert C. Martin",
    description: "A Craftsman's Guide to Software Structure and Design. Essential reading for building resilient, maintainable, and modular software systems.",
    price: 899,
    category: "Books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    stock: 35,
  },
  {
    name: "Designing Data-Intensive Applications",
    description: "The definitive guide to distributed architectures, storage engines, data models, and stream processing systems by Martin Kleppmann.",
    price: 1299,
    category: "Books",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&w=800&q=80",
    stock: 20,
  },
  {
    name: "Ergonomic Ceramic Coffee Mug",
    description: "Artisan handcrafted matte ceramic coffee mug with heat-insulating wooden base and comfort-grip handle, 380ml capacity.",
    price: 649,
    category: "Home",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    stock: 45,
  },
  {
    name: "Smart Ambient LED Desk Lamp",
    description: "Touch-controlled architectural desk lamp with adjustable color temperature, step-less brightness dimming, and wireless charging pad base.",
    price: 1999,
    category: "Home",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    stock: 14,
  },
  {
    name: "Aroma Diffuser & Humidifier",
    description: "Quiet ultrasonic cool mist essential oil diffuser featuring 7 ambient LED mood light modes and auto-shutoff safety sensor.",
    price: 1499,
    category: "Home",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    stock: 30,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Remove old test timestamped products
    await Product.deleteMany({ name: { $regex: /17915302/ } });

    for (const item of sampleProducts) {
      const exists = await Product.findOne({ name: item.name });
      if (!exists) {
        await Product.create(item);
        console.log(`+ Created product: ${item.name} (${item.category})`);
      } else {
        console.log(`= Product already exists: ${item.name}`);
      }
    }

    const count = await Product.countDocuments();
    console.log(`\nSeed completed! Total products in catalog: ${count}`);
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
