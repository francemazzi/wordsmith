import { extract, replace, process } from "../../src/index";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { unlink, readFile } from "fs/promises";
import { join } from "path";

describe("Integration Tests with .docx files", () => {
  const testDir = "./test-template/file-to-test";
  const groundTruthDir = "./test-template/ground-truth";
  const outputDir = "./output";

  // Test data for test_1.docx (must match ground truth)
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

  beforeAll(() => {
    // Create output directory if it doesn't exist
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Clean up output files
    const outputFiles = [
      join(outputDir, "test_1_output.docx"),
      join(outputDir, "test_2_output.docx"),
      join(outputDir, "test-output.docx"),
    ];

    for (const file of outputFiles) {
      if (existsSync(file)) {
        await unlink(file);
      }
    }
  });

  describe("Test File Discovery", () => {
    it("should have test_1.docx", () => {
      const testFile = join(testDir, "test_1.docx");
      expect(existsSync(testFile)).toBe(true);
    });

    it("should have test_2.docx", () => {
      const testFile = join(testDir, "test_2.docx");
      expect(existsSync(testFile)).toBe(true);
    });

    it("should have corresponding ground truth files", () => {
      expect(existsSync(join(groundTruthDir, "test_1_ground_truth.docx"))).toBe(
        true
      );
      expect(existsSync(join(groundTruthDir, "test_2_ground_truth.docx"))).toBe(
        true
      );
    });
  });

  describe("Variable Extraction", () => {
    it("should extract variables from test_1.docx", async () => {
      const testFile = join(testDir, "test_1.docx");
      if (!existsSync(testFile)) return;

      const result = await extract(testFile);

      expect(result).toBeDefined();
      expect(result.variables).toBeDefined();
      expect(Array.isArray(result.variables)).toBe(true);
      expect(result.variables.length).toBeGreaterThan(0);

      // Check for expected variables
      expect(result.variables).toContain("companyName");
      expect(result.variables).toContain("reportDate");
      expect(result.variables).toContain("author");
      expect(result.variables).toContain("isApproved");

      // Check for table variables
      expect(result.tableVariables.resources).toBeDefined();
      expect(result.tableVariables.resources).toContain("name");
      expect(result.tableVariables.resources).toContain("role");
    });

    it("should extract variables from test_2.docx", async () => {
      const testFile = join(testDir, "test_2.docx");
      if (!existsSync(testFile)) return;

      const result = await extract(testFile);

      expect(result).toBeDefined();
      expect(result.variables).toBeDefined();
      expect(Array.isArray(result.variables)).toBe(true);

      // Check for expected variables
      expect(result.variables).toContain("invoiceNumber");
      expect(result.variables).toContain("invoiceDate");

      // Check for table variables
      expect(result.tableVariables).toBeDefined();
      expect(result.tableVariables.user).toBeDefined();
      expect(result.tableVariables.user).toContain("name");
      expect(result.tableVariables.user).toContain("email");

      expect(result.tableVariables.address).toBeDefined();
      expect(result.tableVariables.address).toContain("street");
      expect(result.tableVariables.address).toContain("city");
    });
  });

  describe("Variable Replacement", () => {
    it("should replace variables in test_1.docx", async () => {
      const testFile = join(testDir, "test_1.docx");
      if (!existsSync(testFile)) return;

      const buffer = await replace(testFile, test1Data);

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);

      // Save for manual inspection
      const outputFile = join(outputDir, "test_1_output.docx");
      writeFileSync(outputFile, buffer);
      expect(existsSync(outputFile)).toBe(true);
    });

    it("should replace variables in test_2.docx with table expansion", async () => {
      const testFile = join(testDir, "test_2.docx");
      if (!existsSync(testFile)) return;

      const buffer = await replace(testFile, test2Data);

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);

      // Save for manual inspection
      const outputFile = join(outputDir, "test_2_output.docx");
      writeFileSync(outputFile, buffer);
      expect(existsSync(outputFile)).toBe(true);
    });
  });

  describe("End-to-End Processing", () => {
    it("should process test_1.docx end-to-end", async () => {
      const testFile = join(testDir, "test_1.docx");
      const outputFile = join(outputDir, "test_1_output.docx");

      if (!existsSync(testFile)) return;

      await process(testFile, test1Data, outputFile);

      expect(existsSync(outputFile)).toBe(true);

      // Verify the output is a valid docx (starts with PK signature)
      const buffer = await readFile(outputFile);
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
    });

    it("should process test_2.docx end-to-end with tables", async () => {
      const testFile = join(testDir, "test_2.docx");
      const outputFile = join(outputDir, "test_2_output.docx");

      if (!existsSync(testFile)) return;

      await process(testFile, test2Data, outputFile);

      expect(existsSync(outputFile)).toBe(true);

      // Verify the output is a valid docx
      const buffer = await readFile(outputFile);
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
    });
  });

  describe("Buffer Support", () => {
    it("should work with Buffers instead of file paths", async () => {
      const testFile = join(testDir, "test_1.docx");
      if (!existsSync(testFile)) return;

      const inputBuffer = await readFile(testFile);
      const outputBuffer = await replace(inputBuffer, test1Data);

      expect(Buffer.isBuffer(outputBuffer)).toBe(true);
      expect(outputBuffer.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty array for table variables", async () => {
      const testFile = join(testDir, "test_2.docx");
      if (!existsSync(testFile)) return;

      const dataWithEmptyArrays = {
        ...test2Data,
        user: [], // Empty array
        address: [], // Empty array
      };

      const buffer = await replace(testFile, dataWithEmptyArrays);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle missing variables gracefully", async () => {
      const testFile = join(testDir, "test_1.docx");
      if (!existsSync(testFile)) return;

      const partialData = {
        companyName: "Test Company",
        reportDate: "2025-11-03",
        // Missing other variables
      };

      const buffer = await replace(testFile, partialData);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle special characters in data", async () => {
      const testFile = join(testDir, "test_1.docx");
      if (!existsSync(testFile)) return;

      const dataWithSpecialChars = {
        ...test1Data,
        companyName: "Test & Company™",
        projectDescription: 'Project with "quotes" and special chars',
      };

      const buffer = await replace(testFile, dataWithSpecialChars);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("All Test Files", () => {
    it("should successfully process all test files", async () => {
      const testFiles = ["test_1.docx", "test_2.docx"];
      const testDataMap: Record<string, any> = {
        test_1: test1Data,
        test_2: test2Data,
      };

      for (const filename of testFiles) {
        const testFile = join(testDir, filename);
        const baseName = filename.replace(".docx", "");
        const outputFile = join(outputDir, `${baseName}_output.docx`);
        const data = testDataMap[baseName];

        if (!existsSync(testFile)) {
          console.log(`⚠️  Skipping ${filename} - file not found`);
          continue;
        }

        // Extract
        const extracted = await extract(testFile);
        expect(extracted.variables).toBeDefined();

        // Replace
        const buffer = await replace(testFile, data);
        expect(buffer).toBeDefined();

        // Process
        await process(testFile, data, outputFile);
        expect(existsSync(outputFile)).toBe(true);

        console.log(`✅ Successfully processed ${filename}`);
      }
    });
  });
});
