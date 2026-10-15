const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Product = require("./models/product.model");
const express = require("express");
const customerRoutes = require("./routes/customer.routes");
const productRoutes = require("./routes/product.routes");

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runProductTests() {
  console.log("====================================================");
  console.log("  SHOPKART LAB 03 - BACKEND PRODUCT API TEST SUITE  ");
  console.log("====================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✔ Connected to MongoDB successfully\n");

  // Spin up an in-process Express server on port 5999 for test isolation
  const app = express();
  app.use(express.json());
  app.use("/customers", customerRoutes);
  app.use("/products", productRoutes);

  const server = app.listen(5999);
  const port = 5999;

  let createdProductId = null;

  try {
    // ---------------------------------------------------------
    // Test 1: Task 2 Validation - Missing Required Fields
    // ---------------------------------------------------------
    console.log("▶ [Test 1] POST /products - Missing required fields should return 400");
    const res1 = await makeRequest(
      {
        hostname: "localhost",
        port,
        path: "/products",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { name: "Incomplete Item" }
    );
    console.log(`  Status: ${res1.statusCode} (Expected: 400)`);
    console.log(`  Response: ${JSON.stringify(res1.body)}`);
    if (res1.statusCode !== 400) throw new Error("Test 1 Failed: Expected 400 for missing fields");
    console.log("  ✔ PASS: Missing fields correctly rejected with 400\n");

    // ---------------------------------------------------------
    // Test 2: Task 2 Validation - Invalid Price (<= 0)
    // ---------------------------------------------------------
    console.log("▶ [Test 2] POST /products - Invalid price (<= 0) should return 400");
    const res2 = await makeRequest(
      {
        hostname: "localhost",
        port,
        path: "/products",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        name: "Bad Price Item",
        description: "Zero price test",
        price: 0,
        category: "Electronics",
        image: "https://example.com/bad.jpg",
        stock: 5,
      }
    );
    console.log(`  Status: ${res2.statusCode} (Expected: 400)`);
    if (res2.statusCode !== 400) throw new Error("Test 2 Failed: Expected 400 for zero price");
    console.log("  ✔ PASS: Zero price correctly rejected with 400\n");

    // ---------------------------------------------------------
    // Test 3: Task 2 Validation - Invalid Stock (< 0)
    // ---------------------------------------------------------
    console.log("▶ [Test 3] POST /products - Negative stock should return 400");
    const res3 = await makeRequest(
      {
        hostname: "localhost",
        port,
        path: "/products",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        name: "Negative Stock Item",
        description: "Negative stock test",
        price: 199,
        category: "Electronics",
        image: "https://example.com/negative.jpg",
        stock: -2,
      }
    );
    console.log(`  Status: ${res3.statusCode} (Expected: 400)`);
    if (res3.statusCode !== 400) throw new Error("Test 3 Failed: Expected 400 for negative stock");
    console.log("  ✔ PASS: Negative stock correctly rejected with 400\n");

    // ---------------------------------------------------------
    // Test 4: Task 2 - Successful Product Creation (201)
    // ---------------------------------------------------------
    console.log("▶ [Test 4] POST /products - Valid payload should return 201");
    const res4 = await makeRequest(
      {
        hostname: "localhost",
        port,
        path: "/products",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        name: "Mechanical Keyboard RGB " + Date.now(),
        description: "RGB mechanical keyboard with blue switches.",
        price: 2999,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
        stock: 15,
      }
    );
    console.log(`  Status: ${res4.statusCode} (Expected: 201)`);
    console.log(`  Created Product ID: ${res4.body.product?._id}`);
    if (res4.statusCode !== 201 || !res4.body.product?._id) {
      throw new Error("Test 4 Failed: Expected 201 with product object");
    }
    createdProductId = res4.body.product._id;
    console.log("  ✔ PASS: Product successfully created with 201\n");

    // Also seed another product for filtering / sorting tests
    await makeRequest(
      {
        hostname: "localhost",
        port,
        path: "/products",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        name: "Noise Cancelling Headphones " + Date.now(),
        description: "Wireless over-ear headphones with active noise cancellation.",
        price: 4999,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        stock: 25,
      }
    );

    await makeRequest(
      {
        hostname: "localhost",
        port,
        path: "/products",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        name: "Clean Architecture Book",
        description: "A Craftsman's Guide to Software Structure and Design.",
        price: 799,
        category: "Books",
        image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
        stock: 40,
      }
    );

    // ---------------------------------------------------------
    // Test 5: Task 3 - GET /products (Get All Products)
    // ---------------------------------------------------------
    console.log("▶ [Test 5] GET /products - Returns list of products with count and success: true");
    const res5 = await makeRequest({
      hostname: "localhost",
      port,
      path: "/products",
      method: "GET",
    });
    console.log(`  Status: ${res5.statusCode} (Expected: 200)`);
    console.log(`  Success: ${res5.body.success}, Count: ${res5.body.count}`);
    if (res5.statusCode !== 200 || !res5.body.success || !Array.isArray(res5.body.products)) {
      throw new Error("Test 5 Failed: Invalid GET /products response");
    }
    console.log("  ✔ PASS: Successfully retrieved all products\n");

    // ---------------------------------------------------------
    // Test 6: Task 4 - GET /products/:id (Get Single Product)
    // ---------------------------------------------------------
    console.log("▶ [Test 6] GET /products/:id - Returns single product by valid ID");
    const res6 = await makeRequest({
      hostname: "localhost",
      port,
      path: `/products/${createdProductId}`,
      method: "GET",
    });
    console.log(`  Status: ${res6.statusCode} (Expected: 200)`);
    console.log(`  Product Name: ${res6.body.product?.name}`);
    if (res6.statusCode !== 200 || res6.body.product?._id !== createdProductId) {
      throw new Error("Test 6 Failed: Failed to get single product");
    }
    console.log("  ✔ PASS: Single product fetched successfully\n");

    // ---------------------------------------------------------
    // Test 7: Task 4 Failure - Invalid ID Format (400)
    // ---------------------------------------------------------
    console.log("▶ [Test 7] GET /products/:id - Invalid ID format should return 400");
    const res7 = await makeRequest({
      hostname: "localhost",
      port,
      path: "/products/not-a-valid-id",
      method: "GET",
    });
    console.log(`  Status: ${res7.statusCode} (Expected: 400)`);
    if (res7.statusCode !== 400) throw new Error("Test 7 Failed: Expected 400 for invalid ID format");
    console.log("  ✔ PASS: Invalid ID rejected with 400\n");

    // ---------------------------------------------------------
    // Test 8: Task 4 Failure - Non-existent ID (404)
    // ---------------------------------------------------------
    console.log("▶ [Test 8] GET /products/:id - Non-existent ID should return 404");
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res8 = await makeRequest({
      hostname: "localhost",
      port,
      path: `/products/${fakeId}`,
      method: "GET",
    });
    console.log(`  Status: ${res8.statusCode} (Expected: 404)`);
    if (res8.statusCode !== 404) throw new Error("Test 8 Failed: Expected 404 for non-existent product");
    console.log("  ✔ PASS: Non-existent product returns 404\n");

    // ---------------------------------------------------------
    // Test 9: Task 5 - Search Query (GET /products?search=keyboard)
    // ---------------------------------------------------------
    console.log("▶ [Test 9] GET /products?search=keyboard - Case-insensitive name search");
    const res9 = await makeRequest({
      hostname: "localhost",
      port,
      path: "/products?search=keyboard",
      method: "GET",
    });
    console.log(`  Status: ${res9.statusCode}, Count: ${res9.body.count}`);
    const matchesAll = res9.body.products.every((p) => /keyboard/i.test(p.name));
    if (!matchesAll || res9.body.count === 0) {
      throw new Error("Test 9 Failed: Search didn't return keyboard products");
    }
    console.log("  ✔ PASS: Search query correctly filtered by name\n");

    // ---------------------------------------------------------
    // Test 10: Task 5 - Category Query (GET /products?category=Books)
    // ---------------------------------------------------------
    console.log("▶ [Test 10] GET /products?category=Books - Filter by category");
    const res10 = await makeRequest({
      hostname: "localhost",
      port,
      path: "/products?category=Books",
      method: "GET",
    });
    console.log(`  Status: ${res10.statusCode}, Count: ${res10.body.count}`);
    const booksOnly = res10.body.products.every((p) => p.category.toLowerCase() === "books");
    if (!booksOnly || res10.body.count === 0) {
      throw new Error("Test 10 Failed: Category filter didn't filter books");
    }
    console.log("  ✔ PASS: Category filter correctly filtered products\n");

    // ---------------------------------------------------------
    // Test 11: Task 5 - Combined Query (GET /products?search=keyboard&category=Electronics)
    // ---------------------------------------------------------
    console.log("▶ [Test 11] GET /products?search=keyboard&category=Electronics - Combined search & category");
    const res11 = await makeRequest({
      hostname: "localhost",
      port,
      path: "/products?search=keyboard&category=Electronics",
      method: "GET",
    });
    console.log(`  Status: ${res11.statusCode}, Count: ${res11.body.count}`);
    const combinedValid = res11.body.products.every(
      (p) => /keyboard/i.test(p.name) && p.category.toLowerCase() === "electronics"
    );
    if (!combinedValid || res11.body.count === 0) {
      throw new Error("Test 11 Failed: Combined filter failed");
    }
    console.log("  ✔ PASS: Combined query filter succeeded\n");

    // ---------------------------------------------------------
    // Test 12: Bonus Challenge - Sorting (GET /products?sort=price_asc & sort=price_desc)
    // ---------------------------------------------------------
    console.log("▶ [Test 12] Bonus Challenge: Sorting by price");
    const resAsc = await makeRequest({
      hostname: "localhost",
      port,
      path: "/products?sort=price_asc",
      method: "GET",
    });
    const pricesAsc = resAsc.body.products.map((p) => p.price);
    const isSortedAsc = pricesAsc.every((v, i, a) => !i || a[i - 1] <= v);
    console.log(`  price_asc: [${pricesAsc.slice(0, 5).join(", ")}], Sorted: ${isSortedAsc}`);

    const resDesc = await makeRequest({
      hostname: "localhost",
      port,
      path: "/products?sort=price_desc",
      method: "GET",
    });
    const pricesDesc = resDesc.body.products.map((p) => p.price);
    const isSortedDesc = pricesDesc.every((v, i, a) => !i || a[i - 1] >= v);
    console.log(`  price_desc: [${pricesDesc.slice(0, 5).join(", ")}], Sorted: ${isSortedDesc}`);

    if (!isSortedAsc || !isSortedDesc) {
      throw new Error("Test 12 Failed: Price sorting failed");
    }
    console.log("  ✔ PASS: Sorting bonus challenge passed flawlessly!\n");

    console.log("====================================================");
    console.log("  ALL BACKEND TESTS PASSED (100% SUCCESS)           ");
    console.log("====================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runProductTests().catch((err) => {
  console.error("❌ Test suite encountered an error:", err);
  process.exit(1);
});
