/**
 * Test script con confronto tra output e ground truth
 */

import { extract, replace } from "./dist/index.js";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

// Dati CORRETTI per test_1.docx (basati sul ground truth)
const test1Data = {
  companyName: "TechGrow Ltd.",
  reportDate: "03/11/2025",
  author: "Alice Rossi",
  reviewer: "Bob Johnson",
  projectName: "AI Workflow Automation",
  clientName: "GreenAgri Inc.",
  projectDescription:
    "An AI-powered system that automates document generation and workflow validation for agricultural compliance reports.",
  
  // Condizionale - TRUE per mostrare il blocco approved
  isApproved: true,
  approvalDate: "02/11/2025",
  approverName: "Dr. Marco Verdi",

  // Tabella resources
  resources: [
    { name: "Luca Bianchi", role: "Engineer", hours: "40", completed: "Yes" },
    { name: "Sara Neri", role: "Data Scientist", hours: "35", completed: "Yes" },
    { name: "Tom Chen", role: "Reviewer", hours: "10", completed: "No" },
  ],
};

async function testWithComparison() {
  console.log("🧪 Test con Confronto Ground Truth\n");

  try {
    // 1. Estrai variabili
    console.log("1️⃣  Estraendo variabili da test_1.docx...");
    const extracted = await extract("./test-template/file-to-test/test_1.docx");
    console.log("   Variables:", extracted.variables);
    console.log("   Table variables:", extracted.tableVariables);

    // 2. Processa il file
    console.log("\n2️⃣  Processando test_1.docx...");
    const outputBuffer = await replace(
      "./test-template/file-to-test/test_1.docx",
      test1Data
    );

    // 3. Salva l'output
    const outputPath = "./output/test_1_with_conditionals.docx";
    await writeFile(outputPath, outputBuffer);
    console.log(`   ✅ Output salvato: ${outputPath}`);

    // 4. Confronta dimensioni
    console.log("\n3️⃣  Confronto con ground truth...");
    const groundTruthPath = "./test-template/ground-truth/test_1_ground_truth.docx";
    
    if (existsSync(groundTruthPath)) {
      const groundTruthBuffer = await readFile(groundTruthPath);
      
      console.log(`   Output size:       ${outputBuffer.length} bytes`);
      console.log(`   Ground truth size: ${groundTruthBuffer.length} bytes`);
      
      const sizeDiff = Math.abs(outputBuffer.length - groundTruthBuffer.length);
      const sizePercentDiff = ((sizeDiff / groundTruthBuffer.length) * 100).toFixed(2);
      
      console.log(`   Differenza:        ${sizeDiff} bytes (${sizePercentDiff}%)`);
      
      if (sizePercentDiff < 5) {
        console.log("   ✅ Le dimensioni sono simili!");
      } else {
        console.log("   ⚠️  Le dimensioni differiscono significativamente");
      }
    }

    // 5. Verifica contenuto XML
    console.log("\n4️⃣  Verificando contenuto...");
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(outputBuffer);
    const documentXml = await zip.file("word/document.xml").async("text");
    
    // Cerca variabili non sostituite
    const unreplacedVars = documentXml.match(/\{\{[^}]+\}\}/g);
    if (unreplacedVars) {
      console.log("   ⚠️  Variabili NON sostituite trovate:");
      [...new Set(unreplacedVars)].forEach(v => console.log("      -", v));
    } else {
      console.log("   ✅ Tutte le variabili sono state sostituite!");
    }
    
    // Cerca i valori attesi
    const expectedValues = [
      "TechGrow Ltd.",
      "Alice Rossi",
      "Bob Johnson",
      "AI Workflow Automation",
      "Dr. Marco Verdi",
      "Luca Bianchi",
      "Sara Neri",
      "Tom Chen",
    ];
    
    console.log("\n5️⃣  Verificando valori nel documento...");
    const found = [];
    const notFound = [];
    
    expectedValues.forEach(value => {
      if (documentXml.includes(value)) {
        found.push(value);
      } else {
        notFound.push(value);
      }
    });
    
    console.log(`   ✅ Trovati: ${found.length}/${expectedValues.length}`);
    if (notFound.length > 0) {
      console.log("   ⚠️  Non trovati:");
      notFound.forEach(v => console.log("      -", v));
    }

    console.log("\n✨ Test completato!");
    console.log("\n💡 Apri il file per verificare visivamente:");
    console.log(`   open ${outputPath}`);
    console.log(`   open ${groundTruthPath}`);

  } catch (error) {
    console.error("\n❌ Errore:", error.message);
    console.error(error.stack);
  }
}

testWithComparison();

