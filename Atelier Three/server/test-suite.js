const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// Require our app components
const Customer = require("./models/customer.model");

// Simple fetch-like helper using node http to test raw requests & examine Set-Cookie headers
function request(options, data) {
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

async function runTests() {
  console.log("=========================================");
  console.log("  SHOPKART LAB 01 - AUTOMATED TEST SUITE ");
  console.log("=========================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✔ Connected to MongoDB for testing");

  // Clean up any previous test user
  const testEmail = "test_lab01_" + Date.now() + "@shopkart.com";
  await Customer.deleteMany({ email: { $regex: /test_lab01_/ } });

  // Start app on test port
  const express = require("express");
  const cookieParser = require("cookie-parser");
  const customerRoutes = require("./routes/customer.routes");

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/customers", customerRoutes);

  const server = app.listen(5001);
  console.log("✔ Test server listening on port 5001\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Task 1 - Missing Field (should return 400)
    console.log("--- Task 1: Registration Tests ---");
    const resMissing = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { fullName: "Test User", email: testEmail, password: "password123" /* phone missing */ }
    );
    assert(resMissing.statusCode === 400, "Missing phone returns 400 Bad Request");

    // TEST 2: Task 1 - Short Password (should return 400)
    const resShortPass = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { fullName: "Test User", email: testEmail, password: "123", phone: "9876543210" }
    );
    assert(resShortPass.statusCode === 400, "Short password (<6 chars) returns 400 Bad Request");

    // TEST 3: Task 1 - Valid Registration (should return 201)
    const resRegister = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { fullName: "Rohith Reddy", email: testEmail, password: "securePassword123", phone: "9876543210" }
    );
    assert(resRegister.statusCode === 201, "Valid registration returns 201 Created");
    assert(resRegister.body.success === true, "Registration response has success: true");
    assert(resRegister.body.customer && resRegister.body.customer.email === testEmail, "Customer email matches");
    assert(resRegister.body.customer.password === undefined, "Password is NOT exposed in response");

    // Verify password is encrypted in database
    const savedCustomer = await Customer.findOne({ email: testEmail });
    assert(
      savedCustomer && savedCustomer.password !== "securePassword123" && savedCustomer.password.startsWith("$2"),
      "Password in MongoDB is a valid bcrypt hash"
    );

    // TEST 4: Task 1 - Duplicate Email Registration (should return 409)
    const resDuplicate = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { fullName: "Rohith Duplicate", email: testEmail, password: "securePassword123", phone: "9876543210" }
    );
    assert(resDuplicate.statusCode === 409, "Duplicate email returns 409 Conflict");

    // TEST 5: Task 2 - Login Invalid Credentials (should return 401)
    console.log("\n--- Task 2: Login Tests ---");
    const resInvalidLogin = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: "wrongPassword" }
    );
    assert(resInvalidLogin.statusCode === 401, "Invalid password returns 401 Unauthorized");
    assert(resInvalidLogin.body.message === "Invalid credentials", "Error message does not leak credential specificity");

    // TEST 6: Task 2 - Successful Login & Cookie Verification
    const resLogin = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: "securePassword123" }
    );
    assert(resLogin.statusCode === 200, "Valid login returns 200 OK");
    assert(resLogin.body.success === true, "Login response has success: true");

    const setCookie = resLogin.headers["set-cookie"];
    assert(setCookie && setCookie.length > 0, "Set-Cookie header is present in login response");
    const cookieString = setCookie ? setCookie[0] : "";
    assert(cookieString.includes("token="), "Cookie contains JWT token");
    assert(cookieString.toLowerCase().includes("httponly"), "Cookie has HttpOnly flag enabled");

    // Extract cookie for subsequent authenticated requests
    const authCookie = cookieString.split(";")[0];

    // TEST 7: Task 3 - Profile without Cookie (should return 401)
    console.log("\n--- Task 3: Profile (/customers/me) Tests ---");
    const resProfileNoAuth = await request({
      hostname: "localhost",
      port: 5001,
      path: "/customers/me",
      method: "GET",
    });
    assert(resProfileNoAuth.statusCode === 401, "Accessing /customers/me without cookie returns 401 Unauthorized");

    // TEST 8: Task 3 - Profile with Cookie (should return 200 & profile)
    const resProfileAuth = await request({
      hostname: "localhost",
      port: 5001,
      path: "/customers/me",
      method: "GET",
      headers: { Cookie: authCookie },
    });
    assert(resProfileAuth.statusCode === 200, "Accessing /customers/me with cookie returns 200 OK");
    assert(resProfileAuth.body.email === testEmail, "Profile email matches logged in customer");
    assert(resProfileAuth.body.password === undefined, "Profile does not expose password");

    // TEST 9: Bonus Challenge - Change Password
    console.log("\n--- Bonus Challenge: Change Password Tests ---");
    // Invalid old password
    const resChangePassWrong = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/change-password",
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
      },
      { oldPassword: "incorrectOldPassword", newPassword: "brandNewPassword123" }
    );
    assert(resChangePassWrong.statusCode === 400, "Wrong old password returns 400 Bad Request");

    // Valid change password
    const resChangePass = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/change-password",
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
      },
      { oldPassword: "securePassword123", newPassword: "brandNewPassword123" }
    );
    assert(resChangePass.statusCode === 200, "Valid password change returns 200 OK");

    // Verify login with old password fails
    const resOldPassLogin = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: "securePassword123" }
    );
    assert(resOldPassLogin.statusCode === 401, "Login with old password now fails with 401");

    // Verify login with new password succeeds
    const resNewPassLogin = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/customers/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: "brandNewPassword123" }
    );
    assert(resNewPassLogin.statusCode === 200, "Login with new password succeeds with 200");
    const newAuthCookie = resNewPassLogin.headers["set-cookie"][0].split(";")[0];

    // TEST 10: Task 4 - Logout
    console.log("\n--- Task 4: Logout Tests ---");
    const resLogout = await request({
      hostname: "localhost",
      port: 5001,
      path: "/customers/logout",
      method: "POST",
      headers: { Cookie: newAuthCookie },
    });
    assert(resLogout.statusCode === 200, "Logout returns 200 OK");
    const logoutCookie = resLogout.headers["set-cookie"] ? resLogout.headers["set-cookie"][0] : "";
    assert(
      logoutCookie.includes("token=;") || logoutCookie.includes("Expires=Thu, 01 Jan 1970"),
      "Logout clears the cookie (sets expired/empty)"
    );

    // Clean up test customer from database
    await Customer.deleteOne({ email: testEmail });
    console.log("\n✔ Cleaned up test data");

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log("\n=========================================");
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=========================================\n");
  }
}

runTests();
