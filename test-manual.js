/**
 * Manual test script to generate output files for inspection
 * Run with: node test-manual.js
 */

import { extract, replace, process } from "./dist/index.js";
import { existsSync, mkdirSync } from "fs";

// Test data for test_1.docx (matches ground truth)
const test1Data = {
  companyName: "TechGrow Ltd.",
  reportDate: "03/11/2025",
  author: "Alice Rossi",
  reviewer: "Bob Johnson",
  projectName: "AI Workflow Automation",
  clientName: "GreenAgri Inc.",
  projectDescription:
    "An AI-powered system that automates document generation and workflow validation for agricultural compliance reports.",

  // Conditional - TRUE to show approved block
  isApproved: true,
  approvalDate: "02/11/2025",
  approverName: "Dr. Marco Verdi",

  // Table resources
  resources: [
    { name: "Luca Bianchi", role: "Engineer", hours: "40", completed: "Yes" },
    {
      name: "Sara Neri",
      role: "Data Scientist",
      hours: "35",
      completed: "Yes",
    },
    { name: "Tom Chen", role: "Reviewer", hours: "10", completed: "No" },
  ],
};

// Test data for test_2.docx
const test2Data = {
  invoiceNumber: "INV-2025-001",
  invoiceDate: "2025-11-03",
  paymentDate: "2025-12-03",
  paymentMethod: "Bank Transfer",
  dueDate: "2025-11-30",
  subtotal: "5,000.00",
  taxRate: "22%",
  taxAmount: "1,100.00",
  grandTotal: "6,100.00",
  customerNotes: "Thank you for your business!",
  salesRep: "Giovanni Bianchi",
  templateVersion: "1.0",

  // Conditional
  isPaid: true,

  // Single objects (NOT arrays) - used in paragraphs
  user: {
    name: "Mario Rossi",
    email: "mario.rossi@example.com",
  },

  address: {
    street: "Via Roma 123",
    city: "Milano",
    country: "Italia",
  },

  // Table data - products (the only array that expands)
  products: [
    { name: "Product A", quantity: "10", price: "$100", total: "$1,000" },
    { name: "Product B", quantity: "5", price: "$200", total: "$1,000" },
    { name: "Product C", quantity: "8", price: "$150", total: "$1,200" },
  ],
};

async function runTests() {
  console.log("🧪 wordsmith - Test Manuale\n");

  // Create output directory
  if (!existsSync("./output")) {
    mkdirSync("./output", { recursive: true });
  }

  // Test 1
  console.log("📄 Processing test_1.docx...");
  try {
    const vars1 = await extract("./test-template/file-to-test/test_1.docx");
    console.log("   Variables found:", vars1.variables);

    await process(
      "./test-template/file-to-test/test_1.docx",
      test1Data,
      "./output/test_1_output.docx"
    );
    console.log("   ✅ Generated: output/test_1_output.docx\n");
  } catch (error) {
    console.error("   ❌ Error:", error.message, "\n");
  }

  // Test 2
  console.log("📄 Processing test_2.docx...");
  try {
    const vars2 = await extract("./test-template/file-to-test/test_2.docx");
    console.log("   Variables found:", vars2.variables);
    console.log("   Table variables:", vars2.tableVariables);

    await process(
      "./test-template/file-to-test/test_2.docx",
      test2Data,
      "./output/test_2_output.docx"
    );
    console.log("   ✅ Generated: output/test_2_output.docx\n");
  } catch (error) {
    console.error("   ❌ Error:", error.message, "\n");
  }

  // Summary
  console.log("\n📊 Riepilogo:");
  console.log("   File generati in: ./output/");
  console.log("   - test_1_output.docx (documento con variabili semplici)");
  console.log("   - test_2_output.docx (documento con tabelle dinamiche)");
  console.log(
    "\n💡 Confronta i file generati con quelli in test-template/ground-truth/"
  );
  console.log("\n✨ Test completato!\n");
}

runTests().catch(console.error);
